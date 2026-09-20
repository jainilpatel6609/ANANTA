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

// A dealer can only have one rate configured per Material + Location combination
dealerTransportConfigSchema.index({ dealerId: 1, material: 1, locationName: 1 }, { unique: true });

module.exports = mongoose.model('DealerTransportConfig', dealerTransportConfigSchema);
