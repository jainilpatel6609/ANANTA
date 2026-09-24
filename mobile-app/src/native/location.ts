import Geolocation, { GeolocationError, GeolocationResponse } from '@react-native-community/geolocation';
import { NativeBridgeError } from '../bridge/protocol';
import { requestPermission } from './permissions';

// Permission prompts are handled by ./permissions (so "blocked" can be reported); the library must not prompt itself.
Geolocation.setRNConfiguration({
  skipPermissionRequests: true,
  authorizationLevel: 'whenInUse',
  locationProvider: 'auto', // Google Play services (Fused) when available, Android LocationManager otherwise
});

export interface LocationFix {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export const toFix = (pos: GeolocationResponse): LocationFix => ({
  latitude: pos.coords.latitude,
  longitude: pos.coords.longitude,
  accuracy: pos.coords.accuracy,
  altitude: pos.coords.altitude ?? null,
  heading: pos.coords.heading ?? null,
  speed: pos.coords.speed ?? null,
  timestamp: pos.timestamp,
});

export const toLocationError = (err: GeolocationError): NativeBridgeError => {
  const message = err.message || 'Unable to read the device location.';
  if (err.code === 1) {
    return new NativeBridgeError('PERMISSION_DENIED', 'Location permission was denied.');
  }
  if (err.code === 3) {
    return new NativeBridgeError('LOCATION_TIMEOUT', 'Timed out while getting your GPS location.');
  }
  if (/provider|services?|disabled|settings/i.test(message)) {
    return new NativeBridgeError('LOCATION_SERVICES_OFF', 'Location services are turned off. Please turn on GPS.');
  }
  return new NativeBridgeError('LOCATION_UNAVAILABLE', message);
};

// Requests the runtime location permission and throws a bridge error (with the reason) if it is not granted.
export const ensureLocationPermission = async (): Promise<void> => {
  const status = await requestPermission('location');
  if (status === 'granted') {
    return;
  }
  throw new NativeBridgeError(
    status === 'blocked' ? 'PERMISSION_BLOCKED' : 'PERMISSION_DENIED',
    status === 'blocked'
      ? 'Location permission is blocked. Please enable it from Android Settings.'
      : 'Location permission was denied.',
    { permission: 'location', status },
  );
};

export interface LocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export const getCurrentLocation = async (options: LocationOptions = {}): Promise<LocationFix> => {
  await ensureLocationPermission();
  return new Promise<LocationFix>((resolve, reject) => {
    Geolocation.getCurrentPosition(
      pos => resolve(toFix(pos)),
      err => reject(toLocationError(err)),
      {
        enableHighAccuracy: options.enableHighAccuracy !== false,
        timeout: options.timeout && options.timeout > 0 ? options.timeout : 20000,
        maximumAge: options.maximumAge ?? 0,
      },
    );
  });
};

// Web-page watchers (navigator.geolocation.watchPosition), keyed by the id the page chose.
const watchers = new Map<string, number>();

export const startWatch = async (
  watchId: string,
  options: LocationOptions,
  onFix: (fix: LocationFix) => void,
  onError: (err: NativeBridgeError) => void,
): Promise<void> => {
  await ensureLocationPermission();
  stopWatch(watchId);
  const nativeId = Geolocation.watchPosition(
    pos => onFix(toFix(pos)),
    err => onError(toLocationError(err)),
    {
      enableHighAccuracy: options.enableHighAccuracy !== false,
      timeout: options.timeout && options.timeout > 0 ? options.timeout : 20000,
      maximumAge: options.maximumAge ?? 0,
      distanceFilter: 0,
    },
  );
  watchers.set(watchId, nativeId);
};

export const stopWatch = (watchId: string): void => {
  const nativeId = watchers.get(watchId);
  if (nativeId !== undefined) {
    Geolocation.clearWatch(nativeId);
    watchers.delete(watchId);
  }
};

export const stopAllWatches = (): void => {
  Array.from(watchers.keys()).forEach(stopWatch);
};
