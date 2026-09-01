const express = require('express');
const router = express.Router();
const dealerController = require('../controllers/dealerController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

// Admin Dealer Management
router.use(authenticateToken, authorizeRoles('ADMIN'));
router.get('/', dealerController.getAllDealers);
router.post('/', dealerController.createDealer);
router.put('/:id', dealerController.updateDealer);
router.delete('/:id', dealerController.deleteDealer);
router.patch('/:id/toggle-status', dealerController.toggleDealerStatus);
router.post('/:id/reset-password', dealerController.resetDealerPassword);

module.exports = router;
