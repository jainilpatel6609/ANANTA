const express = require('express');
const router = express.Router();
const dealerTractorRateController = require('../controllers/dealerTractorRateController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.use(authenticateToken, authorizeRoles('DEALER', 'ADMIN'));
router.get('/', dealerTractorRateController.getMyRates);
router.put('/:tractorType', dealerTractorRateController.setRate);
router.patch('/:tractorType/toggle', dealerTractorRateController.toggleRate);

module.exports = router;
