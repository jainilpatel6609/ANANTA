const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

// Public Driver Login
router.post('/login', driverController.driverLogin);

// Driver Self Routes (DRIVER role)
router.get(
  '/my-deliveries',
  authenticateToken,
  authorizeRoles('DRIVER'),
  driverController.getMyDeliveries
);

router.post(
  '/deliveries/:id/location',
  authenticateToken,
  authorizeRoles('DRIVER'),
  driverController.updateDriverLocation
);

// Dealer & Admin Driver Fleet Management Routes
router.post('/send-otp', authenticateToken, authorizeRoles('DEALER', 'ADMIN'), driverController.sendDriverPhoneOtp);
router.post('/verify-otp', authenticateToken, authorizeRoles('DEALER', 'ADMIN'), driverController.verifyDriverPhoneOtp);
router.get('/', authenticateToken, authorizeRoles('DEALER', 'ADMIN'), driverController.getDealerDrivers);
router.post('/', authenticateToken, authorizeRoles('DEALER', 'ADMIN'), driverController.createDriver);
router.put('/:id', authenticateToken, authorizeRoles('DEALER', 'ADMIN'), driverController.updateDriver);
router.patch('/:id/toggle', authenticateToken, authorizeRoles('DEALER', 'ADMIN'), driverController.toggleDriverStatus);
router.delete('/:id', authenticateToken, authorizeRoles('DEALER', 'ADMIN'), driverController.deleteDriver);

module.exports = router;

