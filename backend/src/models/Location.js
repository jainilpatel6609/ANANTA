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
    description: {
      type: String,
      default: ''
    },
    displayOrder: {
      type: Number,
      default: 0
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

// Compound index so location names can be independently created/managed for Dumper and Tractor per category
locationSchema.index({ name: 1, vehicleType: 1, category: 1 }, { unique: true });

const Location = mongoose.model('Location', locationSchema);
module.exports = Location;
