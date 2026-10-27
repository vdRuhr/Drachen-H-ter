// Service Worker: macht das Spiel offline spielbar.
// Strategie "erst Netz, dann Speicher": online immer die neueste Version, offline die gespeicherte.
const CACHE = 'drachenhueter-v1';
const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'js/main.js',
  'js/util.js',
  'js/data.js',
  'js/audio.js',
  'js/input.js',
  'js/save.js',
  'js/story.js',
  'js/gfx/pixel.js',
  'js/gfx/sprites.js',
  'js/gfx/props.js',
  'js/gfx/tiles.js',
  'js/world/maps.js',
  'js/world/world.js',
  'js/entities/effects.js',
  'js/entities/enemies.js',
  'js/entities/funki.js',
  'js/entities/npc.js',
  'js/entities/player.js',
  'js/learn/questions.js',
  'js/learn/tutor.js',
  'js/ui/ui.js',
  'js/ui/quiz.js',
  'js/ui/ring.js',
  'js/ui/screens.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('index.html')))
  );
});
