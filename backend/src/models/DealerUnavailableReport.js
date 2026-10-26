const mongoose = require('mongoose');

// Created when a customer, mid-checkout, finds no dealer available for their chosen
// material/location/wheel-or-Patiya combination and taps "Notify Admin" instead of being stuck.
// Purely informational for Admin to go set up a dealer/rate for this gap -- it is NOT an order
// (no payment, no product reservation) and never becomes one on its own.
const dealerUnavailableReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    customerName: { type: String, default: '' },
    customerMobile: { type: String, default: '' },
    vehicleType: { type: String, enum: ['DUMPER', 'TRACTOR'], required: true },
    category: { type: String, default: '' }, // Sand / Aggregate
    productName: { type: String, default: '' },
    sourcingLocation: { type: String, default: '' }, // Sand origin, or 'Direct Quarry Dispatch'
    aggregateType: { type: String, default: '' }, // e.g. 20mm, 10mm
    tractorType: { type: String, default: '' }, // Single/Double Patiya
    wheelCount: { type: Number, default: null },
    variantName: { type: String, default: '' }, // e.g. Filter Sand / Without Filter Sand
    deliveryArea: { type: String, default: '' },
    deliveryCity: { type: String, default: '' },
    deliveryState: { type: String, default: '' },
    pincode: { type: String, default: '' },
    reason: { type: String, default: '' }, // the exact "No dealers..." message shown to the customer
    status: {
      type: String,
      enum: ['OPEN', 'RESOLVED'],
      default: 'OPEN',
      index: true
    },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('DealerUnavailableReport', dealerUnavailableReportSchema);
