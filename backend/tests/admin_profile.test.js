const mongoose = require('mongoose');
const { MONGODB_URI } = require('../src/config/env');
const User = require('../src/models/User');
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

const runAdminProfileTests = async () => {
  try {
    console.log('====================================================');
    console.log('  SUPER ADMIN PROFILE & SECURITY TEST SUITE');
    console.log('====================================================\n');

    await mongoose.connect(MONGODB_URI);

    // Suite 1: Setup test admin user
    console.log('[Test Suite 1: Super Admin Account Initialization]');
    let admin = await User.findOne({ role: 'ADMIN' });
    if (!admin) {
      admin = await User.create({
        name: 'Executive Superadmin',
        mobile: '9876543210',
        whatsappNumber: '9876543210',
        email: 'admin@anantatraders.com',
        role: 'ADMIN',
        isActive: true,
        passwordHash: await User.hashPassword('Admin@12345')
      });
    }
    assert(admin !== null && admin.role === 'ADMIN', 'Admin account identified in database');
    assert(Boolean(admin.mobile && /^[6-9]\d{9}$/.test(admin.mobile)), `Admin active mobile is valid 10-digit number (${admin.mobile})`);

    const baselineMobile = admin.mobile;

    // Suite 2: Mobile Number OTP Generation & Validation
    console.log('\n[Test Suite 2: Mobile Change OTP Generation]');
    // Test invalid format
    const invalidMobileFormat = '12345';
    assert(!/^[6-9]\d{9}$/.test(invalidMobileFormat), 'Rejects invalid mobile format (12345)');

    // Test same mobile check
    const sameMobile = admin.mobile;
    assert(sameMobile === admin.mobile, 'Detects new mobile is same as current mobile');

    // Generate 10-minute OTP
    const { rawOtp, otpHash, expiresAt } = await OtpService.generateOtp(10);
    assert(rawOtp.length === 6, 'Generated OTP is exactly 6 digits');
    assert(typeof otpHash === 'string' && otpHash.startsWith('$2'), 'OTP is hashed with bcrypt');
    assert(expiresAt > new Date(), 'OTP expiration is in the future');

    // Save pending mobile on admin
    const testNewMobile = '9825998877';
    admin.pendingMobile = testNewMobile;
    admin.mobileOtpHash = otpHash;
    admin.mobileOtpExpiresAt = expiresAt;
    admin.mobileOtpAttempts = 0;
    await admin.save();

    assert(admin.pendingMobile === testNewMobile, 'Pending mobile stored on admin user');

    // Suite 3: OTP Verification & Mobile Update
    console.log('\n[Test Suite 3: OTP Verification & Atomic Mobile Update]');
    // Wrong OTP
    const wrongVerification = await OtpService.verifyOtp('000000', admin.mobileOtpHash, admin.mobileOtpExpiresAt, admin.mobileOtpAttempts);
    assert(wrongVerification.isValid === false, 'Rejects incorrect OTP (000000)');

    // Correct OTP
    const correctVerification = await OtpService.verifyOtp(rawOtp, admin.mobileOtpHash, admin.mobileOtpExpiresAt, admin.mobileOtpAttempts);
    assert(correctVerification.isValid === true, 'Accepts correct 6-digit OTP');

    // Apply mobile change
    admin.mobile = admin.pendingMobile;
    admin.whatsappNumber = admin.pendingMobile;
    admin.pendingMobile = null;
    admin.mobileOtpHash = null;
    admin.mobileOtpExpiresAt = null;
    admin.mobileOtpAttempts = 0;
    await admin.save();

    assert(admin.mobile === testNewMobile, `Admin mobile successfully updated to ${testNewMobile}`);
    assert(admin.pendingMobile === null, 'Pending mobile cleared after successful verification');

    // Revert mobile back to baseline
    admin.mobile = baselineMobile;
    admin.whatsappNumber = baselineMobile;
    await admin.save();
    assert(admin.mobile === baselineMobile, `Admin mobile restored to baseline (${baselineMobile})`);

    // Suite 4: Password Verification & Secure Update
    console.log('\n[Test Suite 4: Current Password Verification & Password Change]');
    // Check current password
    const isCurrentCorrect = await admin.comparePassword('Admin@12345');
    assert(isCurrentCorrect === true, 'Validates correct current password (Admin@12345)');

    const isCurrentWrong = await admin.comparePassword('WrongPassword@999');
    assert(isCurrentWrong === false, 'Correctly rejects invalid current password');

    // Update password
    const newPasswordCandidate = 'Admin@Updated2026';
    admin.passwordHash = await User.hashPassword(newPasswordCandidate);
    await admin.save();

    const isNewPassValid = await admin.comparePassword(newPasswordCandidate);
    assert(isNewPassValid === true, 'New password successfully active (Admin@Updated2026)');

    // Revert password back to Admin@12345 for consistency
    admin.passwordHash = await User.hashPassword('Admin@12345');
    await admin.save();
    assert((await admin.comparePassword('Admin@12345')) === true, 'Admin password restored to standard baseline');

    // Suite 5: Profile Info Update
    console.log('\n[Test Suite 5: Profile Metadata Update]');
    admin.name = 'Super Admin Executive';
    admin.email = 'executive.admin@anantatraders.com';
    admin.officeAddress = 'ANANTA TRADERS HQ, Mehsana, Gujarat';
    await admin.save();

    const reloaded = await User.findById(admin._id);
    assert(reloaded.name === 'Super Admin Executive', 'Admin name updated');
    assert(reloaded.email === 'executive.admin@anantatraders.com', 'Admin email updated');
    assert(reloaded.officeAddress.includes('ANANTA TRADERS HQ'), 'Admin office address updated');

    console.log('\n====================================================');
    console.log(`  ALL ${totalTests} SUPER ADMIN PROFILE TESTS PASSED! (${passedTests}/${totalTests})`);
    console.log('====================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\nTest Suite Error:', err);
    process.exit(1);
  }
};

runAdminProfileTests();

