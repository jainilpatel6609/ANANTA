const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

// Order creation and customer order history (Allows USER, DEALER, ADMIN for testing & cross-purchasing)
router.post('/', authenticateToken, authorizeRoles('USER', 'DEALER', 'ADMIN'), orderController.createOrder);
router.get('/my-orders', authenticateToken, authorizeRoles('USER', 'DEALER', 'ADMIN'), orderController.getMyOrders);

// Dealer routes
router.get('/dealer/available', authenticateToken, authorizeRoles('DEALER', 'ADMIN'), orderController.getDealerAvailableOrders);
router.get('/dealer/my-deliveries', authenticateToken, authorizeRoles('DEALER', 'ADMIN'), orderController.getDealerDeliveries);
router.post('/:id/accept', authenticateToken, authorizeRoles('DEALER', 'ADMIN'), orderController.acceptOrder);
router.post('/:id/decline', authenticateToken, authorizeRoles('DEALER', 'ADMIN'), orderController.declineOrder);
router.post('/:id/reject', authenticateToken, authorizeRoles('DEALER', 'ADMIN'), orderController.declineOrder);

// Admin Escalation & Reassignment routes
router.get('/admin/escalations', authenticateToken, authorizeRoles('ADMIN'), orderController.getAdminEscalations);
router.post('/:id/admin-acknowledge', authenticateToken, authorizeRoles('ADMIN'), orderController.adminAcknowledgeAlert);
router.post('/:id/reassign', authenticateToken, authorizeRoles('ADMIN'), orderController.adminReassignOrder);

// Common / Specific order lookup
router.get('/:id', authenticateToken, orderController.getOrderById);

module.exports = router;
