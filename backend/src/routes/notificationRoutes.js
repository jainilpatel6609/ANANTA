const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, notificationController.getNotifications);
router.patch('/:id/read', authenticateToken, notificationController.markAsRead);
router.patch('/read-all', authenticateToken, notificationController.markAllAsRead);

// FCM Device Token Registration
router.post('/register-device', authenticateToken, notificationController.registerDeviceToken);
router.post('/unregister-device', authenticateToken, notificationController.unregisterDeviceToken);
router.post('/test-push', authenticateToken, notificationController.testPushNotification);

module.exports = router;
