const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const orderController = require('../controllers/orderController');
const productController = require('../controllers/productController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.use(authenticateToken, authorizeRoles('ADMIN'));

router.get('/dashboard', reportController.getDashboardStats);
router.get('/reports', reportController.getReports);
router.get('/reports/export', reportController.exportOrders);
router.get('/orders', orderController.getAllOrdersAdmin);
router.get('/products', productController.getAllProductsAdmin);

module.exports = router;
