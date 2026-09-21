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

// Driver uploads River Royalty photo (Dumper fulfillment flow, requires location already shared)
router.post(
  '/:id/river-royalty',
  authenticateToken,
  authorizeRoles('DRIVER'),
  upload.single('riverRoyalty'),
  deliveryController.uploadRiverRoyalty
);

// Driver uploads Plant Stock Yard Royalty photo, or skips this step (no file = skip)
router.post(
  '/:id/stock-yard-royalty',
  authenticateToken,
  authorizeRoles('DRIVER'),
  upload.single('stockYardRoyalty'),
  deliveryController.uploadStockYardRoyalty
);

// Driver submits the 5 required photos (Weight Bridge Slip/Display, Dumper Top/Front/Rear)
router.post(
  '/:id/required-photos',
  authenticateToken,
  authorizeRoles('DRIVER'),
  upload.fields([
    { name: 'weightBridgeSlip', maxCount: 1 },
    { name: 'weightBridgeDisplay', maxCount: 1 },
    { name: 'dumperTop', maxCount: 1 },
    { name: 'dumperFront', maxCount: 1 },
    { name: 'dumperRear', maxCount: 1 }
  ]),
  deliveryController.uploadRequiredPhotos
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
