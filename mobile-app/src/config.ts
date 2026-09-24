import { WEB_APP_URL, API_URL, DEV_WEB_APP_URL } from '@env';

const clean = (value: string | undefined): string => (value || '').trim().replace(/\/+$/, '');

// The existing ANANTA TRADERS web app (delivery-app) that runs inside the WebView.
// Release builds load the deployed frontend; debug builds may use the local dev server.
export const WEB_URL: string = __DEV__ ? clean(DEV_WEB_APP_URL) || clean(WEB_APP_URL) : clean(WEB_APP_URL);

// Existing ANANTA backend REST API (same one the web app uses).
export const BACKEND_API_URL: string = clean(API_URL);

export const WEB_ORIGIN: string = (() => {
  const match = /^(https?:\/\/[^/]+)/i.exec(WEB_URL);
  return match ? match[1].toLowerCase() : '';
})();

export const isConfigured = (): boolean => WEB_ORIGIN.length > 0;

// Resolves the API base the web app passes for native calls (it may be a relative "/api").
export const resolveApiBase = (apiBase?: string): string => {
  const candidate = clean(apiBase);
  if (/^https?:\/\//i.test(candidate)) {
    return candidate;
  }
  if (candidate.startsWith('/') && WEB_ORIGIN) {
    return `${WEB_ORIGIN}${candidate}`;
  }
  return BACKEND_API_URL || (WEB_ORIGIN ? `${WEB_ORIGIN}/api` : '');
};

// Only pages served from the ANANTA web origin may talk to the native bridge.
export const isTrustedOrigin = (url: string | undefined): boolean => {
  if (!url || !WEB_ORIGIN) {
    return false;
  }
  return url.toLowerCase().startsWith(`${WEB_ORIGIN}/`) || url.toLowerCase() === WEB_ORIGIN;
};
