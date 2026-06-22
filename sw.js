const VERSION = 'v4';
const APP = 'contas-' + VERSION;
const CDN = 'contas-cdn-v1';
const CORE = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/favicon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(APP).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== APP && k !== CDN).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isCDN = url.hostname.includes('unpkg.com') || url.hostname.includes('fonts.googleapis') || url.hostname.includes('fonts.gstatic');

  // CDN + fonts: cache-first (versioned, immutable)
  if (isCDN) {
    e.respondWith(
      caches.match(req).then(c => c || fetch(req).then(res => {
        if (res && res.status === 200) { const r = res.clone(); caches.open(CDN).then(c => c.put(req, r)); }
        return res;
      }))
    );
    return;
  }

  // App shell (same origin): network-first so new deploys show up immediately
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.status === 200 && url.origin === location.origin) {
        const r = res.clone();
        caches.open(APP).then(c => c.put(req, r));
      }
      return res;
    }).catch(() => caches.match(req).then(c => c || caches.match('/index.html')))
  );
});
