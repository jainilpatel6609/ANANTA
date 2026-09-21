const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Location name is required'],
      trim: true
    },
    vehicleType: {
      type: String,
      enum: ['DUMPER', 'TRACTOR'],
      required: [true, 'Vehicle type is required for location scoping'],
      default: 'DUMPER',
      index: true
    },
    category: {
      type: String,
      enum: ['ALL', 'Sand', 'Aggregate', 'Grit'],
      default: 'ALL',
      index: true
    },
    state: {
      type: String,
      default: 'Gujarat',
      trim: true
    },
    // Admin-configured coordinates of the actual physical sourcing point (quarry/riverbed).
    // Used as the fixed origin for road-distance transport pricing (Material + Location -> shipping address).
    latitude: {
      type: Number,
      default: null,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      default: null,
      min: -180,
      max: 180
    },
    description: {
      type: String,
      default: ''
    },
    displayOrder: {
      type: Number,
      default: 0
    },
    singlePatiyaPrice: {
      type: Number,
      default: 2350
    },
    doublePatiyaPrice: {
      type: Number,
      default: 4500
    },
    dumperWheelConfigs: [
      {
        wheelCount: { type: Number, default: 10 },
        approximateTon: { type: Number, default: 25 },
        pricePerTon: { type: Number, default: 800 },
        flatPrice: { type: Number, default: null },
        isActive: { type: Boolean, default: true }
      }
    ],
    wheel10PricePerTon: { type: Number, default: 800 },
    wheel10ApproxTon: { type: Number, default: 25 },
    wheel12PricePerTon: { type: Number, default: 800 },
    wheel12ApproxTon: { type: Number, default: 35 },
    wheel16PricePerTon: { type: Number, default: 800 },
    wheel16ApproxTon: { type: Number, default: 45 },
    wheel18PricePerTon: { type: Number, default: 800 },
    wheel18ApproxTon: { type: Number, default: 50 },
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

// Compound index so location names can be independently created/managed for Dumper and Tractor per category
locationSchema.index({ name: 1, vehicleType: 1, category: 1 }, { unique: true });

const Location = mongoose.model('Location', locationSchema);
module.exports = Location;
