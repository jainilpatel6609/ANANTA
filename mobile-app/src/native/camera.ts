import { launchCamera } from 'react-native-image-picker';
import { NativeBridgeError } from '../bridge/protocol';
import { requestPermission } from './permissions';

export interface CapturedPhoto {
  base64: string;
  mimeType: string;
  fileName: string;
  width?: number;
  height?: number;
  fileSize?: number;
}

// Camera-ONLY capture: launchCamera opens the device camera and never offers the gallery, matching the
// existing ANANTA "live camera required (no gallery pick)" rule for all Driver / KYC photos.
export const capturePhoto = async (facing: 'user' | 'environment' = 'environment'): Promise<CapturedPhoto> => {
  const status = await requestPermission('camera');
  if (status !== 'granted') {
    throw new NativeBridgeError(
      status === 'blocked' ? 'PERMISSION_BLOCKED' : 'PERMISSION_DENIED',
      status === 'blocked'
        ? 'Camera permission is blocked. Please enable it from Android Settings.'
        : 'Camera permission was denied.',
      { permission: 'camera', status },
    );
  }

  const result = await launchCamera({
    mediaType: 'photo',
    cameraType: facing === 'user' ? 'front' : 'back',
    includeBase64: true,
    quality: 0.8,
    maxWidth: 1920,
    maxHeight: 1920,
    saveToPhotos: false,
  });

  if (result.didCancel) {
    throw new NativeBridgeError('CAMERA_CANCELLED', 'Camera was closed without taking a photo.');
  }
  if (result.errorCode) {
    if (result.errorCode === 'permission') {
      throw new NativeBridgeError('PERMISSION_DENIED', 'Camera permission was denied.');
    }
    throw new NativeBridgeError('CAMERA_UNAVAILABLE', result.errorMessage || 'Unable to open the camera.');
  }

  const asset = result.assets && result.assets[0];
  if (!asset || !asset.base64) {
    throw new NativeBridgeError('CAMERA_UNAVAILABLE', 'The camera did not return a photo.');
  }

  return {
    base64: asset.base64,
    mimeType: asset.type || 'image/jpeg',
    fileName: asset.fileName || `live_capture_${Date.now()}.jpg`,
    width: asset.width,
    height: asset.height,
    fileSize: asset.fileSize,
  };
};
