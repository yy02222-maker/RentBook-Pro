/* ════════════════════════════════════════════
   RentBook Pro — Service Worker v1.0
   Offline-first caching strategy
   ════════════════════════════════════════════ */

const CACHE = 'rentbook-v1';
const FONTS_CACHE = 'rentbook-fonts-v1';

// Core app shell — these are cached on install
const APP_SHELL = [
  '/RentBook-Pro/',
  '/RentBook-Pro/index.html',
  '/RentBook-Pro/manifest.json',
];

// ── Install: cache app shell ──
self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(cache){
      return cache.addAll(APP_SHELL);
    }).then(function(){
      return self.skipWaiting();
    })
  );
});

// ── Activate: clean up old caches ──
self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE && k !== FONTS_CACHE; })
            .map(function(k){ return caches.delete(k); })
      );
    }).then(function(){
      return self.clients.claim();
    })
  );
});

// ── Fetch: serve from cache, fall back to network ──
self.addEventListener('fetch', function(e){
  const url = e.request.url;

  // Never intercept Google OAuth / API calls — always go to network
  if(url.includes('accounts.google.com') ||
     url.includes('googleapis.com') ||
     url.includes('googleusercontent.com') ||
     url.includes('fonts.googleapis.com')){
    // For Google Fonts — cache after first fetch
    if(url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')){
      e.respondWith(
        caches.open(FONTS_CACHE).then(function(cache){
          return cache.match(e.request).then(function(cached){
            if(cached) return cached;
            return fetch(e.request).then(function(resp){
              cache.put(e.request, resp.clone());
              return resp;
            }).catch(function(){ return cached; });
          });
        })
      );
    }
    // All other Google API calls — network only
    return;
  }

  // App shell — cache first, network fallback
  e.respondWith(
    caches.match(e.request).then(function(cached){
      if(cached) return cached;
      return fetch(e.request).then(function(resp){
        // Cache successful GET responses for app assets
        if(e.request.method === 'GET' && resp.status === 200){
          const copy = resp.clone();
          caches.open(CACHE).then(function(cache){ cache.put(e.request, copy); });
        }
        return resp;
      }).catch(function(){
        // Offline fallback — serve index.html for navigation requests
        if(e.request.mode === 'navigate'){
          return caches.match('/RentBook-Pro/index.html');
        }
      });
    })
  );
});
