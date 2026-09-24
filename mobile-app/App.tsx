import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import { isConfigured, isTrustedOrigin, WEB_URL } from './src/config';
import { setWebSender } from './src/bridge/emitter';
import { buildDeliverScript, buildInjectedScript, buildNavigateScript } from './src/bridge/injectedScript';
import { handleWebMessage, watchPermissionChanges } from './src/bridge/router';
import type { NativeMessage, WebMessage, WebToNative } from './src/bridge/protocol';
import { initPush } from './src/native/push';

// Same dark slate as the web app so there is no colour flash while the page loads.
const BACKGROUND = '#0b0f19';
const GOLD = '#b28e4e';

const WEB_TYPES: ReadonlySet<string> = new Set<WebToNative>([
  'REQUEST_CURRENT_LOCATION',
  'WATCH_LOCATION',
  'CLEAR_LOCATION_WATCH',
  'START_LIVE_LOCATION',
  'STOP_LIVE_LOCATION',
  'OPEN_CAMERA',
  'REQUEST_CAMERA_PERMISSION',
  'REQUEST_LOCATION_PERMISSION',
  'REQUEST_NOTIFICATION_PERMISSION',
  'GET_PERMISSION_STATUS',
  'OPEN_APP_SETTINGS',
  'GET_DEVICE_TOKEN',
  'REQUEST_OTP',
  'CANCEL_OTP',
]);

// Schemes the WebView cannot open itself (UPI apps, dialer, mail, WhatsApp, maps, Play Store, ...).
const EXTERNAL_SCHEME = /^(?!https?:|about:|blob:|data:|file:|javascript:)[a-z][a-z0-9+.-]*:/i;

// Links the web app opens in a new tab (target="_blank") to hand off to another app: Google Maps navigation and
// WhatsApp. Everything else (including Razorpay / bank pages) stays inside the WebView so payments keep working.
const EXTERNAL_APP_LINK =
  /^https?:\/\/(?:(?:www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl\/maps|wa\.me|api\.whatsapp\.com|wa\.link)/i;

const injectedScript = buildInjectedScript();

// react-native-webview's prop union does not resolve under the RN 0.87 / React 19 typings; the props used below are
// all documented WebView props, so the component is typed loosely (runtime behaviour is unaffected).
const AppWebView = WebView as unknown as React.ComponentType<any>;

function Shell(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const webRef = useRef<WebView>(null);
  const canGoBack = useRef(false);
  const pageReady = useRef(false);
  const pendingPath = useRef<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string | null>(null);

  // Native -> WebView delivery.
  useEffect(() => {
    setWebSender((message: NativeMessage) => {
      webRef.current?.injectJavaScript(buildDeliverScript(message));
    });
    return () => setWebSender(null);
  }, []);

  const openPath = useCallback((path: string) => {
    if (pageReady.current && webRef.current) {
      webRef.current.injectJavaScript(buildNavigateScript(path));
    } else {
      pendingPath.current = path; // opened as soon as the page finishes loading
    }
  }, []);

  // Push notification taps + permission changes made in Android Settings.
  useEffect(() => {
    initPush(openPath);
    return watchPermissionChanges();
  }, [openPath]);

  // Android back button: WebView history first, then leave the app.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack.current && webRef.current) {
        webRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, []);

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    // Only the ANANTA web app itself may use the native bridge.
    if (!isTrustedOrigin(event.nativeEvent.url)) {
      return;
    }
    try {
      const message = JSON.parse(event.nativeEvent.data) as WebMessage;
      if (message && typeof message.type === 'string' && WEB_TYPES.has(message.type)) {
        handleWebMessage(message);
      }
    } catch {
      // Not a bridge message.
    }
  }, []);

  const onShouldStartLoad = useCallback((request: ShouldStartLoadRequest): boolean => {
    if (EXTERNAL_SCHEME.test(request.url) || EXTERNAL_APP_LINK.test(request.url)) {
      Linking.openURL(request.url).catch(() => {});
      return false;
    }
    return true;
  }, []);

  const retry = useCallback(() => {
    setFailed(null);
    setLoading(true);
    webRef.current?.reload();
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <StatusBar barStyle="light-content" />
      <AppWebView
        ref={webRef}
        style={styles.web}
        source={{ uri: WEB_URL }}
        // Existing web app needs: JS, localStorage (JWT session), cookies, media autoplay (dealer alarm sound).
        javaScriptEnabled
        domStorageEnabled
        cacheEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        allowFileAccess
        geolocationEnabled
        setSupportMultipleWindows={false}
        originWhitelist={['*']}
        textZoom={100}
        overScrollMode="never"
        webviewDebuggingEnabled={__DEV__}
        injectedJavaScriptBeforeContentLoaded={injectedScript}
        onMessage={onMessage}
        onShouldStartLoadWithRequest={onShouldStartLoad}
        onNavigationStateChange={(nav: { canGoBack: boolean }) => {
          canGoBack.current = nav.canGoBack;
        }}
        onLoadStart={() => {
          pageReady.current = false;
        }}
        onLoadEnd={() => {
          pageReady.current = true;
          setLoading(false);
          if (pendingPath.current) {
            openPath(pendingPath.current);
            pendingPath.current = null;
          }
        }}
        // Android can kill the WebView's renderer process (low memory, WebView update): reload instead of a frozen screen.
        onRenderProcessGone={() => {
          pageReady.current = false;
          setLoading(true);
          webRef.current?.reload();
        }}
        onContentProcessDidTerminate={() => webRef.current?.reload()}
        onError={(e: { nativeEvent: { description?: string } }) => {
          setLoading(false);
          setFailed(e.nativeEvent.description || 'Unable to load ANANTA TRADERS.');
        }}
      />

      {loading && !failed && (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator size="large" color={GOLD} />
          <Text style={styles.brand}>ANANTA TRADERS</Text>
        </View>
      )}

      {failed && (
        <View style={styles.overlay}>
          <Text style={styles.brand}>ANANTA TRADERS</Text>
          <Text style={styles.title}>Can't connect</Text>
          <Text style={styles.message}>
            Please check your internet connection and try again.
          </Text>
          <Text style={styles.detail}>{failed}</Text>
          <Pressable style={styles.button} onPress={retry}>
            <Text style={styles.buttonText}>Try Again</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function ConfigError(): React.JSX.Element {
  return (
    <View style={[styles.root, styles.center]}>
      <StatusBar barStyle="light-content" />
      <Text style={styles.brand}>ANANTA TRADERS</Text>
      <Text style={styles.title}>App not configured</Text>
      <Text style={styles.message}>
        WEB_APP_URL is not set. Add the deployed web app URL to mobile-app/.env and rebuild.
      </Text>
    </View>
  );
}

export default function App(): React.JSX.Element {
  return <SafeAreaProvider>{isConfigured() ? <Shell /> : <ConfigError />}</SafeAreaProvider>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BACKGROUND },
  web: { flex: 1, backgroundColor: BACKGROUND },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  brand: { color: GOLD, fontSize: 16, fontWeight: '800', letterSpacing: 2, marginTop: 16 },
  title: { color: '#f8fafc', fontSize: 20, fontWeight: '700', marginTop: 20 },
  message: { color: '#94a3b8', fontSize: 14, textAlign: 'center', marginTop: 8 },
  detail: { color: '#64748b', fontSize: 11, textAlign: 'center', marginTop: 6 },
  button: { backgroundColor: GOLD, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12, marginTop: 24 },
  buttonText: { color: '#0b0f19', fontWeight: '800', fontSize: 14 },
});
