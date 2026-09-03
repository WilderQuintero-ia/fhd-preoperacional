// Service Worker — FHD Preoperacional (Falabella Home Delivery)
// Permite que el formulario se pueda "instalar" como app en el celular y
// que la página cargue aunque el conductor tenga señal débil (los envíos
// de datos siempre necesitan internet real, pero la app en sí abre rápido).

var CACHE_NAME = 'fhd-preop-v2';
// El HTML NO se precachea a propósito — así el conductor siempre recibe
// la versión más reciente del formulario al abrirlo.
var ARCHIVOS_BASE = [
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ARCHIVOS_BASE).catch(function(){ /* si falla algún archivo, no bloquea la instalación */ });
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(nombres) {
      return Promise.all(
        nombres.filter(function(n){ return n !== CACHE_NAME; })
               .map(function(n){ return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

// Estrategia: red primero (para que siempre vea la versión más reciente si
// hay internet), y si falla, usa la copia guardada — así la app abre
// incluso con muy mala señal.
// IMPORTANTE: el HTML principal NUNCA se guarda en caché, para que cada
// actualización del formulario llegue de inmediato al conductor sin que
// tenga que borrar datos del navegador.
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;
  var esDocumento = event.request.mode === 'navigate' ||
                    event.request.destination === 'document' ||
                    event.request.url.indexOf('.html') > -1;
  if (esDocumento) {
    event.respondWith(
      fetch(event.request, {cache: 'no-store'})
        .catch(function(){ return caches.match(event.request); })
    );
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then(function(resp){
        var copia = resp.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, copia); });
        return resp;
      })
      .catch(function(){ return caches.match(event.request); })
  );
});
