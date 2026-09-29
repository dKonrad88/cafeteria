/* Café da Corte — service worker.
   HTML: NETWORK-FIRST (online sempre pega a versão nova; offline cai pro cache) — evita servir
   uma build velha depois de um deploy. O jogo é single-file (CSS/JS inline), então o index.html
   cacheado cobre quase tudo offline. Fontes do Google são cacheadas em runtime (fallback Georgia/system). */
const CACHE = 'cafe-da-corte-v3';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // addAll falha tudo se um item faltar; add um a um pra ser tolerante
    await Promise.all(CORE.map(u => c.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Navegação: NETWORK-FIRST. Tenta a rede (build nova), atualiza o cache, e só cai pro cache offline.
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) { caches.open(CACHE).then(c => c.put('./index.html', fresh.clone())); return fresh; }
        throw 0;
      } catch {
        return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }

  // Demais (fontes, ícones, etc.): cache-first, cai pra rede e cacheia o que der certo.
  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) {
        const c = await caches.open(CACHE); c.put(req, res.clone());
      }
      return res;
    } catch {
      return cached || Response.error();
    }
  })());
});
