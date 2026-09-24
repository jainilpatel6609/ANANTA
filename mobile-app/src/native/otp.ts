import { NativeModules } from 'react-native';
import { NativeBridgeError } from '../bridge/protocol';

// Android SMS User Consent API (see android/.../SmsConsentModule.kt).
//
// When the OTP SMS arrives Android shows a system dialog asking the user to allow this app to read that ONE
// message; if allowed, the code is returned here. It needs no READ_SMS / RECEIVE_SMS permission (Google Play
// restricts those) and works with the existing SMS text -- no hash has to be added to the backend SMS.
// If the user declines, times out (5 min) or Play services are missing, the web app's normal manual OTP input
// keeps working.

interface SmsConsentNative {
  start(): Promise<string>;
  stop(): void;
}

const SmsConsent: SmsConsentNative | undefined = NativeModules.SmsConsent;

export const extractOtp = (message: string): string | null => {
  const six = /(?:^|\D)(\d{6})(?:\D|$)/.exec(message);
  if (six) {
    return six[1];
  }
  const other = /(?:^|\D)(\d{4,8})(?:\D|$)/.exec(message);
  return other ? other[1] : null;
};

export const listenForOtp = async (): Promise<{ otp: string; message: string }> => {
  if (!SmsConsent) {
    throw new NativeBridgeError('OTP_UNAVAILABLE', 'Automatic OTP reading is not available on this device.');
  }
  let message: string;
  try {
    message = await SmsConsent.start();
  } catch (err: any) {
    switch (err?.code) {
      case 'TIMEOUT':
        throw new NativeBridgeError('OTP_TIMEOUT', 'No OTP SMS arrived in time. Please enter the OTP manually.');
      case 'DENIED':
        throw new NativeBridgeError('OTP_DENIED', 'OTP reading was declined. Please enter the OTP manually.');
      case 'CANCELLED':
        throw new NativeBridgeError('OTP_DENIED', 'OTP listening was cancelled.');
      default:
        throw new NativeBridgeError('OTP_UNAVAILABLE', err?.message || 'Automatic OTP reading is not available.');
    }
  }
  const otp = extractOtp(message);
  if (!otp) {
    throw new NativeBridgeError('OTP_UNAVAILABLE', 'The SMS did not contain an OTP. Please enter it manually.');
  }
  return { otp, message };
};

export const cancelOtpListener = (): void => {
  try {
    SmsConsent?.stop();
  } catch {
    /* nothing to cancel */
  }
};
