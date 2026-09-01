const express = require('express');
const router = express.Router();
const vehicleConfigController = require('../controllers/vehicleConfigController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

// Public / Customer routes
router.get('/', vehicleConfigController.getPublicVehicleConfigs);
router.get('/settings', vehicleConfigController.getVehicleSettings);

// Admin routes
router.get('/admin', authenticateToken, authorizeRoles('ADMIN'), vehicleConfigController.getAdminVehicleConfigs);
router.post('/admin', authenticateToken, authorizeRoles('ADMIN'), vehicleConfigController.createVehicleConfig);
router.put('/admin/:id', authenticateToken, authorizeRoles('ADMIN'), vehicleConfigController.updateVehicleConfig);
router.patch('/admin/:id/toggle', authenticateToken, authorizeRoles('ADMIN'), vehicleConfigController.toggleVehicleConfig);
router.patch('/admin/settings', authenticateToken, authorizeRoles('ADMIN'), vehicleConfigController.updateVehicleSettings);
router.delete('/admin/:id', authenticateToken, authorizeRoles('ADMIN'), vehicleConfigController.deleteVehicleConfig);

module.exports = router;

