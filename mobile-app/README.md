# ANANTA TRADERS — Android app (React Native + WebView)

The Android app loads the existing ANANTA TRADERS web app (`delivery-app`) inside `react-native-webview` and gives it
native Android access to GPS, live location, camera, push notifications and OTP SMS. The web UI and the backend are
unchanged; the app talks to the same REST APIs, JWT auth and Socket.IO as the browser version.

```
mobile-app/
  App.tsx                      WebView shell: loading / offline screen, back button, external links, bridge wiring
  index.js                     entry; registers push background handlers + live-location foreground service
  src/config.ts                web URL + API URL (from .env)
  src/bridge/protocol.ts       message types
  src/bridge/injectedScript.ts window.AnantaNative + navigator.geolocation replacement injected into the page
  src/bridge/router.ts         WebView -> native message handling
  src/native/                  location, liveLocation, camera, permissions, push (FCM), otp
  android/.../SmsConsentModule.kt   Android SMS User Consent API (OTP auto-read)
```

## Setup

1. `cd mobile-app && npm install`
2. Copy `.env.example` to `.env` and set:
   - `WEB_APP_URL` — the deployed (https) delivery-app URL. **Required for release builds.**
   - `API_URL` — the backend API (same as `VITE_API_URL` in `delivery-app/.env`).
   - `DEV_WEB_APP_URL` — debug builds only (default `http://10.0.2.2:3000` = `npm run dev` of delivery-app on the
     host, seen from the emulator; use your LAN IP for a real device).
3. **Push notifications:** create/open the Firebase project, add an Android app with package name `com.ananta.app`,
   download `google-services.json` into `android/app/`. Without it the app builds and runs, push stays disabled.
4. Build/run (JDK 17–21 and the Android SDK required):
   - Debug on a device/emulator: `npm run android`
   - Release APK: `cd android && ./gradlew assembleRelease` (configure your own signing keystore first — the template
     signs release with the debug key), AAB for Play: `./gradlew bundleRelease`

After changing `.env`, restart Metro with `npx react-native start --reset-cache`.

## Bridge (WebView <-> native)

All messages are JSON. WebView -> native uses `window.ReactNativeWebView.postMessage`, native -> WebView is delivered
by injected JavaScript. The web app uses the helper API `window.AnantaNative` (see
`delivery-app/src/utils/nativeBridge.js`); in a normal browser it does not exist and the web app behaves as before.

| WebView -> Native | Native -> WebView |
| --- | --- |
| `REQUEST_CURRENT_LOCATION`, `WATCH_LOCATION`, `CLEAR_LOCATION_WATCH` | `LOCATION_RESULT` |
| `START_LIVE_LOCATION`, `STOP_LIVE_LOCATION` | `LIVE_LOCATION_UPDATE` |
| `OPEN_CAMERA` | `CAMERA_RESULT` |
| `REQUEST_CAMERA_PERMISSION`, `REQUEST_LOCATION_PERMISSION`, `REQUEST_NOTIFICATION_PERMISSION`, `GET_PERMISSION_STATUS`, `OPEN_APP_SETTINGS` | `PERMISSION_RESULT` |
| `GET_DEVICE_TOKEN` | `NOTIFICATION_TOKEN` |
| `REQUEST_OTP`, `CANCEL_OTP` | `OTP_RESULT` |
| — | `NATIVE_ERROR` `{ code, message }` (also answers any failed request) |

Requests carry an `id`; the reply echoes it. Only pages from `WEB_APP_URL`'s origin can use the bridge.

- **GPS / current location** — `navigator.geolocation` is replaced inside the WebView, so the existing web code
  (order location, dealer location enforcement, map picker, driver GPS) reads the real device GPS via Android location
  services with runtime permission handling. Denied / permanently denied ("blocked") are reported distinctly; returning
  from Android Settings re-sends `PERMISSION_RESULT` if a permission changed.
- **Live location (driver)** — after the driver's first "Broadcast GPS", the web app sends `START_LIVE_LOCATION`
  `{ orderId, token, apiBase }`. Native GPS then runs continuously in a foreground service (persistent notification), so
  it continues in the background, and each fix (min. every 5 s) is POSTed to the existing
  `POST /api/drivers/deliveries/:id/location`; the backend broadcasts it over the existing Socket.IO channel. It stops on
  delivery completion, logout, or if the server rejects the session (401/403/404).
- **Camera** — `OPEN_CAMERA` opens the device camera only (no gallery) and returns the photo as base64; the existing
  `LiveCameraModal` turns it into a `File` and the existing upload APIs are used unchanged.
- **Push** — real FCM token via Firebase; the web app registers it with the existing
  `POST /api/notifications/register-device`. The `ananta_dispatch_alerts` channel (used by the backend's FCM payload) is
  created natively. Foreground messages are shown as notifications; tapping one opens the page in `data.clickAction`.
- **OTP** — Android *SMS User Consent*: when the OTP SMS arrives, Android asks the user to allow reading that one
  message and the code is filled in. No `READ_SMS`/`RECEIVE_SMS` permission (restricted by Google Play) and no change to
  the SMS text are needed. Declining / timeout / no Play services falls back to manual entry.

## Android permissions

`INTERNET`, `ACCESS_NETWORK_STATE`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `CAMERA`, `POST_NOTIFICATIONS`,
`FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`. Live location runs as a foreground service started while the app is
visible, which keeps location access in the background without `ACCESS_BACKGROUND_LOCATION`.

## Testing on an emulator / device against a local web server

- Emulator: `DEV_WEB_APP_URL=http://10.0.2.2:3000`. If the host firewall blocks that, run `adb reverse tcp:3000 tcp:3000`
  and use `DEV_WEB_APP_URL=http://localhost:3000`.
- Use a *production* build of the web app (`npm run build && npx vite preview --host`) for camera tests: the Vite dev
  client reloads the page whenever the app returns from the background (e.g. from the camera app).
- The debug build needs Metro (`npm start`) and `adb reverse tcp:8081 tcp:8081`; release builds embed the JS bundle.
- Emulator GPS: `adb emu geo fix <longitude> <latitude>`. Emulator SMS: `adb emu sms send VM-ANANTA "Your OTP is 123456"`.
