const mongoose = require('mongoose');

const TRACTOR_TYPES = ['Single Patiya', 'Double Patiya'];
const TRACTOR_STATUSES = ['AVAILABLE', 'IN_ORDER', 'DISABLED'];

const tractorSchema = new mongoose.Schema(
  {
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Dealer ID is required'],
      index: true
    },
    tractorType: {
      type: String,
      enum: TRACTOR_TYPES,
      required: [true, 'Tractor type is required'],
      index: true
    },
    numberPlate: {
      type: String,
      required: [true, 'Number plate is required'],
      trim: true,
      uppercase: true,
      unique: true
    },
    // Single source of truth for availability. DISABLED = dealer/admin switched it off.
    status: {
      type: String,
      enum: TRACTOR_STATUSES,
      default: 'AVAILABLE',
      index: true
    },
    // Set only while status === 'IN_ORDER'
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
      index: true
    }
  },
  { timestamps: true }
);

tractorSchema.index({ dealerId: 1, tractorType: 1, status: 1 });

module.exports = mongoose.model('Tractor', tractorSchema);
module.exports.TRACTOR_TYPES = TRACTOR_TYPES;
module.exports.TRACTOR_STATUSES = TRACTOR_STATUSES;
