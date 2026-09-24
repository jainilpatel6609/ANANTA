// WebView <-> React Native message protocol. Every message is a JSON object.
//
//   WebView -> Native : { id, type: WebToNative, payload? }      (via window.ReactNativeWebView.postMessage)
//   Native -> WebView : { id?, type: NativeToWeb, payload? }     (via injected JavaScript; `id` echoes the request)

export type WebToNative =
  | 'REQUEST_CURRENT_LOCATION'
  | 'WATCH_LOCATION'
  | 'CLEAR_LOCATION_WATCH'
  | 'START_LIVE_LOCATION'
  | 'STOP_LIVE_LOCATION'
  | 'OPEN_CAMERA'
  | 'REQUEST_CAMERA_PERMISSION'
  | 'REQUEST_LOCATION_PERMISSION'
  | 'REQUEST_NOTIFICATION_PERMISSION'
  | 'GET_PERMISSION_STATUS'
  | 'OPEN_APP_SETTINGS'
  | 'GET_DEVICE_TOKEN'
  | 'REQUEST_OTP'
  | 'CANCEL_OTP';

export type NativeToWeb =
  | 'LOCATION_RESULT'
  | 'LIVE_LOCATION_UPDATE'
  | 'CAMERA_RESULT'
  | 'PERMISSION_RESULT'
  | 'NOTIFICATION_TOKEN'
  | 'OTP_RESULT'
  | 'NATIVE_ERROR';

export interface WebMessage {
  id?: string;
  type: WebToNative;
  payload?: Record<string, any>;
}

export interface NativeMessage {
  id?: string;
  type: NativeToWeb;
  payload?: Record<string, any>;
}

export type PermissionName = 'location' | 'camera' | 'notifications';
// "blocked" = denied permanently ("Don't ask again"): only Android Settings can change it now.
export type PermissionStatus = 'granted' | 'denied' | 'blocked';

export type ErrorCode =
  | 'PERMISSION_DENIED'
  | 'PERMISSION_BLOCKED'
  | 'LOCATION_UNAVAILABLE'
  | 'LOCATION_TIMEOUT'
  | 'LOCATION_SERVICES_OFF'
  | 'CAMERA_CANCELLED'
  | 'CAMERA_UNAVAILABLE'
  | 'FIREBASE_NOT_CONFIGURED'
  | 'OTP_TIMEOUT'
  | 'OTP_DENIED'
  | 'OTP_UNAVAILABLE'
  | 'LIVE_LOCATION_STOPPED'
  | 'INVALID_REQUEST'
  | 'INTERNAL';

export class NativeBridgeError extends Error {
  code: ErrorCode;
  extra?: Record<string, any>;

  constructor(code: ErrorCode, message: string, extra?: Record<string, any>) {
    super(message);
    this.code = code;
    this.extra = extra;
  }
}
