const express = require('express');
const router = express.Router();
const dealerTractorRateController = require('../controllers/dealerTractorRateController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.use(authenticateToken, authorizeRoles('DEALER', 'ADMIN'));
router.get('/', dealerTractorRateController.getMyRates);
router.post('/', dealerTractorRateController.bulkSaveRates);
router.patch('/:id/toggle', dealerTractorRateController.toggleRate);
router.delete('/:id', dealerTractorRateController.deleteRate);

module.exports = router;
