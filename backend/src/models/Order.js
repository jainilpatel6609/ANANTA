const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    assignedDealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    dealerDistanceKm: {
      type: Number,
      default: null
    },
    dealerRatePerKm: {
      type: Number,
      default: null
    },
    // How dealerDistanceKm was computed: 'google_routes' | 'osrm' | 'haversine_fallback'
    // (admin Location coords as origin) or 'dealer_fallback_haversine' (legacy dealer-coords
    // origin, used only when the admin hasn't configured coordinates for that Location yet).
    dealerDistanceSource: {
      type: String,
      default: null
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    productNameSnapshot: {
      type: String,
      required: true
    },
    category: {
      type: String,
      enum: ['Sand', 'Aggregate', 'Grit'],
      required: true
    },
    aggregateType: {
      type: String,
      default: ''
    },
    transportType: {
      type: String,
      default: ''
    },
    tractorType: {
      type: String,
      default: ''
    },
    numberOfTractors: {
      type: Number,
      default: null
    },
    pricePerTractorSnapshot: {
      type: Number,
      default: null
    },
    vehicleType: {
      type: String,
      required: true
    },
    vehicleCapacity: {
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1']
    },
    pricePerTonSnapshot: {
      type: Number,
      required: true
    },
    subtotal: {
      type: Number,
      required: true
    },
    deliveryCharge: {
      type: Number,
      default: 0
    },
    tax: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      required: true
    },
    sandLocation: {
      type: String,
      default: ''
    },
    shippingAddress: {
      type: String,
      required: [true, 'Shipping address is required']
    },
    deliveryAddress: {
      type: String,
      default: ''
    },
    pincode: {
      type: String,
      required: [true, 'PIN code is required'],
      index: true
    },
    deliveryPincode: {
      type: String,
      default: ''
    },
    shippingDetails: {
      fullName: { type: String, default: '' },
      mobile: { type: String, default: '' },
      addressLine1: { type: String, default: '' },
      addressLine2: { type: String, default: '' },
      area: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
      landmark: { type: String, default: '' },
      placeId: { type: String, default: '' },
      placeName: { type: String, default: '' },
      gpsAccuracy: { type: Number, default: null },
      gpsLatitude: { type: Number, default: null },
      gpsLongitude: { type: Number, default: null }
    },
    placeId: {
      type: String,
      default: ''
    },
    placeName: {
      type: String,
      default: ''
    },
    gpsAccuracy: {
      type: Number,
      default: null
    },
    gpsLatitude: {
      type: Number,
      default: null
    },
    gpsLongitude: {
      type: Number,
      default: null
    },
    deliveryArea: {
      type: String,
      default: ''
    },
    deliveryCity: {
      type: String,
      default: ''
    },
    deliveryState: {
      type: String,
      default: ''
    },
    latitude: {
      type: Number,
      required: [true, 'Latitude coordinate is required']
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude coordinate is required']
    },
    deliveryLatitude: {
      type: Number,
      default: null
    },
    deliveryLongitude: {
      type: Number,
      default: null
    },
    deliveryDate: {
      type: Date,
      default: Date.now
    },
    locationNameSnapshot: {
      type: String,
      default: ''
    },
    vehicleTypeSnapshot: {
      type: String,
      default: ''
    },
    vehicleOptionSnapshot: {
      type: String,
      default: ''
    },
    // The dealer-registered Dumper (see models/Dumper.js) currently assigned to this order.
    dumperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dumper',
      default: null
    },
    wheelCountSnapshot: {
      type: Number,
      default: null
    },
    approximateTonSnapshot: {
      type: Number,
      default: null
    },
    deliveryInstructions: {
      type: String,
      default: ''
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
      index: true
    },
    paymentId: {
      type: String,
      default: ''
    },
    razorpayOrderId: {
      type: String,
      default: ''
    },
    invoiceNumber: {
      type: String,
      default: ''
    },
    invoiceDate: {
      type: Date,
      default: Date.now
    },
    orderStatus: {
      type: String,
      enum: [
        'PENDING_PAYMENT',
        'PAYMENT_FAILED',
        'PLACED',
        'DEALER_NOTIFIED',
        'ACCEPTED',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'CANCELLED'
      ],
      default: 'PENDING_PAYMENT',
      index: true
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      default: null,
      index: true
    },
    driverName: {
      type: String,
      default: ''
    },
    driverMobile: {
      type: String,
      default: ''
    },
    vehicleNumber: {
      type: String,
      default: ''
    },
    driverAssignedAt: {
      type: Date,
      default: null
    },
    driverTaskDispatchedAt: {
      type: Date,
      default: null
    },
    riverRoyaltyUrl: {
      type: String,
      default: ''
    },
    // Weight Bridge SLIP photo (kept on the original field name for backward compatibility).
    waybridgePhotoUrl: {
      type: String,
      default: ''
    },

    // ===================== DUMPER fulfillment lifecycle (post-accept) =====================
    // Permanent code of the dealer who accepted this order, snapshotted at accept time so it
    // never changes even if the dealer's own code is regenerated later.
    dealerCodeSnapshot: {
      type: String,
      default: ''
    },
    // Set the first time the driver broadcasts live location for this order -- gates River
    // Royalty upload (a driver cannot upload royalty proof before sharing their location).
    driverLocationSharedAt: {
      type: Date,
      default: null
    },
    // Plant Stock Yard Royalty photo -- optional, driver may skip this step (stays '' if skipped).
    plantStockYardRoyaltyUrl: {
      type: String,
      default: ''
    },
    // Weight Bridge DISPLAY photo (the screen showing the reading) -- distinct from the slip
    // photo above, since the Slip and Display are two separate required photos.
    weightBridgeDisplayUrl: {
      type: String,
      default: ''
    },
    dumperTopPhotoUrl: {
      type: String,
      default: ''
    },
    dumperFrontPhotoUrl: {
      type: String,
      default: ''
    },
    dumperRearPhotoUrl: {
      type: String,
      default: ''
    },
    // Actual weighed tonnage, entered manually by the Dealer (acting as Transporter) after
    // reviewing the Weight Bridge Slip + Display photos the driver submitted.
    totalWeight: {
      type: Number,
      default: null
    },
    weightEnteredAt: {
      type: Date,
      default: null
    },
    // Final settlement amount = totalWeight x pricePerTonSnapshot, charged AFTER the upfront
    // booking payment and gates Dumper dispatch -- entirely separate from paymentStatus/
    // razorpayOrderId/paymentId above, which remain the upfront booking payment.
    finalPaymentAmount: {
      type: Number,
      default: null
    },
    finalPaymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED'],
      default: 'PENDING',
      index: true
    },
    finalPaymentId: {
      type: String,
      default: ''
    },
    finalRazorpayOrderId: {
      type: String,
      default: ''
    },
    // Fine-grained progress through the DUMPER post-accept fulfillment flow. Only ever set for
    // Dumper orders -- Tractor orders never touch this field and keep using orderStatus alone.
    fulfillmentStage: {
      type: String,
      enum: [
        'AWAITING_DRIVER',
        'DRIVER_ASSIGNED',
        'LOCATION_SHARED',
        'RIVER_ROYALTY_DONE',
        'STOCK_YARD_DONE',
        'PHOTOS_SUBMITTED',
        'WEIGHT_ENTERED',
        'FINAL_PAYMENT_PAID',
        'DISPATCHED'
      ],
      default: null
    },
    // ======================================================================================

    deliveryOtpHash: {
      type: String,
      default: ''
    },
    deliveryOtpDisplay: {
      type: String,
      default: ''
    },
    deliveryOtpExpiresAt: {
      type: Date,
      default: null
    },
    otpAttempts: {
      type: Number,
      default: 0
    },
    acceptedAt: {
      type: Date,
      default: null
    },
    outForDeliveryAt: {
      type: Date,
      default: null
    },
    deliveredAt: {
      type: Date,
      default: null
    },
    deliveryVerifiedAt: {
      type: Date,
      default: null
    },
    declinedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    // 15-Minute Response Timer & Escalation Tracking
    orderAssignedAt: {
      type: Date,
      default: null
    },
    dealerResponseDeadline: {
      type: Date,
      default: null,
      index: true
    },
    dealerResponseStatus: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'TIMEOUT', 'REASSIGNED'],
      default: 'PENDING',
      index: true
    },
    dealerAcceptedAt: {
      type: Date,
      default: null
    },
    dealerRejectedAt: {
      type: Date,
      default: null
    },
    dealerRejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    dealerRejectionReason: {
      type: String,
      default: ''
    },
    dealerAlarmActive: {
      type: Boolean,
      default: false,
      index: true
    },
    adminAlarmActive: {
      type: Boolean,
      default: false,
      index: true
    },
    adminAlertType: {
      type: String,
      enum: ['NONE', 'DEALER_DECLINED', 'DEALER_TIMEOUT'],
      default: 'NONE',
      index: true
    },
    adminEscalationSent: {
      type: Boolean,
      default: false,
      index: true
    },
    adminEscalationSentAt: {
      type: Date,
      default: null
    },
    adminAcknowledgedAt: {
      type: Date,
      default: null
    },
    adminAcknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    assignmentHistory: [
      {
        dealerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        dealerName: String,
        dealerCompanyName: String,
        dealerPincode: String,
        dealerMobile: String,
        distanceKm: Number,
        assignedAt: {
          type: Date,
          default: Date.now
        },
        deadline: Date,
        respondedAt: Date,
        response: {
          type: String,
          enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'TIMEOUT', 'REASSIGNED', 'CANCELLED'],
          default: 'PENDING'
        },
        reason: {
          type: String,
          default: ''
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
