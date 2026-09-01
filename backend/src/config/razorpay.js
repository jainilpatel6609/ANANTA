const Razorpay = require('razorpay');
const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = require('./env');

let razorpayInstance = null;

try {
  if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
    razorpayInstance = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET
    });
    console.log('[ANANTA TRADERS] Razorpay SDK initialized.');
  }
} catch (err) {
  console.warn('[ANANTA TRADERS] Razorpay initialization warning:', err.message);
}

module.exports = razorpayInstance;
