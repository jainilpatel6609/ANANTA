const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

// User routes
router.post('/', authenticateToken, authorizeRoles('USER'), orderController.createOrder);
router.get('/my-orders', authenticateToken, authorizeRoles('USER'), orderController.getMyOrders);

// Dealer routes
router.get('/dealer/available', authenticateToken, authorizeRoles('DEALER'), orderController.getDealerAvailableOrders);
router.get('/dealer/my-deliveries', authenticateToken, authorizeRoles('DEALER'), orderController.getDealerDeliveries);
router.post('/:id/accept', authenticateToken, authorizeRoles('DEALER'), orderController.acceptOrder);
router.post('/:id/decline', authenticateToken, authorizeRoles('DEALER'), orderController.declineOrder);
router.post('/:id/reject', authenticateToken, authorizeRoles('DEALER'), orderController.declineOrder);

// Admin Escalation & Reassignment routes
router.get('/admin/escalations', authenticateToken, authorizeRoles('ADMIN'), orderController.getAdminEscalations);
router.post('/:id/admin-acknowledge', authenticateToken, authorizeRoles('ADMIN'), orderController.adminAcknowledgeAlert);
router.post('/:id/reassign', authenticateToken, authorizeRoles('ADMIN'), orderController.adminReassignOrder);

// Common / Specific order lookup
router.get('/:id', authenticateToken, orderController.getOrderById);

module.exports = router;
