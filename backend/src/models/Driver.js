const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema(
  {
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Dealer ID is required for driver association'],
      index: true
    },
    name: {
      type: String,
      required: [true, 'Driver full name is required'],
      trim: true
    },
    mobile: {
      type: String,
      required: [true, 'Driver 10-digit mobile number is required'],
      trim: true,
      validate: {
        validator: function (v) {
          return /^[6-9]\d{9}$/.test(v.replace(/\D/g, '').slice(-10));
        },
        message: 'Please provide a valid 10-digit Indian mobile number.'
      },
      index: true
    },
    alternateMobile: {
      type: String,
      trim: true,
      default: ''
    },
    vehicleNumber: {
      type: String,
      required: [true, 'Vehicle plate number is required'],
      trim: true,
      uppercase: true
    },
    vehicleType: {
      type: String,
      enum: ['Tractor', 'Dumper', 'Truck', 'Other'],
      default: 'Tractor'
    },
    licenseNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: ''
    },
    licenseFrontUrl: {
      type: String,
      default: ''
    },
    licenseBackUrl: {
      type: String,
      default: ''
    },
    aadharCardUrl: {
      type: String,
      default: ''
    },
    panCardUrl: {
      type: String,
      default: ''
    },
    photoUrl: {
      type: String,
      default: ''
    },
    passwordHash: {
      type: String,
      default: ''
    },
    isMobileVerified: {
      type: Boolean,
      default: true
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'ON_DELIVERY', 'INACTIVE'],
      default: 'AVAILABLE',
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    totalDeliveries: {
      type: Number,
      default: 0
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

const bcrypt = require('bcryptjs');

// Password comparison method
driverSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) return true; // fallback if password not set
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Static helper to hash password
driverSchema.statics.hashPassword = async function (password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// Compound index to ensure clean lookups per dealer
driverSchema.index({ dealerId: 1, isActive: 1, status: 1 });

module.exports = mongoose.model('Driver', driverSchema);

