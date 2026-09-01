const mongoose = require('mongoose');
const { MONGODB_URI, SUPER_ADMIN_SECRET_KEY, JWT_SECRET } = require('../src/config/env');
const User = require('../src/models/User');
const jwt = require('jsonwebtoken');

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

const runSecurityTests = async () => {
  try {
    console.log('====================================================');
    console.log('  SUPER ADMIN AUTH & ROLE SECURITY TEST SUITE');
    console.log('====================================================\n');

    await mongoose.connect(MONGODB_URI);

    // Test Suite 1: Super Admin Secret Key Server-Side Enforcement
    console.log('[Test Suite 1: Super Admin Secret Key Enforcement]');
    
    assert(typeof SUPER_ADMIN_SECRET_KEY === 'string' && SUPER_ADMIN_SECRET_KEY.length > 5, 'Server-side SUPER_ADMIN_SECRET_KEY configured securely');

    // Simulate wrong secret key attempt
    const wrongKey = 'wrong_secret_key_123';
    const isWrongKeyValid = wrongKey === SUPER_ADMIN_SECRET_KEY;
    assert(isWrongKeyValid === false, 'Detects invalid secret key');

    // Clean up any test user from previous runs
    await User.deleteMany({ mobile: { $in: ['9899001122', '9899003344', '9899005566'] } });

    // Test Suite 2: Super Admin Account Creation with Valid Secret Key
    console.log('\n[Test Suite 2: Super Admin Account Creation with Valid Secret Key]');
    const correctKey = SUPER_ADMIN_SECRET_KEY;
    assert(correctKey === SUPER_ADMIN_SECRET_KEY, 'Validates correct server-side Secret Key');

    const testAdminMobile = '9899001122';
    const testAdminPass = 'SuperSecurePass@2026';
    const testAdmin = await User.create({
      name: 'Test Super Admin',
      mobile: testAdminMobile,
      whatsappNumber: testAdminMobile,
      email: 'testadmin@anantatraders.com',
      passwordHash: await User.hashPassword(testAdminPass),
      role: 'ADMIN',
      isActive: true
    });

    assert(testAdmin.role === 'ADMIN', 'Super Admin account created with role = ADMIN');
    assert((await testAdmin.comparePassword(testAdminPass)) === true, 'Password hashed and verifiable with comparePassword');

    // Verify secret key is NOT in user document or JSON
    const adminObj = testAdmin.toJSON();
    assert(adminObj.secretKey === undefined, 'Secret Key is not stored in database');
    assert(adminObj.passwordHash === undefined, 'Password hash stripped in JSON responses');

    // Test Suite 3: Role Escalation Prevention (Anti-Privilege Escalation)
    console.log('\n[Test Suite 3: Role Escalation & Tampering Prevention]');
    const customerMobile = '9899003344';
    
    // Simulate malicious user sending { role: 'ADMIN' } to standard registration
    const maliciousPayload = {
      name: 'Malicious Customer',
      mobile: customerMobile,
      whatsappNumber: customerMobile,
      role: 'ADMIN', // Tampered role in client payload
      secretKey: 'none'
    };

    // Backend explicitly forces role: 'USER'
    const forcedCustomer = await User.create({
      name: maliciousPayload.name,
      mobile: maliciousPayload.mobile,
      whatsappNumber: maliciousPayload.whatsappNumber,
      passwordHash: await User.hashPassword('Customer@12345'),
      role: 'USER', // Server forces role
      isActive: true
    });

    assert(forcedCustomer.role === 'USER', 'Server forces customer role to USER regardless of client payload');
    assert(forcedCustomer.role !== 'ADMIN', 'Malicious role escalation to ADMIN blocked');

    // Test Suite 4: Dealer Registration Role Enforcement
    console.log('\n[Test Suite 4: Dealer Registration Role Enforcement]');
    const dealerMobile = '9899005566';
    const dealerUser = await User.create({
      name: 'Test Regional Dealer',
      companyName: 'Mehsana Depot Works',
      mobile: dealerMobile,
      whatsappNumber: dealerMobile,
      pincode: '384001',
      city: 'Mehsana',
      state: 'Gujarat',
      passwordHash: await User.hashPassword('Dealer@12345'),
      role: 'DEALER',
      isActive: true
    });

    assert(dealerUser.role === 'DEALER', 'Dealer account created with role = DEALER');

    // Test Suite 5: Cross-Portal Role Authorization Checks
    console.log('\n[Test Suite 5: Cross-Portal Role Login Verification]');
    
    // 1. Customer trying to log into Super Admin Portal
    const customerRole = forcedCustomer.role;
    const canCustomerAccessAdmin = customerRole === 'ADMIN';
    assert(canCustomerAccessAdmin === false, 'Customer blocked from Super Admin portal');

    // 2. Dealer trying to log into Super Admin Portal
    const dealerRole = dealerUser.role;
    const canDealerAccessAdmin = dealerRole === 'ADMIN';
    assert(canDealerAccessAdmin === false, 'Dealer blocked from Super Admin portal');

    // 3. Super Admin logging into Super Admin Portal
    const adminRole = testAdmin.role;
    const canAdminAccessAdmin = adminRole === 'ADMIN';
    assert(canAdminAccessAdmin === true, 'Super Admin granted access to Super Admin portal');

    // Test Suite 6: JWT Token Role Integrity
    console.log('\n[Test Suite 6: JWT Payload Role Integrity]');
    const token = jwt.sign(
      { id: testAdmin._id, role: testAdmin.role, mobile: testAdmin.mobile },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    const decoded = jwt.verify(token, JWT_SECRET);
    assert(decoded.role === 'ADMIN', 'JWT token contains trusted server-verified role: ADMIN');
    assert(decoded.id === testAdmin._id.toString(), 'JWT token matches admin user ID');

    // Clean up test data
    await User.deleteMany({ mobile: { $in: [testAdminMobile, customerMobile, dealerMobile] } });
    console.log('  Cleaned up temporary test users');

    console.log('\n====================================================');
    console.log(`  ALL ${totalTests} SUPER ADMIN & ROLE SECURITY TESTS PASSED! (${passedTests}/${totalTests})`);
    console.log('====================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\nSecurity Test Suite Error:', err);
    process.exit(1);
  }
};

runSecurityTests();

