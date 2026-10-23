const Order = require('../models/Order');
const Payment = require('../models/Payment');
const IciciTransaction = require('../models/IciciTransaction');
const User = require('../models/User');
const RazorpayService = require('../services/razorpayService');
const IciciPaymentService = require('../services/iciciPaymentService');
const NotificationService = require('../services/notificationService');
const OtpService = require('../services/otpService');
const SmsService = require('../services/smsService');
const { CLIENT_URL } = require('../config/env');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { emitNewOrder, emitOrderStatusUpdate } = require('../sockets/socket');

// @desc    Shared, idempotent "upfront payment succeeded" side effects -- order PLACED, 15-min
//          dealer response timer started, customer + dealer notified. Used by Razorpay's
//          verifyPayment/devConfirmPayment AND ICICI's callback/advice/status-poller, so every
//          payment gateway produces the exact same downstream order behaviour. No-ops if the
//          order is already PAID (safe to call from multiple independent trigger paths).
const finalizeUpfrontPaymentSuccess = async (order, { paymentId }) => {
  if (order.paymentStatus === 'PAID') {
    return false;
  }

  order.paymentStatus = 'PAID';
  order.paymentId = paymentId;
  order.orderStatus = 'PLACED';

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

  await NotificationService.send({
    recipientId: order.userId._id || order.userId,
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
        title: '🚨 NEW ORDER ASSIGNED 🚛',
        // Deliberately excludes the customer's name/city/address -- a dealer sees only distance
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

  emitNewOrder(order.assignedDealerId, order);
  return true;
};

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

    await finalizeUpfrontPaymentSuccess(order, { paymentId: razorpayPaymentId });

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

    const devPaymentId = `dev_pay_${Date.now()}`;

    await Payment.create({
      orderId: order._id,
      userId: req.user._id,
      razorpayOrderId: order.razorpayOrderId || `dev_rzp_${Date.now()}`,
      razorpayPaymentId: devPaymentId,
      amount: order.totalAmount,
      status: 'PAID',
      signature: 'test_sig_dev_mode',
      verifiedAt: new Date()
    });

    await finalizeUpfrontPaymentSuccess(order, { paymentId: devPaymentId });

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

// @desc    Shared verify + state-update logic for an ICICI payment result -- used by both the
//          customer-browser returnURL callback and the authoritative Payment Advice webhook
//          (identical payload shape per the spec). Idempotent: re-processing an already-
//          finalized transaction just re-verifies and re-saves bookkeeping fields without
//          re-triggering notifications/dispatch (finalizeUpfrontPaymentSuccess / the
//          fulfillmentStage guard below both no-op on a second call).
const processIciciPaymentResult = async (body) => {
  if (!IciciPaymentService.verifyHashV1(body)) {
    throw new Error('Invalid secureHash on ICICI payment response.');
  }

  const { merchantTxnNo, responseCode, txnID, paymentID, paymentMode } = body;
  const transaction = await IciciTransaction.findOne({ merchantTxnNo });
  if (!transaction) {
    throw new Error(`No ICICI transaction found for merchantTxnNo ${merchantTxnNo}.`);
  }

  const isSuccess = responseCode === '000' || responseCode === '0000';
  transaction.status = isSuccess ? 'SUCCESS' : 'FAILED';
  transaction.gatewayTxnId = txnID || transaction.gatewayTxnId;
  transaction.paymentId = paymentID || transaction.paymentId;
  transaction.paymentMode = paymentMode || transaction.paymentMode;
  transaction.responseCode = responseCode || transaction.responseCode;
  transaction.rawAdvicePayload = body;
  await transaction.save();

  const order = await Order.findById(transaction.orderId).populate('userId', 'name mobile whatsappNumber');
  if (!order) {
    throw new Error(`Order ${transaction.orderId} not found for ICICI transaction ${merchantTxnNo}.`);
  }

  if (isSuccess) {
    if (transaction.paymentPurpose === 'UPFRONT') {
      await finalizeUpfrontPaymentSuccess(order, { paymentId: paymentID || transaction.gatewayTxnId });
    } else if (transaction.paymentPurpose === 'FINAL' && order.fulfillmentStage === 'WEIGHT_ENTERED') {
      order.finalPaymentStatus = 'PAID';
      order.finalPaymentId = paymentID || transaction.gatewayTxnId;
      order.fulfillmentStage = 'FINAL_PAYMENT_PAID';
      await order.save();
      await dispatchAfterFinalPayment(order);
    }
  } else if (transaction.paymentPurpose === 'UPFRONT' && order.paymentStatus !== 'PAID') {
    order.paymentStatus = 'FAILED';
    order.orderStatus = 'PAYMENT_FAILED';
    await order.save();
  } else if (transaction.paymentPurpose === 'FINAL' && order.finalPaymentStatus !== 'PAID') {
    order.finalPaymentStatus = 'FAILED';
    await order.save();
  }

  return { transaction, order, success: isSuccess };
};

// @desc    ICICI returnURL -- hit directly by the customer's browser (full-page redirect, not
//          an authenticated app session) after they complete/abandon payment on ICICI's hosted
//          page. Convenience only; Payment Advice below is the authoritative source.
// @route   POST /api/payments/icici/callback
// @access  Public (secureHash-verified)
const iciciReturnCallback = async (req, res) => {
  try {
    const result = await processIciciPaymentResult(req.body);
    const orderId = result.order._id;
    if (result.success) {
      return res.redirect(`${CLIENT_URL}/user/orders/${orderId}/invoice?justPaid=true`);
    }
    return res.redirect(`${CLIENT_URL}/user/orders/${orderId}?paymentFailed=true`);
  } catch (error) {
    console.error('[ICICI Callback Error]', error.message);
    return res.redirect(`${CLIENT_URL}/user/orders?paymentError=true`);
  }
};

// @desc    ICICI Payment Advice -- authoritative server-to-server webhook, independent of
//          whether the customer's browser ever reached the returnURL. Any HTTP 200 is treated
//          by ICICI as successful delivery; a non-200 triggers their retry mechanism, so a
//          genuine processing error is deliberately surfaced as 500 rather than swallowed.
// @route   POST /api/payments/icici/advice
// @access  Public (secureHash-verified)
const iciciPaymentAdvice = async (req, res) => {
  try {
    await processIciciPaymentResult(req.body);
    return res.status(200).send('OK');
  } catch (error) {
    console.error('[ICICI Payment Advice Error]', error.message);
    return res.status(500).send('Processing error');
  }
};

// @desc    ICICI Settlement Advice -- bookkeeping only (settlement reconciliation), no order
//          status side effects.
// @route   POST /api/payments/icici/settlement-advice
// @access  Public (secureHash-verified)
const iciciSettlementAdvice = async (req, res) => {
  try {
    if (!IciciPaymentService.verifyHashV1(req.body)) {
      return res.status(400).send('Invalid secureHash');
    }

    const { merchantTxnNo, settlementID, settlementDate, paymentMode } = req.body;
    const transaction = await IciciTransaction.findOne({ merchantTxnNo });
    if (transaction) {
      transaction.settlementStatus = 'SETTLED';
      transaction.settlementRef = settlementID || transaction.settlementRef;
      transaction.paymentMode = paymentMode || transaction.paymentMode;
      if (settlementDate && /^\d{8}$/.test(settlementDate)) {
        const y = settlementDate.slice(0, 4);
        const m = settlementDate.slice(4, 6);
        const d = settlementDate.slice(6, 8);
        transaction.settlementDate = new Date(`${y}-${m}-${d}`);
      }
      await transaction.save();
    }

    return res.status(200).send('OK');
  } catch (error) {
    console.error('[ICICI Settlement Advice Error]', error.message);
    return res.status(500).send('Processing error');
  }
};

// @desc    Customer-initiated: lazily creates a fresh ICICI transaction + redirect URL for the
//          DUMPER final (weight-based) payment. Unlike Razorpay's order_id (durable, reusable
//          across checkout attempts), ICICI's redirectURI is tied to a time-boxed transaction
//          context, so it can't be generated once at weight-entry time (a dealer action, on a
//          different device/session) and handed to the customer later -- it's generated fresh,
//          on demand, right when the customer clicks "Pay".
// @route   POST /api/payments/icici/initiate-final/:orderId
// @access  Private (User -- order owner)
const initiateFinalIciciPayment = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate('userId', 'name mobile whatsappNumber email');
    if (!order) {
      return errorResponse(res, 'Order not found.', 404);
    }

    if (order.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return errorResponse(res, 'Unauthorized access to this order payment.', 403);
    }

    if (order.fulfillmentStage !== 'WEIGHT_ENTERED' || order.finalPaymentStatus === 'PAID') {
      return errorResponse(res, 'Final payment is not due for this order.', 400);
    }

    const merchantTxnNo = IciciPaymentService.generateMerchantTxnNo();
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const returnURL = `${protocol}://${req.get('host')}/api/payments/icici/callback`;
    const { request: iciciInitiateRequest, response: iciciInitiateResponse } = await IciciPaymentService.initiateSale({
      merchantTxnNo,
      amount: order.finalPaymentAmount,
      customerEmailID: order.userId.email,
      customerMobileNo: order.userId.whatsappNumber || order.userId.mobile,
      customerName: order.userId.name,
      returnURL,
      addlParam1: `${order.orderNumber}-FINAL`
    });

    if (iciciInitiateResponse.responseCode !== 'R1000' || !iciciInitiateResponse.redirectURI) {
      return errorResponse(res, iciciInitiateResponse.respDescription || 'Unable to initiate final payment with ICICI. Please try again.', 502);
    }

    order.finalIciciMerchantTxnNo = merchantTxnNo;
    await order.save();

    await IciciTransaction.create({
      orderId: order._id,
      paymentPurpose: 'FINAL',
      merchantTxnNo,
      amount: order.finalPaymentAmount,
      rawInitiateRequest: iciciInitiateRequest,
      rawInitiateResponse: iciciInitiateResponse
    });

    return successResponse(res, 'Final payment initialized.', { iciciRedirectUrl: iciciInitiateResponse.redirectURI });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  verifyPayment,
  devConfirmPayment,
  verifyFinalPayment,
  devConfirmFinalPayment,
  finalizeUpfrontPaymentSuccess,
  dispatchAfterFinalPayment,
  iciciReturnCallback,
  iciciPaymentAdvice,
  iciciSettlementAdvice,
  initiateFinalIciciPayment
};
