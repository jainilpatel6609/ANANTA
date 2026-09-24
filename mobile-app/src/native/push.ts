import {
  getInitialNotification,
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';
import type { RemoteMessage } from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { sendToWeb } from '../bridge/emitter';
import { NativeBridgeError } from '../bridge/protocol';

// The existing backend (fcmService) sends every push with this Android channel id, so the channel must exist
// on the device or Android silently falls back to a default, non-alerting one.
export const DISPATCH_CHANNEL_ID = 'ananta_dispatch_alerts';

const isFirebaseMissing = (err: unknown): boolean =>
  /no firebase app|default app|not initialized|google-services|FirebaseApp/i.test(String((err as Error)?.message || err));

export const ensureNotificationChannel = async (): Promise<void> => {
  await notifee.createChannel({
    id: DISPATCH_CHANNEL_ID,
    name: 'Dispatch Alerts',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  });
};

// FCM registration token of this device. Registered with the existing backend by the web app
// (POST /api/notifications/register-device), exactly like the web push token was before.
export const getDeviceToken = async (): Promise<string> => {
  try {
    await ensureNotificationChannel();
    const token = await getToken(getMessaging());
    if (!token) {
      throw new NativeBridgeError('INTERNAL', 'Firebase did not return a device token.');
    }
    return token;
  } catch (err) {
    if (err instanceof NativeBridgeError) {
      throw err;
    }
    if (isFirebaseMissing(err)) {
      throw new NativeBridgeError(
        'FIREBASE_NOT_CONFIGURED',
        'Firebase is not configured for this build (android/app/google-services.json is missing).',
      );
    }
    throw new NativeBridgeError('INTERNAL', String((err as Error)?.message || err));
  }
};

// Path inside the web app that a notification opens: what the backend put in data.clickAction, falling back to
// the order page for the recipient.
export const pathFromNotificationData = (data?: Record<string, any> | null): string | null => {
  if (!data) {
    return null;
  }
  const clickAction = typeof data.clickAction === 'string' ? data.clickAction : '';
  if (clickAction.startsWith('/') && !clickAction.startsWith('//')) {
    return clickAction;
  }
  if (typeof data.orderId === 'string' && data.orderId) {
    return `/user/orders/${data.orderId}`;
  }
  return null;
};

let initialised = false;

// Foreground display + tap handling + token refresh. `onOpenPath` navigates the WebView.
export const initPush = (onOpenPath: (path: string) => void): void => {
  if (initialised) {
    return;
  }
  initialised = true;

  // Taps on notifications that Notifee displayed (foreground messages).
  notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS) {
      const path = pathFromNotificationData(detail.notification?.data as Record<string, any> | undefined);
      if (path) {
        onOpenPath(path);
      }
    }
  });
  notifee
    .getInitialNotification()
    .then(initial => {
      const path = pathFromNotificationData(initial?.notification?.data as Record<string, any> | undefined);
      if (path) {
        onOpenPath(path);
      }
    })
    .catch(() => {});

  try {
    const fcm = getMessaging();

    // App in foreground: FCM does not show a system notification itself, so show one.
    onMessage(fcm, async (message: RemoteMessage) => {
      await ensureNotificationChannel();
      await notifee.displayNotification({
        title: message.notification?.title || (message.data?.title as string) || 'ANANTA TRADERS',
        body: message.notification?.body || (message.data?.body as string) || '',
        data: (message.data || {}) as Record<string, string>,
        android: {
          channelId: DISPATCH_CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          pressAction: { id: 'default' },
        },
      });
    });

    // Tap on a system-tray notification while the app was in the background / closed.
    onNotificationOpenedApp(fcm, (message: RemoteMessage) => {
      const path = pathFromNotificationData(message.data);
      if (path) {
        onOpenPath(path);
      }
    });
    getInitialNotification(fcm)
      .then((message: RemoteMessage | null) => {
        const path = pathFromNotificationData(message?.data);
        if (path) {
          onOpenPath(path);
        }
      })
      .catch(() => {});

    onTokenRefresh(fcm, (token: string) => {
      sendToWeb({ type: 'NOTIFICATION_TOKEN', payload: { token, platform: 'android', refreshed: true } });
    });
  } catch {
    // Firebase not configured for this build: push is unavailable, everything else keeps working.
  }
};

// Registered at startup (index.js). Notification-type FCM messages are displayed by the system while the app is
// in the background, so nothing needs to happen here -- the handler only has to exist.
export const registerBackgroundHandlers = (): void => {
  try {
    setBackgroundMessageHandler(getMessaging(), async () => {});
  } catch {
    /* Firebase not configured */
  }
  notifee.onBackgroundEvent(async () => {});
};
