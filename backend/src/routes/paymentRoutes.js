const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.post('/verify', authenticateToken, authorizeRoles('USER', 'DEALER', 'ADMIN'), paymentController.verifyPayment);
router.post('/dev-confirm', authenticateToken, authorizeRoles('USER', 'DEALER', 'ADMIN'), paymentController.devConfirmPayment);

module.exports = router;
