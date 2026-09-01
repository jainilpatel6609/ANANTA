/**
 * ANANTA TRADERS - Background Web Push & FCM Service Worker
 * Handles real-time system/device level push notifications with vibration & sound
 */

/* eslint-disable no-restricted-globals */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listen to incoming push events from backend
self.addEventListener('push', (event) => {
  let title = '🚨 NEW ORDER — ANANTA TRADERS';
  let body = 'A new delivery order has been assigned to your depot. Tap to view and accept.';
  let clickAction = '/dealer/new-orders';
  let tag = 'ananta-order-alert';
  let orderData = {};

  if (event.data) {
    try {
      const payload = event.data.json();
      if (payload.notification) {
        title = payload.notification.title || title;
        body = payload.notification.body || body;
      }
      if (payload.data) {
        orderData = payload.data;
        title = payload.data.title || title;
        body = payload.data.body || body;
        clickAction = payload.data.clickAction || payload.data.url || clickAction;
        tag = payload.data.orderId ? `ananta-order-${payload.data.orderId}` : tag;
      }
    } catch (err) {
      // Plain text fallback
      body = event.data.text() || body;
    }
  }

  const notificationOptions = {
    body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [300, 100, 300, 100, 300, 100, 300], // Urgent vibration cadence
    tag,
    renotify: true,
    requireInteraction: true, // Remains on screen until user interacts
    data: {
      url: clickAction,
      ...orderData
    },
    actions: [
      {
        action: 'open_order',
        title: '🚚 View & Respond'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, notificationOptions));
});

// Handle notification tap / click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) || '/dealer/new-orders';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client && client.url !== targetUrl) {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

