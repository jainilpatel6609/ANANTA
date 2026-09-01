const User = require('../models/User');
const logger = require('../utils/logger');
const { FCM_SERVER_KEY, FCM_PROJECT_ID } = require('../config/env');

class FcmService {
  /**
   * Dispatches FCM push notification to a list of device tokens
   * @param {Object} params - { tokens, title, body, data, clickAction, sound }
   */
  static async sendMulticast({ tokens = [], title, body, data = {}, clickAction = '/dealer/new-orders', sound = 'default' }) {
    if (!Array.isArray(tokens) || tokens.length === 0) {
      return { success: true, count: 0, message: 'No registered device tokens found.' };
    }

    logger.info(`[FCM Dispatch] Sending push to ${tokens.length} device token(s): "${title}"`);

    // If FCM_SERVER_KEY is configured, dispatch HTTP request to FCM endpoint
    if (FCM_SERVER_KEY) {
      try {
        const payload = {
          registration_ids: tokens,
          priority: 'high',
          notification: {
            title,
            body,
            sound,
            click_action: clickAction,
            icon: '/favicon.svg',
            badge: '/favicon.svg',
            vibrate: [300, 100, 300, 100, 300]
          },
          data: {
            ...data,
            title,
            body,
            clickAction,
            timestamp: new Date().toISOString()
          },
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              channel_id: 'ananta_dispatch_alerts',
              priority: 'high',
              notification_priority: 'PRIORITY_MAX',
              default_sound: true,
              default_vibrate_timings: true
            }
          },
          webpush: {
            headers: {
              Urgency: 'high'
            },
            notification: {
              title,
              body,
              icon: '/favicon.svg',
              badge: '/favicon.svg',
              requireInteraction: true,
              vibrate: [300, 100, 300, 100, 300],
              data: {
                ...data,
                url: clickAction
              }
            }
          }
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const res = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            Authorization: `key=${FCM_SERVER_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeout);
        const resData = await res.json();

        logger.info(`[FCM Response] Success: ${resData.success || 0}, Failure: ${resData.failure || 0}`);

        // Cleanup invalid or expired tokens if reported by FCM
        if (resData.results && Array.isArray(resData.results)) {
          const staleTokens = [];
          resData.results.forEach((r, idx) => {
            if (r.error === 'NotRegistered' || r.error === 'InvalidRegistration') {
              staleTokens.push(tokens[idx]);
            }
          });

          if (staleTokens.length > 0) {
            await this._removeStaleTokens(staleTokens);
          }
        }

        return {
          success: true,
          provider: 'FCM_HTTP',
          successCount: resData.success || 0,
          failureCount: resData.failure || 0
        };
      } catch (err) {
        logger.error('[FCM Dispatch Error]', err);
        return { success: false, error: err.message };
      }
    }

    // Development / Simulated Push Log when FCM key is not yet added to .env
    logger.info(`[FCM Device Push Simulated] Pushed to ${tokens.length} token(s) | Sound: ${sound} | ClickAction: ${clickAction}`);
    logger.info(`[FCM Payload] Title: "${title}" | Body: "${body}"`);

    return {
      success: true,
      provider: 'SIMULATED',
      count: tokens.length,
      clickAction
    };
  }

  /**
   * Dispatches push notification to all active devices of a specific user
   */
  static async sendToUserDevices({ userId, title, body, data = {}, clickAction = '/dealer/new-orders', sound = 'default' }) {
    try {
      const user = await User.findById(userId).select('fcmDevices role name');
      if (!user || !Array.isArray(user.fcmDevices) || user.fcmDevices.length === 0) {
        return { success: true, count: 0, message: 'No registered devices for this user.' };
      }

      const tokens = user.fcmDevices.map((d) => d.token).filter(Boolean);
      return await this.sendMulticast({
        tokens,
        title,
        body,
        data,
        clickAction,
        sound
      });
    } catch (err) {
      logger.error('[FCM Send to User Error]', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Dispatches push notification to all active devices of users with a specific role (e.g. 'ADMIN' or 'DEALER')
   */
  static async sendToRoleDevices({ role, title, body, data = {}, clickAction = '/admin/dashboard', sound = 'default' }) {
    try {
      const users = await User.find({ role, isActive: true, isDeleted: { $ne: true } }).select('fcmDevices');
      let allTokens = [];

      users.forEach((u) => {
        if (Array.isArray(u.fcmDevices)) {
          u.fcmDevices.forEach((d) => {
            if (d.token) allTokens.push(d.token);
          });
        }
      });

      // Deduplicate tokens
      allTokens = Array.from(new Set(allTokens));

      return await this.sendMulticast({
        tokens: allTokens,
        title,
        body,
        data,
        clickAction,
        sound
      });
    } catch (err) {
      logger.error('[FCM Send to Role Error]', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Removes stale or expired tokens from database
   */
  static async _removeStaleTokens(staleTokens = []) {
    try {
      if (staleTokens.length === 0) return;
      await User.updateMany(
        { 'fcmDevices.token': { $in: staleTokens } },
        { $pull: { fcmDevices: { token: { $in: staleTokens } } } }
      );
      logger.info(`[FCM Maintenance] Removed ${staleTokens.length} stale device tokens.`);
    } catch (err) {
      logger.error('[FCM Remove Stale Tokens Error]', err);
    }
  }
}

module.exports = FcmService;

