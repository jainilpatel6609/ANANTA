const Order = require('../models/Order');
const Payment = require('../models/Payment');
const User = require('../models/User');
const RazorpayService = require('../services/razorpayService');
const NotificationService = require('../services/notificationService');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { emitNewOrder } = require('../sockets/socket');

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

module.exports = {
  verifyPayment,
  devConfirmPayment
};
