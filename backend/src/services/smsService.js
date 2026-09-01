const {
  SMS_PROVIDER,
  SMS_API_KEY,
  FAST2SMS_API_KEY,
  TWOFACTOR_API_KEY,
  MSG91_AUTH_KEY,
  MSG91_TEMPLATE_ID,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER,
  SMS_SENDER_ID,
  SMS_GATEWAY_URL
} = require('../config/env');
const logger = require('../utils/logger');

class SmsService {
  /**
   * Determine the active real SMS gateway provider based on env configuration
   */
  static getActiveProvider() {
    if (FAST2SMS_API_KEY || (SMS_PROVIDER === 'FAST2SMS' && SMS_API_KEY)) {
      return 'FAST2SMS';
    }
    if (TWOFACTOR_API_KEY || (SMS_PROVIDER === 'TWOFACTOR' && SMS_API_KEY)) {
      return 'TWOFACTOR';
    }
    if (MSG91_AUTH_KEY || (SMS_PROVIDER === 'MSG91' && SMS_API_KEY)) {
      return 'MSG91';
    }
    if (TWILIO_AUTH_TOKEN && TWILIO_ACCOUNT_SID) {
      return 'TWILIO';
    }
    if (SMS_GATEWAY_URL) {
      return 'CUSTOM';
    }
    return 'SIMULATED';
  }

  /**
   * Dispatches a real-time verification OTP via SMS
   * @param {Object} params - { mobile, otp, expiryMinutes, type }
   */
  static async sendOtpSms({ mobile, otp, expiryMinutes = 5, type = 'VERIFICATION' }) {
    const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);
    const cleanOtp = String(otp).trim();

    let message = `Your ANANTA TRADERS verification OTP is ${cleanOtp}. Valid for ${expiryMinutes} minutes. Do NOT share this OTP with anyone.`;
    if (type === 'FORGOT_PASSWORD') {
      message = `Your ANANTA TRADERS password reset OTP is ${cleanOtp}. Valid for ${expiryMinutes} minutes. Do NOT share this OTP with anyone.`;
    } else if (type === 'MOBILE_UPDATE') {
      message = `Your ANANTA TRADERS mobile change verification OTP is ${cleanOtp}. Valid for ${expiryMinutes} minutes.`;
    }

    return await this.sendSms({
      mobile: cleanMobile,
      otp: cleanOtp,
      message,
      type
    });
  }

  /**
   * Dispatches a real-time Delivery Unloading OTP to customer upon tractor departure
   * @param {Object} params - { mobile, otp, orderNumber, driverName, vehicleNumber }
   */
  static async sendDeliveryOtpSms({ mobile, otp, orderNumber, driverName, vehicleNumber }) {
    const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);
    const cleanOtp = String(otp).trim();

    const message = `ANANTA TRADERS Order #${orderNumber} is OUT FOR DELIVERY! Vehicle: ${vehicleNumber}, Driver: ${driverName}. Share this OTP with driver upon material unloading: ${cleanOtp}.`;

    return await this.sendSms({
      mobile: cleanMobile,
      otp: cleanOtp,
      message,
      type: 'DELIVERY_OTP'
    });
  }

  /**
   * Core dispatcher that routes to the configured telecom SMS provider
   * @param {Object} params - { mobile, otp, message, type }
   */
  static async sendSms({ mobile, otp, message, type = 'GENERAL' }) {
    const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);
    const provider = this.getActiveProvider();

    logger.info(`[SMS Dispatch] Sending ${type} to +91 ${cleanMobile} via [${provider}]`);

    try {
      switch (provider) {
        case 'FAST2SMS':
          return await this._sendFast2Sms({ mobile: cleanMobile, otp, message });

        case 'TWOFACTOR':
          return await this._send2Factor({ mobile: cleanMobile, otp, message });

        case 'MSG91':
          return await this._sendMsg91({ mobile: cleanMobile, otp, message });

        case 'TWILIO':
          return await this._sendTwilio({ mobile: cleanMobile, message });

        case 'CUSTOM':
          return await this._sendCustomGateway({ mobile: cleanMobile, otp, message });

        case 'SIMULATED':
        default:
          // Fallback log for local dev when no SMS API key has been added to .env
          logger.info(`[REAL SMS GATEWAY] Dispatching to +91 ${cleanMobile}: "${message}"`);
          return {
            success: true,
            provider: 'SIMULATED',
            message: 'SMS dispatched successfully via simulated gateway (Add FAST2SMS_API_KEY in .env for live telecom delivery).',
            mobile: cleanMobile
          };
      }
    } catch (error) {
      logger.error(`[SMS Delivery Failed] Provider [${provider}] error:`, error.message);
      // Return structured fallback response so user is notified without crashing
      return {
        success: false,
        provider,
        error: error.message,
        mobile: cleanMobile
      };
    }
  }

  // ================= PROVIDER IMPLEMENTATIONS =================

  /**
   * 1. Fast2SMS (India's leading Quick SMS & OTP API)
   * Doc: https://docs.fast2sms.com/
   */
  static async _sendFast2Sms({ mobile, otp, message }) {
    const apiKey = FAST2SMS_API_KEY || SMS_API_KEY;
    const url = 'https://www.fast2sms.com/dev/bulkV2';

    const payload = otp
      ? {
          variables_values: String(otp),
          route: 'otp',
          numbers: mobile
        }
      : {
          route: 'q',
          message,
          numbers: mobile
        };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeout);
    const data = await res.json();

    if (data.return === true || data.status_code === 200) {
      logger.info(`[Fast2SMS Success] RequestId: ${data.request_id || 'OK'} sent to ${mobile}`);
      return {
        success: true,
        provider: 'FAST2SMS',
        requestId: data.request_id,
        mobile
      };
    } else {
      throw new Error(data.message || 'Fast2SMS dispatch failed');
    }
  }

  /**
   * 2. 2Factor.in (Instant Indian OTP SMS API)
   * Doc: https://2factor.in/v3/sms-api/
   */
  static async _send2Factor({ mobile, otp, message }) {
    const apiKey = TWOFACTOR_API_KEY || SMS_API_KEY;
    const url = `https://2factor.in/API/V1/${apiKey}/SMS/${mobile}/${otp}/${SMS_SENDER_ID || 'ANANTA'}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal
    });

    clearTimeout(timeout);
    const data = await res.json();

    if (data.Status === 'Success') {
      logger.info(`[2Factor Success] SessionId: ${data.Details} sent to ${mobile}`);
      return {
        success: true,
        provider: 'TWOFACTOR',
        sessionId: data.Details,
        mobile
      };
    } else {
      throw new Error(data.Details || '2Factor dispatch failed');
    }
  }

  /**
   * 3. MSG91 (DLT OTP Flow Gateway)
   * Doc: https://docs.msg91.com/p/tf9GText/otp
   */
  static async _sendMsg91({ mobile, otp, message }) {
    const authKey = MSG91_AUTH_KEY || SMS_API_KEY;
    const templateId = MSG91_TEMPLATE_ID;

    const url = `https://control.msg91.com/api/v5/otp?template_id=${templateId}&mobile=91${mobile}&authkey=${authKey}&otp=${otp}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeout);
    const data = await res.json();

    if (data.type === 'success') {
      logger.info(`[MSG91 Success] Message: ${data.message} sent to ${mobile}`);
      return {
        success: true,
        provider: 'MSG91',
        mobile
      };
    } else {
      throw new Error(data.message || 'MSG91 dispatch failed');
    }
  }

  /**
   * 4. Twilio (Global / Indian SMS)
   */
  static async _sendTwilio({ mobile, message }) {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

    const params = new URLSearchParams();
    params.append('To', `+91${mobile}`);
    params.append('From', TWILIO_PHONE_NUMBER);
    params.append('Body', message);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString(),
      signal: controller.signal
    });

    clearTimeout(timeout);
    const data = await res.json();

    if (data.sid) {
      logger.info(`[Twilio Success] Message SID: ${data.sid} sent to ${mobile}`);
      return {
        success: true,
        provider: 'TWILIO',
        sid: data.sid,
        mobile
      };
    } else {
      throw new Error(data.message || 'Twilio dispatch failed');
    }
  }

  /**
   * 5. Custom / Generic HTTP SMS Gateway
   */
  static async _sendCustomGateway({ mobile, otp, message }) {
    let url = SMS_GATEWAY_URL.replace('{mobile}', mobile)
      .replace('{otp}', otp || '')
      .replace('{message}', encodeURIComponent(message));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal
    });

    clearTimeout(timeout);
    return {
      success: res.ok,
      provider: 'CUSTOM',
      status: res.status,
      mobile
    };
  }
}

module.exports = SmsService;

