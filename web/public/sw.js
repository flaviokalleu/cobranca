const CACHE_NAME = 'cobranca-pwa-v2';
const APP_SHELL = ['/manifest.webmanifest', '/logo.png'];

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
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/')));
    return;
  }

  const canCache =
    url.pathname.startsWith('/_next/static/') ||
    APP_SHELL.includes(url.pathname);
  if (!canCache) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request)),
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
