// Bridge to the ANANTA Android app (React Native + WebView).
//
// Inside the Android app the native side injects `window.AnantaNative` before this app loads. In a normal browser it
// does not exist, so every helper here is a no-op / falls back and the web app behaves exactly as before.
//
// Message types (WebView -> Native): REQUEST_CURRENT_LOCATION, START_LIVE_LOCATION, STOP_LIVE_LOCATION, OPEN_CAMERA,
//   REQUEST_CAMERA_PERMISSION, REQUEST_LOCATION_PERMISSION, REQUEST_NOTIFICATION_PERMISSION, GET_DEVICE_TOKEN, REQUEST_OTP
// Message types (Native -> WebView): LOCATION_RESULT, LIVE_LOCATION_UPDATE, CAMERA_RESULT, PERMISSION_RESULT,
//   NOTIFICATION_TOKEN, OTP_RESULT, NATIVE_ERROR
// (navigator.geolocation is replaced by the native side, so existing GPS code needs no changes.)

export const isNativeApp = () => typeof window !== 'undefined' && Boolean(window.AnantaNative);

const bridge = () => window.AnantaNative;

// Normalised error thrown by the helpers below: { code, message }
const toError = (err) => {
  const error = new Error((err && err.message) || 'Native request failed.');
  error.code = (err && err.code) || 'INTERNAL';
  return error;
};

const request = async (type, payload, timeoutMs) => {
  try {
    return await bridge().request(type, payload, timeoutMs);
  } catch (err) {
    throw toError(err);
  }
};

// ---- Camera (camera-only; the native side never offers the gallery) --------------------------------------------

const base64ToFile = (base64, mimeType, fileName) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], fileName, { type: mimeType });
};

/**
 * Opens the native Android camera and resolves with { file, dataUrl } (same shape LiveCameraModal hands to onCapture).
 * Rejects with error.code = CAMERA_CANCELLED | PERMISSION_DENIED | PERMISSION_BLOCKED | CAMERA_UNAVAILABLE.
 */
export const captureNativePhoto = async (facingMode = 'environment') => {
  const msg = await request('OPEN_CAMERA', { facing: facingMode === 'user' ? 'user' : 'environment' }, 10 * 60 * 1000);
  const { base64, mimeType = 'image/jpeg', fileName = `live_capture_${Date.now()}.jpg` } = msg.payload;
  return {
    file: base64ToFile(base64, mimeType, fileName),
    dataUrl: `data:${mimeType};base64,${base64}`
  };
};

// ---- Permissions ------------------------------------------------------------------------------------------------

// Sends the user to this app's Android Settings page (for permissions that are permanently denied).
export const openNativeSettings = () => {
  if (isNativeApp()) bridge().send('OPEN_APP_SETTINGS');
};

/**
 * Human-readable message for a native error. For permanently denied permissions it offers to open Android Settings.
 */
export const describeNativeError = (err) => {
  if (err && err.code === 'PERMISSION_BLOCKED') {
    if (typeof window !== 'undefined' && window.confirm(`${err.message}\n\nOpen Settings now?`)) {
      openNativeSettings();
    }
  }
  return (err && err.message) || 'Something went wrong.';
};

// ---- Live location (Driver) -------------------------------------------------------------------------------------

/**
 * Starts continuous native GPS sharing for an order. The native app posts each fix to the existing
 * POST /api/drivers/deliveries/:id/location endpoint (same one the Driver flow already uses), so the backend's
 * existing Socket.IO broadcast to the customer keeps working, also while the app is in the background.
 */
export const startNativeLiveLocation = async ({ orderId, token, apiBase }) => {
  if (!isNativeApp()) return false;
  await request('START_LIVE_LOCATION', { orderId, token, apiBase }, 30000);
  return true;
};

export const stopNativeLiveLocation = () => {
  if (isNativeApp()) bridge().send('STOP_LIVE_LOCATION');
};

// ---- Push notifications -----------------------------------------------------------------------------------------

export const getNativePermissionStatus = async (permission) => {
  const msg = await request('GET_PERMISSION_STATUS', { permission }, 15000);
  return msg.payload.status; // 'granted' | 'denied' | 'blocked'
};

export const requestNativeNotificationPermission = async () => {
  const msg = await request('REQUEST_NOTIFICATION_PERMISSION', {}, 60000);
  return msg.payload.status;
};

export const getNativeDeviceToken = async () => {
  const msg = await request('GET_DEVICE_TOKEN', {}, 30000);
  return msg.payload.token;
};

// Called with every new FCM token (Firebase rotates tokens); returns an unsubscribe function.
export const onNativeTokenRefresh = (handler) => {
  if (!isNativeApp()) return () => {};
  return bridge().on('NOTIFICATION_TOKEN', (msg) => handler(msg.payload.token));
};

// ---- OTP auto-read ----------------------------------------------------------------------------------------------

/**
 * Listens for the incoming OTP SMS (Android SMS User Consent: the user is asked to allow reading that one SMS) and
 * calls onOtp(otp). Returns a cancel function. If auto-read is unavailable/declined nothing happens and the user
 * simply types the OTP as before.
 */
export const listenForNativeOtp = (onOtp) => {
  if (!isNativeApp()) return () => {};
  let active = true;
  request('REQUEST_OTP', {}, 5.5 * 60 * 1000)
    .then((msg) => {
      if (active && msg.payload && msg.payload.otp) onOtp(msg.payload.otp);
    })
    .catch(() => {
      // Timeout / declined / unavailable -> manual entry stays available.
    });
  return () => {
    active = false;
    bridge().send('CANCEL_OTP');
  };
};
