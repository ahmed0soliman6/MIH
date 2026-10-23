// Service Worker — بوابة سياسات الجودة (MIH)
// الإصدار: v13 مع دعم التخزين المؤقت للقطة البيانات الثابتة (Offline Data Snapshot)
// الاستراتيجية:
//  - ملفات /assets/ و /icons/: cache-first (أصول مهددة وثابتة).
//  - التنقل (HTML): network-first مع رجوع للنسخة المخزنة عند انقطاع الاتصال.
//  - ملفات فهرس البيانات (/data/index.json, /data/search.json, /data/version.json): network-first مع كاش عند انقطاع الاتصال.
//  - ملفات محتوى السياسات (/data/policies/*): cache-first (مهشرة بمحتواها) مع تقليم حتى 400 ملف.
//  - لا يُخزَّن أي طلب إلى /api/ أو إلى نطاقات خارجية (Firebase/Gemini/Cloudinary).

const VERSION = 'v13';
const SHELL_CACHE = `mih-shell-${VERSION}`;
const ASSET_CACHE = `mih-assets-${VERSION}`;
const DATA_CACHE = `mih-data-${VERSION}`;

const SHELL = ['/', '/index.html', '/manifest.json', '/icons/icon-192.png'];
const MAX_ASSET_ENTRIES = 80;
const MAX_POLICY_ENTRIES = 400;

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
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE && k !== DATA_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function trimCache(cacheName, max) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > max) {
      await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
    }
  } catch (_) {}
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // لا نتدخل في الطلبات الخارجية
  if (url.pathname.startsWith('/api/')) return;

  // 1) HTML navigation: network-first
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put('/index.html', copy));
          }
          return res;
        })
        .catch(() => caches.match('/index.html').then((r) => r || caches.match('/')))
    );
    return;
  }

  // 2) Hashed build assets: cache-first
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
    return;
  }

  // 3) Policy contents (/data/policies/*): cache-first (مهشرة بالكامل)
  if (url.pathname.startsWith('/data/policies/')) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches
              .open(DATA_CACHE)
              .then((c) => c.put(req, copy))
              .then(() => trimCache(DATA_CACHE, MAX_POLICY_ENTRIES));
          }
          return res;
        });
      })
    );
    return;
  }

  // 4) Dynamic metadata (/data/index.json, /data/search.json, /data/version.json): network-first
  if (url.pathname.startsWith('/data/')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(DATA_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }
});
