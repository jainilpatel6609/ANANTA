const Notification = require('../models/Notification');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// @desc    Get current user's notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipientId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      recipientId: req.user._id,
      isRead: false
    });

    return successResponse(res, 'Notifications retrieved.', {
      notifications,
      unreadCount
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return errorResponse(res, 'Notification not found.', 404);
    }

    return successResponse(res, 'Notification marked as read.', { notification });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientId: req.user._id, isRead: false },
      { isRead: true }
    );

    return successResponse(res, 'All notifications marked as read.');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Register or update an FCM device token for authenticated user
// @route   POST /api/notifications/register-device
// @access  Private
const registerDeviceToken = async (req, res) => {
  try {
    const { token, platform = 'web', userAgent = '' } = req.body;

    if (!token || typeof token !== 'string') {
      return errorResponse(res, 'FCM registration token is required.', 400);
    }

    const user = req.user;
    if (!Array.isArray(user.fcmDevices)) {
      user.fcmDevices = [];
    }

    const existingIndex = user.fcmDevices.findIndex((d) => d.token === token);
    const now = new Date();

    if (existingIndex !== -1) {
      user.fcmDevices[existingIndex].lastSeenAt = now;
      user.fcmDevices[existingIndex].platform = platform;
      user.fcmDevices[existingIndex].userAgent = userAgent || user.fcmDevices[existingIndex].userAgent;
    } else {
      user.fcmDevices.push({
        token,
        platform,
        userAgent,
        createdAt: now,
        lastSeenAt: now
      });
    }

    await user.save();

    return successResponse(res, 'Device token registered successfully for push notifications.', {
      deviceCount: user.fcmDevices.length
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Unregister an FCM device token upon logout
// @route   POST /api/notifications/unregister-device
// @access  Private
const unregisterDeviceToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return errorResponse(res, 'Device token is required.', 400);
    }

    const user = req.user;
    if (Array.isArray(user.fcmDevices)) {
      user.fcmDevices = user.fcmDevices.filter((d) => d.token !== token);
      await user.save();
    }

    return successResponse(res, 'Device token unregistered successfully.');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Send a test push notification to verify device sound and alert
// @route   POST /api/notifications/test-push
// @access  Private
const testPushNotification = async (req, res) => {
  try {
    const FcmService = require('../services/fcmService');
    const result = await FcmService.sendToUserDevices({
      userId: req.user._id,
      title: '🚨 ANANTA TRADERS — Push Alarm Test',
      body: `Live push notification received on your ${req.user.role} device with alarm sound active!`,
      data: { type: 'TEST_PUSH' },
      clickAction: req.user.role === 'DEALER' ? '/dealer/new-orders' : '/admin/dashboard',
      sound: 'default'
    });

    return successResponse(res, 'Test push notification dispatched.', { result });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  registerDeviceToken,
  unregisterDeviceToken,
  testPushNotification
};
