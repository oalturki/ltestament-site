/* Service worker of ltestament.com: phone notifications only (reminders of the daily wird of a khatma — js/push.js,
   supabase/functions/push). It caches nothing: every page and file comes from the network as before. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'العهد الأخير', {
    body: d.body || '', icon: '/img/icons/icon-192.png', badge: '/img/icons/icon-192.png', tag: d.tag || 'wird', lang: d.lang || 'ar', dir: d.dir || 'rtl',
    data: { url: d.url || '/book/' }
  }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || '/book/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (ws) {
    for (var i = 0; i < ws.length; i++) if (ws[i].url.indexOf('/book') >= 0 && 'focus' in ws[i]) { ws[i].navigate(url); return ws[i].focus(); }
    return self.clients.openWindow(url);
  }));
});
