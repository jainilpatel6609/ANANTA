const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ananta_traders',
  JWT_SECRET: process.env.JWT_SECRET || 'ananta_traders_super_secret_key_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_key',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_mock_secret',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || '',
  WHATSAPP_API_KEY: process.env.WHATSAPP_API_KEY || '',
  
  // Real-Time SMS Gateway Configuration
  SMS_PROVIDER: process.env.SMS_PROVIDER || 'FAST2SMS',
  SMS_API_KEY: process.env.SMS_API_KEY || process.env.FAST2SMS_API_KEY || '',
  FAST2SMS_API_KEY: process.env.FAST2SMS_API_KEY || process.env.SMS_API_KEY || '',
  TWOFACTOR_API_KEY: process.env.TWOFACTOR_API_KEY || '',
  MSG91_AUTH_KEY: process.env.MSG91_AUTH_KEY || '',
  MSG91_TEMPLATE_ID: process.env.MSG91_TEMPLATE_ID || '',
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || '',
  SMS_SENDER_ID: process.env.SMS_SENDER_ID || 'ANANTA',
  SMS_GATEWAY_URL: process.env.SMS_GATEWAY_URL || '',

  // Firebase Cloud Messaging (FCM) & Web Push
  FCM_SERVER_KEY: process.env.FCM_SERVER_KEY || '',
  FCM_PROJECT_ID: process.env.FCM_PROJECT_ID || 'ananta-traders',
  FCM_SERVICE_ACCOUNT_KEY: process.env.FCM_SERVICE_ACCOUNT_KEY || '',
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || '',
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || '',

  SUPER_ADMIN_SECRET_KEY: process.env.SUPER_ADMIN_SECRET_KEY || 'ANANTA'
};
