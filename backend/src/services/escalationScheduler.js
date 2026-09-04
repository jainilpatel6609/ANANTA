const Order = require('../models/Order');
const NotificationService = require('./notificationService');
const logger = require('../utils/logger');

let schedulerInterval = null;

class EscalationScheduler {
  /**
   * Checks database for any orders whose 15-minute dealer response window has expired
   */
  static async checkTimedOutOrders() {
    try {
      const now = new Date();

      // Find orders that are confirmed (PLACED & PAID), assigned to a dealer, still PENDING, past deadline, and not yet escalated
      const timedOutOrders = await Order.find({
        orderStatus: 'PLACED',
        paymentStatus: 'PAID',
        assignedDealerId: { $ne: null },
        dealerResponseStatus: 'PENDING',
        dealerResponseDeadline: { $lte: now },
        adminEscalationSent: { $ne: true }
      })
        .populate('userId', 'name mobile')
        .populate('assignedDealerId', 'name companyName mobile pincode');

      if (timedOutOrders.length === 0) {
        return 0;
      }

      logger.warn(`[Escalation Scheduler] Found ${timedOutOrders.length} timed-out orders pending dealer response.`);

      for (const order of timedOutOrders) {
        const dealer = order.assignedDealerId;
        const dealerName = dealer ? (dealer.companyName || dealer.name) : 'Assigned Dealer';
        const customerName = order.userId ? order.userId.name : (order.shippingDetails?.fullName || 'Customer');

        // 1. Update Order state atomically
        order.dealerResponseStatus = 'TIMEOUT';
        order.adminEscalationSent = true;
        order.adminEscalationSentAt = now;
        order.adminAlarmActive = true;
        order.adminAlertType = 'DEALER_TIMEOUT';

        // 2. Update assignment history record
        if (Array.isArray(order.assignmentHistory) && order.assignmentHistory.length > 0) {
          const lastIndex = order.assignmentHistory.length - 1;
          if (order.assignmentHistory[lastIndex].response === 'PENDING') {
            order.assignmentHistory[lastIndex].response = 'TIMEOUT';
            order.assignmentHistory[lastIndex].respondedAt = now;
            order.assignmentHistory[lastIndex].reason = 'No response within 15-minute SLA deadline';
          }
        }

        await order.save();

        // 3. Dispatch Admin Escalation Alert (Push / In-App / Sound)
        await NotificationService.send({
          recipientRole: 'ADMIN',
          type: 'DEALER_NO_RESPONSE_ESCALATION',
          title: '🚨 ORDER ESCALATION — Dealer Timeout',
          message: `Order #${order.orderNumber} (Customer: ${customerName}, PIN: ${order.pincode}) assigned to ${dealerName} has had NO RESPONSE for 15 minutes. Immediate dispatch action required.`,
          orderId: order._id
        });

        // 4. Emit Real-Time Socket.IO Escalation event to Super Admin room
        const { emitOrderEscalation } = require('../sockets/socket');
        emitOrderEscalation(order, {
          dealerName,
          customerName,
          pincode: order.pincode,
          message: `Order #${order.orderNumber} has exceeded the 15-minute dealer response deadline.`
        });

        logger.info(`[Escalation Dispatched] Order #${order.orderNumber} escalated to Super Admin (15-min timeout).`);
      }

      return timedOutOrders.length;
    } catch (err) {
      logger.error('[Escalation Scheduler Error]', err);
      return 0;
    }
  }

  /**
   * Start the continuous background polling job (default every 30 seconds)
   */
  static start(intervalMs = 30000) {
    if (schedulerInterval) {
      clearInterval(schedulerInterval);
    }
    logger.info(`[Escalation Scheduler] Active (Checking every ${intervalMs / 1000}s for 15-minute response timeouts).`);
    schedulerInterval = setInterval(() => {
      EscalationScheduler.checkTimedOutOrders();
    }, intervalMs);
  }

  /**
   * Stop the scheduler (e.g. for graceful server shutdown or testing)
   */
  static stop() {
    if (schedulerInterval) {
      clearInterval(schedulerInterval);
      schedulerInterval = null;
      logger.info('[Escalation Scheduler] Stopped.');
    }
  }
}

module.exports = EscalationScheduler;

