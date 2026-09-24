const mongoose = require('mongoose');

// Wheel options match the existing Dumper wheel-count convention (numeric wheelCount on
// VehicleConfig / Order.wheelCountSnapshot); 14 added per the dealer dumper spec.
const WHEEL_TYPES = [10, 12, 14, 16, 18];
const DUMPER_STATUSES = ['AVAILABLE', 'IN_ORDER', 'DISABLED'];

const dumperSchema = new mongoose.Schema(
  {
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Dealer ID is required'],
      index: true
    },
    wheelType: {
      type: Number,
      enum: WHEEL_TYPES,
      required: [true, 'Wheel type is required'],
      index: true
    },
    numberPlate: {
      type: String,
      required: [true, 'Number plate is required'],
      trim: true,
      uppercase: true,
      unique: true
    },
    capacity: {
      type: Number, // tons
      required: [true, 'Dumper weight / capacity (Ton) is required'],
      min: [0.1, 'Capacity must be greater than 0']
    },
    // Single source of truth for availability. DISABLED = dealer/admin switched it off.
    status: {
      type: String,
      enum: DUMPER_STATUSES,
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

dumperSchema.index({ dealerId: 1, wheelType: 1, status: 1 });

module.exports = mongoose.model('Dumper', dumperSchema);
module.exports.WHEEL_TYPES = WHEEL_TYPES;
module.exports.DUMPER_STATUSES = DUMPER_STATUSES;
