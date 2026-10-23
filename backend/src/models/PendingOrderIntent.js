const mongoose = require('mongoose');

// Holds everything needed to create a real Order document, staged the moment a customer starts
// checkout but BEFORE any Order is persisted -- an Order is only ever created once the upfront
// payment actually succeeds (see OrderFinalizationService.materializeOrder), so an abandoned or
// never-paid checkout never touches the orders collection, the customer's order list, or any
// admin/dealer view. Keyed by the payment gateway's own transaction reference (razorpayOrderId /
// ICICI merchantTxnNo / a locally-generated demo token), which is the only identifier available
// to the browser/gateway before a real order exists.
const pendingOrderIntentSchema = new mongoose.Schema(
  {
    gateway: { type: String, enum: ['RAZORPAY', 'ICICI', 'DEMO'], required: true },
    gatewayRef: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    orderPayload: { type: mongoose.Schema.Types.Mixed, required: true },
    rawInitiateRequest: { type: mongoose.Schema.Types.Mixed, default: null },
    rawInitiateResponse: { type: mongoose.Schema.Types.Mixed, default: null },
    // Set once this intent has been turned into a real Order -- kept (not deleted) for audit.
    consumedOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('PendingOrderIntent', pendingOrderIntentSchema);
