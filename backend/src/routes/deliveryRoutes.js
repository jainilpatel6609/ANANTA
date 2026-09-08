const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/deliveryController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');
const { upload } = require('../middleware/upload');

// Dealer assigns Driver and dispatches SMS + Live Google Map to driver
router.post(
  '/:id/assign-driver',
  authenticateToken,
  authorizeRoles('DEALER', 'ADMIN'),
  deliveryController.assignDriverToOrder
);

// Dealer dispatch driver & uploads documents
router.post(
  '/:id/dispatch',
  authenticateToken,
  authorizeRoles('DEALER'),
  upload.fields([
    { name: 'riverRoyalty', maxCount: 1 },
    { name: 'waybridgePhoto', maxCount: 1 }
  ]),
  deliveryController.dispatchOrder
);

// Dealer / Admin / Driver verify delivery OTP
router.post('/:id/verify-otp', authenticateToken, authorizeRoles('DEALER', 'ADMIN', 'DRIVER'), deliveryController.verifyDeliveryOtp);

// User / Admin view OTP status
router.get('/:id/otp', authenticateToken, authorizeRoles('USER', 'ADMIN'), deliveryController.getDeliveryOtp);

module.exports = router;
