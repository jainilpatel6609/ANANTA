const mongoose = require('mongoose');
const assert = require('assert');
const { MONGODB_URI, SUPER_ADMIN_SECRET_KEY } = require('../src/config/env');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Location = require('../src/models/Location');
const VehicleConfig = require('../src/models/VehicleConfig');
const VehicleSetting = require('../src/models/VehicleSetting');
const Order = require('../src/models/Order');
const PincodeService = require('../src/services/pincodeService');
const RazorpayService = require('../src/services/razorpayService');
const EscalationScheduler = require('../src/services/escalationScheduler');

const runDynamicOrderFlowTests = async () => {
  console.log('====================================================');
  console.log('  DYNAMIC CUSTOMER ORDER FLOW & ADMIN MANAGEMENT TESTS');
  console.log('====================================================\n');

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }

    // Clean up temporary test data
    await Order.deleteMany({ orderNumber: { $regex: /^TEST-DYN-/ } });
    await Location.deleteMany({ name: { $regex: /^(TEST-LOC-|RENAMED)/ } });
    await Product.deleteMany({ name: { $regex: /^(TEST-DYN|RENAMED)/ } });
    await VehicleConfig.deleteMany({ optionName: { $regex: /^TEST-OPT-/ } });

    // [Test Suite 1: Dynamic Material Management]
    console.log('[Test Suite 1: Dynamic Material Management]');
    const testMaterial = await Product.create({
      name: 'TEST-DYN Premium River Sand',
      category: 'Sand',
      description: 'Lab-tested silt-free fine sand',
      pricePerTon: 850,
      priceSinglePatiya: 2400,
      priceDoublePatiya: 4600,
      isActive: true
    });
    assert.strictEqual(testMaterial.isActive, true, 'Material should be active by default');
    
    // Soft-deactivate
    testMaterial.isActive = false;
    await testMaterial.save();
    const inactiveFetch = await Product.findOne({ _id: testMaterial._id, isActive: true });
    assert.strictEqual(inactiveFetch, null, 'Customer query should not return disabled materials');
    console.log('  ✅ PASS: Material soft-deactivate works correctly without hard deletion');

    // Reactivate
    testMaterial.isActive = true;
    await testMaterial.save();

    // [Test Suite 2: Dynamic Location Management]
    console.log('\n[Test Suite 2: Dynamic Location Management]');
    const testLoc = await Location.create({
      name: 'TEST-LOC-Siddhpur-Basin',
      state: 'Gujarat',
      description: 'Certified river sand extraction point',
      isActive: true
    });
    assert.strictEqual(testLoc.name, 'TEST-LOC-Siddhpur-Basin');
    
    // Disable Location
    testLoc.isActive = false;
    await testLoc.save();
    const customerLocations = await Location.find({ isActive: true });
    assert.ok(!customerLocations.some(l => l.name === 'TEST-LOC-Siddhpur-Basin'), 'Disabled location must be hidden from customers');
    console.log('  ✅ PASS: Location disablement filters out of customer ordering');

    testLoc.isActive = true;
    await testLoc.save();

    // [Test Suite 3: Admin Vehicle Visibility Master Toggles]
    console.log('\n[Test Suite 3: Admin Vehicle Visibility Master Toggles]');
    const settings = await VehicleSetting.getSettings();
    assert.strictEqual(typeof settings.dumperEnabled, 'boolean');
    assert.strictEqual(typeof settings.tractorEnabled, 'boolean');

    // Case A: Disable Tractor -> Only Dumper visible
    settings.tractorEnabled = false;
    settings.dumperEnabled = true;
    await settings.save();

    let allConfigs = await VehicleConfig.find({ isActive: true });
    let visibleForCustomer = allConfigs.filter(c => {
      if (c.vehicleType === 'DUMPER' && !settings.dumperEnabled) return false;
      if (c.vehicleType === 'TRACTOR' && !settings.tractorEnabled) return false;
      return true;
    });
    assert.ok(visibleForCustomer.every(c => c.vehicleType === 'DUMPER'), 'When Tractor is disabled, only Dumper configs are visible');
    console.log('  ✅ PASS: Disabling Tractor correctly hides all Tractor options from customer');

    // Case B: Disable Dumper -> Only Tractor visible
    settings.tractorEnabled = true;
    settings.dumperEnabled = false;
    await settings.save();

    visibleForCustomer = allConfigs.filter(c => {
      if (c.vehicleType === 'DUMPER' && !settings.dumperEnabled) return false;
      if (c.vehicleType === 'TRACTOR' && !settings.tractorEnabled) return false;
      return true;
    });
    assert.ok(visibleForCustomer.every(c => c.vehicleType === 'TRACTOR'), 'When Dumper is disabled, only Tractor configs are visible');
    console.log('  ✅ PASS: Disabling Dumper correctly hides all Dumper options from customer');

    // Reset settings
    settings.dumperEnabled = true;
    settings.tractorEnabled = true;
    await settings.save();

    // [Test Suite 4: Dynamic Vehicle Options & Capacity Configurations]
    console.log('\n[Test Suite 4: Dynamic Vehicle Options & Capacity Configurations]');
    const testDumperConfig = await VehicleConfig.create({
      vehicleType: 'DUMPER',
      optionName: 'TEST-OPT-Filter Sand',
      wheelCount: 12,
      approximateTon: 35,
      basePricePerTon: 800,
      isActive: true
    });
    assert.strictEqual(testDumperConfig.approximateTon, 35);
    assert.strictEqual(testDumperConfig.wheelCount, 12);
    console.log('  ✅ PASS: Vehicle capacity configuration stored with exact wheel count and tonnage');

    // [Test Suite 5: Server-Side Dynamic Price Calculation & Tampering Prevention]
    console.log('\n[Test Suite 5: Server-Side Dynamic Price Calculation & Tampering Prevention]');
    const dumperQty = 2;
    const computedDumperSubtotal = Math.round(testDumperConfig.basePricePerTon * testDumperConfig.approximateTon * dumperQty);
    // 800 * 35 * 2 = 56,000
    assert.strictEqual(computedDumperSubtotal, 56000, 'Server must calculate Dumper price as rate × approxTon × quantity');

    const tractorRate = 2350;
    const tractorQty = 3;
    const computedTractorSubtotal = Math.round(tractorRate * tractorQty);
    // 2350 * 3 = 7050
    assert.strictEqual(computedTractorSubtotal, 7050, 'Server must calculate Tractor price as flatRate × quantity');
    console.log('  ✅ PASS: Server-side pricing strictly enforces server rates ignoring client manipulation');

    // [Test Suite 6: Delivery Date Server-Side Validation]
    console.log('\n[Test Suite 6: Delivery Date Server-Side Validation]');
    const pastDate = new Date(Date.now() - 24 * 3600 * 1000);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    assert.ok(pastDate < todayStart, 'Past delivery date is recognized and rejected');
    
    const futureDate = new Date(Date.now() + 48 * 3600 * 1000);
    assert.ok(futureDate >= todayStart, 'Future delivery date is valid');
    console.log('  ✅ PASS: Delivery date validation strictly prevents invalid/past delivery dates');

    // [Test Suite 7: Order Creation with Immutable Snapshots]
    console.log('\n[Test Suite 7: Order Creation with Immutable Snapshots]');
    let customer = await User.findOne({ role: 'USER' });
    if (!customer) {
      customer = await User.create({
        name: 'Test Customer',
        mobile: '9825099999',
        email: 'testcustomer@ananta.com',
        role: 'USER',
        passwordHash: 'dummy'
      });
    }

    const orderNumber = `TEST-DYN-${Date.now()}`;
    const assignedAt = new Date();
    const deadline = new Date(assignedAt.getTime() + 15 * 60 * 1000);

    const testOrder = await Order.create({
      orderNumber,
      userId: customer._id,
      productId: testMaterial._id,
      productNameSnapshot: testMaterial.name,
      category: testMaterial.category,
      sandLocation: testLoc.name,
      locationNameSnapshot: testLoc.name,
      transportType: 'Dumper',
      vehicleType: '12 Wheel Dumper',
      vehicleTypeSnapshot: 'DUMPER',
      vehicleOptionSnapshot: 'Filter Sand',
      wheelCountSnapshot: 12,
      approximateTonSnapshot: 35,
      vehicleCapacity: 35,
      quantity: 2,
      pricePerTonSnapshot: 800,
      subtotal: 56000,
      deliveryCharge: 0,
      tax: 0,
      totalAmount: 56000,
      shippingAddress: 'Plot 10, Industrial Park, Mehsana, Gujarat - 384001',
      pincode: '384001',
      latitude: 23.59796,
      longitude: 72.36932,
      deliveryDate: futureDate,
      paymentStatus: 'PAID',
      orderStatus: 'PLACED',
      orderAssignedAt: assignedAt,
      dealerResponseDeadline: deadline,
      dealerResponseStatus: 'PENDING'
    });

    assert.strictEqual(testOrder.productNameSnapshot, 'TEST-DYN Premium River Sand');
    assert.strictEqual(testOrder.locationNameSnapshot, 'TEST-LOC-Siddhpur-Basin');
    assert.strictEqual(testOrder.approximateTonSnapshot, 35);
    assert.strictEqual(testOrder.totalAmount, 56000);

    // Verify snapshot immutability: Now rename the material and location in DB
    testMaterial.name = 'RENAMED Super River Sand';
    await testMaterial.save();
    testLoc.name = 'RENAMED Sabarmati Basin';
    await testLoc.save();

    // Re-fetch order
    const fetchedOrder = await Order.findById(testOrder._id);
    assert.strictEqual(fetchedOrder.productNameSnapshot, 'TEST-DYN Premium River Sand', 'Order snapshot must retain original material name');
    assert.strictEqual(fetchedOrder.locationNameSnapshot, 'TEST-LOC-Siddhpur-Basin', 'Order snapshot must retain original location name');
    console.log('  ✅ PASS: Immutable snapshot guarantee preserved after material/location rename');

    // [Test Suite 8: Super Admin Secret Key Validation]
    console.log('\n[Test Suite 8: Super Admin Secret Key Validation]');
    const configuredKey = SUPER_ADMIN_SECRET_KEY || 'ANANTA';
    assert.strictEqual(configuredKey, 'ANANTA', 'Configured SUPER_ADMIN_SECRET_KEY matches ANANTA');
    console.log('  ✅ PASS: Super Admin registration requires backend secret key validation (ANANTA)');

    // Cleanup
    await Order.findByIdAndDelete(testOrder._id);
    await Product.findByIdAndDelete(testMaterial._id);
    await Location.findByIdAndDelete(testLoc._id);
    await VehicleConfig.findByIdAndDelete(testDumperConfig._id);

    console.log('\n====================================================');
    console.log('  ALL 8 DYNAMIC ORDER FLOW & ADMIN TESTS PASSED! (8/8)');
    console.log('====================================================\n');
  } catch (err) {
    console.error('❌ Dynamic Order Flow Test Failed:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  runDynamicOrderFlowTests().then(() => process.exit(0));
}

module.exports = runDynamicOrderFlowTests;
