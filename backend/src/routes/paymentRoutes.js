const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.post('/verify', authenticateToken, authorizeRoles('USER', 'DEALER', 'ADMIN'), paymentController.verifyPayment);
router.post('/dev-confirm', authenticateToken, authorizeRoles('USER', 'DEALER', 'ADMIN'), paymentController.devConfirmPayment);
router.post('/verify-final', authenticateToken, authorizeRoles('USER', 'DEALER', 'ADMIN'), paymentController.verifyFinalPayment);
router.post('/dev-confirm-final', authenticateToken, authorizeRoles('USER', 'DEALER', 'ADMIN'), paymentController.devConfirmFinalPayment);

// ICICI Orange PG -- hit by the customer's browser (returnURL) or ICICI's own servers
// (Payment Advice / Settlement Advice webhooks), never by an authenticated app session, so
// these are intentionally not behind authenticateToken. Ownership/integrity is enforced via
// secureHash verification + the stored IciciTransaction record instead.
router.post('/icici/callback', paymentController.iciciReturnCallback);
router.post('/icici/advice', paymentController.iciciPaymentAdvice);
router.post('/icici/settlement-advice', paymentController.iciciSettlementAdvice);

// Customer-initiated: lazily creates a fresh ICICI redirect URL for the Dumper final payment,
// called right when the customer clicks "Pay" on the order details page.
router.post('/icici/initiate-final/:orderId', authenticateToken, authorizeRoles('USER', 'ADMIN'), paymentController.initiateFinalIciciPayment);

module.exports = router;
