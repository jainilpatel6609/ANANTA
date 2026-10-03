const mongoose = require('mongoose');

const helpRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true
    },
    message: {
      type: String,
      required: [true, 'Support message is required'],
      trim: true
    },
    status: {
      type: String,
      enum: ['OPEN', 'RESOLVED'],
      default: 'OPEN',
      index: true
    }
  },
  {
    timestamps: true
  }
);

const HelpRequest = mongoose.model('HelpRequest', helpRequestSchema);
module.exports = HelpRequest;
