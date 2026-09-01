const mongoose = require('mongoose');
const { MONGODB_URI } = require('../src/config/env');
const PincodeService = require('../src/services/pincodeService');
const User = require('../src/models/User');
const Order = require('../src/models/Order');
const Product = require('../src/models/Product');
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

const runPincodeAndNearestDealerTests = async () => {
  try {
    console.log('====================================================');
    console.log('  PIN CODE VALIDATION & NEAREST DEALER TEST SUITE');
    console.log('====================================================\n');

    // Suite 1: 6-Digit Indian PIN Code Validation
    console.log('[Test Suite 1: Indian PIN Code Format Validation]');
    assert(PincodeService.isValidIndianPincode('384001') === true, '384001 is a valid Indian PIN code');
    assert(PincodeService.isValidIndianPincode('384151') === true, '384151 is a valid Indian PIN code');
    assert(PincodeService.isValidIndianPincode('380001') === true, '380001 is a valid Indian PIN code');
    assert(PincodeService.isValidIndianPincode('110001') === true, '110001 is a valid Indian PIN code');
    assert(PincodeService.isValidIndianPincode('400001') === true, '400001 is a valid Indian PIN code');

    assert(PincodeService.isValidIndianPincode('38400') === false, 'Rejects 5-digit PIN code (38400)');
    assert(PincodeService.isValidIndianPincode('3840011') === false, 'Rejects 7-digit PIN code (3840011)');
    assert(PincodeService.isValidIndianPincode('38400A') === false, 'Rejects alphanumeric input (38400A)');
    assert(PincodeService.isValidIndianPincode('384 01') === false, 'Rejects spaces inside PIN (384 01)');
    assert(PincodeService.isValidIndianPincode('384-01') === false, 'Rejects hyphens/special characters (384-01)');
    assert(PincodeService.isValidIndianPincode('084001') === false, 'Rejects PIN starting with 0 (084001)');
    assert(PincodeService.isValidIndianPincode('') === false, 'Rejects empty string');
    assert(PincodeService.isValidIndianPincode(null) === false, 'Rejects null');

    // Suite 2: PIN Code Geolocation Lookup
    console.log('\n[Test Suite 2: PIN Code to Geographic Coordinates Resolution]');
    const mehsanaGeo = await PincodeService.lookup('384001');
    assert(mehsanaGeo !== null, '384001 successfully resolved');
    assert(mehsanaGeo.city.includes('Mehsana'), '384001 city is Mehsana');
    assert(mehsanaGeo.state === 'Gujarat', '384001 state is Gujarat');
    assert(Math.abs(mehsanaGeo.latitude - 23.59796) < 0.01, '384001 latitude matches ~23.59');
    assert(Math.abs(mehsanaGeo.longitude - 72.36932) < 0.01, '384001 longitude matches ~72.36');

    const siddhpurGeo = await PincodeService.lookup('384151');
    assert(siddhpurGeo !== null && siddhpurGeo.city.includes('Siddhpur'), '384151 resolves to Siddhpur');

    const gandhinagarGeo = await PincodeService.lookup('382010');
    assert(gandhinagarGeo !== null && gandhinagarGeo.city.includes('Gandhinagar'), '382010 resolves to Gandhinagar');

    // Suite 3: Haversine Distance Formula Calculation
    console.log('\n[Test Suite 3: Haversine Distance Accuracy Calculation]');
    // Distance between Mehsana (23.59796, 72.36932) and Siddhpur (23.91672, 72.38334) ~ 35.48 km
    const distMehsanaSiddhpur = PincodeService.calculateHaversineDistanceKm(
      mehsanaGeo.latitude,
      mehsanaGeo.longitude,
      siddhpurGeo.latitude,
      siddhpurGeo.longitude
    );
    assert(distMehsanaSiddhpur > 30 && distMehsanaSiddhpur < 40, `Mehsana to Siddhpur distance is ~35.5 km (calculated: ${distMehsanaSiddhpur} km)`);

    // Distance from same point to same point is 0 km
    const distSelf = PincodeService.calculateHaversineDistanceKm(
      mehsanaGeo.latitude,
      mehsanaGeo.longitude,
      mehsanaGeo.latitude,
      mehsanaGeo.longitude
    );
    assert(distSelf === 0, 'Distance to same coordinates is 0 km');

    // Distance between Mehsana (23.59796, 72.36932) and Gandhinagar (23.21563, 72.63694) ~ 50.8 km
    const distMehsanaGandhinagar = PincodeService.calculateHaversineDistanceKm(
      mehsanaGeo.latitude,
      mehsanaGeo.longitude,
      gandhinagarGeo.latitude,
      gandhinagarGeo.longitude
    );
    assert(distMehsanaGandhinagar > 45 && distMehsanaGandhinagar < 56, `Mehsana to Gandhinagar distance is ~51 km (calculated: ${distMehsanaGandhinagar} km)`);

    // Suite 4: Geographically Nearest Dealer Selection (True Geographic vs Numerical)
    console.log('\n[Test Suite 4: Geographic Nearest Dealer Assignment]');
    // Setup Mock Dealers with real locations
    const mockDealers = [
      {
        _id: new mongoose.Types.ObjectId(),
        name: 'Mehsana Dealer',
        companyName: 'Mehsana Logistics Hub',
        pincode: '384001',
        latitude: 23.59796,
        longitude: 72.36932,
        role: 'DEALER',
        isActive: true
      },
      {
        _id: new mongoose.Types.ObjectId(),
        name: 'Siddhpur Dealer',
        companyName: 'Siddhpur Supply Co',
        pincode: '384151',
        latitude: 23.91672,
        longitude: 72.38334,
        role: 'DEALER',
        isActive: true
      },
      {
        _id: new mongoose.Types.ObjectId(),
        name: 'Gandhinagar Dealer',
        companyName: 'Sabarmati Fleet',
        pincode: '382010',
        latitude: 23.21563,
        longitude: 72.63694,
        role: 'DEALER',
        isActive: true
      },
      {
        _id: new mongoose.Types.ObjectId(),
        name: 'Patan Dealer',
        companyName: 'Patan Express',
        pincode: '384265',
        latitude: 23.84932,
        longitude: 72.12662,
        role: 'DEALER',
        isActive: true
      }
    ];

    // Customer in Mehsana (PIN 384001)
    const customerMehsana = { lat: 23.59796, lng: 72.36932 };
    const nearestForMehsana = await PincodeService.findNearestDealer(customerMehsana, mockDealers);
    assert(nearestForMehsana.nearestDealer !== null, 'Found nearest dealer for Mehsana');
    assert(
      nearestForMehsana.nearestDealer._id.toString() === mockDealers[0]._id.toString(),
      'Customer in Mehsana is assigned to Mehsana Dealer (distance 0 km)'
    );
    assert(nearestForMehsana.distanceKm === 0, 'Distance to Mehsana dealer is 0 km');

    // Customer in Siddhpur (PIN 384151)
    const customerSiddhpur = { lat: 23.91672, lng: 72.38334 };
    const nearestForSiddhpur = await PincodeService.findNearestDealer(customerSiddhpur, mockDealers);
    assert(
      nearestForSiddhpur.nearestDealer._id.toString() === mockDealers[1]._id.toString(),
      'Customer in Siddhpur is assigned to Siddhpur Dealer'
    );
    assert(nearestForSiddhpur.distanceKm === 0, 'Distance to Siddhpur dealer is 0 km');

    // Customer in Unjha (PIN 384170, Lat 23.80389, Lng 72.39278 - midway between Mehsana & Siddhpur, closer to Siddhpur ~ 12.6 km vs Mehsana ~ 23 km)
    const unjhaGeo = await PincodeService.lookup('384170');
    const nearestForUnjha = await PincodeService.findNearestDealer(unjhaGeo, mockDealers);
    assert(
      nearestForUnjha.nearestDealer._id.toString() === mockDealers[1]._id.toString(),
      `Customer in Unjha (384170) is geographically closest to Siddhpur Dealer (${nearestForUnjha.distanceKm} km)`
    );

    // Suite 5: Database Integration & Order Schema Validation
    console.log('\n[Test Suite 5: Database Order Creation with PIN & Assigned Dealer]');
    await mongoose.connect(MONGODB_URI);

    const testUser = await User.findOne({ role: 'USER' }) || (await User.create({
      name: 'Integration Test User',
      mobile: '9825099999',
      whatsappNumber: '9825099999',
      passwordHash: await User.hashPassword('User@12345'),
      role: 'USER'
    }));

    const testProduct = await Product.findOne({ isActive: true }) || (await Product.create({
      name: 'Test Sand Material',
      category: 'Sand',
      pricePerTon: 2350,
      priceSinglePatiya: 2350,
      priceDoublePatiya: 4500,
      unit: 'Tractor'
    }));

    const allActiveDealers = await User.find({ role: 'DEALER', isActive: true });
    assert(allActiveDealers.length > 0, `Database has ${allActiveDealers.length} active dealers for testing`);

    const orderNumber = await generateOrderNumber();
    const customerPin = '384001';
    const pinDetails = await PincodeService.lookup(customerPin);
    const { nearestDealer, distanceKm } = await PincodeService.findNearestDealer(pinDetails, allActiveDealers);

    assert(nearestDealer !== null, 'Resolved nearest dealer from database');

    const testOrder = await Order.create({
      orderNumber,
      userId: testUser._id,
      assignedDealerId: nearestDealer._id,
      dealerDistanceKm: distanceKm,
      productId: testProduct._id,
      productNameSnapshot: testProduct.name,
      category: testProduct.category,
      transportType: 'Tractor',
      tractorType: 'Single Patiya',
      numberOfTractors: 2,
      pricePerTractorSnapshot: 2350,
      vehicleType: 'Single Patiya',
      vehicleCapacity: 2,
      quantity: 2,
      pricePerTonSnapshot: 2350,
      subtotal: 4700,
      totalAmount: 4700,
      shippingAddress: 'Plot 5, Highway Industrial Area, Mehsana, Gujarat - 384001',
      pincode: customerPin,
      shippingDetails: {
        fullName: 'Jainil Patel',
        mobile: '9825099999',
        addressLine1: 'Plot 5, Highway Industrial Area',
        addressLine2: 'Gate 2',
        area: 'Highway Zone',
        city: pinDetails.city,
        state: pinDetails.state,
        pincode: customerPin,
        landmark: 'Near Highway Bridge'
      },
      latitude: pinDetails.latitude,
      longitude: pinDetails.longitude,
      orderStatus: 'PLACED',
      paymentStatus: 'PAID'
    });

    assert(testOrder.pincode === '384001', 'Order saved with mandatory 6-digit PIN code');
    assert(testOrder.shippingDetails.city === 'Mehsana', 'Order saved with structured shippingDetails');
    assert(testOrder.assignedDealerId.toString() === nearestDealer._id.toString(), 'Order correctly assigned to nearest dealer');
    assert(typeof testOrder.dealerDistanceKm === 'number', `Order stored distance in km: ${testOrder.dealerDistanceKm} km`);

    // Clean up test order
    await Order.findByIdAndDelete(testOrder._id);

    console.log('\n====================================================');
    console.log(`  ALL ${totalTests} PIN CODE & NEAREST DEALER TESTS PASSED! (${passedTests}/${totalTests})`);
    console.log('====================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\nTest Suite Error:', err);
    process.exit(1);
  }
};

runPincodeAndNearestDealerTests();

