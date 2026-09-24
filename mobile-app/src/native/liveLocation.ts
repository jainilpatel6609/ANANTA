import Geolocation from '@react-native-community/geolocation';
import notifee, { AndroidForegroundServiceType, AndroidImportance } from '@notifee/react-native';
import { sendToWeb } from '../bridge/emitter';
import { NativeBridgeError } from '../bridge/protocol';
import { resolveApiBase } from '../config';
import { ensureLocationPermission, toFix, toLocationError } from './location';

// Live location sharing for the Driver flow.
//
// While active it keeps GPS running (in a foreground service, so it survives the app going to the
// background) and posts every fix to the EXISTING backend endpoint the web app already uses for the
// driver flow: POST /api/drivers/deliveries/:orderId/location. The backend then broadcasts it over the
// existing Socket.IO channel to the customer -- nothing about that pipeline is replaced.

const CHANNEL_ID = 'ananta_live_location';
const NOTIFICATION_ID = 'ananta_live_location_sharing';
const MIN_POST_INTERVAL_MS = 5000;

interface Session {
  orderId: string;
  token: string;
  endpoint: string;
  nativeWatchId: number;
  lastPostAt: number;
  posting: boolean;
}

let session: Session | null = null;

// The foreground service only needs to stay alive until stopForegroundService(); the work runs in the watcher.
export const registerLiveLocationService = (): void => {
  notifee.registerForegroundService(
    () =>
      new Promise<void>(() => {
        /* resolved implicitly when the service is stopped */
      }),
  );
};

const startForegroundService = async (): Promise<void> => {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Live location sharing',
    importance: AndroidImportance.LOW,
  });
  await notifee.displayNotification({
    id: NOTIFICATION_ID,
    title: 'ANANTA TRADERS',
    body: 'Sharing your live location for the active delivery',
    android: {
      channelId: CHANNEL_ID,
      asForegroundService: true,
      ongoing: true,
      onlyAlertOnce: true,
      foregroundServiceTypes: [AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_LOCATION],
      pressAction: { id: 'default' },
    },
  });
};

const stopForegroundService = async (): Promise<void> => {
  try {
    await notifee.stopForegroundService();
    await notifee.cancelNotification(NOTIFICATION_ID);
  } catch {
    /* nothing to stop */
  }
};

export const isLiveLocationActive = (): boolean => session !== null;

export const stopLiveLocation = async (reason?: string): Promise<void> => {
  if (!session) {
    return;
  }
  Geolocation.clearWatch(session.nativeWatchId);
  const orderId = session.orderId;
  session = null;
  await stopForegroundService();
  sendToWeb({ type: 'LIVE_LOCATION_UPDATE', payload: { active: false, orderId, reason: reason || 'stopped' } });
};

const postFix = async (current: Session, fix: ReturnType<typeof toFix>): Promise<void> => {
  if (current.posting || Date.now() - current.lastPostAt < MIN_POST_INTERVAL_MS) {
    return;
  }
  current.posting = true;
  current.lastPostAt = Date.now();
  try {
    const res = await fetch(current.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${current.token}` },
      body: JSON.stringify({
        latitude: fix.latitude,
        longitude: fix.longitude,
        heading: fix.heading || 0,
        speed: fix.speed || 0,
      }),
    });
    // Session expired / order no longer this driver's / order gone: sharing can't continue.
    if (res.status === 401 || res.status === 403 || res.status === 404) {
      if (session === current) {
        sendToWeb({
          type: 'NATIVE_ERROR',
          payload: {
            code: 'LIVE_LOCATION_STOPPED',
            message: `Live location sharing stopped (server responded ${res.status}).`,
            orderId: current.orderId,
          },
        });
        await stopLiveLocation('server_rejected');
      }
    }
  } catch {
    // Offline / server unreachable: skip this fix, the next one will retry.
  } finally {
    current.posting = false;
  }
};

export const startLiveLocation = async (params: { orderId: string; token: string; apiBase?: string }): Promise<void> => {
  const { orderId, token } = params;
  if (!orderId || !token) {
    throw new NativeBridgeError('INVALID_REQUEST', 'orderId and token are required to share live location.');
  }
  await ensureLocationPermission();

  // Restart cleanly if a previous session is running (e.g. a different order).
  if (session) {
    Geolocation.clearWatch(session.nativeWatchId);
    session = null;
  }

  const base = resolveApiBase(params.apiBase);
  if (!base) {
    throw new NativeBridgeError('INVALID_REQUEST', 'Backend API URL is not configured.');
  }

  await startForegroundService();

  const current: Session = {
    orderId,
    token,
    endpoint: `${base.replace(/\/+$/, '')}/drivers/deliveries/${encodeURIComponent(orderId)}/location`,
    nativeWatchId: -1,
    lastPostAt: 0,
    posting: false,
  };

  current.nativeWatchId = Geolocation.watchPosition(
    pos => {
      const fix = toFix(pos);
      sendToWeb({ type: 'LIVE_LOCATION_UPDATE', payload: { active: true, orderId, ...fix } });
      postFix(current, fix);
    },
    err => {
      const error = toLocationError(err);
      sendToWeb({ type: 'NATIVE_ERROR', payload: { code: error.code, message: error.message, orderId } });
    },
    { enableHighAccuracy: true, distanceFilter: 5, interval: 5000, fastestInterval: 3000, timeout: 30000, maximumAge: 0 },
  );
  session = current;
};
