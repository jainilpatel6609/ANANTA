const SmsService = require('../src/services/smsService');
const OtpService = require('../src/services/otpService');

let passedTests = 0;
let totalTests = 0;

const assert = (condition, testName) => {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    throw new Error(`Assertion failed for: ${testName}`);
  }
};

const runSmsOtpTests = async () => {
  try {
    console.log('====================================================');
    console.log('  REAL-TIME SMS OTP DISPATCH & VERIFICATION TEST SUITE');
    console.log('====================================================\n');

    // Test Suite 1: SMS Provider Detection & Strategy Resolution
    console.log('[Test Suite 1: SMS Provider Strategy Resolution]');
    const activeProvider = SmsService.getActiveProvider();
    assert(typeof activeProvider === 'string', `Identified active SMS strategy: [${activeProvider}]`);
    assert(['FAST2SMS', 'TWOFACTOR', 'MSG91', 'TWILIO', 'CUSTOM', 'SIMULATED'].includes(activeProvider), 'Active provider is a supported telecom gateway');

    // Test Suite 2: 6-Digit Cryptographic OTP Generation
    console.log('\n[Test Suite 2: Cryptographic OTP Generation & Expiry Duration]');
    const { rawOtp, otpHash, expiresAt } = await OtpService.generateOtp(5);
    assert(rawOtp.length === 6, 'Generated OTP is exactly 6 numeric digits');
    assert(/^\d{6}$/.test(rawOtp), `OTP (${rawOtp}) is strictly numeric`);
    assert(typeof otpHash === 'string' && otpHash.startsWith('$2'), 'OTP is hashed with bcrypt before storing');
    
    const expiryMinutes = (expiresAt.getTime() - Date.now()) / (60 * 1000);
    assert(expiryMinutes >= 4.9 && expiryMinutes <= 5.1, 'OTP expiration is 5 minutes');

    // Test Suite 3: Forgot Password Real-Time SMS Dispatch
    console.log('\n[Test Suite 3: Forgot Password Real SMS Dispatch]');
    const testMobile = '9327807331';
    const forgotSmsResult = await SmsService.sendOtpSms({
      mobile: testMobile,
      otp: rawOtp,
      expiryMinutes: 5,
      type: 'FORGOT_PASSWORD'
    });

    assert(forgotSmsResult.success === true, 'Forgot Password SMS dispatched successfully');
    assert(forgotSmsResult.mobile === testMobile, `Target mobile matches ${testMobile}`);

    // Test Suite 4: Mobile Change SMS OTP Dispatch
    console.log('\n[Test Suite 4: Mobile Change Real SMS Dispatch]');
    const newMobile = '9825123456';
    const mobileChangeResult = await SmsService.sendOtpSms({
      mobile: newMobile,
      otp: rawOtp,
      expiryMinutes: 10,
      type: 'MOBILE_UPDATE'
    });

    assert(mobileChangeResult.success === true, 'Mobile change SMS OTP dispatched successfully');
    assert(mobileChangeResult.mobile === newMobile, `Target mobile matches ${newMobile}`);

    // Test Suite 5: Delivery Unloading OTP SMS Dispatch
    console.log('\n[Test Suite 5: Order Delivery Unloading OTP SMS Dispatch]');
    const deliverySmsResult = await SmsService.sendDeliveryOtpSms({
      mobile: testMobile,
      otp: rawOtp,
      orderNumber: 'AT-2026-000101',
      driverName: 'Ramesh Patel',
      vehicleNumber: 'GJ-01-AB-1234'
    });

    assert(deliverySmsResult.success === true, 'Delivery OTP SMS dispatched to customer phone');
    assert(deliverySmsResult.mobile === testMobile, `Customer target mobile matches ${testMobile}`);

    // Test Suite 6: OTP Verification Against Bcrypt Hash
    console.log('\n[Test Suite 6: Server-Side OTP Verification]');
    // Wrong OTP
    const wrongVerification = await OtpService.verifyOtp('000000', otpHash, expiresAt, 0, 5);
    assert(wrongVerification.isValid === false, 'Rejects incorrect OTP (000000)');

    // Correct OTP
    const correctVerification = await OtpService.verifyOtp(rawOtp, otpHash, expiresAt, 1, 5);
    assert(correctVerification.isValid === true, 'Accepts matching 6-digit OTP received on mobile');

    console.log('\n====================================================');
    console.log(`  ALL ${totalTests} REAL SMS OTP TESTS PASSED! (${passedTests}/${totalTests})`);
    console.log('====================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('\nSMS OTP Test Suite Error:', err);
    process.exit(1);
  }
};

runSmsOtpTests();

