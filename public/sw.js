// Service Worker — بوابة سياسات الجودة (MIH)
// الاستراتيجية:
//  - ملفات /assets/ المُهشَّرة (hash في الاسم): cache-first (غير قابلة للتغيير).
//  - التنقل (HTML): network-first مع رجوع إلى نسخة مخزنة أو /index.html عند انقطاع الاتصال.
//  - لا يُخزَّن أي طلب إلى /api/ أو إلى نطاقات خارجية (Firebase/Gemini/Cloudinary).
const VERSION = 'v12';
const SHELL_CACHE = `mih-shell-${VERSION}`;
const ASSET_CACHE = `mih-assets-${VERSION}`;
const SHELL = ['/', '/index.html', '/manifest.json', '/icons/icon-192.png'];
const MAX_ASSET_ENTRIES = 80;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

async function trimCache(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > max) {
    await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // لا نتدخل في الطلبات الخارجية
  if (url.pathname.startsWith('/api/')) return;

  // HTML navigation: network-first
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html').then((r) => r || caches.match('/')))
    );
    return;
  }

  // Hashed build assets: cache-first
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches
              .open(ASSET_CACHE)
              .then((c) => c.put(req, copy))
              .then(() => trimCache(ASSET_CACHE, MAX_ASSET_ENTRIES));
          }
          return res;
        });
      })
    );
  }
});
