/* Café da Corte — service worker (offline-first).
   O jogo é single-file (CSS/JS inline), então cachear index.html cacheia quase tudo.
   Fontes do Google são cacheadas em runtime; se nunca carregaram, o fallback (Georgia/system) cobre. */
const CACHE = 'cafe-da-corte-v1';
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

  // Navegação: sempre serve o shell do cache (offline-first), rede como reforço.
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const cached = await caches.match('./index.html');
      if (cached) {
        fetch(req).then(r => r && r.ok && caches.open(CACHE).then(c => c.put('./index.html', r.clone()))).catch(() => {});
        return cached;
      }
      try { return await fetch(req); } catch { return caches.match('./index.html'); }
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
