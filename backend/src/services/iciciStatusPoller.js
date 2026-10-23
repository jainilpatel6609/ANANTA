const IciciTransaction = require('../models/IciciTransaction');
const PendingOrderIntent = require('../models/PendingOrderIntent');
const Order = require('../models/Order');
const IciciPaymentService = require('./iciciPaymentService');
const logger = require('../utils/logger');

let schedulerInterval = null;

class IciciStatusPoller {
  /**
   * Re-checks transaction status with ICICI for any transaction stuck in INITIATED/PENDING
   * for more than 15 minutes -- catches the case where the customer closed the tab before the
   * returnURL redirect AND the Payment Advice webhook also failed to land. Two independent
   * sources are scanned: IciciTransaction (FINAL/weight-based payments, whose Order always
   * pre-exists) and PendingOrderIntent (UPFRONT payments, which have neither an Order nor an
   * IciciTransaction until the payment actually succeeds).
   */
  static async checkStuckTransactions() {
    let recovered = 0;
    recovered += await IciciStatusPoller.checkStuckFinalTransactions();
    recovered += await IciciStatusPoller.checkStuckUpfrontIntents();
    return recovered;
  }

  static async checkStuckFinalTransactions() {
    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      const stuck = await IciciTransaction.find({
        status: { $in: ['INITIATED', 'PENDING'] },
        createdAt: { $lt: fifteenMinutesAgo }
      });

      if (stuck.length === 0) {
        return 0;
      }

      logger.warn(`[ICICI Status Poller] Found ${stuck.length} stuck FINAL transaction(s), checking status with ICICI.`);

      // Lazily required to avoid a require cycle with paymentController (which doesn't import
      // this file, but keeps the dependency direction one-way and explicit).
      const { dispatchAfterFinalPayment } = require('../controllers/paymentController');

      for (const transaction of stuck) {
        try {
          const { response } = await IciciPaymentService.checkStatus({
            merchantTxnNo: transaction.merchantTxnNo,
            originalTxnNo: transaction.merchantTxnNo
          });

          if (response.responseCode !== '000' && response.responseCode !== '0000') {
            // Status check request itself failed (not the underlying transaction) -- leave as
            // PENDING/INITIATED for the next poll rather than guessing.
            continue;
          }

          const isSuccess = response.txnStatus === 'SUC';
          const isFinal = ['REJ', 'ERR'].includes(response.txnStatus);
          if (!isSuccess && !isFinal) {
            transaction.status = 'PENDING';
            await transaction.save();
            continue;
          }

          transaction.status = isSuccess ? 'SUCCESS' : 'FAILED';
          transaction.gatewayTxnId = response.txnID || transaction.gatewayTxnId;
          transaction.paymentId = response.txnAuthID || transaction.paymentId;
          transaction.responseCode = response.txnResponseCode || transaction.responseCode;
          transaction.responseMessage = response.txnRespDescription || transaction.responseMessage;
          await transaction.save();

          if (!isSuccess) continue;

          const order = await Order.findById(transaction.orderId).populate('userId', 'name mobile whatsappNumber');
          if (!order || order.fulfillmentStage !== 'WEIGHT_ENTERED') continue;

          order.finalPaymentStatus = 'PAID';
          order.finalPaymentId = transaction.paymentId || transaction.gatewayTxnId;
          order.fulfillmentStage = 'FINAL_PAYMENT_PAID';
          await order.save();
          await dispatchAfterFinalPayment(order);

          logger.info(`[ICICI Status Poller] Recovered stuck FINAL transaction ${transaction.merchantTxnNo} -> SUCCESS.`);
        } catch (err) {
          logger.error(`[ICICI Status Poller] Error checking transaction ${transaction.merchantTxnNo}`, err);
        }
      }

      return stuck.length;
    } catch (err) {
      logger.error('[ICICI Status Poller Error]', err);
      return 0;
    }
  }

  /**
   * UPFRONT payments stage as a PendingOrderIntent with no Order and no IciciTransaction until
   * they succeed -- so a customer who completed payment but whose returnURL AND Payment Advice
   * webhook both failed to arrive would otherwise have no Order ever created. This recovers that
   * case by asking ICICI directly.
   */
  static async checkStuckUpfrontIntents() {
    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      const stuck = await PendingOrderIntent.find({
        gateway: 'ICICI',
        consumedOrderId: null,
        createdAt: { $lt: fifteenMinutesAgo }
      });

      if (stuck.length === 0) {
        return 0;
      }

      logger.warn(`[ICICI Status Poller] Found ${stuck.length} stuck UPFRONT pending order(s), checking status with ICICI.`);

      const { materializeIciciUpfrontFromIntent } = require('../controllers/paymentController');

      let recoveredCount = 0;
      for (const intent of stuck) {
        try {
          const { response } = await IciciPaymentService.checkStatus({
            merchantTxnNo: intent.gatewayRef,
            originalTxnNo: intent.gatewayRef
          });

          if (response.responseCode !== '000' && response.responseCode !== '0000') {
            continue;
          }

          if (response.txnStatus !== 'SUC') {
            // Not successful (or still pending on ICICI's side) -- leave the intent as an
            // uncommitted draft; it simply never materializes into an Order.
            continue;
          }

          await materializeIciciUpfrontFromIntent(intent, intent.gatewayRef, {
            paymentID: response.txnAuthID,
            txnID: response.txnID,
            paymentMode: response.paymentMode,
            responseCode: response.txnResponseCode
          });

          recoveredCount += 1;
          logger.info(`[ICICI Status Poller] Recovered stuck UPFRONT order for ${intent.gatewayRef} -> SUCCESS.`);
        } catch (err) {
          logger.error(`[ICICI Status Poller] Error checking pending order ${intent.gatewayRef}`, err);
        }
      }

      return recoveredCount;
    } catch (err) {
      logger.error('[ICICI Status Poller Error]', err);
      return 0;
    }
  }

  static start(intervalMs = 60000) {
    if (schedulerInterval) {
      clearInterval(schedulerInterval);
    }
    logger.info(`[ICICI Status Poller] Active (Checking every ${intervalMs / 1000}s for stuck transactions).`);
    schedulerInterval = setInterval(() => {
      IciciStatusPoller.checkStuckTransactions();
    }, intervalMs);
  }

  static stop() {
    if (schedulerInterval) {
      clearInterval(schedulerInterval);
      schedulerInterval = null;
      logger.info('[ICICI Status Poller] Stopped.');
    }
  }
}

module.exports = IciciStatusPoller;
