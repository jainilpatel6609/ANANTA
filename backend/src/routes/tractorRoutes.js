const express = require('express');
const router = express.Router();
const tractorController = require('../controllers/tractorController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.use(authenticateToken, authorizeRoles('DEALER', 'ADMIN'));
router.get('/', tractorController.getTractors);
router.post('/', tractorController.createTractor);
router.put('/:id', tractorController.updateTractor);
router.patch('/:id/toggle', tractorController.toggleTractor);
router.delete('/:id', tractorController.deleteTractor);

module.exports = router;
