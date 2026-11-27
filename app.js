// app.js - Instalación de la PWA y control de la cámara

// ---------- 1. Instalación (Fragmento B) ----------
let eventoInstalacionDiferido = null;
const btnInstalar = document.getElementById('btn-instalar');

// Chrome avisa que la app se puede instalar
window.addEventListener('beforeinstallprompt', function (event) {
  event.preventDefault(); // no mostrar el banner automático
  eventoInstalacionDiferido = event;
  btnInstalar.hidden = false;
});

btnInstalar.addEventListener('click', function () {
  if (!eventoInstalacionDiferido) return;

  eventoInstalacionDiferido.prompt(); // abre la ventana real de instalar

  eventoInstalacionDiferido.userChoice.then(function (resultado) {
    if (resultado.outcome === 'accepted') {
      btnInstalar.hidden = true;
    }
    eventoInstalacionDiferido = null; // el evento solo se puede usar una vez
  });
});

// ---------- 2. iPhone: instrucciones manuales ----------
function verificarEntornoIOS() {
  const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const estaInstalada = window.navigator.standalone === true ||
                        window.matchMedia('(display-mode: standalone)').matches;

  if (esIOS && !estaInstalada) {
    document.getElementById('instrucciones-ios').hidden = false;
  }
}

verificarEntornoIOS();

// ---------- 3. Service Worker ----------
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(function (registro) {
      console.log('Service Worker registrado. Scope:', registro.scope);
    })
    .catch(function (error) {
      console.log('Error al registrar el Service Worker:', error);
    });
}

// ---------- 4. Cámara ----------
const visorVideo = document.getElementById('visor-camara');
const estadoCamara = document.getElementById('estado-camara');
const avisoPermiso = document.getElementById('aviso-permiso');

let streamActual = null;
let modoCamaraActual = 'environment'; // 'environment' = trasera | 'user' = frontal

function actualizarMensajeEstado(texto) {
  estadoCamara.textContent = texto;
}

// Fragmento C: apagar el sensor antes de pedir otra cámara
function detenerCamaraActiva() {
  if (streamActual) {
    streamActual.getTracks().forEach(function (track) {
      track.stop();
    });
    streamActual = null;
  }
}

// Fragmento D: encender la cámara
function iniciarCamara(modo) {
  detenerCamaraActiva();

  const restricciones = {
    video: { facingMode: modo },
    audio: false
  };

  return navigator.mediaDevices.getUserMedia(restricciones)
    .then(function (stream) {
      streamActual = stream;
      visorVideo.srcObject = stream;

      if (modo === 'environment') {
        actualizarMensajeEstado('Cámara activa (Trasera)');
      } else {
        actualizarMensajeEstado('Cámara activa (Frontal)');
      }
    })
    .catch(function (error) {
      if (error.name === 'NotAllowedError') {
        actualizarMensajeEstado('Permiso denegado. Habilita el acceso a la cámara en los ajustes de tu navegador.');
      } else if (error.name === 'NotFoundError') {
        actualizarMensajeEstado('No se detectó el sensor de cámara solicitado en este dispositivo.');
      } else {
        actualizarMensajeEstado('Error al acceder al hardware: ' + error.message);
      }
    })
    .finally(function () {
      console.log('Terminó el intento de encender la cámara.');
    });
}

// Fragmento E: pre-permiso en dos pasos
// Paso 1: solo mostramos el aviso (todavía no se pide la cámara)
document.getElementById('btn-preparar-camara').addEventListener('click', function () {
  avisoPermiso.hidden = false;
});

// Paso 2: el usuario leyó el aviso y confirma
document.getElementById('btn-confirmar-permiso').addEventListener('click', function () {
  avisoPermiso.hidden = true;
  iniciarCamara(modoCamaraActual);
});

// Cambiar entre trasera y frontal
document.getElementById('btn-alternar-camara').addEventListener('click', function () {
  // Si la cámara está apagada, no pedimos permiso sin pasar por el aviso
  if (!streamActual) {
    actualizarMensajeEstado('Primero pulsa "Solicitar Acceso a Cámara".');
    return;
  }

  if (modoCamaraActual === 'environment') {
    modoCamaraActual = 'user';
  } else {
    modoCamaraActual = 'environment';
  }

  iniciarCamara(modoCamaraActual);
});

// Apagar la cámara
document.getElementById('btn-apagar-camara').addEventListener('click', function () {
  detenerCamaraActiva();
  visorVideo.srcObject = null;
  actualizarMensajeEstado('La cámara está apagada.');
});
