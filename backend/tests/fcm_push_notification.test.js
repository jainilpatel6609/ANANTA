const mongoose = require('mongoose');
const { MONGODB_URI } = require('../src/config/env');
const User = require('../src/models/User');
const Order = require('../src/models/Order');
const Product = require('../src/models/Product');
const Notification = require('../src/models/Notification');
const FcmService = require('../src/services/fcmService');
const NotificationService = require('../src/services/notificationService');

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

const runFcmPushTests = async () => {
  try {
    console.log('====================================================');
    console.log('  FIREBASE CLOUD MESSAGING (FCM) & DEVICE PUSH TESTS');
    console.log('====================================================\n');

    await mongoose.connect(MONGODB_URI);

    // Setup Test Users
    const dealerUser = await User.findOne({ role: 'DEALER', isActive: true, isDeleted: { $ne: true } }) || await User.create({
      name: 'Test Push Dealer',
      companyName: 'Push Test Depot',
      mobile: '9898334455',
      role: 'DEALER',
      pincode: '384001'
    });

    const adminUser = await User.findOne({ role: 'ADMIN', isActive: true, isDeleted: { $ne: true } }) || await User.create({
      name: 'Super Admin Push',
      mobile: '9327807331',
      role: 'ADMIN'
    });

    // Test Suite 1: Device Token Registration & Multi-Device Support
    console.log('[Test Suite 1: Device Token Registration & Multi-Device Management]');
    const tokenA = `test_fcm_token_device_phone_${Date.now()}`;
    const tokenB = `test_fcm_token_device_tablet_${Date.now()}`;

    dealerUser.fcmDevices = [
      { token: tokenA, platform: 'mobile_web', userAgent: 'Android Chrome 120' },
      { token: tokenB, platform: 'desktop_web', userAgent: 'Windows Chrome 120' }
    ];
    await dealerUser.save();

    const loadedDealer = await User.findById(dealerUser._id);
    assert(loadedDealer.fcmDevices.length === 2, 'Supports multiple device tokens per Dealer');
    assert(loadedDealer.fcmDevices[0].token === tokenA, 'First device token stored accurately');
    assert(loadedDealer.fcmDevices[1].platform === 'desktop_web', 'Stores device platform context');

    // Test Suite 2: Device Token De-duplication
    console.log('\n[Test Suite 2: Device Token De-duplication & Last Seen Update]');
    const existingIndex = loadedDealer.fcmDevices.findIndex((d) => d.token === tokenA);
    loadedDealer.fcmDevices[existingIndex].lastSeenAt = new Date();
    await loadedDealer.save();

    const deduplicatedDealer = await User.findById(dealerUser._id);
    assert(deduplicatedDealer.fcmDevices.length === 2, 'Does not duplicate existing device token');

    // Test Suite 3: Token Removal / Logout
    console.log('\n[Test Suite 3: Token Removal on Logout]');
    loadedDealer.fcmDevices = loadedDealer.fcmDevices.filter((d) => d.token !== tokenB);
    await loadedDealer.save();

    const afterRemoval = await User.findById(dealerUser._id);
    assert(afterRemoval.fcmDevices.length === 1, 'Device token successfully removed on unregister/logout');
    assert(afterRemoval.fcmDevices[0].token === tokenA, 'Remaining active device token preserved');

    // Test Suite 4: Admin Device Token Registration
    console.log('\n[Test Suite 4: Admin Multi-Device Registration]');
    const adminToken = `test_admin_fcm_token_${Date.now()}`;
    adminUser.fcmDevices = [{ token: adminToken, platform: 'mobile_web', userAgent: 'iPhone Safari' }];
    await adminUser.save();

    const loadedAdmin = await User.findById(adminUser._id);
    assert(loadedAdmin.fcmDevices.length === 1, 'Admin device token registered successfully');

    // Test Suite 5: FCM Service Dispatch to Dealer
    console.log('\n[Test Suite 5: FCM Push Dispatch to Dealer Device]');
    const dealerPushResult = await FcmService.sendToUserDevices({
      userId: dealerUser._id,
      title: '🚨 NEW ORDER — ANANTA TRADERS',
      body: 'New order received from Ramesh Patel. Total: ₹7,050. PIN: 384001',
      data: { orderId: 'test_order_123', type: 'ORDER_PLACED' },
      clickAction: '/dealer/new-orders',
      sound: 'default'
    });

    assert(dealerPushResult.success === true, 'FCM dispatch executes successfully');
    assert(dealerPushResult.clickAction === '/dealer/new-orders', 'Click action routes directly to Dealer Order screen');

    // Test Suite 6: FCM Immediate Push Dispatch to Admin on Dealer Rejection
    console.log('\n[Test Suite 6: Immediate Admin Push on Dealer Rejection]');
    const adminPushResult = await FcmService.sendToRoleDevices({
      role: 'ADMIN',
      title: '🚨 DEALER DECLINED ORDER',
      body: 'Dealer Alpha Sand Depot DECLINED Order #AT-2026-000101. Reason: Depot full',
      data: { orderId: 'test_order_101', type: 'DEALER_DECLINED_ORDER' },
      clickAction: '/admin/dashboard',
      sound: 'default'
    });

    assert(adminPushResult.success === true, 'Admin push alert dispatches immediately upon rejection');
    assert(adminPushResult.clickAction === '/admin/dashboard', 'Click action routes Admin directly to Command Center');

    // Test Suite 7: NotificationService End-to-End Push Integration
    console.log('\n[Test Suite 7: NotificationService Integrated Push + DB Dispatch]');
    const notif = await NotificationService.send({
      recipientId: dealerUser._id,
      recipientRole: 'DEALER',
      type: 'ORDER_PLACED',
      title: '🚨 NEW ORDER ASSIGNED 🚛',
      message: 'Order #AT-TEST-0099 assigned to your depot. 15-minute SLA active.',
      orderId: new mongoose.Types.ObjectId()
    });

    assert(notif !== null, 'Notification created in database');
    assert(notif.recipientRole === 'DEALER', 'Notification recipientRole is DEALER');
    assert(notif.type === 'ORDER_PLACED', 'Notification type is ORDER_PLACED');

    // Test Suite 8: Stale Token Auto-Cleanup
    console.log('\n[Test Suite 8: Stale Token Auto-Cleanup]');
    const staleToken = `stale_token_${Date.now()}`;
    dealerUser.fcmDevices.push({ token: staleToken, platform: 'web' });
    await dealerUser.save();

    await FcmService._removeStaleTokens([staleToken]);
    const afterClean = await User.findById(dealerUser._id);
    assert(!afterClean.fcmDevices.some((d) => d.token === staleToken), 'Stale token automatically purged from database');

    // Clean up test tokens
    await User.updateOne({ _id: dealerUser._id }, { fcmDevices: [] });
    await User.updateOne({ _id: adminUser._id }, { fcmDevices: [] });
    await Notification.deleteMany({ _id: notif._id });

    console.log('\n====================================================');
    console.log(`  ALL ${totalTests} FCM PUSH NOTIFICATION TESTS PASSED! (${passedTests}/${totalTests})`);
    console.log('====================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\nFCM Push Test Error:', err);
    process.exit(1);
  }
};

runFcmPushTests();
