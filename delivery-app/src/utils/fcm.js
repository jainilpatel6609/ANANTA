import { notificationService } from '../services';
import {
  isNativeApp,
  getNativePermissionStatus,
  requestNativeNotificationPermission,
  getNativeDeviceToken,
  onNativeTokenRefresh
} from './nativeBridge';

const DEVICE_TOKEN_KEY = 'ananta_fcm_device_token';

// Native Android permission status ('granted' | 'denied' | 'blocked') -> the browser-style values the UI already uses.
const fromNativeStatus = (status) => {
  if (status === 'granted') return 'granted';
  if (status === 'blocked') return 'denied'; // permanently denied: cannot be asked again from the app
  return 'default';
};

let nativePermissionCache = 'default';

/**
 * Checks if browser environment supports Web Push and Service Workers (or we run inside the Android app,
 * where push goes through native Firebase Cloud Messaging)
 */
export const isPushSupported = () => {
  if (isNativeApp()) return true;
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'Notification' in window;
};

/**
 * Returns current permission status ('default', 'granted', 'denied')
 */
export const getPushPermissionState = () => {
  if (isNativeApp()) return nativePermissionCache;
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
};

/**
 * Same as getPushPermissionState but always fresh (inside the Android app the real status is fetched from the
 * native side, which is asynchronous).
 */
export const getPushPermissionStateAsync = async () => {
  if (!isNativeApp()) return getPushPermissionState();
  try {
    nativePermissionCache = fromNativeStatus(await getNativePermissionStatus('notifications'));
  } catch {
    // keep the last known value
  }
  return nativePermissionCache;
};

/**
 * Registers the Service Worker for background push handling
 */
export const registerServiceWorker = async () => {
  if (isNativeApp() || !isPushSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });
    return registration;
  } catch (err) {
    console.warn('[ServiceWorker Registration Warning]', err);
    return null;
  }
};

let stopNativeTokenRefresh = null;

// Android app: ask for the notification permission, get the real FCM token and register it with the backend
// through the same endpoint the web token used.
const registerNativeDevicePush = async () => {
  try {
    let status = await getNativePermissionStatus('notifications');
    if (status !== 'granted') {
      status = await requestNativeNotificationPermission();
    }
    nativePermissionCache = fromNativeStatus(status);
    if (status !== 'granted') {
      return { success: false, reason: status === 'blocked' ? 'denied' : 'default' };
    }

    const deviceToken = await getNativeDeviceToken();
    localStorage.setItem(DEVICE_TOKEN_KEY, deviceToken);
    await notificationService.registerDevice({
      token: deviceToken,
      platform: 'android',
      userAgent: navigator.userAgent
    });

    // Firebase rotates tokens occasionally: keep the backend in sync.
    if (!stopNativeTokenRefresh) {
      stopNativeTokenRefresh = onNativeTokenRefresh((newToken) => {
        localStorage.setItem(DEVICE_TOKEN_KEY, newToken);
        notificationService
          .registerDevice({ token: newToken, platform: 'android', userAgent: navigator.userAgent })
          .catch(() => {});
      });
    }

    console.info('[Device Push Registered]', deviceToken);
    return { success: true, token: deviceToken };
  } catch (err) {
    console.error('[Device Push Registration Error]', err);
    return {
      success: false,
      reason: err.code === 'FIREBASE_NOT_CONFIGURED' ? 'unsupported' : undefined,
      error: err.message
    };
  }
};

/**
 * Requests device push notification permission and registers token with backend
 */
export const requestAndRegisterDevicePush = async () => {
  if (isNativeApp()) {
    return registerNativeDevicePush();
  }

  if (!isPushSupported()) {
    return { success: false, reason: 'unsupported' };
  }

  try {
    // 1. Request Permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, reason: permission };
    }

    // 2. Ensure Service Worker is registered and ready
    const registration = await registerServiceWorker();
    if (!registration) {
      return { success: false, reason: 'sw_failed' };
    }

    // 3. Generate / retrieve persistent device token for this browser
    let deviceToken = localStorage.getItem(DEVICE_TOKEN_KEY);
    if (!deviceToken) {
      // Generate a unique, cryptographically strong device identifier token
      const randomBytes = new Uint8Array(16);
      window.crypto.getRandomValues(randomBytes);
      const randomHex = Array.from(randomBytes).map((b) => b.toString(16).padStart(2, '0')).join('');
      deviceToken = `fcm_web_${Date.now()}_${randomHex}`;
      localStorage.setItem(DEVICE_TOKEN_KEY, deviceToken);
    }

    // 4. Send token to Backend for Authenticated Dealer/Admin
    await notificationService.registerDevice({
      token: deviceToken,
      platform: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile_web' : 'desktop_web',
      userAgent: navigator.userAgent
    });

    console.info('[Device Push Registered]', deviceToken);
    return { success: true, token: deviceToken };
  } catch (err) {
    console.error('[Device Push Registration Error]', err);
    return { success: false, error: err.message };
  }
};

/**
 * Unregisters token on logout
 */
export const unregisterDevicePush = async () => {
  try {
    const deviceToken = localStorage.getItem(DEVICE_TOKEN_KEY);
    if (deviceToken) {
      await notificationService.unregisterDevice(deviceToken);
    }
  } catch (err) {
    console.warn('[Unregister Device Warning]', err);
  }
};
