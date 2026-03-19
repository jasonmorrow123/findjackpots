/**
 * JackpotMap Service Worker
 * Handles push notifications from the server.
 */

self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || '🎰 JackpotMap', {
      body: data.body || 'New jackpot reported!',
      icon: data.icon || '/icon-192.png',
      badge: '/icon-72.png',
      data: data.data || {},
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/'));
});
