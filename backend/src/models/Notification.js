const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    recipientRole: {
      type: String,
      enum: ['USER', 'DEALER', 'ADMIN'],
      required: true
    },
    type: {
      type: String,
      enum: [
        'ORDER_PLACED',
        'ORDER_ACCEPTED',
        'DEALER_DECLINED_ORDER',
        'DEALER_NO_RESPONSE_ESCALATION',
        'ORDER_REASSIGNED',
        'DRIVER_ASSIGNED',
        'OUT_FOR_DELIVERY',
        'DELIVERY_OTP',
        'ORDER_DELIVERED',
        'ORDER_CANCELLED',
        'GENERAL'
      ],
      default: 'GENERAL'
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
