const Order = require('../models/Order');
const Payment = require('../models/Payment');
const User = require('../models/User');
const RazorpayService = require('../services/razorpayService');
const NotificationService = require('../services/notificationService');
const OtpService = require('../services/otpService');
const SmsService = require('../services/smsService');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { emitNewOrder, emitOrderStatusUpdate } = require('../sockets/socket');

// @desc    Runs immediately after the DUMPER final (weight-based) payment succeeds: generates
//          the delivery OTP, dispatches the order, and notifies Dealer + Driver + Admin. Shared
//          by both verifyFinalPayment and devConfirmFinalPayment so the two stay in lockstep.
const dispatchAfterFinalPayment = async (order) => {
  const { rawOtp, otpHash, expiresAt } = await OtpService.generateOtp(1440); // 24 hours

  order.deliveryOtpHash = otpHash;
  order.deliveryOtpDisplay = rawOtp;
  order.deliveryOtpExpiresAt = expiresAt;
  order.otpAttempts = 0;
  order.orderStatus = 'OUT_FOR_DELIVERY';
  order.outForDeliveryAt = new Date();
  order.fulfillmentStage = 'DISPATCHED';
  await order.save();

  const customerMobile = order.userId.mobile || order.userId.whatsappNumber;

  await SmsService.sendDeliveryOtpSms({
    mobile: customerMobile,
    otp: rawOtp,
    orderNumber: order.orderNumber,
    driverName: order.driverName,
    vehicleNumber: order.vehicleNumber
  }).catch((err) => console.warn('[SMS Delivery OTP Warning]', err.message));

  await NotificationService.send({
    recipientId: order.userId._id,
    recipientRole: 'USER',
    type: 'OUT_FOR_DELIVERY',
    title: 'Material Out for Delivery! 🚚',
    message: `Final payment received for order #${order.orderNumber}. Driver: ${order.driverName} (${order.driverMobile}), Vehicle: ${order.vehicleNumber}. Your Delivery OTP is ${rawOtp}. Share this OTP with the driver only upon receiving the material.`,
    orderId: order._id,
    targetPhone: customerMobile
  });

  if (order.dealerId) {
    await NotificationService.send({
      recipientId: order.dealerId,
      recipientRole: 'DEALER',
      type: 'GENERAL',
      title: 'Final Payment Received ✅',
      message: `Order #${order.orderNumber}: final payment of ₹${order.finalPaymentAmount.toLocaleString('en-IN')} received. The Dumper is cleared for dispatch.`,
      orderId: order._id
    });
  }

  await NotificationService.notifyAdmin({
    title: 'Final Payment Received — Dumper Dispatched',
    message: `Order #${order.orderNumber}: final payment of ₹${order.finalPaymentAmount.toLocaleString('en-IN')} received (${order.totalWeight} Ton). Dumper dispatched.`,
    orderId: order._id
  });

  // Drivers don't yet have push-notification device tokens wired up (a separate piece of
  // infrastructure), so they're reached via the same SMS channel already used to assign them.
  if (order.driverMobile) {
    await SmsService.sendSms({
      mobile: order.driverMobile,
      message: `ANANTA TRADERS: Final payment received for order #${order.orderNumber}. You are cleared to dispatch to the delivery address now.`,
      type: 'GENERAL'
    }).catch((err) => console.warn('[SMS Driver Dispatch Warning]', err.message));
  }

  emitOrderStatusUpdate(order);
};

// @desc    Verify Razorpay Payment Signature
// @route   POST /api/payments/verify
// @access  Private (User)
const verifyPayment = async (req, res) => {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!orderId || !razorpayOrderId || !razorpayPaymentId) {
      return errorResponse(res, 'Missing payment verification credentials.', 400);
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return errorResponse(res, 'Order not found.', 404);
    }

    if (order.userId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return errorResponse(res, 'Unauthorized access to this order payment.', 403);
    }

    // Verify cryptographic signature
    const isValid = RazorpayService.verifySignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    });

    if (!isValid) {
      order.paymentStatus = 'FAILED';
      order.orderStatus = 'PAYMENT_FAILED';
      await order.save();

      await Payment.create({
        orderId: order._id,
        userId: req.user._id,
        razorpayOrderId,
        razorpayPaymentId,
        amount: order.totalAmount,
        status: 'FAILED',
        signature: razorpaySignature || ''
      });

      return errorResponse(res, 'Payment signature verification failed. Please contact your bank or try again.', 400);
    }

    // Payment Verified Successfully
    order.paymentStatus = 'PAID';
    order.paymentId = razorpayPaymentId;
    order.orderStatus = 'PLACED';
    
    // Initialize 15-Minute Dealer Response Timer & Alarm
    const assignedAt = new Date();
    const deadline = new Date(assignedAt.getTime() + 15 * 60 * 1000);
    order.orderAssignedAt = assignedAt;
    order.dealerResponseDeadline = deadline;
    order.dealerResponseStatus = 'PENDING';
    order.dealerAlarmActive = !!order.assignedDealerId;
    order.adminAlarmActive = false;
    order.adminEscalationSent = false;

    if (order.assignedDealerId) {
      const assignedDealer = await User.findById(order.assignedDealerId);
      if (assignedDealer) {
        order.assignmentHistory = [
          {
            dealerId: assignedDealer._id,
            dealerName: assignedDealer.name,
            dealerCompanyName: assignedDealer.companyName,
            dealerPincode: assignedDealer.pincode,
            dealerMobile: assignedDealer.mobile,
            distanceKm: order.dealerDistanceKm,
            assignedAt,
            deadline,
            response: 'PENDING'
          }
        ];
      }
    }

    await order.save();

    await Payment.create({
      orderId: order._id,
      userId: req.user._id,
      razorpayOrderId,
      razorpayPaymentId,
      amount: order.totalAmount,
      status: 'PAID',
      signature: razorpaySignature || '',
      verifiedAt: new Date()
    });

    // Notify user
    await NotificationService.send({
      recipientId: req.user._id,
      recipientRole: 'USER',
      type: 'ORDER_PLACED',
      title: 'Payment Confirmed! 🎉',
      message: `Your payment of ₹${order.totalAmount.toLocaleString('en-IN')} for order #${order.orderNumber} is confirmed. Dealers have been notified for dispatch!`,
      orderId: order._id
    });

    // Notify assigned nearest dealer specifically or broadcast if unassigned
    if (order.assignedDealerId) {
      const assignedDealer = await User.findById(order.assignedDealerId);
      if (assignedDealer && assignedDealer.isActive) {
        await NotificationService.send({
          recipientId: assignedDealer._id,
          recipientRole: 'DEALER',
          type: 'ORDER_PLACED',
          title: '🚨 NEW ORDER ASSIGNED 🚛',
          // Deliberately excludes the customer's name/city/address — a dealer sees only distance
          // and price until they accept. Full shipping details unlock in the accepted-order view.
          message: `New order #${order.orderNumber}${order.dealerDistanceKm !== null ? ` — ${order.dealerDistanceKm} km away` : ''}: ${order.numberOfTractors || order.quantity} ${order.transportType || 'Vehicle'}${(order.numberOfTractors || order.quantity) === 1 ? '' : 's'} (${order.tractorType || order.vehicleType}) of ${order.productNameSnapshot}. Total: ₹${order.totalAmount.toLocaleString('en-IN')}. Please accept within 15 minutes.`,
          orderId: order._id,
          targetPhone: assignedDealer.whatsappNumber || assignedDealer.mobile
        });
      } else {
        await NotificationService.notifyAllDealers({
          title: 'New Delivery Order Available 🚛',
          message: `New order #${order.orderNumber}${order.dealerDistanceKm !== null ? ` — ${order.dealerDistanceKm} km away` : ''}: ${order.numberOfTractors || order.quantity} ${order.transportType || 'Vehicle'}${(order.numberOfTractors || order.quantity) === 1 ? '' : 's'} (${order.tractorType || order.vehicleType}) of ${order.productNameSnapshot}.`,
          orderId: order._id
        });
      }
    } else {
      await NotificationService.notifyAllDealers({
        title: 'New Delivery Order Available 🚛',
        message: `New order #${order.orderNumber}${order.dealerDistanceKm !== null ? ` — ${order.dealerDistanceKm} km away` : ''}: ${order.numberOfTractors || order.quantity} ${order.transportType || 'Vehicle'}${(order.numberOfTractors || order.quantity) === 1 ? '' : 's'} (${order.tractorType || order.vehicleType}) of ${order.productNameSnapshot}.`,
        orderId: order._id
      });
    }

    // Emit Real-Time Socket.IO event to Assigned / Nearby Dealers
    emitNewOrder(order.assignedDealerId, order);

    return successResponse(res, 'Payment verified successfully! Order is placed and nearest dealer is notified.', { order });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Simulate/Dev Payment Confirm (Dev helper)
// @route   POST /api/payments/dev-confirm
// @access  Private (User)
const devConfirmPayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);

    if (!order) {
      return errorResponse(res, 'Order not found.', 404);
    }

    order.paymentStatus = 'PAID';
    order.paymentId = `dev_pay_${Date.now()}`;
    order.orderStatus = 'PLACED';

    // Initialize 15-Minute Response Timer & History
    const assignedAt = new Date();
    const deadline = new Date(assignedAt.getTime() + 15 * 60 * 1000);
    order.orderAssignedAt = assignedAt;
    order.dealerResponseDeadline = deadline;
    order.dealerResponseStatus = 'PENDING';
    order.dealerAlarmActive = !!order.assignedDealerId;
    order.adminAlarmActive = false;
    order.adminEscalationSent = false;

    if (order.assignedDealerId) {
      const assignedDealer = await User.findById(order.assignedDealerId);
      if (assignedDealer) {
        order.assignmentHistory = [
          {
            dealerId: assignedDealer._id,
            dealerName: assignedDealer.name,
            dealerCompanyName: assignedDealer.companyName,
            dealerPincode: assignedDealer.pincode,
            dealerMobile: assignedDealer.mobile,
            distanceKm: order.dealerDistanceKm,
            assignedAt,
            deadline,
            response: 'PENDING'
          }
        ];
      }
    }

    await order.save();

    await Payment.create({
      orderId: order._id,
      userId: req.user._id,
      razorpayOrderId: order.razorpayOrderId || `dev_rzp_${Date.now()}`,
      razorpayPaymentId: order.paymentId,
      amount: order.totalAmount,
      status: 'PAID',
      signature: 'test_sig_dev_mode',
      verifiedAt: new Date()
    });

    // Notify user
    await NotificationService.send({
      recipientId: req.user._id,
      recipientRole: 'USER',
      type: 'ORDER_PLACED',
      title: 'Payment Confirmed! 🎉',
      message: `Payment of ₹${order.totalAmount.toLocaleString('en-IN')} confirmed for order #${order.orderNumber}.`,
      orderId: order._id
    });

    // Notify assigned dealer
    if (order.assignedDealerId) {
      const assignedDealer = await User.findById(order.assignedDealerId);
      if (assignedDealer && assignedDealer.isActive) {
        await NotificationService.send({
          recipientId: assignedDealer._id,
          recipientRole: 'DEALER',
          type: 'ORDER_PLACED',
          title: 'Nearest Delivery Order Assigned 🚛',
          message: `New order #${order.orderNumber}${order.dealerDistanceKm !== null ? ` — ${order.dealerDistanceKm} km away` : ''}: ${order.numberOfTractors || order.quantity} ${order.transportType || 'Vehicle'}${(order.numberOfTractors || order.quantity) === 1 ? '' : 's'} of ${order.productNameSnapshot}.`,
          orderId: order._id,
          targetPhone: assignedDealer.whatsappNumber || assignedDealer.mobile
        });
      } else {
        await NotificationService.notifyAllDealers({
          title: 'New Delivery Order Available 🚛',
          message: `New order #${order.orderNumber}${order.dealerDistanceKm !== null ? ` — ${order.dealerDistanceKm} km away` : ''}: ${order.numberOfTractors || order.quantity} ${order.transportType || 'Vehicle'}${(order.numberOfTractors || order.quantity) === 1 ? '' : 's'} (${order.tractorType || order.vehicleType}) of ${order.productNameSnapshot}.`,
          orderId: order._id
        });
      }
    } else {
      await NotificationService.notifyAllDealers({
        title: 'New Delivery Order Available 🚛',
        message: `New order #${order.orderNumber}${order.dealerDistanceKm !== null ? ` — ${order.dealerDistanceKm} km away` : ''}: ${order.numberOfTractors || order.quantity} ${order.transportType || 'Vehicle'}${(order.numberOfTractors || order.quantity) === 1 ? '' : 's'} (${order.tractorType || order.vehicleType}) of ${order.productNameSnapshot}.`,
        orderId: order._id
      });
    }

    // Emit Real-Time Socket.IO event to Assigned / Nearby Dealers
    emitNewOrder(order.assignedDealerId, order);

    return successResponse(res, 'Development payment simulated successfully! Order placed & dealer notified.', { order });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Verify Razorpay signature for the DUMPER final (weight-based) payment -- entirely
//          separate from verifyPayment above, which handles the upfront booking payment.
// @route   POST /api/payments/verify-final
// @access  Private (User)
const verifyFinalPayment = async (req, res) => {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!orderId || !razorpayOrderId || !razorpayPaymentId) {
      return errorResponse(res, 'Missing payment verification credentials.', 400);
    }

    const order = await Order.findById(orderId).populate('userId', 'name mobile whatsappNumber');
    if (!order) {
      return errorResponse(res, 'Order not found.', 404);
    }

    if (order.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return errorResponse(res, 'Unauthorized access to this order payment.', 403);
    }

    if (order.fulfillmentStage !== 'WEIGHT_ENTERED') {
      return errorResponse(res, 'Final payment is not due yet for this order.', 400);
    }

    if (order.finalRazorpayOrderId !== razorpayOrderId) {
      return errorResponse(res, 'This payment does not match the final payment initialized for this order.', 400);
    }

    const isValid = RazorpayService.verifySignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature });

    if (!isValid) {
      order.finalPaymentStatus = 'FAILED';
      await order.save();

      await Payment.create({
        orderId: order._id,
        userId: req.user._id,
        razorpayOrderId,
        razorpayPaymentId,
        amount: order.finalPaymentAmount,
        status: 'FAILED',
        signature: razorpaySignature || ''
      });

      return errorResponse(res, 'Payment signature verification failed. Please contact your bank or try again.', 400);
    }

    order.finalPaymentStatus = 'PAID';
    order.finalPaymentId = razorpayPaymentId;
    order.fulfillmentStage = 'FINAL_PAYMENT_PAID';
    await order.save();

    await Payment.create({
      orderId: order._id,
      userId: req.user._id,
      razorpayOrderId,
      razorpayPaymentId,
      amount: order.finalPaymentAmount,
      status: 'PAID',
      signature: razorpaySignature || '',
      verifiedAt: new Date()
    });

    await dispatchAfterFinalPayment(order);

    return successResponse(res, 'Final payment verified successfully! Your order is dispatched.', { order });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Simulate/Dev final-payment confirm (Dev helper, mirrors devConfirmPayment)
// @route   POST /api/payments/dev-confirm-final
// @access  Private (User)
const devConfirmFinalPayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId).populate('userId', 'name mobile whatsappNumber');

    if (!order) {
      return errorResponse(res, 'Order not found.', 404);
    }

    if (order.fulfillmentStage !== 'WEIGHT_ENTERED') {
      return errorResponse(res, 'Final payment is not due yet for this order.', 400);
    }

    order.finalPaymentStatus = 'PAID';
    order.finalPaymentId = `dev_pay_${Date.now()}`;
    order.fulfillmentStage = 'FINAL_PAYMENT_PAID';
    await order.save();

    await Payment.create({
      orderId: order._id,
      userId: req.user._id,
      razorpayOrderId: order.finalRazorpayOrderId || `dev_rzp_final_${Date.now()}`,
      razorpayPaymentId: order.finalPaymentId,
      amount: order.finalPaymentAmount,
      status: 'PAID',
      signature: 'test_sig_dev_mode',
      verifiedAt: new Date()
    });

    await dispatchAfterFinalPayment(order);

    return successResponse(res, 'Development final payment simulated successfully! Order dispatched.', { order });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  verifyPayment,
  devConfirmPayment,
  verifyFinalPayment,
  devConfirmFinalPayment
};
