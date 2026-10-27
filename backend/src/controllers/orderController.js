const crypto = require('crypto');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Location = require('../models/Location');
const VehicleConfig = require('../models/VehicleConfig');
const VehicleSetting = require('../models/VehicleSetting');
const User = require('../models/User');
const Driver = require('../models/Driver');
const DealerTransportConfig = require('../models/DealerTransportConfig');
const DealerTractorRate = require('../models/DealerTractorRate');
const IciciTransaction = require('../models/IciciTransaction');
const PendingOrderIntent = require('../models/PendingOrderIntent');
const { generateDealerCode } = require('../utils/dealerCode');
const { escapeRegex } = require('../utils/escapeRegex');
const { findConflictingActiveOrder } = require('../utils/driverAvailability');
const { claimDumperForOrder, releaseDumperForOrder } = require('../utils/dumperAvailability');
const RazorpayService = require('../services/razorpayService');
const IciciPaymentService = require('../services/iciciPaymentService');
const { splitOrderAmount } = require('../utils/invoiceSplit');
const NotificationService = require('../services/notificationService');
const PincodeService = require('../services/pincodeService');
const RoadDistanceService = require('../services/roadDistanceService');
const SmsService = require('../services/smsService');
const { PAYMENT_GATEWAY } = require('../config/env');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { emitOrderAccepted, emitOrderStatusUpdate } = require('../sockets/socket');
const { ensureProductTractorPrices } = require('../utils/tractorPricing');

// Fields identifying the customer's exact shipping address/map location. Hidden from a dealer
// until they accept the order -- before that, a dealer may see only the computed distance (KM),
// material and price, never where the delivery actually is.
const DEALER_HIDDEN_ADDRESS_FIELDS = [
  'shippingAddress',
  'deliveryAddress',
  'pincode',
  'deliveryPincode',
  'placeId',
  'placeName',
  'gpsAccuracy',
  'gpsLatitude',
  'gpsLongitude',
  'latitude',
  'longitude',
  'deliveryLatitude',
  'deliveryLongitude',
  'deliveryInstructions'
];

// @desc    Strips the customer's exact shipping address/coordinates (street address, PIN code,
//          GPS) from an order before it is sent to a dealer who has not yet accepted it
//          (order.dealerId is null, or belongs to a different dealer) -- only "where exactly"
//          is hidden. Distance in KM, the broad delivery Area/City/State, material, quantity and
//          price all remain visible, so a dealer can judge a job before accepting it. Full
//          address/coordinates unlock automatically once `dealerId` is set to that dealer via
//          acceptOrder.
const maskAddressForPendingDealer = (orderDoc, requestingDealerId) => {
  const obj = orderDoc.toObject ? orderDoc.toObject() : { ...orderDoc };
  const ownerId = obj.dealerId && obj.dealerId._id ? String(obj.dealerId._id) : obj.dealerId ? String(obj.dealerId) : null;
  if (ownerId && requestingDealerId && ownerId === String(requestingDealerId)) {
    return obj; // Already accepted by this dealer -- full visibility.
  }

  for (const field of DEALER_HIDDEN_ADDRESS_FIELDS) {
    obj[field] = null;
  }
  if (obj.shippingDetails) {
    obj.shippingDetails = {
      fullName: obj.shippingDetails.fullName,
      mobile: obj.shippingDetails.mobile
    };
  }
  return obj;
};

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
      deliveryLatitude: rawDeliveryLatitude,
      deliveryLongitude: rawDeliveryLongitude,
      gpsLatitude: rawGpsLatitude,
      gpsLongitude: rawGpsLongitude,
      placeId: rawPlaceId,
      placeName: rawPlaceName,
      gpsAccuracy: rawGpsAccuracy,
      deliveryInstructions,
      dealerId: customerSelectedDealerId
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
    let locationDoc = null;
    if (locationId) {
      locationDoc = await Location.findOne({ _id: locationId, vehicleType });
      if (!locationDoc || !locationDoc.isActive) {
        return errorResponse(res, `The selected location is not active for ${vehicleType} delivery.`, 400);
      }
      finalLocationName = locationDoc.name;
    } else if (finalLocationName) {
      locationDoc = await Location.findOne({
        name: { $regex: `^${escapeRegex(finalLocationName)}$`, $options: 'i' },
        vehicleType,
        category: product.category,
        isActive: true
      });
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

    // DUMPER: no material/base pricing at all any more. TRACTOR: material price is now the
    // selling dealer's own configured Single/Double Patiya rate (DealerTractorRate), resolved
    // once a dealer is known -- see the TRACTOR branch further below, after dealer assignment.

    let deliveryCharge = 0;
    const tax = 0;

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

    // 6. PIN code is optional -- a confirmed map/GPS pin (latitude/longitude below) can stand in
    // for it. When a PIN code IS provided, it must still be a valid 6-digit Indian PIN.
    const pincode = String(rawPincode || shippingDetails?.pincode || '').trim();
    if (pincode && !PincodeService.isValidIndianPincode(pincode)) {
      return errorResponse(
        res,
        'Invalid PIN code. Must be exactly 6 numeric digits (e.g. 384001). Letters and special characters are not allowed.',
        400
      );
    }

    // Geocode PIN code (only if one was actually provided)
    const pinGeo = pincode ? await PincodeService.lookup(pincode) : null;

    // Build structured shipping details
    const finalGpsAccuracy =
      typeof shippingDetails?.gpsAccuracy === 'number'
        ? shippingDetails.gpsAccuracy
        : typeof rawGpsAccuracy === 'number'
        ? rawGpsAccuracy
        : null;
    const finalGpsLat =
      typeof shippingDetails?.gpsLatitude === 'number'
        ? shippingDetails.gpsLatitude
        : typeof rawGpsLatitude === 'number'
        ? rawGpsLatitude
        : null;

    const finalGpsLng =
      typeof shippingDetails?.gpsLongitude === 'number'
        ? shippingDetails.gpsLongitude
        : typeof rawGpsLongitude === 'number'
        ? rawGpsLongitude
        : null;

    const structuredDetails = {
      fullName: (shippingDetails?.fullName || req.user.name || '').trim(),
      mobile: (shippingDetails?.mobile || req.user.mobile || '').trim(),
      addressLine1: (shippingDetails?.addressLine1 || '').trim(),
      addressLine2: (shippingDetails?.addressLine2 || '').trim(),
      area: (shippingDetails?.area || '').trim(),
      city: (shippingDetails?.city || pinGeo?.city || '').trim(),
      state: (shippingDetails?.state || pinGeo?.state || 'Gujarat').trim(),
      pincode,
      landmark: (shippingDetails?.landmark || '').trim(),
      placeId: (shippingDetails?.placeId || rawPlaceId || '').trim(),
      placeName: (shippingDetails?.placeName || rawPlaceName || '').trim(),
      gpsAccuracy: finalGpsAccuracy,
      gpsLatitude: finalGpsLat,
      gpsLongitude: finalGpsLng
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

    // 7. Dealer Assignment & Distance-Based Pricing.
    // Origin for the road-distance price calculation is the ADMIN-configured coordinates of
    // the resolved sourcing `locationDoc` (Material + Location), never the dealer's own saved
    // address — every dealer offering the same Material+Location therefore quotes the same
    // distance, and only their own configured Rate/KM differs. If the admin hasn't saved
    // coordinates for this Location yet, this gracefully falls back to the original per-dealer
    // distance model (dealer's own lat/lng vs customer) so checkout never breaks mid-rollout.
    let nearestDealer = null;
    let distanceKm = null;
    let dealerRatePerKm = null;
    let distanceSource = null;

    const transportMaterial = ['Sand', 'Aggregate'].includes(product.category) ? product.category : null;
    const hasLocationCoords = !!(
      locationDoc &&
      transportMaterial &&
      (locationDoc.category === transportMaterial || locationDoc.category === 'ALL') &&
      locationDoc.latitude !== null &&
      locationDoc.latitude !== undefined &&
      locationDoc.longitude !== null &&
      locationDoc.longitude !== undefined
    );

    // TRACTOR is priced entirely by the dealer's own flat Rate/Tractor (resolved further below
    // via DealerTractorRate) -- no distance-based transport charge and no DealerTransportConfig
    // dependency, so dealer resolution here is just "validate the customer's chosen dealer".
    // The customer always reaches checkout having picked one from the already 5km-radius- and
    // rate-filtered list (see dealerTransportController.getEligibleDealers).
    if (vehicleType === 'TRACTOR') {
      if (!customerSelectedDealerId) {
        return errorResponse(res, 'Please select a dealer for your Tractor order.', 400);
      }
      const selectedDealer = await User.findOne({
        _id: customerSelectedDealerId,
        role: 'DEALER',
        isActive: true,
        isDeleted: { $ne: true }
      });
      if (!selectedDealer) {
        return errorResponse(res, 'The selected dealer is no longer available. Please choose another dealer.', 400);
      }
      nearestDealer = selectedDealer;
    } else if (customerSelectedDealerId) {
      const selectedDealer = await User.findOne({
        _id: customerSelectedDealerId,
        role: 'DEALER',
        isActive: true,
        isDeleted: { $ne: true }
      });
      if (!selectedDealer) {
        return errorResponse(res, 'The selected dealer is no longer available. Please choose another dealer.', 400);
      }

      if (transportMaterial && finalLocationName) {
        // Dumper rates vary by grain size (Aggregate) / processing specification (Sand) the same
        // way Tractor rates already do -- see dumperVariant below.
        const dumperVariant = transportMaterial === 'Aggregate' ? aggregateType : optionName;
        const config = await DealerTransportConfig.findOne({
          dealerId: selectedDealer._id,
          material: transportMaterial,
          locationName: { $regex: `^${escapeRegex(finalLocationName)}$`, $options: 'i' },
          variantName: { $regex: `^${escapeRegex(String(dumperVariant || '').trim())}$`, $options: 'i' },
          isActive: true
        });
        if (!config) {
          return errorResponse(
            res,
            `${selectedDealer.companyName || selectedDealer.name} no longer offers transport for ${transportMaterial} (${dumperVariant}) from ${finalLocationName}. Please go back and select another dealer.`,
            400
          );
        }
        dealerRatePerKm = config.ratePerKm;
      }

      if (hasLocationCoords) {
        const roadResult = await RoadDistanceService.calculateRoadDistanceKm(
          locationDoc.latitude,
          locationDoc.longitude,
          finalLat,
          finalLng
        );
        distanceKm = roadResult ? roadResult.distanceKm : null;
        distanceSource = roadResult ? roadResult.source : null;
      } else if (selectedDealer.latitude !== null && selectedDealer.longitude !== null) {
        distanceKm = PincodeService.calculateHaversineDistanceKm(
          finalLat,
          finalLng,
          selectedDealer.latitude,
          selectedDealer.longitude
        );
        distanceSource = 'dealer_fallback_haversine';
      }
      nearestDealer = selectedDealer;
    } else {
      let eligibleConfigs = [];
      const dumperVariant = transportMaterial === 'Aggregate' ? aggregateType : optionName;
      if (transportMaterial && finalLocationName) {
        const configs = await DealerTransportConfig.find({
          material: transportMaterial,
          locationName: { $regex: `^${escapeRegex(finalLocationName)}$`, $options: 'i' },
          variantName: { $regex: `^${escapeRegex(String(dumperVariant || '').trim())}$`, $options: 'i' },
          isActive: true
        }).populate({
          path: 'dealerId',
          match: { role: 'DEALER', isActive: true, isDeleted: { $ne: true } }
        });
        eligibleConfigs = configs.filter((c) => c.dealerId);
      }

      if (eligibleConfigs.length > 0 && hasLocationCoords) {
        // Distance is identical for every eligible dealer (fixed Location origin), so
        // auto-assignment picks the cheapest rate for the customer rather than "nearest".
        const roadResult = await RoadDistanceService.calculateRoadDistanceKm(
          locationDoc.latitude,
          locationDoc.longitude,
          finalLat,
          finalLng
        );
        distanceKm = roadResult ? roadResult.distanceKm : null;
        distanceSource = roadResult ? roadResult.source : null;
        const cheapest = eligibleConfigs.reduce((min, c) => (c.ratePerKm < min.ratePerKm ? c : min), eligibleConfigs[0]);
        nearestDealer = cheapest.dealerId;
        dealerRatePerKm = cheapest.ratePerKm;
      } else if (eligibleConfigs.length > 0) {
        const dealerDocs = eligibleConfigs.map((c) => c.dealerId);
        const result = await PincodeService.findNearestDealer(
          { latitude: finalLat, longitude: finalLng },
          dealerDocs
        );
        nearestDealer = result.nearestDealer;
        distanceKm = result.distanceKm;
        distanceSource = 'dealer_fallback_haversine';
        if (nearestDealer) {
          const matchedConfig = eligibleConfigs.find((c) => String(c.dealerId._id) === String(nearestDealer._id));
          dealerRatePerKm = matchedConfig ? matchedConfig.ratePerKm : null;
        }
      } else {
        const activeDealers = await User.find({ role: 'DEALER', isActive: true, isDeleted: { $ne: true } });
        const result = await PincodeService.findNearestDealer(
          { latitude: finalLat, longitude: finalLng },
          activeDealers
        );
        nearestDealer = result.nearestDealer;
        distanceKm = result.distanceKm;
        distanceSource = 'dealer_fallback_haversine';
      }
    }

    // Sand/Aggregate orders (DUMPER, or TRACTOR via the branch above) must resolve to a dealer
    // with an actual configured rate for this Material + Location -- without this, the
    // `nearestDealer` fallback above would silently assign the order to a dealer who never set
    // a rate for it. Tractor doesn't use this transport-rate system at all (see above), so it's
    // exempt here.
    if (transportMaterial && vehicleType !== 'TRACTOR' && (dealerRatePerKm === null || distanceKm === null)) {
      return errorResponse(
        res,
        `No dealer currently offers a transport rate for ${transportMaterial} from ${finalLocationName || 'this location'}. Please choose a different sourcing location or select another dealer.`,
        400
      );
    }

    if (dealerRatePerKm !== null && distanceKm !== null) {
      deliveryCharge = Math.round(dealerRatePerKm * distanceKm * 100) / 100;
    }

    // DUMPER has no material/base price component any more (see section 4 above) — the Rate
    // Per Ton (Distance x Dealer Rate/KM) IS the entire order value, so it cannot be ₹0/unset.
    // A dealer with a configured rate for this exact Material + Location must be resolvable.
    if (vehicleType === 'DUMPER') {
      if (dealerRatePerKm === null || distanceKm === null || deliveryCharge <= 0) {
        return errorResponse(
          res,
          `No dealer currently offers a transport rate for ${transportMaterial || product.category} from ${finalLocationName || 'this location'}. Please choose a different sourcing location or select another dealer.`,
          400
        );
      }
      // Add the admin-configured flat platform service charge on top of the dealer's own rate
      // BEFORE assigning unitPrice -- deliveryCharge (not unitPrice) is what totalAmount is
      // actually built from below (subtotal stays 0 for Dumper), so the charge must land here
      // for the displayed Rate Per Ton and the amount actually billed to stay in sync.
      deliveryCharge = Math.round((deliveryCharge + (settings.dumperServiceCharge || 0)) * 100) / 100;
      // The computed transport rate IS the customer-facing "Rate Per Ton" for Dumper orders.
      unitPrice = deliveryCharge;
    }

    // Dumper's upfront charge is a flat, admin-configured "booking amount" -- NOT the Rate Per
    // Ton computed above (that stays in unitPrice/pricePerTonSnapshot for display and for the
    // real weight-based final payment later). Snapshotted so a later admin change never alters
    // what was actually charged/owed on an already-placed order.
    const dumperBookingAmount = Math.round((settings.dumperBookingAmount ?? 1000) * 100) / 100;

    // TRACTOR material price is the selling dealer's own configured rate for this exact
    // Material + Location/Grain + Patiya type -- never the old admin-fixed flat price. A
    // dealer without one isn't a valid selection (mirrors the Dumper requirement above).
    if (vehicleType === 'TRACTOR') {
      const tractorVariant = transportMaterial === 'Aggregate' ? aggregateType : finalLocationName;
      const dealerTractorRate = await DealerTractorRate.findOne({
        dealerId: nearestDealer?._id,
        material: transportMaterial,
        variantName: { $regex: `^${escapeRegex(String(tractorVariant || '').trim())}$`, $options: 'i' },
        tractorType,
        isActive: true
      });
      if (!dealerTractorRate) {
        return errorResponse(
          res,
          `${nearestDealer?.companyName || nearestDealer?.name || 'The selected dealer'} has not set a rate for ${tractorType} → ${tractorVariant}. Please choose a different dealer.`,
          400
        );
      }
      // Admin-configured flat platform service charge added per tractor trip, on top of the
      // dealer's own rate, before multiplying by quantity.
      unitPrice = dealerTractorRate.ratePerTractor + (settings.tractorServiceCharge || 0);
      subtotal = Math.round(unitPrice * qty);
    }

    const totalAmount = vehicleType === 'DUMPER' ? dumperBookingAmount : subtotal + deliveryCharge + tax;

    // 8. Build the full order payload now (everything Order.create() will eventually need), but
    // do NOT persist it yet -- no Order document exists until the upfront payment actually
    // succeeds. This is staged in PendingOrderIntent, keyed by the payment gateway's own
    // transaction reference, and is only turned into a real Order by
    // OrderFinalizationService.materializeOrder once payment is confirmed (see
    // paymentController.js's finalizeUpfrontPaymentSuccess). An abandoned/never-paid checkout
    // therefore never shows up anywhere -- not the customer's order list, not any admin/dealer
    // view, not even as a document in the orders collection.
    const orderPayload = {
      userId: req.user._id,
      dealerId: null,
      assignedDealerId: nearestDealer ? nearestDealer._id : null,
      dealerDistanceKm: distanceKm,
      dealerRatePerKm,
      dealerDistanceSource: distanceSource,
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
      // Admin's platform service-charge rate AT THIS MOMENT, snapshotted so a later rate change
      // never retroactively changes this order's GST invoice split (see utils/invoiceSplit.js).
      serviceChargeRateSnapshot: vehicleType === 'TRACTOR' ? settings.tractorServiceCharge : settings.dumperServiceCharge,
      bookingAmountSnapshot: vehicleType === 'DUMPER' ? dumperBookingAmount : 0,
      shippingAddress: finalShippingAddress,
      deliveryAddress: finalShippingAddress,
      pincode,
      deliveryPincode: pincode,
      shippingDetails: structuredDetails,
      placeId: structuredDetails.placeId,
      placeName: structuredDetails.placeName,
      gpsAccuracy: structuredDetails.gpsAccuracy,
      gpsLatitude: structuredDetails.gpsLatitude,
      gpsLongitude: structuredDetails.gpsLongitude,
      deliveryArea: structuredDetails.area,
      deliveryCity: structuredDetails.city,
      deliveryState: structuredDetails.state,
      latitude: finalLat,
      longitude: finalLng,
      deliveryLatitude: finalLat,
      deliveryLongitude: finalLng,
      deliveryDate,
      deliveryInstructions: deliveryInstructions || ''
    };

    // Demo/testing bypass is staged alongside whichever live gateway is active, so the payment
    // modal's "Confirm & Place Order (Demo Mode)" button always works regardless of
    // PAYMENT_GATEWAY. It never creates an Order on its own either -- devConfirmPayment
    // materializes it the same way a real gateway confirmation would.
    const demoRef = `DEMO-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`.toUpperCase();
    await PendingOrderIntent.create({
      gateway: 'DEMO',
      gatewayRef: demoRef,
      userId: req.user._id,
      amount: totalAmount,
      orderPayload
    });

    let rzpOrder = null;
    let iciciRedirectUrl = '';
    if (PAYMENT_GATEWAY === 'ICICI') {
      const merchantTxnNo = IciciPaymentService.generateMerchantTxnNo();
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const returnURL = `${protocol}://${req.get('host')}/api/payments/icici/callback`;
      const { request: iciciInitiateRequest, response: iciciInitiateResponse } = await IciciPaymentService.initiateSale({
        merchantTxnNo,
        amount: totalAmount,
        customerEmailID: req.user?.email,
        customerMobileNo: structuredDetails.mobile,
        customerName: structuredDetails.fullName,
        returnURL,
        addlParam1: merchantTxnNo
      });
      if (iciciInitiateResponse.responseCode !== 'R1000' || !iciciInitiateResponse.fullRedirectURI) {
        console.error('[ICICI Initiate Sale Rejected]', JSON.stringify(iciciInitiateResponse));
        const reason =
          iciciInitiateResponse.respDescription ||
          iciciInitiateResponse.responseMessage ||
          iciciInitiateResponse.message ||
          iciciInitiateResponse.errorDescription ||
          'Unable to initiate payment with ICICI. Please try again.';
        return errorResponse(res, reason, 502);
      }
      iciciRedirectUrl = iciciInitiateResponse.fullRedirectURI;

      await PendingOrderIntent.create({
        gateway: 'ICICI',
        gatewayRef: merchantTxnNo,
        userId: req.user._id,
        amount: totalAmount,
        orderPayload,
        rawInitiateRequest: iciciInitiateRequest,
        rawInitiateResponse: iciciInitiateResponse
      });
    } else {
      const receiptRef = `CHK-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`.toUpperCase();
      rzpOrder = await RazorpayService.createOrder(totalAmount, receiptRef);

      await PendingOrderIntent.create({
        gateway: 'RAZORPAY',
        gatewayRef: rzpOrder.id,
        userId: req.user._id,
        amount: totalAmount,
        orderPayload
      });
    }

    console.log(
      `[Checkout] gateway=${PAYMENT_GATEWAY} vehicleType=${vehicleType} hasIciciRedirect=${!!iciciRedirectUrl} hasRzpOrder=${!!rzpOrder}`
    );

    return successResponse(
      res,
      'Checkout initialized. Complete payment to place your order.',
      {
        orderPreview: orderPayload,
        demoRef,
        nearestDealer: nearestDealer
          ? {
              id: nearestDealer._id,
              name: nearestDealer.name,
              companyName: nearestDealer.companyName,
              pincode: nearestDealer.pincode,
              distanceKm
            }
          : null,
        ...(PAYMENT_GATEWAY === 'ICICI'
          ? { paymentGateway: 'ICICI', iciciRedirectUrl }
          : { paymentGateway: 'RAZORPAY', razorpayOrder: rzpOrder, keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_key' })
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
    // An order record is created before the customer completes the upfront payment (so the
    // payment gateway has an order to reference), but it isn't a real, committed order yet --
    // no dealer has been notified. Excluded here so an abandoned/never-paid checkout never shows
    // up in the customer's order history or inflates "Pending" counts derived from this list.
    const orders = await Order.find({ userId: req.user._id, orderStatus: { $ne: 'PENDING_PAYMENT' } })
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
      .populate('dealerId', 'name companyName mobile whatsappNumber email gstNumber officeAddress city state pincode')
      .populate('productId', 'name category description');

    if (!order) {
      return errorResponse(res, 'Order not found.', 404);
    }

    // Role-based security check
    const userIdStr = req.user._id ? req.user._id.toString() : req.user.id?.toString();
    const isOwner = order.userId && order.userId._id?.toString() === userIdStr;
    const isAssignedDealer = order.dealerId && order.dealerId._id?.toString() === userIdStr;
    const isAvailableToDealer = req.user.role === 'DEALER' && order.orderStatus === 'PLACED' && !order.dealerId;
    const isDriver = req.user.role === 'DRIVER' && (
      (order.driverId && order.driverId.toString() === userIdStr) ||
      (order.driverMobile && req.user.mobile && order.driverMobile.replace(/\D/g, '').slice(-10) === req.user.mobile.replace(/\D/g, '').slice(-10)) ||
      (req.user.dealerId && order.dealerId && order.dealerId._id?.toString() === (req.user.dealerId._id || req.user.dealerId).toString())
    );
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';

    if (!isOwner && !isAssignedDealer && !isAvailableToDealer && !isDriver && !isAdmin) {
      return errorResponse(res, 'Unauthorized to view this order details.', 403);
    }

    const responseOrder = req.user.role === 'DEALER' && !isAssignedDealer ? maskAddressForPendingDealer(order, userIdStr) : order;

    return successResponse(res, 'Order retrieved successfully.', {
      order: responseOrder,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_key'
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc  Idempotently ensures this order's Zoho Service Charge invoice exists (creating it on
//        the first call, just returning the cached id/number on every later call -- repeat page
//        views, the Android WebView's known double-request pattern on downloads, etc. must never
//        issue a second Zoho invoice for the same order). `order` must already have `userId`
//        populated with at least name/email/mobile/whatsappNumber.
const ensureServiceChargeInvoice = async (order) => {
  const { serviceChargeAmount, materialAmount } = splitOrderAmount(order);

  // The real sold quantity/unit/rate -- Tractor bills per trip, Dumper bills per the actual
  // weighed tonnage (order.totalWeight, only reached once finalPaymentStatus is PAID -- see the
  // route's own gate). Computed once here and handed back to the caller so the frontend's
  // Material Invoice can show the SAME figures Zoho's Service Charge invoice uses, instead of
  // re-deriving its own from whatever `order` snapshot the client currently holds.
  const isTractorOrder = order.vehicleTypeSnapshot === 'TRACTOR' || order.transportType === 'Tractor';
  const quantity = isTractorOrder ? (order.numberOfTractors || order.quantity || 1) : (order.totalWeight || 1);
  const unit = isTractorOrder ? 'trip' : 'ton';
  // Dumper's upfront booking amount is a payment adjustment already netted out of materialAmount
  // (see invoiceSplit.js) -- it must NOT affect the taxable rate, so the rate is computed from
  // the full, pre-deduction material value (matching what the Material Invoice's own GST
  // breakdown is computed from).
  const materialGrossAmountForRate = materialAmount + (order.bookingAmountSnapshot || 0);
  // Pre-tax (5% GST not yet added) per-unit rate -- the Material Invoice shows RATE and TAX as
  // separate columns, so RATE itself must be the pre-tax figure, not the GST-inclusive total.
  const materialTaxableForRate = Math.round((materialGrossAmountForRate / 1.05) * 100) / 100;
  const materialRatePerUnit = quantity > 0 ? Math.round((materialTaxableForRate / quantity) * 100) / 100 : materialTaxableForRate;

  if (order.zohoServiceChargeInvoiceNumber) {
    return {
      invoiceId: order.zohoServiceChargeInvoiceId,
      invoiceNumber: order.zohoServiceChargeInvoiceNumber,
      serviceChargeAmount,
      materialAmount,
      quantity,
      unit,
      materialRatePerUnit
    };
  }

  // Locally generated -- NOT a real Zoho Books invoice. Ananta's Service Charge invoice is
  // rendered by the app itself (InvoiceSection), in the exact same template as the Material
  // Invoice, rather than a separately Zoho-styled PDF. Field names (zohoServiceChargeInvoice*)
  // are kept from when this really did call Zoho, to avoid a model/field rename.
  const digits = (order.orderNumber || '').replace(/^[^\d]*/, '');
  const invoiceNumber = `AN/SC/26-27/${digits}`;

  order.zohoServiceChargeInvoiceId = '';
  order.zohoServiceChargeInvoiceNumber = invoiceNumber;
  await order.save();

  return { invoiceId: '', invoiceNumber, serviceChargeAmount, materialAmount, quantity, unit, materialRatePerUnit };
};

// @desc    Issues (or, on a repeat call, simply returns) Ananta's own "Service Charge" invoice
//          for this order's upfront payment -- Ananta's own GSTIN, 18% GST. Lazily created the
//          first time the customer views/downloads the order's invoice, never at
//          payment-confirmation time. Rendered by the app itself (not Zoho) in the exact same
//          template as the dealer's own "Material Invoice" below it, which likewise is not a
//          Zoho invoice (Zoho ties one GSTIN to the whole organization, so it cannot carry the
//          dealer's own GSTIN anyway) -- both use the order's real dealer/customer data.
// @route   GET /api/orders/:id/service-charge-invoice
// @access  Private (User -- order owner, or Admin)
const getServiceChargeInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('userId', 'name mobile whatsappNumber email');
    if (!order) {
      return errorResponse(res, 'Order not found.', 404);
    }

    const userIdStr = req.user._id ? req.user._id.toString() : req.user.id?.toString();
    const isOwner = order.userId && order.userId._id?.toString() === userIdStr;
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
    if (!isOwner && !isAdmin) {
      return errorResponse(res, 'Unauthorized to view this order invoice.', 403);
    }

    if (order.paymentStatus !== 'PAID') {
      return errorResponse(res, 'This order has not been paid yet -- no invoice can be issued.', 400);
    }

    const isTractorOrder = order.vehicleTypeSnapshot === 'TRACTOR' || order.transportType === 'Tractor';
    if (!isTractorOrder && order.finalPaymentStatus !== 'PAID') {
      return errorResponse(
        res,
        'The final weight-based settlement for this order is still pending. The GST invoice will be available once the final payment is completed.',
        400
      );
    }

    const { invoiceNumber, serviceChargeAmount, materialAmount, quantity, unit, materialRatePerUnit } =
      await ensureServiceChargeInvoice(order);

    return successResponse(res, 'Service charge invoice retrieved.', {
      zohoInvoiceNumber: invoiceNumber,
      serviceChargeAmount,
      materialAmount,
      quantity,
      unit,
      materialRatePerUnit
    });
  } catch (error) {
    console.error('[Service Charge Invoice Error]', error.message);
    return errorResponse(res, 'Unable to generate the service charge invoice right now. Please try again shortly.', 502);
  }
};

// @desc    Get new available orders for Dealers (Assigned to this dealer or open pool)
// @route   GET /api/orders/dealer/available
// @access  Private (Dealer, Admin)
const getDealerAvailableOrders = async (req, res) => {
  try {
    const dealer = await User.findById(req.user._id);
    const dealerLat = dealer?.latitude !== undefined ? dealer.latitude : req.user.latitude;
    const dealerLng = dealer?.longitude !== undefined ? dealer.longitude : req.user.longitude;

    const isAdmin = req.user.role === 'ADMIN';

    // Find orders that are confirmed/paid and pending dealer acceptance. A dealer-declined OR
    // 15-minute-SLA-timed-out order stays hidden from every dealer's pool (assignedDealerId is
    // cleared and awaitingCustomerDealerChoice is set by declineOrder / EscalationScheduler,
    // which would otherwise make it match the `assignedDealerId: null` branch below) until the
    // customer explicitly picks a new dealer or requests a refund.
    const filter = {
      orderStatus: 'PLACED',
      dealerId: null,
      paymentStatus: 'PAID',
      awaitingCustomerDealerChoice: { $ne: true }
    };

    if (!isAdmin) {
      // `declinedBy` only matters for the OPEN pool (an order nobody has specifically routed to
      // this dealer) -- it must never hide an order that's directly assigned to them right now,
      // or a customer/admin reassignment back to a dealer who previously declined/timed-out on
      // this same order would notify them but then make the order invisible in their own pool
      // forever (the notification fires regardless, since NotificationService doesn't check
      // declinedBy at all -- only this query did).
      filter.$or = [
        { assignedDealerId: req.user._id },
        { assignedDealerId: null, declinedBy: { $ne: req.user._id } }
      ];
    }

    const orders = await Order.find(filter)
      .populate('userId', 'name mobile city')
      .populate('assignedDealerId', 'name companyName pincode mobile')
      .sort({ createdAt: -1 });

    // A dealer must have an active transport rate configured for this order's exact Material +
    // Sourcing Location before they can see or accept it -- even if, at order creation time, no
    // dealer had a matching rate and the system fell back to assigning it to the nearest active
    // dealer regardless of config (that fallback should not let an unconfigured dealer dispatch
    // material they never set a rate for; admin can still reassign stuck orders manually).
    let dealerConfigKeys = null;
    if (!isAdmin) {
      const dealerConfigs = await DealerTransportConfig.find({ dealerId: req.user._id, isActive: true });
      dealerConfigKeys = new Set(
        dealerConfigs.map((c) => `${c.material}|${c.locationName.trim().toLowerCase()}`)
      );
    }

    const MAX_DISPATCH_RADIUS_KM = 5.0;
    const filteredAndEnriched = [];

    for (const order of orders) {
      const isDirectlyAssigned =
        order.assignedDealerId &&
        order.assignedDealerId._id.toString() === req.user._id.toString();

      // The registration-date floor and rate-config requirement below exist to keep the OPEN
      // pool (unassigned orders, or orders nobody has claimed) scoped to what a dealer should
      // actually see -- they must never hide an order the customer, or a reassignment, routed
      // directly to this exact dealer (e.g. after the original dealer declined).
      if (!isAdmin && !isDirectlyAssigned) {
        if (dealer?.createdAt && order.createdAt < dealer.createdAt) {
          continue;
        }
        if (
          dealerConfigKeys &&
          ['Sand', 'Aggregate'].includes(order.category) &&
          order.sandLocation &&
          !dealerConfigKeys.has(`${order.category}|${order.sandLocation.trim().toLowerCase()}`)
        ) {
          continue;
        }
      }

      // Trust the distance already computed and shown to the customer at checkout
      // (order.dealerDistanceKm -- the real road distance from the ASSIGNED dealer's coordinates
      // AT ORDER-CREATION TIME) instead of live-recomputing a straight-line Haversine distance
      // from this calling dealer's CURRENT profile coordinates. The two can diverge wildly (e.g.
      // if a dealer edits their depot location later, or simply because Haversine straight-line
      // distance is a poor substitute for the road distance actually used to price/route the
      // order), and the dealer's pool card must show the same number the customer already saw.
      const distanceToDealer = order.dealerDistanceKm;

      const isWithin5km = distanceToDealer !== null && distanceToDealer <= MAX_DISPATCH_RADIUS_KM;

      // Always include if assigned to this dealer, or if within 5km, or if open pool.
      // Every order here has dealerId: null (per the filter above) -- none has been accepted
      // yet by any dealer -- so the shipping address/map location is always masked here.
      filteredAndEnriched.push({
        ...maskAddressForPendingDealer(order, req.user._id),
        distanceToDealer: distanceToDealer !== null ? distanceToDealer : order.dealerDistanceKm,
        isWithin5km: distanceToDealer !== null ? distanceToDealer <= MAX_DISPATCH_RADIUS_KM : true,
        isDirectlyAssigned
      });
    }

    return successResponse(res, 'Available orders retrieved.', {
      orders: filteredAndEnriched,
      dealerLocation: {
        latitude: dealerLat,
        longitude: dealerLng,
        isLocationActive: dealer?.isLocationActive || Boolean(dealerLat)
      }
    });
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

// @desc    Dealer's Dumper sales report -- delivered Dumper orders grouped by Vehicle
//          Number, for the requested period (week/month/year)
// @route   GET /api/orders/dealer/reports/sales-by-vehicle
// @access  Private (Dealer)
const getDealerVehicleSalesReport = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const now = new Date();
    let startDate;

    if (period === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    startDate.setHours(0, 0, 0, 0);

    const vehicles = await Order.aggregate([
      {
        $match: {
          dealerId: req.user._id,
          orderStatus: 'DELIVERED',
          vehicleTypeSnapshot: 'DUMPER',
          deliveredAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $cond: [{ $eq: ['$vehicleNumber', ''] }, 'Unassigned', '$vehicleNumber'] },
          totalOrders: { $sum: 1 },
          totalTonnage: { $sum: { $ifNull: ['$totalWeight', 0] } },
          totalSales: {
            $sum: {
              $cond: [
                { $eq: ['$finalPaymentStatus', 'PAID'] },
                { $add: [{ $ifNull: ['$finalPaymentAmount', 0] }, { $ifNull: ['$bookingAmountSnapshot', 0] }] },
                '$totalAmount'
              ]
            }
          },
          driverName: { $last: '$driverName' }
        }
      },
      { $sort: { totalSales: -1 } }
    ]);

    return successResponse(res, 'Dealer vehicle sales report retrieved.', {
      period,
      startDate,
      vehicles: vehicles.map((v) => ({
        vehicleNumber: v._id,
        totalOrders: v.totalOrders,
        totalTonnage: v.totalTonnage,
        totalSales: v.totalSales,
        driverName: v.driverName
      }))
    });
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

    // Every dealer has a permanent unique code, shown to the customer once they accept an
    // order. Generate it lazily on first use rather than requiring a one-off migration for
    // dealers created before this existed.
    if (!req.user.dealerCode) {
      req.user.dealerCode = await generateDealerCode();
      await req.user.save();
    }
    order.dealerCodeSnapshot = req.user.dealerCode;

    if (order.vehicleTypeSnapshot === 'DUMPER') {
      order.fulfillmentStage = 'AWAITING_DRIVER';
    }

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

    // Dumper orders: the accepting dealer must commit one of their own available dumpers of the
    // required wheel type (Available -> In Order). Claimed atomically so the same dumper can never
    // be on two active orders.
    let claimedDumper = null;
    if (order.vehicleTypeSnapshot === 'DUMPER' && order.wheelCountSnapshot) {
      claimedDumper = await claimDumperForOrder({
        dumperId: (req.body || {}).dumperId,
        dealerId: req.user._id,
        wheelType: order.wheelCountSnapshot,
        orderId: order._id
      });
      if (!claimedDumper) {
        return errorResponse(
          res,
          `Select one of your available ${order.wheelCountSnapshot} Wheel dumpers to accept this order.`,
          400
        );
      }
      order.dumperId = claimedDumper._id;
    }

    // Optional Driver Assignment right at Acceptance / Claim Time
    const { driverId, driverName, driverMobile, vehicleNumber } = req.body || {};
    let finalDriverName = (driverName || '').trim();
    let finalDriverMobile = (driverMobile || '').trim();
    let finalVehicleNumber = (vehicleNumber || '').trim().toUpperCase();
    let driverDoc = null;

    if (driverId) {
      driverDoc = await Driver.findById(driverId);
      if (driverDoc) {
        finalDriverName = driverDoc.name;
        finalDriverMobile = driverDoc.mobile;
        finalVehicleNumber = driverDoc.vehicleNumber;
      }
    }

    if (finalDriverName && finalDriverMobile) {
      const cleanDriverMobile = String(finalDriverMobile).replace(/\D/g, '').slice(-10);

      // A driver can only be on one active (not-yet-delivered) delivery at a time.
      const conflict = await findConflictingActiveOrder({
        driverId: driverDoc ? driverDoc._id : null,
        mobile: cleanDriverMobile,
        excludeOrderId: order._id
      });
      if (conflict) {
        if (claimedDumper) await releaseDumperForOrder(order._id);
        return errorResponse(
          res,
          `This driver is already on an active delivery (Order #${conflict.orderNumber}). They'll be available again once that delivery is completed.`,
          409
        );
      }

      order.driverId = driverDoc ? driverDoc._id : null;
      order.driverName = finalDriverName;
      order.driverMobile = cleanDriverMobile;
      order.vehicleNumber = finalVehicleNumber;
      order.driverAssignedAt = now;
      order.driverTaskDispatchedAt = now;

      if (driverDoc) {
        driverDoc.status = 'ON_DELIVERY';
        await driverDoc.save().catch(() => {});
      }

      // Dispatch real-time SMS & live Google Maps navigation link to driver
      SmsService.sendDriverAssignmentSms({
        mobile: cleanDriverMobile,
        driverName: finalDriverName,
        orderNumber: order.orderNumber,
        productName: order.productNameSnapshot,
        quantity: `${order.numberOfTractors || order.quantity} ${order.transportType || 'Loads'}`,
        transportType: order.tractorType || order.vehicleType || order.transportType,
        customerName: order.shippingDetails?.fullName || order.userId?.name,
        customerMobile: order.shippingDetails?.mobile || order.userId?.mobile,
        shippingAddress: order.shippingAddress,
        landmark: order.shippingDetails?.landmark || '',
        instructions: order.deliveryInstructions || '',
        latitude: order.latitude,
        longitude: order.longitude,
        dealerName: req.user.companyName || req.user.name
      }).catch((err) => console.warn('[SMS Driver Assignment Warning]', err.message));
    }

    try {
      await order.save();
    } catch (saveErr) {
      if (claimedDumper) await releaseDumperForOrder(order._id);
      throw saveErr;
    }

    // Notify Customer
    await NotificationService.send({
      recipientId: order.userId._id,
      recipientRole: 'USER',
      type: 'ORDER_ACCEPTED',
      title: 'Order Accepted by Dealer',
      message: `Your order #${order.orderNumber} has been accepted by dealer ${req.user.companyName || req.user.name} (Dealer Code: ${order.dealerCodeSnapshot}). Vehicle dispatch is being prepared.`,
      orderId: order._id,
      targetPhone: order.userId.whatsappNumber || order.userId.mobile
    });

    // Emit Real-Time Socket.IO event to Customer and Admin
    emitOrderAccepted(order);

    const responseMsg = finalDriverName
      ? `Order #${order.orderNumber} accepted and Driver ${finalDriverName} assigned! Google Maps location sent to driver.`
      : 'Order accepted successfully. You can assign driver and dispatch details anytime.';

    return successResponse(res, responseMsg, { order });
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

    const reason = (req.body.reason || '').trim();
    if (!reason) {
      return errorResponse(res, 'A reason is required to decline this order.', 400);
    }

    const now = new Date();

    // 1. Record rejection in Order model
    order.dealerResponseStatus = 'REJECTED';
    order.dealerRejectedAt = now;
    order.dealerRejectedBy = req.user._id;
    order.dealerRejectionReason = reason;
    order.dealerCancellationType = 'DEALER_DECLINED';
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
      message: `Dealer ${dealerName} (PIN: ${req.user.pincode}) DECLINED Order #${order.orderNumber} from ${customerName} (PIN: ${order.pincode}). Material: ${order.numberOfTractors || order.quantity} ${order.transportType || 'Vehicle'}(s) of ${order.productNameSnapshot} (₹${order.totalAmount.toLocaleString('en-IN')}). Reason: ${reason}`,
      orderId: order._id
    });

    // 4. Hand control to the customer instead of auto-routing to another dealer -- they must
    // explicitly pick a new dealer or request a refund.
    order.assignedDealerId = null;
    order.awaitingCustomerDealerChoice = true;

    await order.save();

    await NotificationService.send({
      recipientId: order.userId?._id || order.userId,
      recipientRole: 'USER',
      type: 'ORDER_REJECTED_NEEDS_ACTION',
      title: 'Your order was declined by the dealer',
      message: `Order #${order.orderNumber} was declined by the dealer. Reason: "${reason}". Please select a new dealer or request a refund.`,
      orderId: order._id
    });

    return successResponse(
      res,
      'Order declined and recorded. Admin alerted and customer notified to choose a new dealer or request a refund.',
      { orderId: order._id }
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
    order.awaitingCustomerDealerChoice = false;

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
      message: `Admin reassigned Order #${order.orderNumber}${distanceKm !== null ? ` — ${distanceKm} km away` : ''}: ${order.numberOfTractors || order.quantity} ${order.transportType || 'Vehicle'}(s) of ${order.productNameSnapshot}. Total: ₹${order.totalAmount.toLocaleString('en-IN')}. Please accept within 15 minutes.`,
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
      const safeSearch = escapeRegex(search);
      filter.$or = [
        { orderNumber: { $regex: safeSearch, $options: 'i' } },
        { productNameSnapshot: { $regex: safeSearch, $options: 'i' } },
        { shippingAddress: { $regex: safeSearch, $options: 'i' } },
        { driverName: { $regex: safeSearch, $options: 'i' } },
        { vehicleNumber: { $regex: safeSearch, $options: 'i' } }
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

// @desc    Dealer (acting as Transporter) enters the actual weighed tonnage after reviewing the
//          Weight Bridge Slip + Display photos the driver submitted. Computes the Final Payment
//          amount (Total Weight x Rate Per Ton) and creates its Razorpay order so the customer's
//          app can immediately show the payment screen. This is entirely separate from the
//          upfront booking payment (paymentStatus/razorpayOrderId) -- both remain in effect.
// @route   POST /api/orders/:id/weight
// @access  Private (Dealer)
const enterTotalWeight = async (req, res) => {
  try {
    const { totalWeight } = req.body;
    const weight = Number(totalWeight);
    if (!weight || Number.isNaN(weight) || weight <= 0) {
      return errorResponse(res, 'A valid Total Weight (in tons) is required.', 400);
    }

    const order = await Order.findById(req.params.id).populate('userId', 'name mobile whatsappNumber');
    if (!order) {
      return errorResponse(res, 'Order not found.', 404);
    }

    if (!order.dealerId || order.dealerId.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Unauthorized. This order is not assigned to you.', 403);
    }

    if (order.fulfillmentStage !== 'PHOTOS_SUBMITTED') {
      return errorResponse(res, 'The driver must submit all required weighbridge photos before Total Weight can be entered.', 400);
    }

    const grossFinalAmount = Math.round(weight * order.pricePerTonSnapshot * 100) / 100;
    // Net of the flat booking amount already paid upfront (see createOrder) -- the customer
    // only owes the remainder, never the full weight-based total again on top of it.
    const finalPaymentAmount = Math.max(0, Math.round((grossFinalAmount - (order.bookingAmountSnapshot || 0)) * 100) / 100);

    // Note: unlike Razorpay's order_id (durable, reusable across checkout attempts), ICICI's
    // redirectURI is tied to a time-boxed transaction context. This endpoint is called by the
    // DEALER (entering the weighed tonnage) whose UI discards the response, not by the customer
    // who actually pays -- so for ICICI, nothing is initiated here. The customer's own browser
    // lazily initiates a fresh ICICI transaction on demand via POST /api/payments/icici/initiate-final/:orderId
    // right when they click "Pay", instead of reusing a possibly-stale URL generated earlier.
    let rzpOrder = null;
    if (PAYMENT_GATEWAY !== 'ICICI') {
      rzpOrder = await RazorpayService.createOrder(finalPaymentAmount, `${order.orderNumber}-FINAL`);
      order.finalRazorpayOrderId = rzpOrder.id;
    }

    order.totalWeight = weight;
    order.weightEnteredAt = new Date();
    order.finalPaymentAmount = finalPaymentAmount;
    order.fulfillmentStage = 'WEIGHT_ENTERED';
    await order.save();

    await NotificationService.send({
      recipientId: order.userId._id,
      recipientRole: 'USER',
      type: 'GENERAL',
      title: 'Final Weight Confirmed — Payment Due',
      message: order.bookingAmountSnapshot
        ? `Order #${order.orderNumber}: Total Weight ${weight} Ton x ₹${order.pricePerTonSnapshot}/Ton = ₹${grossFinalAmount.toLocaleString('en-IN')}. ₹${order.bookingAmountSnapshot.toLocaleString('en-IN')} already paid at booking is deducted — please pay the remaining ₹${finalPaymentAmount.toLocaleString('en-IN')} to dispatch your material.`
        : `Order #${order.orderNumber}: Total Weight ${weight} Ton x ₹${order.pricePerTonSnapshot}/Ton = ₹${finalPaymentAmount.toLocaleString('en-IN')}. Please complete the final payment to dispatch your material.`,
      orderId: order._id,
      targetPhone: order.userId.whatsappNumber || order.userId.mobile
    });

    return successResponse(res, 'Total Weight recorded and final payment initialized.', {
      order,
      ...(PAYMENT_GATEWAY === 'ICICI'
        ? { paymentGateway: 'ICICI' }
        : { paymentGateway: 'RAZORPAY', razorpayOrder: rzpOrder, keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_key' })
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Customer: list dealers they can re-assign a dealer-declined order to
// @route   GET /api/orders/:id/reassign-options
// @access  Private (Customer — must own the order)
const getReassignOptions = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return errorResponse(res, 'Order not found.', 404);
    }
    if (order.userId.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Unauthorized. This is not your order.', 403);
    }
    if (!order.awaitingCustomerDealerChoice) {
      return errorResponse(res, 'This order is not awaiting a dealer choice.', 400);
    }

    const remainingDealers = await User.find({
      role: 'DEALER',
      isActive: true,
      isDeleted: { $ne: true },
      _id: { $nin: order.declinedBy }
    });

    const dealers = remainingDealers.map((dealer) => {
      let distanceKm = null;
      if (order.latitude && order.longitude && dealer.latitude && dealer.longitude) {
        distanceKm = Math.round(
          PincodeService.calculateHaversineDistanceKm(order.latitude, order.longitude, dealer.latitude, dealer.longitude) * 10
        ) / 10;
      }
      return {
        dealerId: dealer._id,
        dealerCode: dealer.dealerCode || null,
        city: dealer.city || null,
        distanceKm
      };
    });

    dealers.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));

    return successResponse(res, 'Available dealers retrieved.', { dealers });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Customer: pick a new dealer for an order the previous dealer declined.
//          No repayment is needed -- the existing upfront payment carries over.
// @route   POST /api/orders/:id/select-dealer
// @access  Private (Customer — must own the order)
const selectNewDealer = async (req, res) => {
  try {
    const { dealerId } = req.body;
    if (!dealerId) {
      return errorResponse(res, 'A dealerId is required.', 400);
    }

    const order = await Order.findById(req.params.id).populate('userId', 'name mobile whatsappNumber');
    if (!order) {
      return errorResponse(res, 'Order not found.', 404);
    }
    if (order.userId._id.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Unauthorized. This is not your order.', 403);
    }
    if (!order.awaitingCustomerDealerChoice) {
      return errorResponse(res, 'This order is not awaiting a dealer choice.', 400);
    }
    if (order.declinedBy.some((id) => id.toString() === dealerId)) {
      return errorResponse(res, 'This dealer already declined this order. Please pick a different dealer.', 400);
    }

    const dealer = await User.findOne({ _id: dealerId, role: 'DEALER', isActive: true, isDeleted: { $ne: true } });
    if (!dealer) {
      return errorResponse(res, 'Selected dealer not found or inactive.', 404);
    }

    const now = new Date();
    const deadline = new Date(now.getTime() + 15 * 60 * 1000);

    let distanceKm = null;
    if (order.latitude && order.longitude && dealer.latitude && dealer.longitude) {
      distanceKm = PincodeService.calculateHaversineDistanceKm(order.latitude, order.longitude, dealer.latitude, dealer.longitude);
    }

    order.assignedDealerId = dealer._id;
    order.dealerDistanceKm = distanceKm;
    order.orderAssignedAt = now;
    order.dealerResponseDeadline = deadline;
    order.dealerResponseStatus = 'PENDING';
    order.dealerAlarmActive = true;
    order.adminEscalationSent = false;
    order.adminAlarmActive = false;
    order.awaitingCustomerDealerChoice = false;

    order.assignmentHistory.push({
      dealerId: dealer._id,
      dealerName: dealer.name,
      dealerCompanyName: dealer.companyName,
      dealerPincode: dealer.pincode,
      dealerMobile: dealer.mobile,
      distanceKm,
      assignedAt: now,
      deadline,
      response: 'PENDING'
    });

    await order.save();

    await NotificationService.send({
      recipientId: dealer._id,
      recipientRole: 'DEALER',
      type: 'ORDER_PLACED',
      title: '🚛 NEW ORDER ASSIGNED (Customer Selected) 🚛',
      message: `Order #${order.orderNumber}${distanceKm !== null ? ` — ${Math.round(distanceKm * 10) / 10} km away` : ''}: ${order.numberOfTractors || order.quantity} ${order.transportType || 'Vehicle'}(s) of ${order.productNameSnapshot}. Total: ₹${order.totalAmount.toLocaleString('en-IN')}. Please accept within 15 minutes.`,
      orderId: order._id,
      targetPhone: dealer.whatsappNumber || dealer.mobile
    });

    return successResponse(res, 'New dealer selected. No additional payment required — your order has been sent to them for acceptance.', { order });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Customer: request a refund instead of picking a new dealer, after a dealer decline
// @route   POST /api/orders/:id/request-refund
// @access  Private (Customer — must own the order)
const requestRefund = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('userId', 'name mobile whatsappNumber');
    if (!order) {
      return errorResponse(res, 'Order not found.', 404);
    }
    if (order.userId._id.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Unauthorized. This is not your order.', 403);
    }
    if (!order.awaitingCustomerDealerChoice) {
      return errorResponse(res, 'This order is not awaiting a dealer choice.', 400);
    }

    order.awaitingCustomerDealerChoice = false;
    order.refundRequested = true;
    order.refundRequestedAt = new Date();
    order.refundStatus = 'REQUESTED';
    order.orderStatus = 'CANCELLED';
    order.adminAlarmActive = false;
    await order.save();

    await NotificationService.send({
      recipientRole: 'ADMIN',
      type: 'REFUND_REQUESTED',
      title: '💸 CUSTOMER REQUESTED REFUND',
      message: `${order.userId.name} (${order.userId.mobile}) requested a refund of ₹${order.totalAmount.toLocaleString('en-IN')} for declined Order #${order.orderNumber}. Please process the refund.`,
      orderId: order._id
    });

    return successResponse(res, 'Refund requested. Our team will process it shortly.', { order });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Admin: list all orders a dealer has ever declined, with reason & resolution status
// @route   GET /api/admin/dealer-cancelled-orders
// @access  Private (Admin)
const getDealerCancelledOrders = async (req, res) => {
  try {
    // `declinedBy` is a permanent record of every dealer who ever declined this order, unlike
    // `dealerResponseStatus` which gets reset back to PENDING once the customer picks a new
    // dealer -- so this stays a complete history even after the order is resolved.
    const filter = { declinedBy: { $exists: true, $not: { $size: 0 } } };

    if (req.query.type === 'DEALER_DECLINED') {
      // Orders cancelled before this field existed have no dealerCancellationType on record
      // (null/missing) -- they were all explicit declines (the auto-timeout type is new), so the
      // "Dealer Cancelled" filter must also match those, not just the exact string, or every
      // historical decline silently disappears the moment this filter is applied.
      filter.dealerCancellationType = { $in: ['DEALER_DECLINED', null] };
    } else if (req.query.type === 'AUTO_TIMEOUT') {
      filter.dealerCancellationType = 'AUTO_TIMEOUT';
    }

    if (req.query.from || req.query.to) {
      filter.dealerRejectedAt = {};
      if (req.query.from) {
        const fromDate = new Date(req.query.from);
        if (!Number.isNaN(fromDate.getTime())) {
          fromDate.setHours(0, 0, 0, 0);
          filter.dealerRejectedAt.$gte = fromDate;
        }
      }
      if (req.query.to) {
        const toDate = new Date(req.query.to);
        if (!Number.isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          filter.dealerRejectedAt.$lte = toDate;
        }
      }
      if (Object.keys(filter.dealerRejectedAt).length === 0) delete filter.dealerRejectedAt;
    }

    const orders = await Order.find(filter)
      .populate('userId', 'name mobile email')
      .populate('dealerRejectedBy', 'name companyName mobile pincode')
      .populate('assignedDealerId', 'name companyName mobile pincode')
      .sort({ dealerRejectedAt: -1 });

    return successResponse(res, 'Dealer-cancelled orders retrieved.', { orders });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Admin: mark a customer's refund request as processed (paid back manually)
// @route   PATCH /api/admin/orders/:id/refund-processed
// @access  Private (Admin)
const markRefundProcessed = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return errorResponse(res, 'Order not found.', 404);
    }
    if (order.refundStatus !== 'REQUESTED') {
      return errorResponse(res, 'This order has no pending refund request.', 400);
    }

    order.refundStatus = 'PROCESSED';
    order.refundProcessedAt = new Date();
    order.paymentStatus = 'REFUNDED';
    await order.save();

    return successResponse(res, 'Refund marked as processed.', { order });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  getServiceChargeInvoice,
  getDealerAvailableOrders,
  getDealerDeliveries,
  getDealerVehicleSalesReport,
  acceptOrder,
  declineOrder,
  enterTotalWeight,
  getAllOrdersAdmin,
  getAdminEscalations,
  adminAcknowledgeAlert,
  adminReassignOrder,
  getReassignOptions,
  selectNewDealer,
  requestRefund,
  getDealerCancelledOrders,
  markRefundProcessed
};
