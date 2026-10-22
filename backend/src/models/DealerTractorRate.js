const mongoose = require('mongoose');

const TRACTOR_TYPES = ['Single Patiya', 'Double Patiya'];

const dealerTractorRateSchema = new mongoose.Schema(
  {
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    tractorType: {
      type: String,
      enum: TRACTOR_TYPES,
      required: [true, 'Tractor type is required'],
      index: true
    },
    ratePerTractor: {
      type: Number,
      required: [true, 'Rate per tractor is required'],
      min: [0, 'Rate per tractor cannot be negative']
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// A dealer can only have one rate configured per Patiya type
dealerTractorRateSchema.index({ dealerId: 1, tractorType: 1 }, { unique: true });

module.exports = mongoose.model('DealerTractorRate', dealerTractorRateSchema);
module.exports.TRACTOR_TYPES = TRACTOR_TYPES;
