const mongoose = require('mongoose');

const dealerTransportConfigSchema = new mongoose.Schema(
  {
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    material: {
      type: String,
      enum: ['Sand', 'Aggregate'],
      required: [true, 'Material is required'],
      index: true
    },
    locationName: {
      type: String,
      required: [true, 'Sourcing location is required'],
      trim: true
    },
    // The admin-defined grain size (Aggregate) or processing specification (Sand) this rate
    // applies to -- a dealer can quote a different Rate/KM per variant at the same Location,
    // mirroring how DealerTractorRate already varies by variantName.
    variantName: {
      type: String,
      required: [true, 'Grain size / processing specification is required'],
      trim: true
    },
    ratePerKm: {
      type: Number,
      required: [true, 'Rate per KM is required'],
      min: [0, 'Rate per KM cannot be negative']
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

// A dealer can only have one rate configured per Material + Location + Variant combination
dealerTransportConfigSchema.index({ dealerId: 1, material: 1, locationName: 1, variantName: 1 }, { unique: true });

module.exports = mongoose.model('DealerTransportConfig', dealerTransportConfigSchema);
