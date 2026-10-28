const express = require('express');
const router = express.Router();
const dealerRequestController = require('../controllers/dealerRequestController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

// Admin review queue for self-registered dealers awaiting KYC approval
router.use(authenticateToken, authorizeRoles('ADMIN'));
router.get('/', dealerRequestController.getPendingDealerRequests);
router.get('/:id', dealerRequestController.getDealerRequestById);
router.post('/:id/approve', dealerRequestController.approveDealerRequest);
router.post('/:id/reject', dealerRequestController.rejectDealerRequest);

module.exports = router;
