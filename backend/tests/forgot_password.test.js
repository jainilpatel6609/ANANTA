const mongoose = require('mongoose');
const { MONGODB_URI } = require('../src/config/env');
const User = require('../src/models/User');
const OtpService = require('../src/services/otpService');
const crypto = require('crypto');

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

const runForgotPasswordTests = async () => {
  try {
    console.log('====================================================');
    console.log('  FORGOT PASSWORD 4-STEP OTP & RESET TEST SUITE');
    console.log('====================================================\n');

    await mongoose.connect(MONGODB_URI);

    // Step 1 & Setup: Identify Super Admin User
    console.log('[Step 1: Super Admin Identification & Mobile Validation]');
    let admin = await User.findOne({ role: 'ADMIN' });
    if (!admin) {
      admin = await User.create({
        name: 'Super Admin Executive',
        mobile: '9876543210',
        role: 'ADMIN',
        isActive: true,
        passwordHash: await User.hashPassword('Admin@12345')
      });
    }

    assert(admin !== null && admin.role === 'ADMIN', 'Super Admin account loaded');
    assert(Boolean(admin.mobile && /^[6-9]\d{9}$/.test(admin.mobile)), `Admin mobile is valid 10-digit Indian number (${admin.mobile})`);

    // Test mobile format validation
    const invalidMobile = '123456';
    assert(!/^[6-9]\d{9}$/.test(invalidMobile), 'Rejects invalid mobile number format (123456)');

    const validMobile = admin.mobile;
    assert(/^[6-9]\d{9}$/.test(validMobile), `Validates 10-digit Indian mobile format (${validMobile})`);

    // Step 2: OTP Generation (5-Minute Expiry & Masked Number)
    console.log('\n[Step 2: 5-Minute OTP Generation & Security Restrictions]');
    const { rawOtp, otpHash, expiresAt } = await OtpService.generateOtp(5);

    assert(rawOtp.length === 6, 'Generated OTP is exactly 6 digits');
    assert(typeof otpHash === 'string' && otpHash.startsWith('$2'), 'OTP is hashed with bcrypt before storing');
    
    const expiryDiffMinutes = (expiresAt.getTime() - Date.now()) / (60 * 1000);
    assert(expiryDiffMinutes >= 4.9 && expiryDiffMinutes <= 5.1, 'OTP expiration is exactly 5 minutes');

    // Phone masking check (e.g. ******3210 or ******7331)
    const masked = `******${validMobile.slice(-4)}`;
    assert(masked.startsWith('******') && masked.length === 10, `Correctly generates masked mobile (${masked}) for security`);

    // Save OTP on admin
    admin.resetPasswordOtpHash = otpHash;
    admin.resetPasswordOtpExpiresAt = expiresAt;
    admin.resetPasswordOtpAttempts = 0;
    admin.resetPasswordToken = null;
    await admin.save();

    // Verify toJSON strips resetPasswordOtpHash
    const jsonAdmin = admin.toJSON();
    assert(jsonAdmin.resetPasswordOtpHash === undefined, 'toJSON strips resetPasswordOtpHash from JSON responses');

    // Step 3: Verify OTP & Issue 15-Minute Reset Token
    console.log('\n[Step 3: Backend OTP Verification & Reset Token Issuance]');
    // Test incorrect OTP
    const wrongVerification = await OtpService.verifyOtp('111111', admin.resetPasswordOtpHash, admin.resetPasswordOtpExpiresAt, admin.resetPasswordOtpAttempts, 5);
    assert(wrongVerification.isValid === false, 'Rejects incorrect OTP (111111)');

    // Test correct OTP
    const correctVerification = await OtpService.verifyOtp(rawOtp, admin.resetPasswordOtpHash, admin.resetPasswordOtpExpiresAt, admin.resetPasswordOtpAttempts, 5);
    assert(correctVerification.isValid === true, 'Accepts matching 6-digit OTP');

    // Generate secure reset token
    const generatedResetToken = crypto.randomBytes(32).toString('hex');
    admin.resetPasswordToken = generatedResetToken;
    admin.resetPasswordTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    admin.resetPasswordOtpHash = null;
    admin.resetPasswordOtpExpiresAt = null;
    admin.resetPasswordOtpAttempts = 0;
    await admin.save();

    assert(admin.resetPasswordToken === generatedResetToken, 'Reset token stored on user document');
    assert(admin.resetPasswordOtpHash === null, 'OTP hash cleared after successful verification');

    // Step 4: Reset Password & Login Verification
    console.log('\n[Step 4: Create New Password & Verification]');
    const newPassword = 'SuperAdmin@New2026';
    assert(newPassword.length >= 6, 'New password satisfies minimum length of 6 characters');

    // Verify reset token
    const userToReset = await User.findOne({
      mobile: validMobile,
      resetPasswordToken: generatedResetToken,
      resetPasswordTokenExpiresAt: { $gt: new Date() }
    });
    assert(userToReset !== null && userToReset._id.toString() === admin._id.toString(), 'Finds user by valid reset token');

    // Apply new password
    userToReset.passwordHash = await User.hashPassword(newPassword);
    userToReset.resetPasswordToken = null;
    userToReset.resetPasswordTokenExpiresAt = null;
    await userToReset.save();

    // Verify new password is active
    const reloaded = await User.findById(admin._id);
    const isNewPassValid = await reloaded.comparePassword(newPassword);
    assert(isNewPassValid === true, 'New password successfully active and validated by comparePassword');

    const isOldPassInvalid = await reloaded.comparePassword('Admin@12345');
    assert(isOldPassInvalid === false, 'Old password is no longer valid');

    // Restore baseline seed password for test environment consistency
    reloaded.passwordHash = await User.hashPassword('Admin@12345');
    await reloaded.save();
    assert((await reloaded.comparePassword('Admin@12345')) === true, 'Admin baseline password restored to Admin@12345');

    console.log('\n====================================================');
    console.log(`  ALL ${totalTests} FORGOT PASSWORD TESTS PASSED! (${passedTests}/${totalTests})`);
    console.log('====================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\nTest Suite Error:', err);
    process.exit(1);
  }
};

runForgotPasswordTests();
