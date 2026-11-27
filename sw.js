// sw.js - Service Worker básico con estrategia Cache First

const CACHE_NAME = 'pwa-camara-v2';

const ARCHIVOS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// install: guardar los archivos en caché
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ARCHIVOS);
    })
  );
});

// activate: borrar cachés de versiones anteriores
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (nombres) {
      const borrados = nombres
        .filter(function (nombre) {
          return nombre !== CACHE_NAME;
        })
        .map(function (nombre) {
          return caches.delete(nombre);
        });
      return Promise.all(borrados);
    })
  );
});

// fetch: primero buscar en caché; si no está, ir a internet
self.addEventListener('fetch', function (event) {
  event.respondWith(
    caches.match(event.request).then(function (enCache) {
      return enCache || fetch(event.request);
    })
  );
});
