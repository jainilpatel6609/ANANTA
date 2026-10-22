const mongoose = require('mongoose');

const TRACTOR_TYPES = ['Single Patiya', 'Double Patiya'];
const MATERIALS = ['Sand', 'Aggregate'];

const dealerTractorRateSchema = new mongoose.Schema(
  {
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    material: {
      type: String,
      enum: MATERIALS,
      required: [true, 'Material is required'],
      index: true
    },
    // Sand: the sourcing Location name (Patan / Siddhpur / Sabarmati / ...).
    // Aggregate: the grain/variant name (20mm / 10mm / Wetmix / ...).
    variantName: {
      type: String,
      required: [true, 'Location/grain is required'],
      trim: true
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

// A dealer can only have one rate per Material + Location/Grain + Patiya type
dealerTractorRateSchema.index({ dealerId: 1, material: 1, variantName: 1, tractorType: 1 }, { unique: true });

module.exports = mongoose.model('DealerTractorRate', dealerTractorRateSchema);
module.exports.TRACTOR_TYPES = TRACTOR_TYPES;
module.exports.MATERIALS = MATERIALS;
