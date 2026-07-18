const CACHE_NAME = 'bss-backend-mvp-v1-r2';
const ASSETS = [
  './index.html','./styles.css','./app.js','./manifest.json','./icons/icon.svg',
  './styles/base.css','./styles/layouts.css','./styles/components.css','./styles/screens.css',
  './styles/navigation.css','./styles/themes.css','./styles/responsive.css',
  './src/adapters/runtime.js','./src/adapters/api.js','./src/adapters/api-state.js','./src/adapters/api-bindings.js','./src/adapters/theme-bootstrap.js','./src/domain/contracts.js','./src/domain/time.js','./src/policies/access.js',
  './src/use-cases/attendance.js','./src/use-cases/leave.js','./src/use-cases/corrections.js',
  './src/views/registry.js','./src/views/events.js',
  './design-system/index.html','./design-system/tokens.css','./design-system/guide.css','./design-system/guide.js',
  './brand-book/index.html','./brand-book/brand.css','./brand-book/brand.js',
  './brand-book/assets/bss-symbol.svg','./brand-book/assets/bss-logo-primary.svg','./brand-book/assets/bss-logo-reversed.svg','./brand-book/assets/bss-logo-monochrome.svg',
  './brand-book/assets/bss-business-card.svg','./brand-book/assets/bss-presentation-cover.svg','./brand-book/assets/bss-terminal-label.svg',
  './output/pdf/BSS_BRAND-BOOK_v1.0_11.07.2026.pdf'
];

function offlineDocument(request){
  const path = new URL(request.url).pathname;
  if(path.includes('/brand-book')) return caches.match('./brand-book/index.html');
  if(path.includes('/design-system')) return caches.match('./design-system/index.html');
  return caches.match('./index.html');
}

async function networkFirstDocument(request){
  try{
    return await fetch(new Request(request,{cache:'no-store'}));
  }catch{
    const cached = await caches.match(request,{ignoreSearch:true});
    return cached || offlineDocument(request);
  }
}

async function networkFirstAsset(request){
  try{
    const response = await fetch(new Request(request,{cache:'no-cache'}));
    if(response.ok && response.type === 'basic'){
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request,response.clone());
    }
    return response;
  }catch{
    const cached = await caches.match(request,{ignoreSearch:true});
    if(cached)return cached;
    throw new Error('Mreža i offline cache nisu dostupni.');
  }
}

self.addEventListener('install', event => {
  event.waitUntil((async()=>{
    const cache = await caches.open(CACHE_NAME);
    const freshAssets = ASSETS.map(asset=>new Request(asset,{cache:'reload'}));
    await cache.addAll(freshAssets);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async()=>{
    const keys = await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith('bss-')&&key!==CACHE_NAME).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  if(event.request.method!=='GET') return;
  const path = new URL(event.request.url).pathname;
  if(path.startsWith('/api/')){
    event.respondWith(fetch(new Request(event.request,{cache:'no-store'})));
    return;
  }
  if(event.request.mode==='navigate' || path.endsWith('/index.html')){
    event.respondWith(networkFirstDocument(event.request));
    return;
  }
  if(new URL(event.request.url).origin === self.location.origin){
    event.respondWith(networkFirstAsset(event.request));
  }
});
