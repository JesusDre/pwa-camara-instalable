/*
  ========================================================================
  SW.JS - El "robotito ayudante" (Service Worker)
  ========================================================================

  Imagina este archivo como un robotito invisible que vive escondido
  detras de nuestra app. Su trabajo es guardar copias de nuestros
  archivos en una "mochila magica" (el Cache) para que la app pueda
  abrirse incluso si no hay internet.

  Este robotito tiene 3 momentos importantes en su vida, como si fueran
  3 capitulos de un cuento:

  1) "install"  -> Cuando nace por primera vez: guarda copias en su mochila.
  2) "activate" -> Cuando empieza a trabajar de verdad: limpia mochilas viejas.
  3) "fetch"    -> Cada vez que la app pide un archivo: el decide de donde
                   lo saca (de su mochila o de internet).
*/

// Le pusimos un nombre a nuestra "mochila magica" (cache).
// Si algun dia cambiamos los archivos, subimos el numero de version
// para que el robotito haga una mochila nueva.
var NOMBRE_CACHE = 'pwa-camara-cache-v1';

// Esta es la LISTA de archivos que el robotito debe guardar en su
// mochila para que la app funcione sin internet.
var ARCHIVOS_PARA_GUARDAR = [
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];


/* ======================================================================
   CAPITULO 1: "install" - El robotito nace y llena su mochila
   ====================================================================== */
self.addEventListener('install', function (evento) {
  /*
    waitUntil() le dice al navegador: "espera a que el robotito
    termine de guardar todo antes de decir que ya esta listo".
  */
  evento.waitUntil(
    // Abrimos (o creamos) la mochila con el nombre que elegimos.
    caches.open(NOMBRE_CACHE)
      .then(function (mochila) {
        // Metemos en la mochila TODOS los archivos de nuestra lista.
        return mochila.addAll(ARCHIVOS_PARA_GUARDAR);
      })
  );
});


/* ======================================================================
   CAPITULO 2: "activate" - El robotito empieza a trabajar
   ======================================================================
   Aqui el robotito revisa si tiene mochilas VIEJAS de versiones
   anteriores, y si las encuentra, las bota a la basura para no llenar
   el telefono de cosas que ya no se usan.
*/
self.addEventListener('activate', function (evento) {
  evento.waitUntil(
    // Pedimos la lista de TODAS las mochilas que existen.
    caches.keys().then(function (nombresDeMochilas) {
      // Por cada mochila que encontremos...
      return Promise.all(
        nombresDeMochilas
          // Nos quedamos solo con las que NO son nuestra mochila actual.
          .filter(function (nombre) {
            return nombre !== NOMBRE_CACHE;
          })
          // Y las borramos una por una.
          .map(function (nombre) {
            return caches.delete(nombre);
          })
      );
    })
  );
});


/* ======================================================================
   CAPITULO 3: "fetch" - Cada vez que la app pide algo
   ======================================================================
   Esta es la estrategia "Cache First" (primero la mochila):

   1) El robotito revisa si YA tiene ese archivo guardado en su mochila.
   2) Si lo tiene, se lo da rapidito (sin usar internet).
   3) Si NO lo tiene, entonces si va a buscarlo a internet.
   4) Si tampoco hay internet y pedian la pagina principal, le mostramos
      igual el "index.html" guardado para que la app no se vea rota.
*/
self.addEventListener('fetch', function (evento) {
  evento.respondWith(
    // Buscamos en la mochila si ya tenemos ese archivo guardado.
    caches.match(evento.request)
      .then(function (archivoGuardado) {
        if (archivoGuardado) {
          // Si lo encontramos en la mochila, lo entregamos de inmediato.
          return archivoGuardado;
        }
        // Si no estaba en la mochila, lo pedimos a internet como siempre.
        return fetch(evento.request);
      })
      .catch(function () {
        // Si algo sale mal (por ejemplo, no hay internet y tampoco
        // estaba guardado), mostramos la pagina principal como ultimo
        // recurso para que la app no se quede en blanco.
        return caches.match('./index.html');
      })
  );
});
