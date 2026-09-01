const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

// Public / Customer endpoint
router.get('/', locationController.getPublicLocations);

// Admin endpoints
router.get('/admin', authenticateToken, authorizeRoles('ADMIN'), locationController.getAdminLocations);
router.post('/admin', authenticateToken, authorizeRoles('ADMIN'), locationController.createLocation);
router.put('/admin/:id', authenticateToken, authorizeRoles('ADMIN'), locationController.updateLocation);
router.patch('/admin/:id/toggle', authenticateToken, authorizeRoles('ADMIN'), locationController.toggleLocation);
router.delete('/admin/:id', authenticateToken, authorizeRoles('ADMIN'), locationController.deleteLocation);

module.exports = router;

