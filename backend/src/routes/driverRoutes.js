const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

// All driver routes require authenticated DEALER or ADMIN
router.use(authenticateToken);
router.use(authorizeRoles('DEALER', 'ADMIN'));

router.get('/', driverController.getDealerDrivers);
router.post('/', driverController.createDriver);
router.put('/:id', driverController.updateDriver);
router.patch('/:id/toggle', driverController.toggleDriverStatus);
router.delete('/:id', driverController.deleteDriver);

module.exports = router;

