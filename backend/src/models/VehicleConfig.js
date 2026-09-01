const mongoose = require('mongoose');

const vehicleConfigSchema = new mongoose.Schema(
  {
    vehicleType: {
      type: String,
      enum: ['DUMPER', 'TRACTOR'],
      required: [true, 'Vehicle type is required'],
      index: true
    },
    optionName: {
      type: String,
      required: [true, 'Option name is required'],
      trim: true // 'Filter Sand', 'Without Filter', 'Choliyu', 'Single Patiya', 'Double Patiya'
    },
    wheelCount: {
      type: Number,
      default: null // 10, 12, 16, 18 for Dumper
    },
    approximateTon: {
      type: Number,
      required: [true, 'Approximate tonnage is required'] // e.g. 25, 35, 45, 50, 3.5, 7
    },
    basePricePerTon: {
      type: Number,
      default: 0
    },
    flatPrice: {
      type: Number,
      default: null // Fixed price per tractor if applicable
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

const VehicleConfig = mongoose.model('VehicleConfig', vehicleConfigSchema);
module.exports = VehicleConfig;

