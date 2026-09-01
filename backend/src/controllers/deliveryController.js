const Order = require('../models/Order');
const OtpService = require('../services/otpService');
const SmsService = require('../services/smsService');
const NotificationService = require('../services/notificationService');
const { processUploadedFile } = require('../middleware/upload');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// @desc    Dealer assigns Driver information and uploads Royalty & Weighbridge documents
// @route   POST /api/orders/:id/dispatch
// @access  Private (Dealer)
const dispatchOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { driverName, driverMobile, vehicleNumber } = req.body;

    const order = await Order.findById(orderId).populate('userId', 'name mobile whatsappNumber');
    if (!order) {
      return errorResponse(res, 'Order not found.', 404);
    }

    if (order.dealerId.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Unauthorized. You are not assigned to this order.', 403);
    }

    if (!['ACCEPTED', 'OUT_FOR_DELIVERY'].includes(order.orderStatus)) {
      return errorResponse(res, `Cannot dispatch order with status ${order.orderStatus}.`, 400);
    }

    if (!driverName || !driverMobile || !vehicleNumber) {
      return errorResponse(res, 'Driver name, driver mobile number, and vehicle registration number are required.', 400);
    }

    // Process file uploads if present in files
    let riverRoyaltyUrl = order.riverRoyaltyUrl;
    let waybridgePhotoUrl = order.waybridgePhotoUrl;

    if (req.files) {
      if (req.files.riverRoyalty && req.files.riverRoyalty[0]) {
        riverRoyaltyUrl = await processUploadedFile(req.files.riverRoyalty[0], 'ananta_traders/royalty');
      }
      if (req.files.waybridgePhoto && req.files.waybridgePhoto[0]) {
        waybridgePhotoUrl = await processUploadedFile(req.files.waybridgePhoto[0], 'ananta_traders/waybridge');
      }
    }

    // Also support direct URLs if passed in body
    if (req.body.riverRoyaltyUrl) riverRoyaltyUrl = req.body.riverRoyaltyUrl;
    if (req.body.waybridgePhotoUrl) waybridgePhotoUrl = req.body.waybridgePhotoUrl;

    if (!riverRoyaltyUrl || !waybridgePhotoUrl) {
      return errorResponse(res, 'Both River Royalty photo and Weighbridge slip photo must be uploaded before dispatch.', 400);
    }

    // Generate secure 6-digit Delivery OTP
    const { rawOtp, otpHash, expiresAt } = await OtpService.generateOtp(1440); // 24 hours

    order.driverName = driverName.trim();
    order.driverMobile = driverMobile.trim();
    order.vehicleNumber = vehicleNumber.trim().toUpperCase();
    order.riverRoyaltyUrl = riverRoyaltyUrl;
    order.waybridgePhotoUrl = waybridgePhotoUrl;
    order.deliveryOtpHash = otpHash;
    order.deliveryOtpExpiresAt = expiresAt;
    order.otpAttempts = 0;
    order.orderStatus = 'OUT_FOR_DELIVERY';
    order.outForDeliveryAt = new Date();

    await order.save();

    const customerMobile = order.userId.mobile || order.userId.whatsappNumber;

    // 1. Dispatch real-time SMS to customer's mobile
    await SmsService.sendDeliveryOtpSms({
      mobile: customerMobile,
      otp: rawOtp,
      orderNumber: order.orderNumber,
      driverName: order.driverName,
      vehicleNumber: order.vehicleNumber
    });

    // 2. In-App & Multi-Channel Notification
    await NotificationService.send({
      recipientId: order.userId._id,
      recipientRole: 'USER',
      type: 'OUT_FOR_DELIVERY',
      title: 'Material Out for Delivery! 🚚',
      message: `Your material is en route! Driver: ${driverName} (${driverMobile}), Vehicle: ${order.vehicleNumber}. Your Delivery OTP is ${rawOtp}. Share this OTP with the driver only upon receiving the material.`,
      orderId: order._id,
      targetPhone: customerMobile
    });

    return successResponse(res, 'Order dispatched successfully. Driver details and Delivery OTP sent to customer via SMS.', {
      order
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Dealer verifies delivery OTP provided by customer at drop-off
// @route   POST /api/orders/:id/verify-otp
// @access  Private (Dealer, Admin)
const verifyDeliveryOtp = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { otp } = req.body;

    if (!otp) {
      return errorResponse(res, 'Please provide the 6-digit delivery OTP.', 400);
    }

    const order = await Order.findById(orderId).populate('userId', 'name mobile whatsappNumber');
    if (!order) {
      return errorResponse(res, 'Order not found.', 404);
    }

    const isAssignedDealer = order.dealerId && order.dealerId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'ADMIN';

    if (!isAssignedDealer && !isAdmin) {
      return errorResponse(res, 'Unauthorized to verify delivery for this order.', 403);
    }

    if (order.orderStatus === 'DELIVERED') {
      return errorResponse(res, 'This order has already been marked as DELIVERED.', 400);
    }

    if (order.orderStatus !== 'OUT_FOR_DELIVERY') {
      return errorResponse(res, `Cannot verify OTP for order in state '${order.orderStatus}'. Must be 'OUT_FOR_DELIVERY'.`, 400);
    }

    // Increment attempts
    order.otpAttempts = (order.otpAttempts || 0) + 1;

    // Verify OTP cryptographic hash
    const verification = await OtpService.verifyOtp(
      otp,
      order.deliveryOtpHash,
      order.deliveryOtpExpiresAt,
      order.otpAttempts
    );

    if (!verification.isValid) {
      await order.save();
      return errorResponse(res, verification.reason, 400);
    }

    // Mark order as DELIVERED
    order.orderStatus = 'DELIVERED';
    order.deliveredAt = new Date();
    order.deliveryVerifiedAt = new Date();
    await order.save();

    // Send confirmation notifications
    await NotificationService.send({
      recipientId: order.userId._id,
      recipientRole: 'USER',
      type: 'ORDER_DELIVERED',
      title: 'Order Delivered & Verified! ✅',
      message: `Your order #${order.orderNumber} (${order.quantity} Tons of ${order.productNameSnapshot}) has been successfully delivered and verified. Thank you for choosing ANANTA TRADERS!`,
      orderId: order._id
    });

    await NotificationService.notifyAdmin({
      title: 'Delivery Completed',
      message: `Order #${order.orderNumber} successfully delivered by dealer ${req.user.companyName || req.user.name}.`,
      orderId: order._id
    });

    return successResponse(res, 'Delivery OTP verified successfully! Order marked as DELIVERED.', { order });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Customer or Admin view generated OTP (Customer Portal)
// @route   GET /api/orders/:id/otp
// @access  Private (User, Admin)
const getDeliveryOtp = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return errorResponse(res, 'Order not found.', 404);
    }

    const isOwner = order.userId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return errorResponse(res, 'Unauthorized to view OTP.', 403);
    }

    return successResponse(res, 'Delivery OTP status.', {
      hasOtp: Boolean(order.deliveryOtpHash),
      expiresAt: order.deliveryOtpExpiresAt,
      orderStatus: order.orderStatus,
      attempts: order.otpAttempts
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  dispatchOrder,
  verifyDeliveryOtp,
  getDeliveryOtp
};
