const express = require('express');
const router = express.Router();
const dumperController = require('../controllers/dumperController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.get('/admin/summary', authenticateToken, authorizeRoles('ADMIN'), dumperController.getDealerDumperSummaries);

router.use(authenticateToken, authorizeRoles('DEALER', 'ADMIN'));
router.get('/', dumperController.getDumpers);
router.post('/', dumperController.createDumper);
router.put('/:id', dumperController.updateDumper);
router.patch('/:id/toggle', dumperController.toggleDumper);
router.delete('/:id', dumperController.deleteDumper);

module.exports = router;
