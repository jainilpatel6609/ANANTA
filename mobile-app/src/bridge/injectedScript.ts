import { WEB_ORIGIN } from '../config';

// Runs inside the WebView before the ANANTA web app loads. It provides:
//
//   window.AnantaNative   the bridge API used by the web app (see delivery-app/src/utils/nativeBridge.js)
//     .isNative           true
//     .request(type, payload, timeoutMs) -> Promise<{ type, payload }>   (resolved by the reply to that request)
//     .send(type, payload)                fire-and-forget
//     .on(type, handler) -> unsubscribe   unsolicited native events (LIVE_LOCATION_UPDATE, NOTIFICATION_TOKEN, ...)
//
//   navigator.geolocation  replaced by a bridge-backed implementation, so EVERY existing
//                          getCurrentPosition / watchPosition call in the web app reads the device's real GPS via
//                          native Android location (with proper Android permission handling) -- no page changes.
//
// Only pages from the ANANTA web origin get the bridge.
export const buildInjectedScript = (): string => `
(function () {
  if (window.AnantaNative) { return; }
  if (${JSON.stringify(WEB_ORIGIN)} && window.location.origin.toLowerCase() !== ${JSON.stringify(WEB_ORIGIN)}) { return; }
  if (!window.ReactNativeWebView) { return; }

  var pending = {};
  var listeners = {};
  var seq = 0;

  function post(message) {
    window.ReactNativeWebView.postMessage(JSON.stringify(message));
  }

  function emit(message) {
    var list = listeners[message.type];
    if (list) {
      list.slice().forEach(function (handler) {
        try { handler(message); } catch (e) { console.error('[AnantaNative] listener error', e); }
      });
    }
  }

  var Native = {
    isNative: true,
    platform: 'android',

    request: function (type, payload, timeoutMs) {
      return new Promise(function (resolve, reject) {
        var id = 'w' + (++seq) + '_' + Date.now();
        var timer = setTimeout(function () {
          delete pending[id];
          reject({ code: 'BRIDGE_TIMEOUT', message: 'The native app did not respond in time.' });
        }, timeoutMs || 30000);
        pending[id] = { resolve: resolve, reject: reject, timer: timer };
        post({ id: id, type: type, payload: payload || {} });
      });
    },

    send: function (type, payload) {
      post({ type: type, payload: payload || {} });
    },

    on: function (type, handler) {
      (listeners[type] = listeners[type] || []).push(handler);
      return function () {
        var list = listeners[type] || [];
        var index = list.indexOf(handler);
        if (index !== -1) { list.splice(index, 1); }
      };
    },

    // Called by the native side with every message (replies and unsolicited events).
    _receive: function (message) {
      var waiting = message.id ? pending[message.id] : null;
      if (waiting) {
        clearTimeout(waiting.timer);
        delete pending[message.id];
        if (message.type === 'NATIVE_ERROR') { waiting.reject(message.payload || {}); }
        else { waiting.resolve(message); }
      }
      emit(message);
    }
  };
  window.AnantaNative = Native;

  // ---- navigator.geolocation -> native Android GPS ---------------------------------------------------------
  var watchers = {};
  var watchSeq = 0;

  function toPosition(p) {
    return {
      coords: {
        latitude: p.latitude,
        longitude: p.longitude,
        accuracy: p.accuracy,
        altitude: p.altitude,
        altitudeAccuracy: null,
        heading: p.heading,
        speed: p.speed
      },
      timestamp: p.timestamp || Date.now()
    };
  }

  function toPositionError(e) {
    var code = e && e.code;
    var n = 2;
    if (code === 'PERMISSION_DENIED' || code === 'PERMISSION_BLOCKED') { n = 1; }
    else if (code === 'LOCATION_TIMEOUT' || code === 'BRIDGE_TIMEOUT') { n = 3; }
    return { code: n, message: (e && e.message) || 'Unable to get location.', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 };
  }

  Native.on('LOCATION_RESULT', function (msg) {
    var watchId = msg.payload && msg.payload.watchId;
    if (watchId && watchers[watchId] && watchers[watchId].success) {
      watchers[watchId].success(toPosition(msg.payload));
    }
  });
  Native.on('NATIVE_ERROR', function (msg) {
    var watchId = msg.payload && msg.payload.watchId;
    if (watchId && watchers[watchId] && watchers[watchId].error) {
      watchers[watchId].error(toPositionError(msg.payload));
    }
  });

  var geolocation = {
    getCurrentPosition: function (success, error, options) {
      options = options || {};
      Native.request('REQUEST_CURRENT_LOCATION', {
        enableHighAccuracy: !!options.enableHighAccuracy,
        timeout: options.timeout,
        maximumAge: options.maximumAge
      }, (options.timeout || 20000) + 20000).then(function (msg) {
        if (success) { success(toPosition(msg.payload)); }
      }, function (err) {
        if (error) { error(toPositionError(err)); }
      });
    },
    watchPosition: function (success, error, options) {
      options = options || {};
      var id = ++watchSeq;
      watchers[id] = { success: success, error: error };
      Native.send('WATCH_LOCATION', {
        watchId: id,
        enableHighAccuracy: !!options.enableHighAccuracy,
        timeout: options.timeout,
        maximumAge: options.maximumAge
      });
      return id;
    },
    clearWatch: function (id) {
      delete watchers[id];
      Native.send('CLEAR_LOCATION_WATCH', { watchId: id });
    }
  };

  try {
    Object.defineProperty(navigator, 'geolocation', { value: geolocation, configurable: true });
  } catch (e) {
    console.error('[AnantaNative] could not install geolocation bridge', e);
  }
})();
true;
`;

// JS that delivers one native message to the page. U+2028/2029 are valid in JSON but not in JS source.
export const buildDeliverScript = (message: unknown): string => {
  const json = JSON.stringify(message).split(String.fromCharCode(0x2028)).join('\\u2028').split(String.fromCharCode(0x2029)).join('\\u2029');
  return `window.AnantaNative && window.AnantaNative._receive(${json}); true;`;
};

// Opens an in-app path (from a tapped notification) using the SPA's own router: pushState + popstate.
export const buildNavigateScript = (path: string): string => `
(function () {
  try {
    var target = ${JSON.stringify(path)};
    if (window.location.pathname + window.location.search !== target) {
      window.history.pushState({}, '', target);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  } catch (e) { window.location.href = ${JSON.stringify(path)}; }
})();
true;
`;
