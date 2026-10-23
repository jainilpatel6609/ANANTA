const Order = require('../models/Order');
const Payment = require('../models/Payment');
const IciciTransaction = require('../models/IciciTransaction');
const PendingOrderIntent = require('../models/PendingOrderIntent');
const User = require('../models/User');
const RazorpayService = require('../services/razorpayService');
const IciciPaymentService = require('../services/iciciPaymentService');
const OrderFinalizationService = require('../services/orderFinalizationService');
const NotificationService = require('../services/notificationService');
const OtpService = require('../services/otpService');
const SmsService = require('../services/smsService');
const { CLIENT_URL } = require('../config/env');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { emitOrderStatusUpdate } = require('../sockets/socket');

// @desc    The ONLY place an Order is created for the upfront-payment flow. No Order document
//          exists for a checkout attempt until payment actually succeeds -- before that, the
//          full order data sits in a PendingOrderIntent, keyed by the gateway's own transaction
//          reference (razorpayOrderId / ICICI merchantTxnNo / a local demo token). Called by
//          Razorpay's verifyPayment/devConfirmPayment, ICICI's callback/advice webhook, and the
//          stuck-transaction poller -- so every path that can confirm a payment produces the
//          exact same order. Idempotent: if an Order already exists for this gatewayRef (a
//          retried verify call, a redelivered webhook), that same order is returned without
//          re-creating or re-notifying anyone.
const finalizeUpfrontPaymentSuccess = async ({ gateway, gatewayRef, paymentId, requestingUserId, allowAnyUser }) => {
  const existingOrder = await Order.findOne(
    gateway === 'ICICI' ? { iciciMerchantTxnNo: gatewayRef } : { razorpayOrderId: gatewayRef }
  ).populate('userId', 'name mobile whatsappNumber email');
  if (existingOrder) {
    return { order: existingOrder, created: false, intent: null };
  }

  const intent = await PendingOrderIntent.findOne({ gateway, gatewayRef });
  if (!intent) {
    throw new Error(`No pending order found for ${gateway} reference ${gatewayRef}. It may have already expired or was never initiated.`);
  }

  if (requestingUserId && !allowAnyUser && intent.userId.toString() !== requestingUserId.toString()) {
    throw new Error('This payment does not belong to the requesting user.');
  }

  const orderPayload = {
    ...intent.orderPayload,
    razorpayOrderId: gateway !== 'ICICI' ? gatewayRef : '',
    iciciMerchantTxnNo: gateway === 'ICICI' ? gatewayRef : ''
  };
  const order = await OrderFinalizationService.materializeOrder(orderPayload, { paymentStatus: 'PAID', paymentId });

  intent.consumedOrderId = order._id;
  await intent.save();

  const populatedOrder = await Order.findById(order._id).populate('userId', 'name mobile whatsappNumber email');
  return { order: populatedOrder, created: true, intent };
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

// @desc    Verify Razorpay Payment Signature. No Order exists yet at this point -- the signature
//          cryptographically proves the payment against razorpayOrderId, which is the lookup key
//          into the PendingOrderIntent that finalizeUpfrontPaymentSuccess turns into a real Order.
// @route   POST /api/payments/verify
// @access  Private (User)
const verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId) {
      return errorResponse(res, 'Missing payment verification credentials.', 400);
    }

    const isValid = RazorpayService.verifySignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    });

    if (!isValid) {
      return errorResponse(res, 'Payment signature verification failed. Please contact your bank or try again.', 400);
    }

    const { order } = await finalizeUpfrontPaymentSuccess({
      gateway: 'RAZORPAY',
      gatewayRef: razorpayOrderId,
      paymentId: razorpayPaymentId,
      requestingUserId: req.user._id,
      allowAnyUser: req.user.role === 'ADMIN'
    });

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

    return successResponse(res, 'Payment verified successfully! Order is placed and nearest dealer is notified.', { order });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Simulate/Dev Payment Confirm (Dev helper) -- instantly materializes the Order staged
//          under the DEMO PendingOrderIntent created alongside the live gateway at checkout.
// @route   POST /api/payments/dev-confirm
// @access  Private (User)
const devConfirmPayment = async (req, res) => {
  try {
    const { demoRef } = req.body;
    if (!demoRef) {
      return errorResponse(res, 'Missing demo payment reference.', 400);
    }

    const devPaymentId = `dev_pay_${Date.now()}`;

    const { order } = await finalizeUpfrontPaymentSuccess({
      gateway: 'DEMO',
      gatewayRef: demoRef,
      paymentId: devPaymentId,
      requestingUserId: req.user._id,
      allowAnyUser: req.user.role === 'ADMIN'
    });

    await Payment.create({
      orderId: order._id,
      userId: req.user._id,
      razorpayOrderId: order.razorpayOrderId || demoRef,
      razorpayPaymentId: devPaymentId,
      amount: order.totalAmount,
      status: 'PAID',
      signature: 'test_sig_dev_mode',
      verifiedAt: new Date()
    });

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
//          re-triggering notifications/dispatch.
//
//          Two distinct cases, because UPFRONT payments no longer have an IciciTransaction (or
//          an Order) until they actually succeed:
//           1. An IciciTransaction already exists -- a FINAL (weight-based) payment (whose Order
//              always pre-exists), or a redelivered UPFRONT webhook for an order already created.
//           2. No IciciTransaction yet -- the first-ever delivery for an UPFRONT payment. Looked
//              up via PendingOrderIntent instead; on success this is where the Order AND its
//              IciciTransaction are both created for the first time.
const processIciciPaymentResult = async (body) => {
  if (!IciciPaymentService.verifyHashV1(body)) {
    throw new Error('Invalid secureHash on ICICI payment response.');
  }

  const { merchantTxnNo, responseCode, txnID, paymentID, paymentMode } = body;
  const isSuccess = responseCode === '000' || responseCode === '0000';

  const transaction = await IciciTransaction.findOne({ merchantTxnNo });
  if (transaction) {
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

    if (isSuccess && transaction.paymentPurpose === 'FINAL' && order.fulfillmentStage === 'WEIGHT_ENTERED') {
      order.finalPaymentStatus = 'PAID';
      order.finalPaymentId = paymentID || transaction.gatewayTxnId;
      order.fulfillmentStage = 'FINAL_PAYMENT_PAID';
      await order.save();
      await dispatchAfterFinalPayment(order);
    } else if (!isSuccess && transaction.paymentPurpose === 'FINAL' && order.finalPaymentStatus !== 'PAID') {
      order.finalPaymentStatus = 'FAILED';
      await order.save();
    }
    // UPFRONT here means a redelivered webhook for an order already created -- nothing left to do.

    return { order, success: isSuccess };
  }

  const intent = await PendingOrderIntent.findOne({ gateway: 'ICICI', gatewayRef: merchantTxnNo });
  if (!intent) {
    throw new Error(`No ICICI transaction or pending order found for merchantTxnNo ${merchantTxnNo}.`);
  }

  if (!isSuccess) {
    // Never became a real order -- nothing to roll back. The intent is simply left as an
    // uncommitted draft; it never materializes into an Order.
    return { order: null, success: false };
  }

  const order = await materializeIciciUpfrontFromIntent(intent, merchantTxnNo, {
    paymentID,
    txnID,
    paymentMode,
    responseCode,
    rawAdvicePayload: body
  });

  return { order, success: true };
};

// @desc    Shared by processIciciPaymentResult (webhook/callback path) and the stuck-transaction
//          status poller (status-check path) -- both discover an UPFRONT ICICI success for a
//          PendingOrderIntent that has no IciciTransaction yet, and both need to create the Order
//          AND its IciciTransaction together, the same way.
const materializeIciciUpfrontFromIntent = async (intent, merchantTxnNo, { paymentID, txnID, paymentMode, responseCode, rawAdvicePayload }) => {
  const { order } = await finalizeUpfrontPaymentSuccess({ gateway: 'ICICI', gatewayRef: merchantTxnNo, paymentId: paymentID || txnID });

  await IciciTransaction.create({
    orderId: order._id,
    paymentPurpose: 'UPFRONT',
    merchantTxnNo,
    amount: order.totalAmount,
    status: 'SUCCESS',
    gatewayTxnId: txnID || '',
    paymentId: paymentID || '',
    paymentMode: paymentMode || '',
    responseCode: responseCode || '',
    rawInitiateRequest: intent.rawInitiateRequest,
    rawInitiateResponse: intent.rawInitiateResponse,
    rawAdvicePayload: rawAdvicePayload || null
  });

  return order;
};

// @desc    ICICI returnURL -- hit directly by the customer's browser (full-page redirect, not
//          an authenticated app session) after they complete/abandon payment on ICICI's hosted
//          page. Convenience only; Payment Advice below is the authoritative source.
// @route   POST /api/payments/icici/callback
// @access  Public (secureHash-verified)
const iciciReturnCallback = async (req, res) => {
  try {
    const result = await processIciciPaymentResult(req.body);
    if (result.success && result.order) {
      return res.redirect(`${CLIENT_URL}/user/orders/${result.order._id}/invoice?justPaid=true`);
    }
    if (result.order) {
      return res.redirect(`${CLIENT_URL}/user/orders/${result.order._id}?paymentFailed=true`);
    }
    // Payment failed/cancelled before an order ever existed -- nothing to link back to.
    return res.redirect(`${CLIENT_URL}/user/dashboard?paymentFailed=true`);
  } catch (error) {
    console.error('[ICICI Callback Error]', error.message);
    return res.redirect(`${CLIENT_URL}/user/dashboard?paymentError=true`);
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

    if (iciciInitiateResponse.responseCode !== 'R1000' || !iciciInitiateResponse.fullRedirectURI) {
      console.error('[ICICI Initiate Sale Rejected - Final Payment]', JSON.stringify(iciciInitiateResponse));
      const reason =
        iciciInitiateResponse.respDescription ||
        iciciInitiateResponse.responseMessage ||
        iciciInitiateResponse.message ||
        iciciInitiateResponse.errorDescription ||
        'Unable to initiate final payment with ICICI. Please try again.';
      return errorResponse(res, reason, 502);
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

    return successResponse(res, 'Final payment initialized.', { iciciRedirectUrl: iciciInitiateResponse.fullRedirectURI });
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
  materializeIciciUpfrontFromIntent,
  dispatchAfterFinalPayment,
  iciciReturnCallback,
  iciciPaymentAdvice,
  iciciSettlementAdvice,
  initiateFinalIciciPayment
};
