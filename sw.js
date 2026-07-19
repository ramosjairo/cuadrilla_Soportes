const CACHE_NAME = 'cuadrilla-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icono-192.png',
  './icono-512.png'
];

// 1. Instalar el Service Worker y almacenar los archivos esenciales en la caché local
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Guardando archivos en caché local para uso offline...');
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activar el Service Worker y limpiar cachés antiguas si las hubiera
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Eliminando caché antigua:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Interceptar las peticiones: Estrategia Cache First (Priorizar Caché sobre Internet)
// Si el archivo está en el teléfono, lo carga al instante sin usar datos ni internet.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse; // Devuelve el archivo local inmediatamente
      }
      
      // Si no está en caché (por ejemplo, una petición externa), intenta buscarlo en la red
      return fetch(event.request).catch(() => {
        // Fallback en caso de error total fuera de línea
        console.log('El recurso solicitado no está disponible offline.');
      });
    })
  );
});