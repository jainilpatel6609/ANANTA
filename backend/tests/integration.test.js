const mongoose = require('mongoose');
const { MONGODB_URI, JWT_SECRET } = require('../src/config/env');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Order = require('../src/models/Order');
const OtpService = require('../src/services/otpService');
const { generateOrderNumber } = require('../src/utils/orderNumber');

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

const runTests = async () => {
  try {
    console.log('----------------------------------------------------');
    console.log('  RUNNING ANANTA TRADERS BACKEND INTEGRATION TESTS');
    console.log('----------------------------------------------------');

    await mongoose.connect(MONGODB_URI);

    // 1. Test Password Hashing & Verification
    console.log('\n[Test Suite 1: Authentication & User Models]');
    const rawPass = 'SecretSecure@123';
    const hash = await User.hashPassword(rawPass);
    assert(hash && hash !== rawPass, 'Password hashing generates valid bcrypt hash');

    const testUser = new User({
      name: 'Test Contractor',
      mobile: '9999988888',
      whatsappNumber: '9999988888',
      userType: 'Contractor',
      passwordHash: hash,
      role: 'USER'
    });
    const isMatch = await testUser.comparePassword(rawPass);
    assert(isMatch === true, 'User model successfully validates correct password');
    const isWrongMatch = await testUser.comparePassword('WrongPassword');
    assert(isWrongMatch === false, 'User model rejects incorrect password');

    // 2. Test Order Number Sequential Generation
    console.log('\n[Test Suite 2: Sequential Order Number Generation]');
    const num1 = await generateOrderNumber();
    const num2 = await generateOrderNumber();
    assert(num1.startsWith('AT-2026-'), 'Order number matches format AT-2026-XXXXXX');
    assert(num1 !== num2, 'Sequential order numbers are distinct and incrementing');

    // 3. Test Pricing Snapshot Immutability & Tractor Calculations
    console.log('\n[Test Suite 3: Tractor Calculations & Pricing Snapshot Immutability]');
    const sandProduct = await Product.findOne({ category: 'Sand' });
    const aggProduct = await Product.findOne({ category: 'Aggregate' });
    const gritProduct = await Product.findOne({ category: 'Grit' });

    assert(sandProduct && sandProduct.priceSinglePatiya === 2350, 'Sand Single Patiya baseline is ₹2,350');
    assert(sandProduct && sandProduct.priceDoublePatiya === 4500, 'Sand Double Patiya baseline is ₹4,500');
    assert(aggProduct && aggProduct.priceSinglePatiya === 2800, 'Aggregate Single Patiya baseline is ₹2,800');
    assert(gritProduct && gritProduct.priceSinglePatiya === 1100, 'Grit Single Patiya baseline is ₹1,100');

    // Test tractor calculation: Sand + Single Patiya × 3 Tractors = ₹7,050
    const sandSinglePrice = sandProduct.priceSinglePatiya;
    const sandTractorsCount = 3;
    const sandExpectedTotal = sandSinglePrice * sandTractorsCount;
    assert(sandExpectedTotal === 7050, 'Sand + Single Patiya: 2,350 × 3 = 7,050');

    // Test tractor calculation: Sand + Double Patiya × 2 Tractors = ₹9,000
    const sandDoublePrice = sandProduct.priceDoublePatiya;
    const sandDoubleCount = 2;
    const sandDoubleExpectedTotal = sandDoublePrice * sandDoubleCount;
    assert(sandDoubleExpectedTotal === 9000, 'Sand + Double Patiya: 4,500 × 2 = 9,000');

    // Test tractor calculation: Aggregate + Single Patiya × 3 Tractors = ₹8,400
    const aggSinglePrice = aggProduct.priceSinglePatiya;
    const aggCount = 3;
    const aggExpectedTotal = aggSinglePrice * aggCount;
    assert(aggExpectedTotal === 8400, 'Aggregate + Single Patiya: 2,800 × 3 = 8,400');

    // Create historical order
    const orderNumber = await generateOrderNumber();
    const order = await Order.create({
      orderNumber,
      userId: testUser._id,
      productId: sandProduct._id,
      productNameSnapshot: sandProduct.name,
      category: sandProduct.category,
      sandLocation: 'Patan',
      transportType: 'Tractor',
      tractorType: 'Single Patiya',
      numberOfTractors: 3,
      pricePerTractorSnapshot: sandSinglePrice,
      vehicleType: 'Single Patiya',
      vehicleCapacity: 3,
      quantity: 3,
      pricePerTonSnapshot: sandSinglePrice,
      subtotal: sandExpectedTotal,
      deliveryCharge: 0,
      tax: 0,
      totalAmount: sandExpectedTotal,
      shippingAddress: 'Patan River Road, Patan, Gujarat - 384265',
      pincode: '384265',
      latitude: 23.8500,
      longitude: 72.1200,
      orderStatus: 'PLACED',
      paymentStatus: 'PAID'
    });

    assert(order.pricePerTractorSnapshot === 2350, 'Historical order snapshot recorded ₹2,350 per tractor');
    assert(order.totalAmount === 7050, 'Historical order total amount recorded ₹7,050');

    // Admin updates price
    sandProduct.priceSinglePatiya = 2500;
    await sandProduct.save();

    // Verify historical order remained untouched
    const fetchedOldOrder = await Order.findById(order._id);
    assert(fetchedOldOrder.pricePerTractorSnapshot === 2350, 'Historical order tractor price remained immutable at ₹2,350 after admin price change');
    assert(fetchedOldOrder.totalAmount === 7050, 'Historical total order amount remained immutable at ₹7,050');

    // Verify new order picks up new admin price
    const newOrderNumber = await generateOrderNumber();
    const newOrder = await Order.create({
      orderNumber: newOrderNumber,
      userId: testUser._id,
      productId: sandProduct._id,
      productNameSnapshot: sandProduct.name,
      category: sandProduct.category,
      sandLocation: 'Patan',
      transportType: 'Tractor',
      tractorType: 'Single Patiya',
      numberOfTractors: 3,
      pricePerTractorSnapshot: sandProduct.priceSinglePatiya,
      vehicleType: 'Single Patiya',
      vehicleCapacity: 3,
      quantity: 3,
      pricePerTonSnapshot: sandProduct.priceSinglePatiya,
      subtotal: sandProduct.priceSinglePatiya * 3,
      deliveryCharge: 0,
      tax: 0,
      totalAmount: sandProduct.priceSinglePatiya * 3,
      shippingAddress: 'Patan River Road, Patan, Gujarat - 384265',
      pincode: '384265',
      latitude: 23.8500,
      longitude: 72.1200,
      orderStatus: 'PLACED',
      paymentStatus: 'PAID'
    });
    assert(newOrder.pricePerTractorSnapshot === 2500, 'New order successfully picks up updated price of ₹2,500');
    assert(newOrder.totalAmount === 7500, 'New order total calculates to ₹7,500 (2,500 × 3)');

    // Reset price back to standard baseline
    sandProduct.priceSinglePatiya = 2350;
    await sandProduct.save();

    await Order.findByIdAndDelete(newOrder._id);

    // 4. Test Atomic Dealer Acceptance & Race Conditions
    console.log('\n[Test Suite 4: Atomic Dealer Acceptance & Race Condition Protection]');
    const dealerA = new mongoose.Types.ObjectId();
    const dealerB = new mongoose.Types.ObjectId();

    // First dealer accepts atomically
    const acceptResult1 = await Order.findOneAndUpdate(
      { _id: order._id, orderStatus: 'PLACED', dealerId: null },
      { dealerId: dealerA, orderStatus: 'ACCEPTED', acceptedAt: new Date() },
      { new: true }
    );
    assert(acceptResult1 !== null && acceptResult1.dealerId.toString() === dealerA.toString(), 'Dealer A successfully accepts the available order');

    // Second dealer tries to accept simultaneously
    const acceptResult2 = await Order.findOneAndUpdate(
      { _id: order._id, orderStatus: 'PLACED', dealerId: null },
      { dealerId: dealerB, orderStatus: 'ACCEPTED', acceptedAt: new Date() },
      { new: true }
    );
    assert(acceptResult2 === null, 'Dealer B is blocked atomically from accepting the already-accepted order');

    // 5. Test Delivery OTP Cryptographic Generation & Verification
    console.log('\n[Test Suite 5: Delivery OTP Hashing, Expiry, & Verification]');
    const { rawOtp, otpHash, expiresAt } = await OtpService.generateOtp(1440);
    assert(/^\d{6}$/.test(rawOtp), 'Generated OTP is exactly 6 digits');
    assert(otpHash && otpHash !== rawOtp, 'OTP is cryptographically hashed');

    const verifySuccess = await OtpService.verifyOtp(rawOtp, otpHash, expiresAt, 0);
    assert(verifySuccess.isValid === true, 'OtpService successfully verifies matching raw OTP');

    const verifyWrong = await OtpService.verifyOtp('000000', otpHash, expiresAt, 1);
    assert(verifyWrong.isValid === false, 'OtpService correctly rejects incorrect OTP');

    const expiredDate = new Date(Date.now() - 10000);
    const verifyExpired = await OtpService.verifyOtp(rawOtp, otpHash, expiredDate, 0);
    assert(verifyExpired.isValid === false && verifyExpired.reason.includes('expired'), 'OtpService correctly rejects expired OTP');

    const verifyMaxAttempts = await OtpService.verifyOtp(rawOtp, otpHash, expiresAt, 5, 5);
    assert(verifyMaxAttempts.isValid === false && verifyMaxAttempts.reason.includes('Maximum'), 'OtpService enforces attempt rate-limits');

    // Clean up test order
    await Order.findByIdAndDelete(order._id);

    console.log('\n====================================================');
    console.log(`  ALL ${totalTests} INTEGRATION TESTS PASSED! (${passedTests}/${totalTests})`);
    console.log('====================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\nTest Execution Error:', error);
    process.exit(1);
  }
};

runTests();
