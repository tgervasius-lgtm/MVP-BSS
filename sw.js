const CACHE_NAME = 'bss-design-system-v1';
const ASSETS = [
  './','./index.html','./styles.css','./app.js','./manifest.json','./icons/icon.svg',
  './design-system/index.html','./design-system/tokens.css','./design-system/guide.css','./design-system/guide.js'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
      return response;
    }).catch(() => caches.match(e.request).then(cached => {
      if (cached) return cached;
      const path = new URL(e.request.url).pathname;
      return caches.match(path.includes('/design-system') ? './design-system/index.html' : './index.html');
    })));
    return;
  }
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request)));
});
