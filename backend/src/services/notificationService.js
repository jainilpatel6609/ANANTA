const Notification = require('../models/Notification');
const User = require('../models/User');
const logger = require('../utils/logger');
const SmsService = require('./smsService');
const FcmService = require('./fcmService');
const { WHATSAPP_API_KEY } = require('../config/env');

class NotificationService {
  /**
   * Dispatches in-app notification and triggers external channel stubs
   */
  static async send({ recipientId, recipientRole, type, title, message, orderId = null, targetPhone = null }) {
    try {
      let finalRecipientId = recipientId;
      let finalPhone = targetPhone;

      if (!finalRecipientId && recipientRole === 'ADMIN') {
        const adminUser = await User.findOne({ role: 'ADMIN', isActive: true, isDeleted: { $ne: true } });
        if (adminUser) {
          finalRecipientId = adminUser._id;
          if (!finalPhone) {
            finalPhone = adminUser.whatsappNumber || adminUser.mobile;
          }
        }
      }

      // 1. In-App Notification (Database)
      const notification = await Notification.create({
        recipientId: finalRecipientId || null,
        recipientRole,
        type,
        title,
        message,
        orderId,
        isRead: false
      });

      // 2. External Provider Delivery (SMS / WhatsApp)
      if (targetPhone || recipientId) {
        let phone = targetPhone;
        if (!phone && recipientId) {
          const user = await User.findById(recipientId).select('mobile whatsappNumber');
          if (user) {
            phone = user.whatsappNumber || user.mobile;
          }
        }

        if (phone) {
          await this.sendExternalAlerts({ phone, title, message, type });
        }
      }

      // 3. Real Device Push Notification via Firebase Cloud Messaging (FCM)
      const clickAction =
        recipientRole === 'DEALER'
          ? '/dealer/new-orders'
          : recipientRole === 'ADMIN'
          ? '/admin/dashboard'
          : orderId
          ? `/user/orders/${orderId}`
          : '/user/dashboard';

      if (finalRecipientId) {
        await FcmService.sendToUserDevices({
          userId: finalRecipientId,
          title,
          body: message,
          data: { orderId: orderId ? orderId.toString() : '', type: type || '' },
          clickAction,
          sound: 'default'
        });
      } else if (recipientRole === 'ADMIN') {
        await FcmService.sendToRoleDevices({
          role: 'ADMIN',
          title,
          body: message,
          data: { orderId: orderId ? orderId.toString() : '', type: type || '' },
          clickAction,
          sound: 'default'
        });
      }

      return notification;
    } catch (error) {
      logger.error('Failed to dispatch notification', error);
      return null;
    }
  }

  /**
   * Broadcast notification to all active dealers or admins
   */
  static async notifyAllDealers({ title, message, orderId }) {
    try {
      const activeDealers = await User.find({ role: 'DEALER', isActive: true });
      const promises = activeDealers.map((dealer) =>
        this.send({
          recipientId: dealer._id,
          recipientRole: 'DEALER',
          type: 'ORDER_PLACED',
          title,
          message,
          orderId,
          targetPhone: dealer.whatsappNumber || dealer.mobile
        })
      );
      await Promise.all(promises);
    } catch (error) {
      logger.error('Failed to notify dealers', error);
    }
  }

  static async notifyAdmin({ title, message, orderId }) {
    try {
      const admins = await User.find({ role: 'ADMIN', isActive: true });
      const promises = admins.map((admin) =>
        this.send({
          recipientId: admin._id,
          recipientRole: 'ADMIN',
          type: 'GENERAL',
          title,
          message,
          orderId
        })
      );
      await Promise.all(promises);
    } catch (error) {
      logger.error('Failed to notify admin', error);
    }
  }

  /**
   * External Provider Dispatcher (SMS / WhatsApp Business API / MSG91 / Twilio)
   */
  static async sendExternalAlerts({ phone, title, message, type }) {
    try {
      // 1. Dispatch real-time SMS via configured telecom gateway
      if (phone) {
        await SmsService.sendSms({
          mobile: phone,
          message: `[${title}] ${message}`,
          type: type || 'ALERT'
        });
      }

      // 2. WhatsApp Business API integration stub
      if (WHATSAPP_API_KEY && phone) {
        logger.info(`[WhatsApp API] Sent to ${phone}: ${message}`);
      }
    } catch (err) {
      logger.error('[External Notification Error]', err);
    }
  }
}

module.exports = NotificationService;
