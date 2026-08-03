const PREVIEW_CACHE_PREFIX = 'bss-preview-portal-';
const CACHE_NAME = `${PREVIEW_CACHE_PREFIX}rc3`;
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './ux-polish.css',
  './director-intelligence.css',
  './final-experience.css',
  './release-polish.css',
  './enhancements.css',
  './app.js',
  './premium-experience.js',
  './notifications.js',
  './director-intelligence.js',
  './final-experience.js',
  './release-polish.js',
  './mobile-shell.js',
  './state.js',
  './industry-context.js',
  './analytics.js',
  './living-office.js',
  './business-summary.js',
  './kpi-details.js',
  './terminal-effects.js',
  './terminal-status.js',
  './command-center.js',
  './cancellable-delay.js',
  './experience-engine.js',
  './scenarios/morning-shift.js',
  './company-profile.js',
  './operational-metrics.js',
  './html-safe.js',
  './manifest.webmanifest',
  './app-icon.svg',
  './app-icon-192.png',
  './app-icon-512.png'
];

async function previewCache() {
  return caches.open(CACHE_NAME);
}

async function networkFirstDocument(request) {
  const cache = await previewCache();
  try {
    return await fetch(new Request(request, { cache: 'no-store' }));
  } catch {
    return await cache.match(request, { ignoreSearch: true })
      || await cache.match('./index.html');
  }
}

async function cacheFirstAsset(request) {
  const cache = await previewCache();
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok && response.type === 'basic') await cache.put(request, response.clone());
  return response;
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await previewCache();
    await cache.addAll(ASSETS.map((asset) => new Request(asset, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith(PREVIEW_CACHE_PREFIX) && key !== CACHE_NAME)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  const scopeUrl = new URL(self.registration.scope);
  if (requestUrl.origin !== scopeUrl.origin || !requestUrl.pathname.startsWith(scopeUrl.pathname)) return;

  if (event.request.mode === 'navigate' || requestUrl.pathname.endsWith('/index.html')) {
    event.respondWith(networkFirstDocument(event.request));
    return;
  }

  event.respondWith(cacheFirstAsset(event.request));
});
