/* RentBook Pro — Service Worker v6 */
const CACHE = 'rentbook-v6';
const FONTS_CACHE = 'rentbook-fonts-v1';
const APP_SHELL = ['/RentBook-Pro/', '/RentBook-Pro/index.html', '/RentBook-Pro/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE && k !== FONTS_CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  if(url.includes('accounts.google.com') || url.includes('googleapis.com') || url.includes('googleusercontent.com')) return;

  if(url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')){
    e.respondWith(caches.open(FONTS_CACHE).then(c => c.match(e.request).then(cached => {
      if(cached) return cached;
      return fetch(e.request).then(r => { c.put(e.request, r.clone()); return r; }).catch(() => cached);
    })));
    return;
  }

  // index.html — NETWORK FIRST so new versions always load
  if(e.request.mode === 'navigate' || url.endsWith('index.html') || url.endsWith('/RentBook-Pro/')){
    e.respondWith(
      fetch(e.request).then(r => {
        if(r && r.status === 200){ const copy=r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
        return r;
      }).catch(() => caches.match('/RentBook-Pro/index.html'))
    );
    return;
  }

  // Other assets — cache first
  e.respondWith(caches.match(e.request).then(cached => {
    if(cached) return cached;
    return fetch(e.request).then(r => {
      if(e.request.method==='GET' && r.status===200){ const copy=r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return r;
    }).catch(() => e.request.mode==='navigate' ? caches.match('/RentBook-Pro/index.html') : null);
  }));
});
