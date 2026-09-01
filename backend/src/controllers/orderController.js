const Order = require('../models/Order');
const Product = require('../models/Product');
const Location = require('../models/Location');
const VehicleConfig = require('../models/VehicleConfig');
const VehicleSetting = require('../models/VehicleSetting');
const User = require('../models/User');
const { generateOrderNumber } = require('../utils/orderNumber');
const RazorpayService = require('../services/razorpayService');
const NotificationService = require('../services/notificationService');
const PincodeService = require('../services/pincodeService');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const {
  TRACTOR_TYPES,
  getPricePerTractor,
  getGrainSpecificTractorPrice,
  ensureProductTractorPrices
} = require('../utils/tractorPricing');

// @desc    Create a new order (Dynamic multi-step wizard calculation & Razorpay order initialization)
// @route   POST /api/orders
// @access  Private (User)
const createOrder = async (req, res) => {
  try {
    const {
      productId,
      materialId,
      locationId,
      sandLocation,
      aggregateType,
      vehicleType: rawVehicleType,
      vehicleConfigId,
      vehicleOption,
      tractorType: rawTractorType,
      wheelCount: rawWheelCount,
      approximateTon: rawApproximateTon,
      quantity: rawQuantity,
      numberOfTractors,
      deliveryDate: rawDeliveryDate,
      shippingAddress,
      shippingDetails,
      pincode: rawPincode,
      latitude,
      longitude,
      deliveryInstructions
    } = req.body;

    // 1. Validate Material / Product from MongoDB
    const targetProductId = productId || materialId;
    if (!targetProductId) {
      return errorResponse(res, 'Material selection is required.', 400);
    }

    const product = await Product.findById(targetProductId);
    if (!product || !product.isActive) {
      return errorResponse(res, 'The selected material is currently unavailable or inactive.', 400);
    }

    await ensureProductTractorPrices(product);

    // 2. Validate Vehicle Type & Global Admin Visibility Settings
    const settings = await VehicleSetting.getSettings();
    const vehicleType = (rawVehicleType || (rawTractorType ? 'TRACTOR' : 'DUMPER')).toUpperCase();

    if (!['DUMPER', 'TRACTOR'].includes(vehicleType)) {
      return errorResponse(res, 'Please select a valid vehicle type (Dumper or Tractor).', 400);
    }

    if (vehicleType === 'DUMPER' && !settings.dumperEnabled) {
      return errorResponse(res, 'Dumper delivery is currently unavailable. Please choose Tractor delivery.', 400);
    }

    if (vehicleType === 'TRACTOR' && !settings.tractorEnabled) {
      return errorResponse(res, 'Tractor delivery is currently unavailable. Please choose Dumper delivery.', 400);
    }

    if (!settings.dumperEnabled && !settings.tractorEnabled) {
      return errorResponse(res, 'No delivery vehicle is currently available. Please try again later.', 400);
    }

    // 3. Validate Location strictly for the selected vehicleType
    let finalLocationName = (sandLocation || '').trim();
    if (locationId) {
      const loc = await Location.findOne({ _id: locationId, vehicleType });
      if (!loc || !loc.isActive) {
        return errorResponse(res, `The selected location is not active for ${vehicleType} delivery.`, 400);
      }
      finalLocationName = loc.name;
    }

    if (product.category === 'Sand' && !finalLocationName) {
      return errorResponse(res, `Please select a valid sourcing location for ${vehicleType}.`, 400);
    }

    if (product.category === 'Aggregate') {
      if (vehicleType === 'DUMPER' && !finalLocationName) {
        return errorResponse(res, 'Please select a valid Aggregate sourcing location (e.g. Vadagam, Sayala).', 400);
      }
      if (vehicleType === 'TRACTOR' && !finalLocationName) {
        finalLocationName = 'Direct Quarry Dispatch';
      }
      if (!aggregateType) {
        return errorResponse(res, 'Please select an aggregate grain specification (e.g. 20mm, 10mm, 6mm).', 400);
      }
    }

    // 4. Validate Vehicle Option, Capacity & Pricing strictly for the selected vehicleType
    let vehicleConfig = null;
    if (vehicleConfigId) {
      vehicleConfig = await VehicleConfig.findOne({ _id: vehicleConfigId, vehicleType });
      if (!vehicleConfig || !vehicleConfig.isActive) {
        return errorResponse(res, `The selected capacity configuration is not active for ${vehicleType}.`, 400);
      }
    }

    const tractorType = rawTractorType || (vehicleConfig?.vehicleType === 'TRACTOR' ? vehicleConfig.optionName : 'Single Patiya');
    const optionName = vehicleOption || (vehicleConfig ? vehicleConfig.optionName : (vehicleType === 'DUMPER' ? 'Filter Sand' : tractorType));
    const wheelCount = rawWheelCount !== undefined && rawWheelCount !== null ? Number(rawWheelCount) : (vehicleConfig?.wheelCount || (vehicleType === 'DUMPER' ? 12 : null));
    const approxTon = rawApproximateTon !== undefined && rawApproximateTon !== null ? Number(rawApproximateTon) : (vehicleConfig?.approximateTon || (vehicleType === 'DUMPER' ? 35 : (tractorType === 'Double Patiya' ? 7.0 : 3.5)));

    const qty = Math.max(1, Number(rawQuantity || numberOfTractors) || 1);

    // Dynamic Server-Side Price Calculation (Reject client-sent prices)
    let subtotal = 0;
    let unitPrice = 0;

    if (vehicleType === 'DUMPER') {
      const pricePerTon = vehicleConfig?.basePricePerTon || product.pricePerTon || 800;
      unitPrice = pricePerTon;
      subtotal = Math.round(pricePerTon * approxTon * qty);
    } else {
      // Tractor pricing (grain-size specific when available, fallback to vehicle config / product base)
      const grainSpecificPrice = getGrainSpecificTractorPrice(product, tractorType, aggregateType);
      const flatTractorPrice = grainSpecificPrice || vehicleConfig?.flatPrice || getPricePerTractor(product, tractorType) || (tractorType === 'Double Patiya' ? 4500 : 2350);
      unitPrice = flatTractorPrice;
      subtotal = Math.round(flatTractorPrice * qty);
    }

    const deliveryCharge = 0;
    const tax = 0;
    const totalAmount = subtotal + deliveryCharge + tax;

    // 5. Validate Delivery Date (Must not be in the past)
    let deliveryDate = new Date();
    if (rawDeliveryDate) {
      deliveryDate = new Date(rawDeliveryDate);
      if (Number.isNaN(deliveryDate.getTime())) {
        return errorResponse(res, 'Invalid delivery date format.', 400);
      }
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      if (deliveryDate < todayStart) {
        return errorResponse(res, 'Delivery date cannot be in the past.', 400);
      }
    }

    // 6. Mandatory 6-digit Indian PIN code & Address validation
    const pincode = String(rawPincode || shippingDetails?.pincode || '').trim();
    if (!pincode) {
      return errorResponse(res, 'A 6-digit Indian PIN code is mandatory for the shipping address.', 400);
    }
    if (!PincodeService.isValidIndianPincode(pincode)) {
      return errorResponse(
        res,
        'Invalid PIN code. Must be exactly 6 numeric digits (e.g. 384001). Letters and special characters are not allowed.',
        400
      );
    }

    // Geocode PIN code
    const pinGeo = await PincodeService.lookup(pincode);

    // Build structured shipping details
    const structuredDetails = {
      fullName: (shippingDetails?.fullName || req.user.name || '').trim(),
      mobile: (shippingDetails?.mobile || req.user.mobile || '').trim(),
      addressLine1: (shippingDetails?.addressLine1 || '').trim(),
      addressLine2: (shippingDetails?.addressLine2 || '').trim(),
      area: (shippingDetails?.area || '').trim(),
      city: (shippingDetails?.city || pinGeo?.city || '').trim(),
      state: (shippingDetails?.state || pinGeo?.state || 'Gujarat').trim(),
      pincode,
      landmark: (shippingDetails?.landmark || '').trim()
    };

    // Format full delivery address string
    let finalShippingAddress = shippingAddress ? shippingAddress.trim() : '';
    if (!finalShippingAddress || shippingDetails) {
      const parts = [
        structuredDetails.addressLine1,
        structuredDetails.addressLine2,
        structuredDetails.area,
        structuredDetails.city,
        `${structuredDetails.state} - ${pincode}`,
        structuredDetails.landmark ? `Landmark: ${structuredDetails.landmark}` : ''
      ].filter(Boolean);
      finalShippingAddress = parts.join(', ');
    }

    if (!finalShippingAddress) {
      return errorResponse(res, 'Complete delivery shipping address is required.', 400);
    }

    // Determine geographic coordinates (Latitude / Longitude)
    let finalLat = latitude !== undefined && latitude !== null ? Number(latitude) : (pinGeo ? pinGeo.latitude : null);
    let finalLng = longitude !== undefined && longitude !== null ? Number(longitude) : (pinGeo ? pinGeo.longitude : null);

    if (finalLat === null || finalLng === null || Number.isNaN(finalLat) || Number.isNaN(finalLng)) {
      if (pinGeo) {
        finalLat = pinGeo.latitude;
        finalLng = pinGeo.longitude;
      } else {
        return errorResponse(res, 'Could not determine geographic coordinates for the provided PIN code.', 400);
      }
    }

    // 7. Geographically Nearest Dealer Calculation (Haversine Formula)
    const activeDealers = await User.find({ role: 'DEALER', isActive: true, isDeleted: { $ne: true } });
    const { nearestDealer, distanceKm } = await PincodeService.findNearestDealer(
      { latitude: finalLat, longitude: finalLng },
      activeDealers
    );

    // 8. Generate human-readable unique order number & Initialize Razorpay order
    const orderNumber = await generateOrderNumber();
    const rzpOrder = await RazorpayService.createOrder(totalAmount, orderNumber);

    // 9. Save Order to Database with immutable snapshots & assigned nearest dealer
    const assignedAt = new Date();
    const deadline = new Date(assignedAt.getTime() + 15 * 60 * 1000);

    const initialHistory = nearestDealer
      ? [
          {
            dealerId: nearestDealer._id,
            dealerName: nearestDealer.name,
            dealerCompanyName: nearestDealer.companyName,
            dealerPincode: nearestDealer.pincode,
            dealerMobile: nearestDealer.mobile,
            distanceKm,
            assignedAt,
            deadline,
            response: 'PENDING'
          }
        ]
      : [];

    const order = await Order.create({
      orderNumber,
      userId: req.user._id,
      dealerId: null,
      assignedDealerId: nearestDealer ? nearestDealer._id : null,
      dealerDistanceKm: distanceKm,
      orderAssignedAt: assignedAt,
      dealerResponseDeadline: deadline,
      dealerResponseStatus: 'PENDING',
      dealerAlarmActive: !!nearestDealer,
      adminAlarmActive: false,
      adminEscalationSent: false,
      assignmentHistory: initialHistory,
      productId: product._id,
      productNameSnapshot: product.name,
      category: product.category,
      aggregateType: aggregateType || '',
      sandLocation: finalLocationName,
      locationNameSnapshot: finalLocationName,
      transportType: vehicleType === 'DUMPER' ? 'Dumper' : 'Tractor',
      tractorType: vehicleType === 'TRACTOR' ? tractorType : '',
      numberOfTractors: vehicleType === 'TRACTOR' ? qty : null,
      pricePerTractorSnapshot: vehicleType === 'TRACTOR' ? unitPrice : null,
      vehicleType: vehicleType === 'DUMPER' ? `${wheelCount} Wheel Dumper` : tractorType,
      vehicleTypeSnapshot: vehicleType,
      vehicleOptionSnapshot: optionName,
      wheelCountSnapshot: wheelCount,
      approximateTonSnapshot: approxTon,
      vehicleCapacity: approxTon,
      quantity: qty,
      pricePerTonSnapshot: unitPrice,
      subtotal,
      deliveryCharge,
      tax,
      totalAmount,
      shippingAddress: finalShippingAddress,
      pincode,
      shippingDetails: structuredDetails,
      latitude: finalLat,
      longitude: finalLng,
      deliveryDate,
      deliveryInstructions: deliveryInstructions || '',
      paymentStatus: 'PENDING',
      razorpayOrderId: rzpOrder.id,
      orderStatus: 'PENDING_PAYMENT'
    });

    // Notify user order created
    await NotificationService.send({
      recipientId: req.user._id,
      recipientRole: 'USER',
      type: 'ORDER_PLACED',
      title: 'Order Initiated',
      message: `Your order #${orderNumber} for ${tractorQty} Tractor${tractorQty === 1 ? '' : 's'} (${tractorType}) of ${product.name} has been initiated. Complete payment to confirm.`,
      orderId: order._id
    });

    return successResponse(
      res,
      'Order created successfully. Nearest dealer identified. Proceed to payment verification.',
      {
        order,
        nearestDealer: nearestDealer
          ? {
              id: nearestDealer._id,
              name: nearestDealer.name,
              companyName: nearestDealer.companyName,
              pincode: nearestDealer.pincode,
              distanceKm
            }
          : null,
        razorpayOrder: rzpOrder,
        keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_key'
      },
      201
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Get current user's orders
// @route   GET /api/orders/my-orders
// @access  Private (User)
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
      .populate('dealerId', 'name companyName mobile whatsappNumber')
      .populate('productId', 'name category')
      .sort({ createdAt: -1 });

    return successResponse(res, 'User orders retrieved.', { orders });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Get single order details by ID
// @route   GET /api/orders/:id
// @access  Private (User, Dealer, Admin)
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'name mobile whatsappNumber email gstNumber officeAddress userType companyName')
      .populate('dealerId', 'name companyName mobile whatsappNumber email')
      .populate('productId', 'name category description');

    if (!order) {
      return errorResponse(res, 'Order not found.', 404);
    }

    // Role-based security check
    const isOwner = order.userId && order.userId._id.toString() === req.user._id.toString();
    const isAssignedDealer = order.dealerId && order.dealerId._id.toString() === req.user._id.toString();
    const isAvailableToDealer = req.user.role === 'DEALER' && order.orderStatus === 'PLACED' && !order.dealerId;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwner && !isAssignedDealer && !isAvailableToDealer && !isAdmin) {
      return errorResponse(res, 'Unauthorized to view this order details.', 403);
    }

    return successResponse(res, 'Order retrieved successfully.', { order });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Get new available orders for Dealers (Assigned to this dealer or open pool)
// @route   GET /api/orders/dealer/available
// @access  Private (Dealer)
const getDealerAvailableOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      orderStatus: 'PLACED',
      dealerId: null,
      paymentStatus: 'PAID',
      declinedBy: { $ne: req.user._id },
      $or: [
        { assignedDealerId: req.user._id },
        { assignedDealerId: null }
      ]
    })
      .populate('userId', 'name mobile city')
      .populate('assignedDealerId', 'name companyName pincode')
      .sort({ createdAt: -1 });

    // Enrich with real-time distance from this dealer's registered location
    const dealerLat = req.user.latitude;
    const dealerLng = req.user.longitude;

    const enrichedOrders = orders.map((order) => {
      let distanceToDealer = order.dealerDistanceKm;
      if (dealerLat && dealerLng && order.latitude && order.longitude) {
        distanceToDealer = PincodeService.calculateHaversineDistanceKm(
          dealerLat,
          dealerLng,
          order.latitude,
          order.longitude
        );
      }
      return {
        ...order.toObject(),
        distanceToDealer: distanceToDealer !== null ? distanceToDealer : order.dealerDistanceKm
      };
    });

    return successResponse(res, 'Available orders retrieved.', { orders: enrichedOrders });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Get Dealer's assigned orders (Accepted, Out for delivery, Delivered)
// @route   GET /api/orders/dealer/my-deliveries
// @access  Private (Dealer)
const getDealerDeliveries = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { dealerId: req.user._id };

    if (status) {
      filter.orderStatus = status;
    }

    const orders = await Order.find(filter)
      .populate('userId', 'name mobile whatsappNumber gstNumber officeAddress userType companyName')
      .sort({ updatedAt: -1 });

    return successResponse(res, 'Dealer deliveries retrieved.', { orders });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Dealer Atomically Accepts an Order (Prevents Race Conditions)
// @route   POST /api/orders/:id/accept
// @access  Private (Dealer)
const acceptOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const now = new Date();

    const order = await Order.findById(orderId).populate('userId', 'name mobile whatsappNumber');

    if (!order) {
      return errorResponse(res, 'Order not found.', 404);
    }

    if (order.orderStatus !== 'PLACED' || order.dealerId) {
      return errorResponse(
        res,
        'This order has already been accepted by another dealer or is no longer available.',
        409
      );
    }

    // Security: Only the assigned dealer or open pool can accept
    if (
      order.assignedDealerId &&
      order.assignedDealerId.toString() !== req.user._id.toString() &&
      order.dealerResponseStatus === 'PENDING'
    ) {
      return errorResponse(res, 'Unauthorized. This order is currently assigned to another dealer.', 403);
    }

    // Update order status and stop alarms
    order.dealerId = req.user._id;
    order.orderStatus = 'ACCEPTED';
    order.acceptedAt = now;
    order.dealerResponseStatus = 'ACCEPTED';
    order.dealerAcceptedAt = now;
    order.dealerAlarmActive = false;
    order.adminAlarmActive = false;
    order.adminEscalationSent = false;

    // Update active assignment history record
    if (Array.isArray(order.assignmentHistory) && order.assignmentHistory.length > 0) {
      const matchIndex = order.assignmentHistory.findIndex(
        (h) => h.dealerId.toString() === req.user._id.toString() && h.response === 'PENDING'
      );
      if (matchIndex !== -1) {
        order.assignmentHistory[matchIndex].response = 'ACCEPTED';
        order.assignmentHistory[matchIndex].respondedAt = now;
      } else {
        order.assignmentHistory.push({
          dealerId: req.user._id,
          dealerName: req.user.name,
          dealerCompanyName: req.user.companyName,
          dealerPincode: req.user.pincode,
          dealerMobile: req.user.mobile,
          assignedAt: now,
          respondedAt: now,
          response: 'ACCEPTED'
        });
      }
    }

    await order.save();

    // Notify Customer
    await NotificationService.send({
      recipientId: order.userId._id,
      recipientRole: 'USER',
      type: 'ORDER_ACCEPTED',
      title: 'Order Accepted by Dealer',
      message: `Your order #${order.orderNumber} has been accepted by dealer ${req.user.companyName || req.user.name}. Vehicle dispatch is being prepared.`,
      orderId: order._id,
      targetPhone: order.userId.whatsappNumber || order.userId.mobile
    });

    return successResponse(res, 'Order accepted successfully. Please assign driver and weighbridge details.', { order });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Dealer Declines an Order (Immediate Admin Alert & Re-routes to next nearest dealer)
// @route   POST /api/orders/:id/decline
// @access  Private (Dealer)
const declineOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'name mobile')
      .populate('assignedDealerId', 'name companyName pincode mobile');

    if (!order) {
      return errorResponse(res, 'Order not found.', 404);
    }

    if (order.orderStatus !== 'PLACED' || order.dealerId) {
      return errorResponse(res, 'Cannot decline an order that is already accepted or fulfilled.', 400);
    }

    // Security check: Only the currently assigned dealer can decline their assignment
    if (order.assignedDealerId && order.assignedDealerId._id.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Unauthorized. You are not the assigned dealer for this order.', 403);
    }

    const now = new Date();
    const reason = (req.body.reason || 'Dealer declined order').trim();

    // 1. Record rejection in Order model
    order.dealerResponseStatus = 'REJECTED';
    order.dealerRejectedAt = now;
    order.dealerRejectedBy = req.user._id;
    order.dealerRejectionReason = reason;
    order.dealerAlarmActive = false; // Stop Dealer Alarm
    order.declinedBy.addToSet(req.user._id);

    // 2. Update assignment history
    if (Array.isArray(order.assignmentHistory)) {
      const matchIndex = order.assignmentHistory.findIndex(
        (h) => h.dealerId.toString() === req.user._id.toString() && h.response === 'PENDING'
      );
      if (matchIndex !== -1) {
        order.assignmentHistory[matchIndex].response = 'REJECTED';
        order.assignmentHistory[matchIndex].respondedAt = now;
        order.assignmentHistory[matchIndex].reason = reason;
      }
    }

    // 3. 🚨 CRITICAL: IMMEDIATELY ALERT ADMIN (DO NOT WAIT 15 MINUTES)
    order.adminAlarmActive = true;
    order.adminAlertType = 'DEALER_DECLINED';

    const customerName = order.shippingDetails?.fullName || order.userId?.name || 'Customer';
    const dealerName = req.user.companyName || req.user.name;

    await NotificationService.send({
      recipientRole: 'ADMIN',
      type: 'DEALER_DECLINED_ORDER',
      title: '🚨 DEALER DECLINED ORDER',
      message: `Dealer ${dealerName} (PIN: ${req.user.pincode}) DECLINED Order #${order.orderNumber} from ${customerName} (PIN: ${order.pincode}). Material: ${order.numberOfTractors || order.quantity} Tractor(s) of ${order.productNameSnapshot} (₹${order.totalAmount.toLocaleString('en-IN')}). Reason: ${reason}`,
      orderId: order._id
    });

    // 4. Reassign to the next nearest eligible dealer
    const remainingDealers = await User.find({
      role: 'DEALER',
      isActive: true,
      isDeleted: { $ne: true },
      _id: { $nin: order.declinedBy }
    });

    let nextDealer = null;
    let nextDistanceKm = null;

    if (remainingDealers.length > 0 && order.latitude && order.longitude) {
      const routing = await PincodeService.findNearestDealer(
        { latitude: order.latitude, longitude: order.longitude },
        remainingDealers
      );
      nextDealer = routing.nearestDealer;
      nextDistanceKm = routing.distanceKm;
    }

    if (nextDealer) {
      const newDeadline = new Date(now.getTime() + 15 * 60 * 1000);
      order.assignedDealerId = nextDealer._id;
      order.dealerDistanceKm = nextDistanceKm;
      order.orderAssignedAt = now;
      order.dealerResponseDeadline = newDeadline;
      order.dealerResponseStatus = 'PENDING';
      order.dealerAlarmActive = true; // Start Dealer B Alarm!
      order.adminEscalationSent = false;

      // Add new assignment to history
      order.assignmentHistory.push({
        dealerId: nextDealer._id,
        dealerName: nextDealer.name,
        dealerCompanyName: nextDealer.companyName,
        dealerPincode: nextDealer.pincode,
        dealerMobile: nextDealer.mobile,
        distanceKm: nextDistanceKm,
        assignedAt: now,
        deadline: newDeadline,
        response: 'PENDING'
      });

      // Notify Dealer B with fresh 15-minute response window
      await NotificationService.send({
        recipientId: nextDealer._id,
        recipientRole: 'DEALER',
        type: 'ORDER_PLACED',
        title: '🚨 NEW ORDER ASSIGNED (Re-routed) 🚛',
        message: `New re-routed order #${order.orderNumber} (${order.shippingDetails?.city || order.pincode} — ${nextDistanceKm !== null ? `${nextDistanceKm} km` : ''}): ${order.numberOfTractors || order.quantity} Tractor(s) of ${order.productNameSnapshot}. Total: ₹${order.totalAmount.toLocaleString('en-IN')}. Please accept within 15 minutes.`,
        orderId: order._id,
        targetPhone: nextDealer.whatsappNumber || nextDealer.mobile
      });
    } else {
      order.assignedDealerId = null;
      order.dealerAlarmActive = false;
    }

    await order.save();

    return successResponse(
      res,
      'Order declined and recorded. Immediate alert sent to Admin. Order re-routed to next available dealer.',
      {
        orderId: order._id,
        reassignedTo: nextDealer ? nextDealer.name : null,
        nextDealerDistanceKm: nextDistanceKm
      }
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Admin: Get all active escalations & rejection alerts
// @route   GET /api/orders/admin/escalations
// @access  Private (Admin)
const getAdminEscalations = async (req, res) => {
  try {
    const escalations = await Order.find({
      orderStatus: 'PLACED',
      paymentStatus: 'PAID',
      $or: [
        { adminAlarmActive: true },
        { adminAlertType: { $ne: 'NONE' } },
        { dealerResponseStatus: { $in: ['REJECTED', 'TIMEOUT'] } }
      ]
    })
      .populate('userId', 'name mobile email')
      .populate('assignedDealerId', 'name companyName mobile pincode')
      .populate('dealerRejectedBy', 'name companyName mobile pincode')
      .sort({ updatedAt: -1 });

    return successResponse(res, 'Admin escalations retrieved successfully.', { escalations });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Admin: Acknowledge and silence alert alarm
// @route   POST /api/orders/:id/admin-acknowledge
// @access  Private (Admin)
const adminAcknowledgeAlert = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return errorResponse(res, 'Order not found.', 404);
    }

    order.adminAlarmActive = false;
    order.adminAcknowledgedAt = new Date();
    order.adminAcknowledgedBy = req.user._id;
    await order.save();

    return successResponse(res, 'Alert acknowledged and alarm silenced.', { orderId: order._id });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Admin: Manually reassign order to a specific regional dealer
// @route   POST /api/orders/:id/reassign
// @access  Private (Admin)
const adminReassignOrder = async (req, res) => {
  try {
    const { targetDealerId } = req.body;
    if (!targetDealerId) {
      return errorResponse(res, 'Target dealer ID is required.', 400);
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return errorResponse(res, 'Order not found.', 404);
    }

    const targetDealer = await User.findOne({ _id: targetDealerId, role: 'DEALER', isActive: true, isDeleted: { $ne: true } });
    if (!targetDealer) {
      return errorResponse(res, 'Target dealer not found or inactive.', 404);
    }

    const now = new Date();
    const deadline = new Date(now.getTime() + 15 * 60 * 1000);

    let distanceKm = null;
    if (targetDealer.latitude && targetDealer.longitude && order.latitude && order.longitude) {
      distanceKm = PincodeService.calculateHaversineDistanceKm(
        targetDealer.latitude,
        targetDealer.longitude,
        order.latitude,
        order.longitude
      );
    }

    order.assignedDealerId = targetDealer._id;
    order.dealerDistanceKm = distanceKm;
    order.orderAssignedAt = now;
    order.dealerResponseDeadline = deadline;
    order.dealerResponseStatus = 'PENDING';
    order.dealerAlarmActive = true;
    order.adminAlarmActive = false;
    order.adminEscalationSent = false;
    order.adminAlertType = 'NONE';

    order.assignmentHistory.push({
      dealerId: targetDealer._id,
      dealerName: targetDealer.name,
      dealerCompanyName: targetDealer.companyName,
      dealerPincode: targetDealer.pincode,
      dealerMobile: targetDealer.mobile,
      distanceKm,
      assignedAt: now,
      deadline,
      response: 'PENDING',
      reason: `Manually reassigned by Admin (${req.user.name})`
    });

    await order.save();

    // Notify newly assigned dealer
    await NotificationService.send({
      recipientId: targetDealer._id,
      recipientRole: 'DEALER',
      type: 'ORDER_REASSIGNED',
      title: '🚨 ORDER REASSIGNED BY ADMIN 🚛',
      message: `Admin reassigned Order #${order.orderNumber} to your depot (${order.shippingDetails?.city || order.pincode}): ${order.numberOfTractors || order.quantity} Tractor(s) of ${order.productNameSnapshot}. Total: ₹${order.totalAmount.toLocaleString('en-IN')}. Please accept within 15 minutes.`,
      orderId: order._id,
      targetPhone: targetDealer.whatsappNumber || targetDealer.mobile
    });

    return successResponse(res, `Order #${order.orderNumber} successfully reassigned to dealer ${targetDealer.companyName || targetDealer.name}. Fresh 15-min response window active.`, { order });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Admin: Get all orders with multi-filters
// @route   GET /api/admin/orders
// @access  Private (Admin)
const getAllOrdersAdmin = async (req, res) => {
  try {
    const {
      status,
      paymentStatus,
      dealerId,
      userId,
      category,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 50
    } = req.query;

    const filter = {};

    if (status) filter.orderStatus = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (dealerId) filter.dealerId = dealerId;
    if (userId) filter.userId = userId;
    if (category) filter.category = category;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { productNameSnapshot: { $regex: search, $options: 'i' } },
        { shippingAddress: { $regex: search, $options: 'i' } },
        { driverName: { $regex: search, $options: 'i' } },
        { vehicleNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('userId', 'name mobile whatsappNumber companyName userType gstNumber')
        .populate('dealerId', 'name companyName mobile')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Order.countDocuments(filter)
    ]);

    return successResponse(res, 'Admin orders retrieved.', {
      orders,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  getDealerAvailableOrders,
  getDealerDeliveries,
  acceptOrder,
  declineOrder,
  getAllOrdersAdmin,
  getAdminEscalations,
  adminAcknowledgeAlert,
  adminReassignOrder
};
