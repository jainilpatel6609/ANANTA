const express = require('express');
const router = express.Router();
const dealerTransportController = require('../controllers/dealerTransportController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

// Public / Customer endpoints
router.get('/eligible-dealers', dealerTransportController.getEligibleDealers);

// Dealer self-service endpoints (a dealer can only ever read/modify their own rates,
// since dealerId is always taken from the authenticated JWT, never the request body/params)
router.get('/material-locations', authenticateToken, authorizeRoles('DEALER'), dealerTransportController.getMaterialLocations);
router.get('/my-configs', authenticateToken, authorizeRoles('DEALER'), dealerTransportController.getMyConfigs);
router.post('/my-configs', authenticateToken, authorizeRoles('DEALER'), dealerTransportController.bulkSaveConfigs);
router.patch('/my-configs/:id/toggle', authenticateToken, authorizeRoles('DEALER'), dealerTransportController.toggleMyConfig);
router.delete('/my-configs/:id', authenticateToken, authorizeRoles('DEALER'), dealerTransportController.deleteMyConfig);

// Admin endpoints
router.get('/admin', authenticateToken, authorizeRoles('ADMIN'), dealerTransportController.adminGetAllConfigs);
router.put('/admin/:id', authenticateToken, authorizeRoles('ADMIN'), dealerTransportController.adminUpdateConfig);
router.patch('/admin/:id/toggle', authenticateToken, authorizeRoles('ADMIN'), dealerTransportController.adminToggleConfig);

module.exports = router;
