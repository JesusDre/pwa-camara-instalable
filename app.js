/*
  ========================================================================
  APP.JS - El "cerebro" de nuestra aplicacion
  ========================================================================

  Imagina que esta app es un robotito. Este archivo es el cerebro que le
  dice al robotito que hacer cuando tocamos los botones.

  REGLAS que debemos seguir en todo este archivo:
  1) Nada de "async/await" (esas palabras magicas estan prohibidas aqui).
  2) Cuando pedimos algo que tarda (como prender la camara), usamos
     .then()  -> "cuando termine bien, haz esto"
     .catch() -> "si algo sale mal, haz esto otro"
     .finally() -> "pase lo que pase, al final haz esto"

  Piensa en .then()/.catch() como pedirle un helado a alguien:
  - .then()    = "cuando me traigas el helado, me lo como"
  - .catch()   = "si no hay helado, no llores, solo dime 'no hay'"
  - .finally() = "de todas formas, cierra la puerta del refrigerador"
*/


/* ======================================================================
   PARTE 1: INSTALAR LA APP EN EL TELEFONO
   ====================================================================== */

/*
  Esta variable es como una "caja" donde guardamos el permiso especial
  que el navegador nos da para poder mostrar el boton de "Instalar".
  Al principio esta vacia (null) porque todavia no sabemos si se puede.
*/
var eventoInstalacionDiferido = null;

/* Buscamos el boton de instalar que esta escondido en el HTML */
var btnInstalar = document.getElementById('btn-instalar');

/*
  El navegador, cuando ve que nuestra app cumple los requisitos para
  instalarse (tiene manifest, tiene service worker, usa HTTPS...),
  lanza un evento llamado "beforeinstallprompt". Es como si el
  navegador dijera: "Oye, esta app SI se puede instalar, avisale".
*/
window.addEventListener('beforeinstallprompt', function (evento) {
  // Le decimos al navegador: "espera, yo quiero mostrar mi propio boton,
  // no el tuyo automatico". Por eso usamos preventDefault().
  evento.preventDefault();

  // Guardamos el evento en nuestra caja para usarlo despues, cuando
  // el usuario toque nuestro boton.
  eventoInstalacionDiferido = evento;

  // Mostramos el boton "Instalar esta App" (ya no esta escondido).
  btnInstalar.hidden = false;
});

/* Cuando el usuario toca nuestro boton de instalar... */
btnInstalar.addEventListener('click', function () {
  // Si por alguna razon no tenemos el permiso guardado, no hacemos nada.
  if (!eventoInstalacionDiferido) {
    return;
  }

  // Aqui le pedimos al navegador: "muestra ahora la ventanita real
  // de instalar, la que pregunta Si o No".
  eventoInstalacionDiferido.prompt();

  // userChoice es una "promesa": el navegador nos avisara que elegio
  // el usuario (instalar o no instalar). Usamos .then() para esperar
  // la respuesta sin usar async/await.
  eventoInstalacionDiferido.userChoice.then(function (resultado) {
    if (resultado.outcome === 'accepted') {
      // El usuario dijo que SI quiere instalar -> escondemos el boton.
      btnInstalar.hidden = true;
    }
    // Ya usamos el permiso, asi que vaciamos la caja otra vez.
    eventoInstalacionDiferido = null;
  });
});

/* Si la app ya quedo instalada, tambien escondemos el boton */
window.addEventListener('appinstalled', function () {
  btnInstalar.hidden = true;
});


/* ======================================================================
   PARTE 1.1: AYUDA ESPECIAL PARA IPHONE
   ======================================================================
   Los iPhone (con el navegador Safari) NUNCA avisan con
   "beforeinstallprompt". Por eso, si detectamos que el telefono es un
   iPhone y la app todavia no esta instalada, mostramos un cartel con
   instrucciones escritas a mano.
*/
var pareceSerIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
var yaEstaInstaladaEnIOS = window.navigator.standalone === true;

if (pareceSerIOS && !yaEstaInstaladaEnIOS) {
  document.getElementById('aviso-ios').hidden = false;
}


/* ======================================================================
   PARTE 2: EL ROBOT AYUDANTE (SERVICE WORKER)
   ======================================================================
   El "Service Worker" es como un robotito ayudante que vive detras de
   la pagina. El se encarga de guardar copias de nuestros archivos para
   que la app funcione aunque no haya internet.

   Para que el robotito empiece a trabajar, primero debemos "registrarlo".
*/
if ('serviceWorker' in navigator) {
  // Le pedimos al navegador: "por favor activa a mi robotito (sw.js)".
  navigator.serviceWorker.register('./sw.js')
    .then(function (registro) {
      // .then() = "cuando el robotito ya esta activo, avisame aqui"
      console.log('El robotito ayudante (Service Worker) ya esta listo. Scope:', registro.scope);
    })
    .catch(function (error) {
      // .catch() = "si algo salio mal activando al robotito, avisame aqui"
      console.log('Hubo un problema activando al Service Worker:', error);
    });
}


/* ======================================================================
   PARTE 3: LA CAMARA - PREPARAR TODO
   ======================================================================
*/

// Buscamos las piezas del HTML que vamos a necesitar.
var visorVideo = document.getElementById('visor-camara');
var elementoEstado = document.getElementById('estado-camara');
var avisoPermiso = document.getElementById('aviso-permiso');
var btnPedirCamara = document.getElementById('btn-pedir-camara');
var btnConfirmarPermiso = document.getElementById('btn-confirmar-permiso');
var btnAlternarCamara = document.getElementById('btn-alternar-camara');
var btnApagarCamara = document.getElementById('btn-apagar-camara');

/*
  Esta variable guarda el "flujo de video" que esta activo en este
  momento (si hay una camara prendida). Si no hay ninguna camara
  prendida, esta vacia (null).
*/
var flujoActivo = null;

/*
  Esta variable guarda que camara estamos usando ahora:
  'environment' = la camara de ATRAS (la trasera)
  'user'        = la camara de ADELANTE (la frontal, la de los "selfies")
*/
var modoCamaraActual = 'environment';


/* ----------------------------------------------------------------------
   FUNCION: Apagar y soltar la camara que este prendida
   ------------------------------------------------------------------- */
function detenerCamaraActiva() {
  // Si no hay ninguna camara prendida, no hay nada que apagar.
  if (!flujoActivo) {
    return;
  }

  /*
    Un "flujo de video" (stream) esta hecho de "pistas" (tracks).
    Imagina que cada pista es como un cablecito conectado al sensor
    de la camara. Para soltar la camara de verdad, hay que cortar
    TODOS esos cablecitos con .stop().

    Esto es MUY importante en telefonos: si no sueltas la camara
    trasera antes de pedir la frontal, el telefono se confunde y
    rechaza el permiso.
  */
  flujoActivo.getTracks().forEach(function (pista) {
    pista.stop();
  });

  // Vaciamos la caja porque ya no hay ninguna camara prendida.
  flujoActivo = null;
}


/* ----------------------------------------------------------------------
   FUNCION: Prender la camara (trasera o frontal)
   ------------------------------------------------------------------- */
function iniciarCamara(modoCamara) {
  // Primero, por seguridad, apagamos cualquier camara que ya estuviera
  // prendida antes de pedir una nueva.
  detenerCamaraActiva();

  // Esto es como una "lista de pedidos" que le damos al telefono:
  // "quiero video, con esta camara en especial, y nada de audio".
  var loQuePedimos = {
    video: { facingMode: modoCamara },
    audio: false
  };

  elementoEstado.textContent = 'Pidiendo permiso para usar la camara...';

  /*
    getUserMedia() es la funcion magica que PIDE la camara de verdad.
    Ella regresa una "promesa": una cajita que, despues de un tiempito,
    se llena con la camara (si todo salio bien) o con un error (si algo
    salio mal). Por eso usamos .then(), .catch() y .finally().
  */
  navigator.mediaDevices.getUserMedia(loQuePedimos)
    .then(function (flujoDeVideo) {
      // .then() = "la camara SI se prendio, aqui esta el video"
      flujoActivo = flujoDeVideo;

      // Conectamos ese video a la etiqueta <video> para que se vea
      // en la pantalla, como poner un espejo frente a la camara.
      visorVideo.srcObject = flujoDeVideo;

      // Guardamos cual camara quedo prendida (trasera o frontal).
      modoCamaraActual = modoCamara;

      var nombreCamara = (modoCamara === 'environment') ? 'trasera' : 'frontal';
      elementoEstado.textContent = 'Camara ' + nombreCamara + ' encendida.';
    })
    .catch(function (error) {
      // .catch() = "algo salio mal, vamos a explicar que fue"

      if (error.name === 'NotAllowedError') {
        // El usuario toco "Bloquear" en el permiso del telefono.
        elementoEstado.textContent =
          'No se pudo usar la camara porque el permiso fue bloqueado. ' +
          'Debes activarlo manualmente en la configuracion del navegador.';
      } else if (error.name === 'NotFoundError') {
        // El telefono no tiene esa camara (por ejemplo, no tiene frontal).
        elementoEstado.textContent =
          'Este dispositivo no tiene esa camara disponible.';
      } else {
        // Cualquier otro error raro que no esperabamos.
        elementoEstado.textContent =
          'Ocurrio un error al encender la camara: ' + error.message;
      }
    })
    .finally(function () {
      // .finally() = "esto se ejecuta siempre, haya salido bien o mal"
      console.log('Se termino de intentar encender la camara.');
    });
}


/* ----------------------------------------------------------------------
   PARTE 4: EL FLUJO DE "PRE-PERMISO" (preguntar antes de preguntar)
   ------------------------------------------------------------------- */

/*
  PRIMER CLIC: el usuario toca "Preparar la Camara".
  Aqui TODAVIA NO tocamos la camara de verdad. Solo mostramos la
  tarjeta amarilla que explica para que se va a usar la camara.
  Esto evita sustos: nadie bloquea un permiso si entiende para que es.
*/
btnPedirCamara.addEventListener('click', function () {
  avisoPermiso.hidden = false;
});

/*
  SEGUNDO CLIC: el usuario ya leyo el aviso y toca
  "Entiendo, usar mi camara". Recien AHORA llamamos a iniciarCamara(),
  que es la funcion que de verdad enciende el sensor.
*/
btnConfirmarPermiso.addEventListener('click', function () {
  avisoPermiso.hidden = true;
  iniciarCamara(modoCamaraActual);
});


/* ----------------------------------------------------------------------
   PARTE 5: CAMBIAR DE CAMARA (trasera <-> frontal)
   ------------------------------------------------------------------- */
btnAlternarCamara.addEventListener('click', function () {
  // Si estaba en la trasera, la cambiamos a frontal (y viceversa).
  if (modoCamaraActual === 'environment') {
    modoCamaraActual = 'user';
  } else {
    modoCamaraActual = 'environment';
  }

  // Encendemos de nuevo la camara, ahora con el otro lente.
  iniciarCamara(modoCamaraActual);
});


/* ----------------------------------------------------------------------
   PARTE 6: APAGAR LA CAMARA
   ------------------------------------------------------------------- */
btnApagarCamara.addEventListener('click', function () {
  // Soltamos el sensor de la camara (cortamos los "cablecitos").
  detenerCamaraActiva();

  // Quitamos el video de la pantalla.
  visorVideo.srcObject = null;

  // Avisamos al usuario que ya se apago.
  elementoEstado.textContent = 'La camara esta apagada.';
});
