import { notificationService } from '../services';

const DEVICE_TOKEN_KEY = 'ananta_fcm_device_token';

/**
 * Checks if browser environment supports Web Push and Service Workers
 */
export const isPushSupported = () => {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'Notification' in window;
};

/**
 * Returns current permission status ('default', 'granted', 'denied')
 */
export const getPushPermissionState = () => {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
};

/**
 * Registers the Service Worker for background push handling
 */
export const registerServiceWorker = async () => {
  if (!isPushSupported()) return null;

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

/**
 * Requests device push notification permission and registers token with backend
 */
export const requestAndRegisterDevicePush = async () => {
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

