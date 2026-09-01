const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

// Public
router.get('/', productController.getActiveProducts);
router.get('/:id', productController.getProductById);

// Admin Only
router.post('/', authenticateToken, authorizeRoles('ADMIN'), productController.createProduct);
router.put('/:id', authenticateToken, authorizeRoles('ADMIN'), productController.updateProduct);
router.delete('/:id', authenticateToken, authorizeRoles('ADMIN'), productController.deleteProduct);

module.exports = router;
