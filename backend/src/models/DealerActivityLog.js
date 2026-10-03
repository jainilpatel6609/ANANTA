const mongoose = require('mongoose');

const dealerActivityLogSchema = new mongoose.Schema(
  {
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    category: {
      type: String,
      enum: ['DRIVER', 'DUMPER', 'TRANSPORT_RATE', 'PROFILE'],
      required: true,
      index: true
    },
    action: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    actorName: {
      type: String,
      default: ''
    },
    actorRole: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

const DealerActivityLog = mongoose.model('DealerActivityLog', dealerActivityLogSchema);
module.exports = DealerActivityLog;
