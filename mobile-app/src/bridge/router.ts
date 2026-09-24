import { AppState } from 'react-native';
import { sendToWeb } from './emitter';
import { NativeBridgeError, NativeMessage, PermissionName, PermissionStatus, WebMessage } from './protocol';
import { capturePhoto } from '../native/camera';
import { getCurrentLocation, startWatch, stopWatch } from '../native/location';
import { startLiveLocation, stopLiveLocation } from '../native/liveLocation';
import { ALL_PERMISSIONS, getPermissionStatus, openAppSettings, requestPermission } from '../native/permissions';
import { getDeviceToken } from '../native/push';
import { cancelOtpListener, listenForOtp } from '../native/otp';

const reply = (id: string | undefined, message: NativeMessage): void => {
  sendToWeb(id ? { ...message, id } : message);
};

const replyError = (id: string | undefined, err: unknown, extra?: Record<string, any>): void => {
  const bridgeError =
    err instanceof NativeBridgeError ? err : new NativeBridgeError('INTERNAL', String((err as Error)?.message || err));
  reply(id, {
    type: 'NATIVE_ERROR',
    payload: { code: bridgeError.code, message: bridgeError.message, ...bridgeError.extra, ...extra },
  });
};

const permissionResult = (permission: PermissionName, status: PermissionStatus): NativeMessage => ({
  type: 'PERMISSION_RESULT',
  payload: { permission, status, granted: status === 'granted', canAskAgain: status === 'denied' },
});

const asPermissionName = (value: unknown): PermissionName | null =>
  value === 'location' || value === 'camera' || value === 'notifications' ? value : null;

const handlePermissionRequest = async (id: string | undefined, permission: PermissionName): Promise<void> => {
  const status = await requestPermission(permission);
  reply(id, permissionResult(permission, status));
};

// Dispatches one message from the WebView. Never throws: failures go back as NATIVE_ERROR.
export const handleWebMessage = async (message: WebMessage): Promise<void> => {
  const { id, type } = message;
  const payload = message.payload || {};

  try {
    switch (type) {
      case 'REQUEST_CURRENT_LOCATION': {
        const fix = await getCurrentLocation({
          enableHighAccuracy: payload.enableHighAccuracy,
          timeout: payload.timeout,
          maximumAge: payload.maximumAge,
        });
        reply(id, { type: 'LOCATION_RESULT', payload: { success: true, ...fix } });
        return;
      }

      case 'WATCH_LOCATION': {
        const watchId = String(payload.watchId);
        try {
          await startWatch(
            watchId,
            payload,
            fix => sendToWeb({ type: 'LOCATION_RESULT', payload: { success: true, watchId: payload.watchId, ...fix } }),
            err => replyError(undefined, err, { watchId: payload.watchId }),
          );
        } catch (err) {
          replyError(undefined, err, { watchId: payload.watchId });
        }
        return;
      }

      case 'CLEAR_LOCATION_WATCH':
        stopWatch(String(payload.watchId));
        return;

      case 'START_LIVE_LOCATION':
        await startLiveLocation({ orderId: String(payload.orderId || ''), token: String(payload.token || ''), apiBase: payload.apiBase });
        reply(id, { type: 'LIVE_LOCATION_UPDATE', payload: { active: true, orderId: payload.orderId } });
        return;

      case 'STOP_LIVE_LOCATION':
        await stopLiveLocation('requested');
        reply(id, { type: 'LIVE_LOCATION_UPDATE', payload: { active: false } });
        return;

      case 'OPEN_CAMERA': {
        const photo = await capturePhoto(payload.facing === 'user' ? 'user' : 'environment');
        reply(id, { type: 'CAMERA_RESULT', payload: { success: true, ...photo } });
        return;
      }

      case 'REQUEST_CAMERA_PERMISSION':
        await handlePermissionRequest(id, 'camera');
        return;

      case 'REQUEST_LOCATION_PERMISSION':
        await handlePermissionRequest(id, 'location');
        return;

      case 'REQUEST_NOTIFICATION_PERMISSION':
        await handlePermissionRequest(id, 'notifications');
        return;

      case 'GET_PERMISSION_STATUS': {
        const requested = asPermissionName(payload.permission);
        if (requested) {
          reply(id, permissionResult(requested, await getPermissionStatus(requested)));
        } else {
          const all: Record<string, PermissionStatus> = {};
          for (const name of ALL_PERMISSIONS) {
            all[name] = await getPermissionStatus(name);
          }
          reply(id, { type: 'PERMISSION_RESULT', payload: { permissions: all } });
        }
        return;
      }

      case 'OPEN_APP_SETTINGS':
        await openAppSettings();
        return;

      case 'GET_DEVICE_TOKEN': {
        const token = await getDeviceToken();
        reply(id, { type: 'NOTIFICATION_TOKEN', payload: { token, platform: 'android' } });
        return;
      }

      case 'REQUEST_OTP': {
        const { otp, message: sms } = await listenForOtp();
        reply(id, { type: 'OTP_RESULT', payload: { otp, message: sms } });
        return;
      }

      case 'CANCEL_OTP':
        cancelOtpListener();
        return;

      default:
        throw new NativeBridgeError('INVALID_REQUEST', `Unknown bridge message type: ${String(type)}`);
    }
  } catch (err) {
    replyError(id, err);
  }
};

// If the user changes a permission in Android Settings and returns to the app, tell the web app.
let lastKnown: Partial<Record<PermissionName, PermissionStatus>> = {};

export const watchPermissionChanges = (): (() => void) => {
  const refresh = async () => {
    for (const name of ALL_PERMISSIONS) {
      const status = await getPermissionStatus(name);
      if (lastKnown[name] !== undefined && lastKnown[name] !== status) {
        sendToWeb(permissionResult(name, status));
      }
      lastKnown[name] = status;
    }
  };
  refresh().catch(() => {});
  const sub = AppState.addEventListener('change', state => {
    if (state === 'active') {
      refresh().catch(() => {});
    }
  });
  return () => {
    sub.remove();
    lastKnown = {};
  };
};
