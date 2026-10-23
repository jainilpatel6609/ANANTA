const mongoose = require('mongoose');

const PAYMENT_PURPOSES = ['UPFRONT', 'FINAL'];
const STATUSES = ['INITIATED', 'PENDING', 'SUCCESS', 'FAILED'];

const iciciTransactionSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true
    },
    // Which of the app's two payment moments this transaction is for -- upfront booking
    // payment at order creation, or the Dumper weight-based final payment.
    paymentPurpose: {
      type: String,
      enum: PAYMENT_PURPOSES,
      required: true
    },
    merchantTxnNo: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'INR'
    },
    status: {
      type: String,
      enum: STATUSES,
      default: 'INITIATED',
      index: true
    },
    gatewayTxnId: {
      type: String,
      default: ''
    },
    paymentId: {
      type: String,
      default: ''
    },
    paymentMode: {
      type: String,
      default: ''
    },
    responseCode: {
      type: String,
      default: ''
    },
    responseMessage: {
      type: String,
      default: ''
    },
    rawInitiateRequest: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    rawInitiateResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    rawAdvicePayload: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    settlementStatus: {
      type: String,
      default: ''
    },
    settlementDate: {
      type: Date,
      default: null
    },
    settlementRef: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

const IciciTransaction = mongoose.model('IciciTransaction', iciciTransactionSchema);
module.exports = IciciTransaction;
module.exports.PAYMENT_PURPOSES = PAYMENT_PURPOSES;
module.exports.STATUSES = STATUSES;
