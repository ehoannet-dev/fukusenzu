/* ===========================================================
   sw.js — オフラインでも開けるようにする（ホーム画面に追加したアプリ用）
   ・ページ（index.html / photo.html）は「まずネット、だめなら保存した版」
   ・css / js / 画像は「保存した版をすぐ出し、裏で新しい版を取りに行く」
   ・VERSION を上げると古い保存を捨てて、起動時に取り直す（公開するたびに上げる）
   ・別のサイト（GitHub の API など）への通信には触らない
   =========================================================== */
const VERSION = 'v20261005d';
const CACHE = 'fukusenzu-' + VERSION;
const SHELL = [
  './', './index.html', './photo.html', './manifest.webmanifest',
  './css/style.css',
  './js/problems.js', './js/problems/no06.js', './js/problems/no07.js', './js/problems/no08.js', './js/problems/no09.js',
  './js/problems/no10.js', './js/problems/no11.js', './js/problems/no12.js', './js/problems/no13.js',
  './js/engine.js', './js/render.js', './js/app.js', './js/pwa.js', './js/photo.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-512-maskable.png', './icons/apple-touch-icon.png',
  './reward.html', './models/lamp_black.glb'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.indexOf('fukusenzu-') === 0 && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // GitHub API などはそのまま通す

  // ページ本体：ネット優先。つながらなければ保存した版
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html'))));
    return;
  }

  // それ以外：保存した版を先に（?v= が同じものを優先、無ければ古い版）、裏で取り直す
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const exact = await c.match(req);
    const cached = exact || await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => null);
    if (cached) { e.waitUntil(net); return cached; }
    const res = await net;
    return res || Response.error();
  }));
});
