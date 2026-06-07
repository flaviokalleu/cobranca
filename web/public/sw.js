const CACHE_NAME = 'cobranca-pwa-v1';
const APP_SHELL = ['/', '/dashboard', '/manifest.webmanifest', '/logo.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/dashboard'))),
  );
});

self.addEventListener('push', (event) => {
  const payload = event.data
    ? event.data.json()
    : { title: 'WEBBA ERP', body: 'Nova atualizacao disponivel.' };
  event.waitUntil(
    self.registration.showNotification(payload.title || 'WEBBA ERP', {
      body: payload.body || '',
      icon: '/logo.png',
      badge: '/logo.png',
      tag: payload.tag,
      data: payload.url ? { url: payload.url } : payload.data,
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard';
  event.waitUntil(clients.openWindow(url));
});
