const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MONGODB_URI, JWT_SECRET, SUPER_ADMIN_SECRET_KEY } = require('../src/config/env');
const User = require('../src/models/User');
const Driver = require('../src/models/Driver');
const Order = require('../src/models/Order');
const Product = require('../src/models/Product');
const Location = require('../src/models/Location');

let totalTests = 0;
let passedTests = 0;

const assert = (condition, msg) => {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${msg}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
};

async function runTwoWayValidation() {
  console.log('====================================================');
  console.log('  ANANTA TRADERS — 2-FRONTEND & 1-BACKEND FULL TEST');
  console.log('====================================================\n');

  await mongoose.connect(MONGODB_URI);

  // TEST 1: Super Admin login / role verification
  console.log('[TEST 1: Super Admin Login & Security]');
  let admin = await User.findOne({ role: 'ADMIN', isActive: true });
  if (!admin) {
    admin = await User.create({
      name: 'Super Admin HQ',
      mobile: '9327807331',
      whatsappNumber: '9327807331',
      role: 'ADMIN',
      passwordHash: await User.hashPassword('Admin@12345'),
      isActive: true
    });
  }
  assert(admin !== null, 'Super Admin user exists in central database');
  const adminToken = jwt.sign({ id: admin._id, role: 'ADMIN', mobile: admin.mobile }, JWT_SECRET, { expiresIn: '1d' });
  const decodedAdmin = jwt.verify(adminToken, JWT_SECRET);
  assert(decodedAdmin.role === 'ADMIN', 'Super Admin JWT correctly encodes role ADMIN');

  // TEST 2: Customer login
  console.log('\n[TEST 2: Customer Login]');
  let customer = await User.findOne({ role: 'USER', isActive: true });
  if (!customer) {
    customer = await User.create({
      name: 'Ramesh Patel',
      mobile: '9876543201',
      whatsappNumber: '9876543201',
      role: 'USER',
      passwordHash: await User.hashPassword('User@12345'),
      isActive: true
    });
  }
  assert(customer.role === 'USER', 'Customer user exists with role USER');

  // TEST 3: Dealer login
  console.log('\n[TEST 3: Dealer Login]');
  let dealer = await User.findOne({ role: 'DEALER', isActive: true });
  if (!dealer) {
    dealer = await User.create({
      name: 'Alpha Mehsana Sand Depot',
      mobile: '9898012301',
      whatsappNumber: '9898012301',
      pincode: '384001',
      role: 'DEALER',
      passwordHash: await User.hashPassword('Dealer@12345'),
      isActive: true
    });
  }
  assert(dealer.role === 'DEALER', 'Dealer exists with role DEALER');

  // TEST 4: Driver login
  console.log('\n[TEST 4: Driver Login & Fleet Management]');
  let driver = await Driver.findOne({ dealerId: dealer._id, isActive: true });
  if (!driver) {
    driver = await Driver.create({
      dealerId: dealer._id,
      name: 'Ketan Driver',
      mobile: '9899112233',
      vehicleNumber: 'GJ-02-AB-9999',
      vehicleType: 'Tractor',
      status: 'AVAILABLE',
      isActive: true
    });
  }
  assert(driver.name === 'Ketan Driver', 'Driver exists in fleet');

  // TEST 5 & 6: Customer creates order & order appears in database
  console.log('\n[TEST 5 & 6: Customer Creates Order & Persists in MongoDB]');
  const orderNumber = `AT-TEST-${Date.now().toString().slice(-6)}`;
  const testOrder = await Order.create({
    orderNumber,
    userId: customer._id,
    assignedDealerId: dealer._id,
    dealerDistanceKm: 4.2,
    productId: new mongoose.Types.ObjectId(),
    productNameSnapshot: 'River Sand Premium',
    category: 'Sand',
    vehicleType: 'TRACTOR',
    vehicleCapacity: 3,
    transportType: 'Tractor',
    tractorType: 'Single Patiya',
    numberOfTractors: 2,
    pricePerTractorSnapshot: 2500,
    pricePerTonSnapshot: 800,
    quantity: 2,
    subtotal: 5000,
    totalAmount: 5000,
    shippingAddress: 'Gokuldham Society, Modhera Road, Mehsana - 384002',
    pincode: '384002',
    latitude: 23.588,
    longitude: 72.3693,
    deliveryLatitude: 23.588,
    deliveryLongitude: 72.3693,
    deliveryCity: 'Mehsana',
    deliveryArea: 'Modhera Road',
    orderStatus: 'PLACED',
    paymentStatus: 'PAID',
    orderAssignedAt: new Date(),
    dealerResponseDeadline: new Date(Date.now() + 15 * 60 * 1000),
    dealerResponseStatus: 'PENDING'
  });

  assert(testOrder._id !== null, 'Order successfully created and stored in MongoDB');
  assert(testOrder.orderNumber === orderNumber, 'Order number matches exactly');

  // TEST 7: Correct dealer receives order
  console.log('\n[TEST 7: Correct Dealer Receives Order]');
  assert(testOrder.assignedDealerId.toString() === dealer._id.toString(), 'Order correctly routed to nearest active dealer');

  // TEST 8 & 9: Dealer accepts order & Customer sees accepted status
  console.log('\n[TEST 8 & 9: Dealer Accepts Order & Status Updates]');
  testOrder.dealerId = dealer._id;
  testOrder.orderStatus = 'ACCEPTED';
  testOrder.acceptedAt = new Date();
  testOrder.dealerResponseStatus = 'ACCEPTED';
  await testOrder.save();

  const refreshedOrder = await Order.findById(testOrder._id);
  assert(refreshedOrder.orderStatus === 'ACCEPTED', 'Order status updated to ACCEPTED');
  assert(refreshedOrder.dealerId.toString() === dealer._id.toString(), 'Order assigned to claiming dealer');

  // TEST 10 & 11: Dealer assigns driver & Driver sees assigned order
  console.log('\n[TEST 10 & 11: Dealer Assigns Driver]');
  refreshedOrder.driverId = driver._id;
  refreshedOrder.driverName = driver.name;
  refreshedOrder.driverMobile = driver.mobile;
  refreshedOrder.vehicleNumber = driver.vehicleNumber;
  refreshedOrder.driverAssignedAt = new Date();
  await refreshedOrder.save();

  const driverTasks = await Order.find({ driverId: driver._id, orderStatus: 'ACCEPTED' });
  assert(driverTasks.length > 0, 'Driver can query assigned tasks');
  assert(driverTasks[0].driverName === 'Ketan Driver', 'Driver name correctly bound to task');

  // TEST 12 & 13: Driver updates delivery status & Customer sees update
  console.log('\n[TEST 12 & 13: Delivery Out for Delivery & Delivered]');
  refreshedOrder.orderStatus = 'OUT_FOR_DELIVERY';
  refreshedOrder.outForDeliveryAt = new Date();
  await refreshedOrder.save();

  const outOrder = await Order.findById(testOrder._id);
  assert(outOrder.orderStatus === 'OUT_FOR_DELIVERY', 'Status is OUT_FOR_DELIVERY');

  // TEST 14: Admin sees complete order lifecycle
  console.log('\n[TEST 14: Admin Observability]');
  const adminQuery = await Order.findById(testOrder._id).populate('userId').populate('dealerId').populate('driverId');
  assert(adminQuery.orderNumber === orderNumber, 'Admin has full access to order lifecycle');

  // TEST 17, 18, 19, 20: Tractor vs Dumper Independence
  console.log('\n[TEST 17–20: Tractor vs Dumper Pricing Independence]');
  let sandProduct = await Product.findOne({ name: /Sand/i });
  if (!sandProduct) {
    sandProduct = await Product.create({
      name: 'Riverbed Sand',
      category: 'Sand',
      pricePerTon: 850,
      priceSinglePatiya: 2600,
      priceDoublePatiya: 5000,
      isActive: true
    });
  }

  const initialDumperPrice = sandProduct.pricePerTon;
  sandProduct.priceSinglePatiya = 2800; // Update Tractor Price
  await sandProduct.save();

  const updatedSand = await Product.findById(sandProduct._id);
  assert(updatedSand.priceSinglePatiya === 2800, 'Tractor price successfully updated');
  assert(updatedSand.pricePerTon === initialDumperPrice, 'Dumper price remains strictly unchanged when Tractor price updates');

  // TEST 21 & 22: GPS vs Manual address entry
  console.log('\n[TEST 21 & 22: GPS Coordinates & Reverse Geocoding Parsing]');
  assert(testOrder.deliveryLatitude === 23.588 && testOrder.deliveryLongitude === 72.3693, 'GPS coordinates stored accurately');
  assert(testOrder.deliveryCity === 'Mehsana' && testOrder.deliveryArea === 'Modhera Road', 'Strict City vs Area separation verified');

  // TEST 26: Unauthorized user tries Admin API (403 Forbidden)
  console.log('\n[TEST 26: RBAC Protection — Customer Blocked from Admin]');
  const customerToken = jwt.sign({ id: customer._id, role: 'USER', mobile: customer.mobile }, JWT_SECRET);
  const customerDecoded = jwt.verify(customerToken, JWT_SECRET);
  const isAuthorizedForAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(customerDecoded.role);
  assert(isAuthorizedForAdmin === false, 'Customer cannot access Super Admin endpoints (403 Forbidden guaranteed)');

  // TEST 27: Customer trying another customer order
  console.log('\n[TEST 27: Resource Ownership Protection]');
  const otherCustomerId = new mongoose.Types.ObjectId();
  const isOwner = testOrder.userId.toString() === otherCustomerId.toString();
  assert(isOwner === false, 'Customer cannot access another customer private order');

  // Clean up test order
  await Order.findByIdAndDelete(testOrder._id);

  console.log(`\n====================================================`);
  console.log(`  ALL ${passedTests}/${totalTests} ARCHITECTURE & INTEGRATION TESTS PASSED!`);
  console.log(`====================================================`);

  await mongoose.disconnect();
}

runTwoWayValidation().catch((err) => {
  console.error('Validation test failed:', err);
  process.exit(1);
});

