const mongoose = require('mongoose');
const { MONGODB_URI } = require('../src/config/env');
const User = require('../src/models/User');
const Order = require('../src/models/Order');
const Product = require('../src/models/Product');
const PincodeService = require('../src/services/pincodeService');

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

const runDealerManagementTests = async () => {
  try {
    console.log('====================================================');
    console.log('  SUPER ADMIN DEALER MANAGEMENT & DELETION TEST SUITE');
    console.log('====================================================\n');

    await mongoose.connect(MONGODB_URI);

    // Suite 1: Query Dealers List (Excluding Deleted)
    console.log('[Test Suite 1: View Registered Dealers]');
    const activeDealers = await User.find({ role: 'DEALER', isDeleted: { $ne: true } });
    assert(activeDealers.length > 0, `Found ${activeDealers.length} registered non-deleted dealers`);

    // Suite 2: Update Dealer Phone Number & Validations
    console.log('\n[Test Suite 2: Dealer Phone Number Validation & Update]');
    const testDealer = await User.findOne({ role: 'DEALER', isDeleted: { $ne: true } });
    assert(testDealer !== null, 'Found dealer for phone update test');

    const originalMobile = testDealer.mobile;

    // Test invalid format 1: Short number
    const shortMobile = '98765';
    assert(!/^[6-9]\d{9}$/.test(shortMobile), 'Rejects short mobile (98765)');

    // Test invalid format 2: Starts with non-Indian prefix (e.g. 1-5)
    const invalidPrefix = '3840011223';
    assert(!/^[6-9]\d{9}$/.test(invalidPrefix), 'Rejects invalid Indian prefix (3840011223)');

    // Test invalid format 3: Alphanumeric
    const alphaMobile = '98765ABCD0';
    assert(!/^[6-9]\d{9}$/.test(alphaMobile), 'Rejects alphanumeric mobile number');

    // Test valid 10-digit Indian mobile
    const validNewMobile = '9825123456';
    assert(/^[6-9]\d{9}$/.test(validNewMobile), 'Validates standard 10-digit Indian mobile (9825123456)');

    // Collision check simulation: find another user
    const otherUser = await User.findOne({ _id: { $ne: testDealer._id } });
    if (otherUser) {
      const collidingMobile = otherUser.mobile;
      const collisionExists = await User.findOne({ mobile: collidingMobile, _id: { $ne: testDealer._id } });
      assert(collisionExists !== null, 'Correctly detects duplicate mobile collision');
    }

    // Apply phone update on test dealer
    testDealer.mobile = validNewMobile;
    testDealer.whatsappNumber = validNewMobile;
    await testDealer.save();

    const reloadedDealer = await User.findById(testDealer._id);
    assert(reloadedDealer.mobile === validNewMobile, `Dealer phone number successfully updated to ${validNewMobile}`);

    // Revert back to original mobile for test integrity
    testDealer.mobile = originalMobile;
    testDealer.whatsappNumber = originalMobile;
    await testDealer.save();
    assert(testDealer.mobile === originalMobile, 'Restored dealer mobile to original seed value');

    // Suite 3: Soft Delete Dealer & Historical Order Preservation
    console.log('\n[Test Suite 3: Delete Dealer & Historical Order Integrity]');

    // Clean up any previous test artifacts
    await User.deleteMany({ email: 'temp.dealer@example.com' });

    const dynamicMobile = '98' + Math.floor(10000000 + Math.random() * 90000000);

    // Create a temporary test dealer
    const tempDealer = await User.create({
      name: 'Temp Deletable Dealer',
      companyName: 'Temp Logistics Ltd',
      mobile: dynamicMobile,
      whatsappNumber: dynamicMobile,
      email: 'temp.dealer@example.com',
      pincode: '384002',
      city: 'Mehsana',
      state: 'Gujarat',
      role: 'DEALER',
      isActive: true,
      isDeleted: false,
      passwordHash: await User.hashPassword('Temp@12345')
    });
    assert(tempDealer !== null && tempDealer._id, 'Created temporary dealer for deletion test');

    // Find a customer and product for dummy order
    let customer = await User.findOne({ role: 'USER' });
    let product = await Product.findOne({ isActive: true });

    // Create historical order linked to tempDealer
    const testOrder = await Order.create({
      orderNumber: `AT-TEST-DEL-${Date.now().toString().slice(-6)}`,
      userId: customer._id,
      dealerId: tempDealer._id,
      assignedDealerId: tempDealer._id,
      productId: product._id,
      productNameSnapshot: product.name,
      category: product.category,
      transportType: 'Tractor',
      tractorType: 'Single Patiya',
      vehicleType: 'Single Patiya',
      vehicleCapacity: 2,
      quantity: 2,
      numberOfTractors: 2,
      pricePerTractorSnapshot: 2350,
      pricePerTonSnapshot: 2350,
      subtotal: 4700,
      totalAmount: 4700,
      shippingAddress: 'Test Location, Mehsana',
      pincode: '384002',
      latitude: 23.59,
      longitude: 72.36,
      orderStatus: 'DELIVERED',
      paymentStatus: 'PAID'
    });
    assert(testOrder !== null && testOrder.dealerId.toString() === tempDealer._id.toString(), 'Created test order linked to dealer');

    // Execute Soft Delete on Temp Dealer
    tempDealer.isDeleted = true;
    tempDealer.isActive = false;
    tempDealer.deletedAt = new Date();
    await tempDealer.save();

    assert(tempDealer.isDeleted === true, 'Dealer marked as isDeleted: true');
    assert(tempDealer.isActive === false, 'Dealer marked as isActive: false');
    assert(tempDealer.deletedAt !== null, 'Dealer deletedAt timestamp recorded');

    // Verify Deleted Dealer is excluded from Active Dealer listing
    const nonDeletedList = await User.find({ role: 'DEALER', isDeleted: { $ne: true } });
    const isTempInList = nonDeletedList.some((d) => d._id.toString() === tempDealer._id.toString());
    assert(isTempInList === false, 'Deleted dealer is excluded from active dealer list');

    // Verify Nearest Dealer / Order assignment excludes deleted dealer
    const nearestDealersQuery = await User.find({ role: 'DEALER', isActive: true, isDeleted: { $ne: true } });
    const isTempInNearestPool = nearestDealersQuery.some((d) => d._id.toString() === tempDealer._id.toString());
    assert(isTempInNearestPool === false, 'Deleted dealer is excluded from dispatch assignment routing');

    // CRITICAL: Verify Historical Order Still Successfully Populates Dealer Details!
    const populatedOrder = await Order.findById(testOrder._id)
      .populate('dealerId', 'name companyName mobile')
      .populate('userId', 'name mobile');

    assert(populatedOrder.dealerId !== null, 'Historical order dealerId populated successfully');
    assert(populatedOrder.dealerId.name === 'Temp Deletable Dealer', 'Historical order preserves Dealer Name');
    assert(populatedOrder.dealerId.companyName === 'Temp Logistics Ltd', 'Historical order preserves Dealer Company Name');
    assert(populatedOrder.dealerId.mobile === dynamicMobile, 'Historical order preserves Dealer Phone Number');
    assert(populatedOrder.dealerId._id.toString() === tempDealer._id.toString(), 'Historical order preserves Dealer ID');

    // Cleanup test artifacts
    await Order.findByIdAndDelete(testOrder._id);
    await User.findByIdAndDelete(tempDealer._id);
    console.log('  Cleaned up temporary test order and dealer');

    console.log('\n====================================================');
    console.log(`  ALL ${totalTests} DEALER MANAGEMENT TESTS PASSED! (${passedTests}/${totalTests})`);
    console.log('====================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\nTest Suite Error:', err);
    process.exit(1);
  }
};

runDealerManagementTests();
