const mongoose = require('mongoose');

const signupOtpSchema = new mongoose.Schema(
  {
    mobile: {
      type: String,
      required: true,
      index: true
    },
    otpHash: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 600 } // TTL index: auto-deletes expired records after 10 minutes
    },
    attempts: {
      type: Number,
      default: 0
    },
    isVerified: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

const SignupOtp = mongoose.model('SignupOtp', signupOtpSchema);
module.exports = SignupOtp;

