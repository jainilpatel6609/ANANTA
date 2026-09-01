const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/deliveryController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');
const { upload } = require('../middleware/upload');

// Dealer dispatch driver & uploads
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

// Dealer / Admin verify delivery OTP
router.post('/:id/verify-otp', authenticateToken, authorizeRoles('DEALER', 'ADMIN'), deliveryController.verifyDeliveryOtp);

// User / Admin view OTP status
router.get('/:id/otp', authenticateToken, authorizeRoles('USER', 'ADMIN'), deliveryController.getDeliveryOtp);

module.exports = router;
