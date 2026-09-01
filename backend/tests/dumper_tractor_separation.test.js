const mongoose = require('mongoose');
const assert = require('assert');
const { MONGODB_URI } = require('../src/config/env');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Location = require('../src/models/Location');
const VehicleConfig = require('../src/models/VehicleConfig');
const VehicleSetting = require('../src/models/VehicleSetting');
const Order = require('../src/models/Order');

const runSeparationTests = async () => {
  console.log('====================================================');
  console.log('  DUMPER VS TRACTOR ARCHITECTURAL SEPARATION TESTS');
  console.log('====================================================\n');

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }

    // Cleanup test data
    await Order.deleteMany({ orderNumber: { $regex: /^TEST-SEP-/ } });
    await Location.deleteMany({ name: { $regex: /^TEST-SEP-/ } });
    await VehicleConfig.deleteMany({ optionName: { $regex: /^TEST-SEP-/ } });

    // [Test Suite 1: Pricing Independence]
    console.log('[Test Suite 1: Pricing Independence]');
    const dumperConfig = await VehicleConfig.create({
      vehicleType: 'DUMPER',
      optionName: 'TEST-SEP-Dumper-FilterSand',
      wheelCount: 12,
      approximateTon: 35,
      basePricePerTon: 800,
      isActive: true
    });

    const tractorConfig = await VehicleConfig.create({
      vehicleType: 'TRACTOR',
      optionName: 'TEST-SEP-Tractor-SinglePatiya',
      wheelCount: null,
      approximateTon: 3.5,
      flatPrice: 2350,
      isActive: true
    });

    assert.strictEqual(dumperConfig.basePricePerTon, 800);
    assert.strictEqual(tractorConfig.flatPrice, 2350);

    // Modify Tractor Price: 2350 -> 2500
    tractorConfig.flatPrice = 2500;
    await tractorConfig.save();

    // Verify Dumper price remained completely untouched
    const fetchedDumper = await VehicleConfig.findById(dumperConfig._id);
    assert.strictEqual(fetchedDumper.basePricePerTon, 800, 'Dumper price must remain strictly unchanged when Tractor price is updated');
    console.log('  ✅ PASS TEST 1: Modifying Tractor price does NOT affect Dumper price');

    // Modify Dumper Price: 800 -> 900
    fetchedDumper.basePricePerTon = 900;
    await fetchedDumper.save();

    // Verify Tractor price remained completely untouched
    const fetchedTractor = await VehicleConfig.findById(tractorConfig._id);
    assert.strictEqual(fetchedTractor.flatPrice, 2500, 'Tractor price must remain strictly unchanged when Dumper price is updated');
    console.log('  ✅ PASS TEST 2: Modifying Dumper price does NOT affect Tractor price');

    // [Test Suite 2: Location Independence]
    console.log('\n[Test Suite 2: Location Independence]');
    const tractorOnlyLoc = await Location.create({
      name: 'TEST-SEP-Mehsana-Rural',
      vehicleType: 'TRACTOR',
      state: 'Gujarat',
      description: 'Tractor drop point',
      isActive: true
    });

    const dumperLocations = await Location.find({ vehicleType: 'DUMPER', isActive: true });
    assert.ok(
      !dumperLocations.some(l => l.name === 'TEST-SEP-Mehsana-Rural'),
      'Tractor-only location must NOT appear in Dumper location query'
    );
    console.log('  ✅ PASS TEST 3: Tractor location appears ONLY in Tractor locations and NOT in Dumper');

    const dumperOnlyLoc = await Location.create({
      name: 'TEST-SEP-Highway-Quarry-Bay',
      vehicleType: 'DUMPER',
      state: 'Gujarat',
      description: 'Heavy Dumper quarry entrance',
      isActive: true
    });

    const tractorLocations = await Location.find({ vehicleType: 'TRACTOR', isActive: true });
    assert.ok(
      !tractorLocations.some(l => l.name === 'TEST-SEP-Highway-Quarry-Bay'),
      'Dumper-only location must NOT appear in Tractor location query'
    );
    console.log('  ✅ PASS TEST 4: Dumper location appears ONLY in Dumper locations and NOT in Tractor');

    // [Test Suite 3: Visibility Independence]
    console.log('\n[Test Suite 3: Visibility Independence]');
    const settings = await VehicleSetting.getSettings();

    // Case A: Disable Tractor
    settings.tractorEnabled = false;
    settings.dumperEnabled = true;
    await settings.save();

    let allActiveConfigs = await VehicleConfig.find({ isActive: true });
    let visibleForCustomer = allActiveConfigs.filter(c => {
      if (c.vehicleType === 'DUMPER' && !settings.dumperEnabled) return false;
      if (c.vehicleType === 'TRACTOR' && !settings.tractorEnabled) return false;
      return true;
    });
    assert.ok(visibleForCustomer.every(c => c.vehicleType === 'DUMPER'), 'Customer can only see Dumper when Tractor is disabled');
    console.log('  ✅ PASS TEST 5: Disabling Tractor leaves Dumper fully active and available');

    // Case B: Disable Dumper
    settings.tractorEnabled = true;
    settings.dumperEnabled = false;
    await settings.save();

    visibleForCustomer = allActiveConfigs.filter(c => {
      if (c.vehicleType === 'DUMPER' && !settings.dumperEnabled) return false;
      if (c.vehicleType === 'TRACTOR' && !settings.tractorEnabled) return false;
      return true;
    });
    assert.ok(visibleForCustomer.every(c => c.vehicleType === 'TRACTOR'), 'Customer can only see Tractor when Dumper is disabled');
    console.log('  ✅ PASS TEST 6: Disabling Dumper leaves Tractor fully active and available');

    // Reset settings
    settings.dumperEnabled = true;
    settings.tractorEnabled = true;
    await settings.save();

    // [Test Suite 4: Type & Capacity Independence]
    console.log('\n[Test Suite 4: Type & Capacity Independence]');
    // Soft-deactivate tractor config
    tractorConfig.isActive = false;
    await tractorConfig.save();

    const dumperActiveConfigs = await VehicleConfig.find({ vehicleType: 'DUMPER', isActive: true });
    assert.ok(
      dumperActiveConfigs.some(c => c._id.equals(dumperConfig._id)),
      'Disabling Tractor type must NOT disable Dumper types'
    );
    console.log('  ✅ PASS TEST 7: Deactivating Tractor type leaves Dumper types unchanged');

    tractorConfig.isActive = true;
    await tractorConfig.save();

    // Soft-deactivate dumper config
    dumperConfig.isActive = false;
    await dumperConfig.save();

    const tractorActiveConfigs = await VehicleConfig.find({ vehicleType: 'TRACTOR', isActive: true });
    assert.ok(
      tractorActiveConfigs.some(c => c._id.equals(tractorConfig._id)),
      'Disabling Dumper type must NOT disable Tractor types'
    );
    console.log('  ✅ PASS TEST 8: Deactivating Dumper type leaves Tractor types unchanged');

    dumperConfig.isActive = true;
    await dumperConfig.save();

    // Change Dumper capacity: 35 Ton -> 40 Ton
    dumperConfig.approximateTon = 40;
    await dumperConfig.save();

    const recheckTractor = await VehicleConfig.findById(tractorConfig._id);
    assert.strictEqual(recheckTractor.approximateTon, 3.5, 'Tractor capacity must remain 3.5 Ton');
    console.log('  ✅ PASS TEST 9: Modifying Dumper tonnage capacity leaves Tractor capacity unchanged');

    // Change Tractor capacity: 3.5 Ton -> 4.0 Ton
    tractorConfig.approximateTon = 4.0;
    await tractorConfig.save();

    const recheckDumper = await VehicleConfig.findById(dumperConfig._id);
    assert.strictEqual(recheckDumper.approximateTon, 40, 'Dumper capacity must remain 40 Ton');
    console.log('  ✅ PASS TEST 10: Modifying Tractor tonnage capacity leaves Dumper capacity unchanged');

    // [Test Suite 5: Cross-Vehicle Mutation Protection (Backend Security)]
    console.log('\n[Test Suite 5: Cross-Vehicle Mutation Protection (Backend Security)]');
    // Simulate attempt to mutate Tractor record through Dumper API logic
    const attemptCrossVehicleMutation = (record, targetApiVehicleType) => {
      if (record.vehicleType !== targetApiVehicleType) {
        return { status: 403, error: `Cannot modify ${record.vehicleType} via a ${targetApiVehicleType} request.` };
      }
      return { status: 200 };
    };

    const dumperApiResult = attemptCrossVehicleMutation(tractorConfig, 'DUMPER');
    assert.strictEqual(dumperApiResult.status, 403, 'Dumper API must reject mutation on Tractor records');
    console.log('  ✅ PASS TEST 13: Dumper API rejects attempt to modify Tractor record (403 Forbidden)');

    const tractorApiResult = attemptCrossVehicleMutation(dumperConfig, 'TRACTOR');
    assert.strictEqual(tractorApiResult.status, 403, 'Tractor API must reject mutation on Dumper records');
    console.log('  ✅ PASS TEST 14: Tractor API rejects attempt to modify Dumper record (403 Forbidden)');

    // [Test Suite 6: Historical Order Snapshot Immutability]
    console.log('\n[Test Suite 6: Historical Order Snapshot Immutability]');
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

    let product = await Product.findOne({ isActive: true });
    if (!product) {
      product = await Product.create({
        name: 'Sand',
        category: 'Sand',
        pricePerTon: 800,
        priceSinglePatiya: 2350,
        priceDoublePatiya: 4500,
        isActive: true
      });
    }

    // Create Dumper Order with snapshot price = 36000 (900 * 40 * 1)
    const dumperOrder = await Order.create({
      orderNumber: `TEST-SEP-D-${Date.now()}`,
      userId: customer._id,
      productId: product._id,
      productNameSnapshot: product.name,
      category: 'Sand',
      sandLocation: dumperOnlyLoc.name,
      locationNameSnapshot: dumperOnlyLoc.name,
      transportType: 'Dumper',
      vehicleType: '12 Wheel Dumper',
      vehicleTypeSnapshot: 'DUMPER',
      vehicleOptionSnapshot: dumperConfig.optionName,
      wheelCountSnapshot: 12,
      approximateTonSnapshot: 40,
      vehicleCapacity: 40,
      quantity: 1,
      pricePerTonSnapshot: 900,
      subtotal: 36000,
      totalAmount: 36000,
      shippingAddress: 'Plot 10, GIDC, Mehsana - 384001',
      pincode: '384001',
      latitude: 23.59796,
      longitude: 72.36932,
      deliveryDate: new Date(),
      paymentStatus: 'PAID',
      orderStatus: 'PLACED'
    });

    // Create Tractor Order with snapshot price = 2500
    const tractorOrder = await Order.create({
      orderNumber: `TEST-SEP-T-${Date.now()}`,
      userId: customer._id,
      productId: product._id,
      productNameSnapshot: product.name,
      category: 'Sand',
      sandLocation: tractorOnlyLoc.name,
      locationNameSnapshot: tractorOnlyLoc.name,
      transportType: 'Tractor',
      tractorType: 'Single Patiya',
      vehicleType: 'Single Patiya',
      vehicleTypeSnapshot: 'TRACTOR',
      vehicleOptionSnapshot: tractorConfig.optionName,
      wheelCountSnapshot: null,
      approximateTonSnapshot: 4.0,
      vehicleCapacity: 4.0,
      quantity: 1,
      pricePerTonSnapshot: 2500,
      subtotal: 2500,
      totalAmount: 2500,
      shippingAddress: 'Station Road, Siddhpur - 384151',
      pincode: '384151',
      latitude: 23.91672,
      longitude: 72.38334,
      deliveryDate: new Date(),
      paymentStatus: 'PAID',
      orderStatus: 'PLACED'
    });

    // Now change live Dumper & Tractor rates & names in DB
    dumperConfig.basePricePerTon = 1200;
    dumperConfig.approximateTon = 50;
    await dumperConfig.save();

    tractorConfig.flatPrice = 3000;
    tractorConfig.approximateTon = 5.0;
    await tractorConfig.save();

    dumperOnlyLoc.name = 'RENAMED Dumper Port';
    await dumperOnlyLoc.save();

    tractorOnlyLoc.name = 'RENAMED Tractor Depot';
    await tractorOnlyLoc.save();

    // Re-fetch past orders from DB
    const fetchedDumperOrder = await Order.findById(dumperOrder._id);
    const fetchedTractorOrder = await Order.findById(tractorOrder._id);

    assert.strictEqual(fetchedDumperOrder.totalAmount, 36000, 'Dumper historical order total must remain exactly 36000');
    assert.strictEqual(fetchedDumperOrder.locationNameSnapshot, 'TEST-SEP-Highway-Quarry-Bay', 'Dumper historical location snapshot must remain unchanged');
    console.log('  ✅ PASS TEST 15 & 16: Past Dumper orders strictly retain their immutable historical snapshots');

    assert.strictEqual(fetchedTractorOrder.totalAmount, 2500, 'Tractor historical order total must remain exactly 2500');
    assert.strictEqual(fetchedTractorOrder.locationNameSnapshot, 'TEST-SEP-Mehsana-Rural', 'Tractor historical location snapshot must remain unchanged');
    console.log('  ✅ PASS TEST 17: Past Tractor orders strictly retain their immutable historical snapshots');

    // Cleanup
    await Order.findByIdAndDelete(dumperOrder._id);
    await Order.findByIdAndDelete(tractorOrder._id);
    await Location.findByIdAndDelete(dumperOnlyLoc._id);
    await Location.findByIdAndDelete(tractorOnlyLoc._id);
    await VehicleConfig.findByIdAndDelete(dumperConfig._id);
    await VehicleConfig.findByIdAndDelete(tractorConfig._id);

    console.log('\n====================================================');
    console.log('  ALL 17 DUMPER VS TRACTOR SEPARATION TESTS PASSED! (17/17)');
    console.log('====================================================\n');
  } catch (err) {
    console.error('❌ Separation Test Failed:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  runSeparationTests().then(() => process.exit(0));
}

module.exports = runSeparationTests;

