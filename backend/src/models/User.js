const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      unique: true,
      trim: true
    },
    whatsappNumber: {
      type: String,
      required: [true, 'WhatsApp number is required'],
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: ''
    },
    officeAddress: {
      type: String,
      trim: true,
      default: ''
    },
    addressLine1: {
      type: String,
      trim: true,
      default: ''
    },
    addressLine2: {
      type: String,
      trim: true,
      default: ''
    },
    area: {
      type: String,
      trim: true,
      default: ''
    },
    city: {
      type: String,
      trim: true,
      default: ''
    },
    state: {
      type: String,
      trim: true,
      default: ''
    },
    pincode: {
      type: String,
      trim: true,
      default: '',
      index: true
    },
    latitude: {
      type: Number,
      default: null
    },
    longitude: {
      type: Number,
      default: null
    },
    userType: {
      type: String,
      enum: ['Contractor', 'Trader', 'Builder', 'Individual'],
      default: 'Contractor'
    },
    companyName: {
      type: String,
      trim: true,
      default: ''
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required']
    },
    role: {
      type: String,
      enum: ['USER', 'DEALER', 'ADMIN'],
      default: 'USER'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    pendingMobile: {
      type: String,
      trim: true,
      default: null
    },
    mobileOtpHash: {
      type: String,
      default: null
    },
    mobileOtpExpiresAt: {
      type: Date,
      default: null
    },
    mobileOtpAttempts: {
      type: Number,
      default: 0
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date,
      default: null
    },
    resetPasswordOtpHash: {
      type: String,
      default: null
    },
    resetPasswordOtpExpiresAt: {
      type: Date,
      default: null
    },
    resetPasswordOtpAttempts: {
      type: Number,
      default: 0
    },
    resetPasswordToken: {
      type: String,
      default: null
    },
    resetPasswordTokenExpiresAt: {
      type: Date,
      default: null
    },
    // FCM Push Notification Device Tokens (Supports Multi-Device per Dealer/Admin)
    fcmDevices: [
      {
        token: {
          type: String,
          required: true
        },
        platform: {
          type: String,
          default: 'web'
        },
        userAgent: {
          type: String,
          default: ''
        },
        createdAt: {
          type: Date,
          default: Date.now
        },
        lastSeenAt: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Static helper to hash password
userSchema.statics.hashPassword = async function (plainPassword) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(plainPassword, salt);
};

// Remove sensitive fields when returning JSON
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.mobileOtpHash;
  delete obj.resetPasswordOtpHash;
  delete obj.resetPasswordToken;
  return obj;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
