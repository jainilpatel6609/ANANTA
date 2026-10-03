const express = require('express');
const router = express.Router();
const helpController = require('../controllers/helpController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.post('/', authenticateToken, helpController.createHelpRequest);
router.get('/', authenticateToken, authorizeRoles('ADMIN'), helpController.getAllHelpRequests);
router.patch('/:id/resolve', authenticateToken, authorizeRoles('ADMIN'), helpController.toggleHelpRequestStatus);

module.exports = router;
