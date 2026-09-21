const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.post('/verify', authenticateToken, authorizeRoles('USER', 'DEALER', 'ADMIN'), paymentController.verifyPayment);
router.post('/dev-confirm', authenticateToken, authorizeRoles('USER', 'DEALER', 'ADMIN'), paymentController.devConfirmPayment);
router.post('/verify-final', authenticateToken, authorizeRoles('USER', 'DEALER', 'ADMIN'), paymentController.verifyFinalPayment);
router.post('/dev-confirm-final', authenticateToken, authorizeRoles('USER', 'DEALER', 'ADMIN'), paymentController.devConfirmFinalPayment);

module.exports = router;
