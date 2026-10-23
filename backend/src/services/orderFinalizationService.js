const Order = require('../models/Order');
const User = require('../models/User');
const NotificationService = require('./notificationService');
const { generateOrderNumber } = require('../utils/orderNumber');
const { emitNewOrder } = require('../sockets/socket');

// Creates the real, persisted Order document from a staged PendingOrderIntent payload -- this is
// the ONLY place an Order document for the upfront-payment flow is ever created, and it only
// ever runs once payment has actually been confirmed (DEMO mode confirms instantly, Razorpay/
// ICICI confirm via signature verification / secureHash-verified webhook). An abandoned or
// never-paid checkout therefore never creates an Order at all.
const materializeOrder = async (orderPayload, { paymentStatus, paymentId }) => {
  const orderNumber = await generateOrderNumber();
  const assignedAt = new Date();
  const deadline = new Date(assignedAt.getTime() + 15 * 60 * 1000);

  let assignmentHistory = [];
  if (orderPayload.assignedDealerId) {
    const assignedDealer = await User.findById(orderPayload.assignedDealerId);
    if (assignedDealer) {
      assignmentHistory = [
        {
          dealerId: assignedDealer._id,
          dealerName: assignedDealer.name,
          dealerCompanyName: assignedDealer.companyName,
          dealerPincode: assignedDealer.pincode,
          dealerMobile: assignedDealer.mobile,
          distanceKm: orderPayload.dealerDistanceKm,
          assignedAt,
          deadline,
          response: 'PENDING'
        }
      ];
    }
  }

  const order = await Order.create({
    ...orderPayload,
    orderNumber,
    invoiceNumber: `AN/SL/26-27/${orderNumber.replace(/^[^\d]*/, '')}`,
    invoiceDate: new Date(),
    paymentStatus,
    paymentId,
    orderStatus: 'PLACED',
    orderAssignedAt: assignedAt,
    dealerResponseDeadline: deadline,
    dealerResponseStatus: 'PENDING',
    dealerAlarmActive: !!orderPayload.assignedDealerId,
    adminAlarmActive: false,
    adminEscalationSent: false,
    assignmentHistory
  });

  await NotificationService.send({
    recipientId: order.userId,
    recipientRole: 'USER',
    type: 'ORDER_PLACED',
    title: 'Payment Confirmed! 🎉',
    message: `Your payment of ₹${order.totalAmount.toLocaleString('en-IN')} for order #${order.orderNumber} is confirmed. Dealers have been notified for dispatch!`,
    orderId: order._id
  });

  if (order.assignedDealerId) {
    const assignedDealer = await User.findById(order.assignedDealerId);
    if (assignedDealer && assignedDealer.isActive) {
      await NotificationService.send({
        recipientId: assignedDealer._id,
        recipientRole: 'DEALER',
        type: 'ORDER_PLACED',
        // Deliberately excludes the customer's name/city/address -- a dealer sees only distance
        // and price until they accept. Full shipping details unlock in the accepted-order view.
        title: '🚨 NEW ORDER ASSIGNED 🚛',
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

  emitNewOrder(order.assignedDealerId, order);
  return order;
};

module.exports = { materializeOrder };
