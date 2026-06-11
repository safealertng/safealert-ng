self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '🚨 SafeAlertNG Emergency';
  let url = 'https://safealert-ng-theta.vercel.app/';
  if (data.fromUserId) {
    url += '?openFamily=' + encodeURIComponent(data.fromUserId);
  }
  const options = {
    body: data.body || 'Emergency alert activated!',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true,
    data: { url, fromUserId: data.fromUserId || null }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const { url, fromUserId } = event.notification.data || {};
  const targetUrl = url || 'https://safealert-ng-theta.vercel.app/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if (fromUserId) client.postMessage({ type: 'OPEN_FAMILY_MEMBER', userId: fromUserId });
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(event.data.title, {
      body: event.data.body,
      icon: '/favicon.svg',
      vibrate: [200, 100, 200, 100, 200],
      requireInteraction: true,
    });
  }
});