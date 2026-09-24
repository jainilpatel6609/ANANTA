import { Linking, PermissionsAndroid, Platform } from 'react-native';
import type { PermissionName, PermissionStatus } from '../bridge/protocol';

// Permissions the user ticked "Don't ask again" for -- only Android Settings can change them now.
const blocked: Partial<Record<PermissionName, boolean>> = {};

const isAtLeastAndroid13 = (): boolean => Platform.OS === 'android' && Number(Platform.Version) >= 33;

const checkNotificationsEnabled = async (): Promise<boolean> => {
  try {
    // notifee also reflects the per-app "Notifications" switch in Android Settings (all API levels).
    const notifee = (await import('@notifee/react-native')).default;
    const settings = await notifee.getNotificationSettings();
    return settings.authorizationStatus === 1; // AuthorizationStatus.AUTHORIZED
  } catch {
    if (!isAtLeastAndroid13()) {
      return true;
    }
    return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }
};

const isGranted = async (name: PermissionName): Promise<boolean> => {
  switch (name) {
    case 'location': {
      const fine = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      const coarse = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);
      return fine || coarse;
    }
    case 'camera':
      return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
    case 'notifications':
      return checkNotificationsEnabled();
  }
};

export const getPermissionStatus = async (name: PermissionName): Promise<PermissionStatus> => {
  if (await isGranted(name)) {
    blocked[name] = false;
    return 'granted';
  }
  // Below Android 13 there is no runtime prompt for notifications: if they are off the user must use Settings.
  if (name === 'notifications' && !isAtLeastAndroid13()) {
    return 'blocked';
  }
  return blocked[name] ? 'blocked' : 'denied';
};

export const requestPermission = async (name: PermissionName): Promise<PermissionStatus> => {
  if (await isGranted(name)) {
    blocked[name] = false;
    return 'granted';
  }

  let result: string;
  switch (name) {
    case 'location': {
      const res = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ]);
      const values = Object.values(res);
      if (values.includes(PermissionsAndroid.RESULTS.GRANTED)) {
        result = PermissionsAndroid.RESULTS.GRANTED;
      } else if (values.includes(PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN)) {
        result = PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
      } else {
        result = PermissionsAndroid.RESULTS.DENIED;
      }
      break;
    }
    case 'camera':
      result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
      break;
    case 'notifications':
      if (!isAtLeastAndroid13()) {
        return getPermissionStatus('notifications');
      }
      result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      break;
  }

  if (result === PermissionsAndroid.RESULTS.GRANTED) {
    blocked[name] = false;
    return 'granted';
  }
  if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
    blocked[name] = true;
    return 'blocked';
  }
  return 'denied';
};

export const openAppSettings = (): Promise<void> => Linking.openSettings();

export const ALL_PERMISSIONS: PermissionName[] = ['location', 'camera', 'notifications'];
