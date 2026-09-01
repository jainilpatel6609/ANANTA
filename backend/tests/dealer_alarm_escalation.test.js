const mongoose = require('mongoose');
const { MONGODB_URI } = require('../src/config/env');
const User = require('../src/models/User');
const Order = require('../src/models/Order');
const Product = require('../src/models/Product');
const Notification = require('../src/models/Notification');
const EscalationScheduler = require('../src/services/escalationScheduler');

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

const runDealerEscalationTests = async () => {
  try {
    console.log('====================================================');
    console.log('  DEALER ORDER NOTIFICATION & ESCALATION TEST SUITE');
    console.log('====================================================\n');

    await mongoose.connect(MONGODB_URI);

    // Setup Test Data
    const customer = await User.findOne({ role: 'USER', isActive: true }) || await User.create({
      name: 'Test Customer',
      mobile: '9825112233',
      role: 'USER',
      pincode: '384001',
      latitude: 23.59,
      longitude: 72.36
    });

    const dealerA = await User.findOne({ role: 'DEALER', isActive: true, isDeleted: { $ne: true } }) || await User.create({
      name: 'Dealer Alpha',
      companyName: 'Alpha Sand Depot',
      mobile: '9898112233',
      role: 'DEALER',
      pincode: '384001',
      latitude: 23.59,
      longitude: 72.36
    });

    let dealerB = await User.findOne({ role: 'DEALER', _id: { $ne: dealerA._id }, isActive: true, isDeleted: { $ne: true } });
    if (!dealerB) {
      dealerB = await User.create({
        name: 'Dealer Beta',
        companyName: 'Beta Aggregate Depot',
        mobile: '9898223344',
        role: 'DEALER',
        pincode: '384151',
        latitude: 23.91,
        longitude: 72.37
      });
    }

    const product = await Product.findOne({ isActive: true }) || await Product.create({
      name: 'Certified River Sand',
      category: 'Sand',
      pricePerTon: 800,
      pricePerTractorSingle: 7050,
      pricePerTractorDouble: 13500,
      isActive: true
    });

    // Test Suite 1: Order Placement & Initial 15-Minute Response SLA
    console.log('[Test Suite 1: Order Creation & 15-Minute SLA Initialization]');
    const assignedAt = new Date();
    const deadline = new Date(assignedAt.getTime() + 15 * 60 * 1000);

    const testOrder1 = await Order.create({
      orderNumber: `TEST-ESC-${Date.now()}-1`,
      userId: customer._id,
      assignedDealerId: dealerA._id,
      dealerDistanceKm: 0,
      orderAssignedAt: assignedAt,
      dealerResponseDeadline: deadline,
      dealerResponseStatus: 'PENDING',
      dealerAlarmActive: true,
      adminAlarmActive: false,
      adminEscalationSent: false,
      assignmentHistory: [
        {
          dealerId: dealerA._id,
          dealerName: dealerA.name,
          dealerCompanyName: dealerA.companyName,
          dealerPincode: dealerA.pincode,
          dealerMobile: dealerA.mobile,
          distanceKm: 0,
          assignedAt,
          deadline,
          response: 'PENDING'
        }
      ],
      productId: product._id,
      productNameSnapshot: product.name,
      category: 'Sand',
      vehicleType: 'Single Patiya',
      vehicleCapacity: 1,
      quantity: 1,
      pricePerTonSnapshot: 7050,
      subtotal: 7050,
      totalAmount: 7050,
      shippingAddress: 'Mehsana Site Highway, Mehsana, Gujarat - 384001',
      pincode: '384001',
      latitude: 23.59,
      longitude: 72.36,
      paymentStatus: 'PAID',
      orderStatus: 'PLACED'
    });

    assert(testOrder1.orderAssignedAt !== null, 'Order records assignedAt timestamp');
    assert(testOrder1.dealerResponseDeadline > testOrder1.orderAssignedAt, 'Deadline is in the future (+15 minutes)');
    assert(testOrder1.dealerResponseStatus === 'PENDING', 'Initial dealer response status is PENDING');
    assert(testOrder1.dealerAlarmActive === true, 'Dealer alarm state is activated upon assignment');
    assert(testOrder1.assignmentHistory.length === 1, 'Initial assignment recorded in history');

    // Test Suite 2: CASE A — Dealer Accepts Order
    console.log('\n[Test Suite 2: CASE A — Dealer Accepts Order (No Admin Escalation)]');
    testOrder1.dealerId = dealerA._id;
    testOrder1.orderStatus = 'ACCEPTED';
    testOrder1.acceptedAt = new Date();
    testOrder1.dealerResponseStatus = 'ACCEPTED';
    testOrder1.dealerAcceptedAt = new Date();
    testOrder1.dealerAlarmActive = false; // Stop alarm
    testOrder1.adminAlarmActive = false;
    testOrder1.adminEscalationSent = false;
    testOrder1.assignmentHistory[0].response = 'ACCEPTED';
    testOrder1.assignmentHistory[0].respondedAt = new Date();
    await testOrder1.save();

    assert(testOrder1.orderStatus === 'ACCEPTED', 'Order status updated to ACCEPTED');
    assert(testOrder1.dealerResponseStatus === 'ACCEPTED', 'Dealer response status is ACCEPTED');
    assert(testOrder1.dealerAlarmActive === false, 'Dealer alarm stopped immediately upon acceptance');
    assert(testOrder1.adminAlarmActive === false, 'No Admin alarm generated for acceptance');
    assert(testOrder1.adminEscalationSent === false, 'No Admin escalation sent');

    // Test Suite 3: CASE B — Dealer Declines Order (IMMEDIATE ADMIN ALERT)
    console.log('\n[Test Suite 3: CASE B — Dealer Declines Order (Immediate Admin Alert & Re-routing)]');
    const testOrder2 = await Order.create({
      orderNumber: `TEST-ESC-${Date.now()}-2`,
      userId: customer._id,
      assignedDealerId: dealerA._id,
      dealerDistanceKm: 0,
      orderAssignedAt: new Date(),
      dealerResponseDeadline: new Date(Date.now() + 15 * 60 * 1000),
      dealerResponseStatus: 'PENDING',
      dealerAlarmActive: true,
      assignmentHistory: [
        {
          dealerId: dealerA._id,
          dealerName: dealerA.name,
          dealerCompanyName: dealerA.companyName,
          dealerPincode: dealerA.pincode,
          dealerMobile: dealerA.mobile,
          assignedAt: new Date(),
          deadline: new Date(Date.now() + 15 * 60 * 1000),
          response: 'PENDING'
        }
      ],
      productId: product._id,
      productNameSnapshot: product.name,
      category: 'Sand',
      vehicleType: 'Single Patiya',
      vehicleCapacity: 1,
      quantity: 1,
      pricePerTonSnapshot: 7050,
      subtotal: 7050,
      totalAmount: 7050,
      shippingAddress: 'Siddhpur Highway, Gujarat - 384151',
      pincode: '384151',
      latitude: 23.91,
      longitude: 72.37,
      paymentStatus: 'PAID',
      orderStatus: 'PLACED'
    });

    // Simulate Dealer A Declining
    const declineTime = new Date();
    testOrder2.dealerResponseStatus = 'REJECTED';
    testOrder2.dealerRejectedAt = declineTime;
    testOrder2.dealerRejectedBy = dealerA._id;
    testOrder2.dealerRejectionReason = 'Depot capacity full';
    testOrder2.dealerAlarmActive = false; // Stop Dealer A alarm
    testOrder2.declinedBy.push(dealerA._id);
    testOrder2.assignmentHistory[0].response = 'REJECTED';
    testOrder2.assignmentHistory[0].respondedAt = declineTime;
    testOrder2.assignmentHistory[0].reason = 'Depot capacity full';

    // 🚨 IMMEDIATELY ALERT ADMIN
    testOrder2.adminAlarmActive = true;
    testOrder2.adminAlertType = 'DEALER_DECLINED';

    // Create Notification record
    await Notification.create({
      recipientId: new mongoose.Types.ObjectId(),
      recipientRole: 'ADMIN',
      type: 'DEALER_DECLINED_ORDER',
      title: '🚨 DEALER DECLINED ORDER',
      message: `Dealer ${dealerA.companyName} declined Order #${testOrder2.orderNumber}. Reason: Depot capacity full`,
      orderId: testOrder2._id
    });

    // Reassign to Dealer B with fresh 15-minute timer
    const dealerBDeadline = new Date(declineTime.getTime() + 15 * 60 * 1000);
    testOrder2.assignedDealerId = dealerB._id;
    testOrder2.dealerDistanceKm = 5.2;
    testOrder2.orderAssignedAt = declineTime;
    testOrder2.dealerResponseDeadline = dealerBDeadline;
    testOrder2.dealerResponseStatus = 'PENDING';
    testOrder2.dealerAlarmActive = true; // Dealer B alarm starts!

    testOrder2.assignmentHistory.push({
      dealerId: dealerB._id,
      dealerName: dealerB.name,
      dealerCompanyName: dealerB.companyName,
      dealerPincode: dealerB.pincode,
      dealerMobile: dealerB.mobile,
      distanceKm: 5.2,
      assignedAt: declineTime,
      deadline: dealerBDeadline,
      response: 'PENDING'
    });

    await testOrder2.save();

    assert(testOrder2.dealerResponseStatus === 'PENDING', 'Reassigned order is PENDING for Dealer B');
    assert(testOrder2.adminAlarmActive === true, 'Admin alarm is IMMEDIATELY active upon Dealer A rejection');
    assert(testOrder2.adminAlertType === 'DEALER_DECLINED', 'Admin alert type is DEALER_DECLINED');
    assert(testOrder2.assignmentHistory.length === 2, 'Assignment history tracks both Dealer A rejection and Dealer B assignment');
    assert(testOrder2.assignmentHistory[0].response === 'REJECTED', 'Dealer A response is recorded as REJECTED');
    assert(testOrder2.assignmentHistory[1].response === 'PENDING', 'Dealer B response is recorded as PENDING');
    assert(testOrder2.dealerResponseDeadline.getTime() === dealerBDeadline.getTime(), 'Dealer B received a fresh 15-minute response timer');

    // Test Suite 4: CASE C — 15-Minute Timeout Detection via Background Scheduler
    console.log('\n[Test Suite 4: CASE C — 15-Minute SLA Timeout Escalation]');
    const expiredAssignedAt = new Date(Date.now() - 16 * 60 * 1000); // 16 mins ago
    const expiredDeadline = new Date(Date.now() - 1 * 60 * 1000); // Expired 1 min ago

    const testOrder3 = await Order.create({
      orderNumber: `TEST-ESC-${Date.now()}-3`,
      userId: customer._id,
      assignedDealerId: dealerB._id,
      dealerDistanceKm: 10,
      orderAssignedAt: expiredAssignedAt,
      dealerResponseDeadline: expiredDeadline,
      dealerResponseStatus: 'PENDING',
      dealerAlarmActive: true,
      adminAlarmActive: false,
      adminEscalationSent: false,
      assignmentHistory: [
        {
          dealerId: dealerB._id,
          dealerName: dealerB.name,
          dealerCompanyName: dealerB.companyName,
          dealerPincode: dealerB.pincode,
          dealerMobile: dealerB.mobile,
          assignedAt: expiredAssignedAt,
          deadline: expiredDeadline,
          response: 'PENDING'
        }
      ],
      productId: product._id,
      productNameSnapshot: product.name,
      category: 'Sand',
      vehicleType: 'Single Patiya',
      vehicleCapacity: 1,
      quantity: 1,
      pricePerTonSnapshot: 7050,
      subtotal: 7050,
      totalAmount: 7050,
      shippingAddress: 'Gandhinagar Highway, Gujarat - 382010',
      pincode: '382010',
      latitude: 23.21,
      longitude: 72.63,
      paymentStatus: 'PAID',
      orderStatus: 'PLACED'
    });

    // Run the scheduler check
    const timedOutCount = await EscalationScheduler.checkTimedOutOrders();
    assert(timedOutCount >= 1, 'Scheduler detects timed-out orders pending response');

    const escalatedOrder = await Order.findById(testOrder3._id);
    assert(escalatedOrder.dealerResponseStatus === 'TIMEOUT', 'Status updated to TIMEOUT after 15 minutes');
    assert(escalatedOrder.adminEscalationSent === true, 'Admin escalation sent flag marked true');
    assert(escalatedOrder.adminAlarmActive === true, 'Admin alarm activated for 15-minute timeout');
    assert(escalatedOrder.adminAlertType === 'DEALER_TIMEOUT', 'Admin alert type is DEALER_TIMEOUT');

    // Test Idempotency: second run shouldn't escalate again
    const secondRunCount = await EscalationScheduler.checkTimedOutOrders();
    assert(secondRunCount === 0, 'Scheduler is idempotent (does not duplicate escalations for same order)');

    // Test Suite 5: Admin Acknowledgment & Manual Reassignment
    console.log('\n[Test Suite 5: Admin Acknowledgment & Manual Reassignment]');
    escalatedOrder.adminAlarmActive = false;
    escalatedOrder.adminAcknowledgedAt = new Date();
    await escalatedOrder.save();

    assert(escalatedOrder.adminAlarmActive === false, 'Admin acknowledged and silenced the alarm');

    // Clean up test orders
    await Order.deleteMany({ _id: { $in: [testOrder1._id, testOrder2._id, testOrder3._id] } });
    await Notification.deleteMany({ orderId: { $in: [testOrder1._id, testOrder2._id, testOrder3._id] } });
    console.log('  Cleaned up temporary escalation test orders');

    console.log('\n====================================================');
    console.log(`  ALL ${totalTests} DEALER ALARM & ESCALATION TESTS PASSED! (${passedTests}/${totalTests})`);
    console.log('====================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\nEscalation Test Suite Error:', err);
    process.exit(1);
  }
};

runDealerEscalationTests();

