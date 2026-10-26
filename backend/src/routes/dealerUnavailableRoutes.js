const express = require('express');
const router = express.Router();
const dealerUnavailableController = require('../controllers/dealerUnavailableController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.post('/', authenticateToken, authorizeRoles('USER', 'ADMIN'), dealerUnavailableController.createReport);
router.get('/', authenticateToken, authorizeRoles('ADMIN'), dealerUnavailableController.getReports);
router.post('/:id/resolve', authenticateToken, authorizeRoles('ADMIN'), dealerUnavailableController.resolveReport);

module.exports = router;
