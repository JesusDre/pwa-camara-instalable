# Tema 6.1 y 6.2 — Instalabilidad Nativa (manifest.json) y Acceso Ético a Cámara Frontal/Trasera

**Asignatura:** Desarrollo de Aplicaciones Web Progresivas (PWA)
**Repositorio sugerido:** `pwa-camara-instalable`

---

## 0. Restricciones Técnicas Obligatorias

- Código escrito **100% en JavaScript Vanilla** (sin frameworks ni librerías externas).
- **Prohibido** el uso de `async`/`await`. Toda la asincronía se resuelve con `.then()`, `.catch()` y `.finally()`.
- Despliegue obligatorio en **GitHub Pages (HTTPS)**.
- Revisión presencial directamente desde el **teléfono móvil** en la siguiente clase.

---

## 1. Contexto Arquitectónico y Ética de Permisos (UX Consciente)

Para que una app web se instale como app nativa en la pantalla de inicio, el navegador exige **tres requisitos simultáneos**:

1. Servirse bajo **HTTPS** (lo garantiza GitHub Pages).
2. Tener un **Service Worker activo** que controle el `scope` de la página.
3. Declarar un **`manifest.json` válido** con identidad, modo de visualización e iconos de alta resolución.

### Consentimiento consciente antes de pedir permisos

Un error grave de diseño es disparar el diálogo nativo (*"¿Permitir que este sitio use tu cámara?"*) apenas carga la página o con un botón ambiguo.

- **Riesgo irreversible:** si el usuario pulsa "Bloquear" por sorpresa o desconfianza, el navegador guarda esa decisión a nivel de sistema operativo. JavaScript **no puede volver a mostrar** ese diálogo; la cámara falla silenciosamente y el usuario debe entrar manualmente a la configuración del navegador para desbloquearla.
- **Patrón de Pre-Permiso (UX Ética):** antes de invocar `getUserMedia`, la interfaz muestra un aviso explicando para qué se usará la cámara, qué lente se encenderá, y que el video es local al dispositivo. Solo al confirmar conscientemente se dispara la solicitud nativa.

---

## 2. Mapa de Archivos del Proyecto

```
pwa-camara-instalable/
├── index.html
├── styles.css
├── app.js
├── manifest.json
├── sw.js
└── icons/
    ├── icon-192.png   (192x192 exacto)
    └── icon-512.png   (512x512 exacto)
```

> **Nota sobre iconos:** Chrome/Android rechazan la instalación si no existen físicamente ambos PNG con las dimensiones exactas declaradas en el manifiesto.

---

## 3. Fase 1 — Configuración de Instalabilidad

### 3.1 `manifest.json` (rutas relativas `./` para GitHub Pages)

```json
{
  "name": "PWA Cámara Instalable",
  "short_name": "CámaraPWA",
  "start_url": "./index.html",
  "scope": "./",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#0f172a",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "./icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "./icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### 3.2 Vínculos obligatorios en `<head>` de `index.html`

```html
<link rel="manifest" href="./manifest.json">
<meta name="theme-color" content="#0f172a">

<!-- Soporte iOS: Safari ignora manifest.json para el icono de inicio -->
<link rel="apple-touch-icon" href="./icons/icon-192.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

### 3.3 Captura del evento `beforeinstallprompt` (`app.js`)

```javascript
var eventoInstalacionDiferido = null;
var btnInstalar = document.getElementById('btn-instalar');

window.addEventListener('beforeinstallprompt', function (evento) {
  evento.preventDefault();
  eventoInstalacionDiferido = evento;
  btnInstalar.hidden = false;
});

btnInstalar.addEventListener('click', function () {
  if (!eventoInstalacionDiferido) {
    return;
  }

  eventoInstalacionDiferido.prompt();

  eventoInstalacionDiferido.userChoice
    .then(function (resultado) {
      if (resultado.outcome === 'accepted') {
        btnInstalar.hidden = true;
      }
      eventoInstalacionDiferido = null;
    });
});

window.addEventListener('appinstalled', function () {
  btnInstalar.hidden = true;
});
```

### 3.4 Registro del Service Worker

```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(function (registro) {
      console.log('Service Worker registrado con scope:', registro.scope);
    })
    .catch(function (error) {
      console.error('Error al registrar el Service Worker:', error);
    });
}
```

### 3.5 `sw.js` — Estrategia Cache First

```javascript
var NOMBRE_CACHE = 'pwa-camara-cache-v1';
var ARCHIVOS_PRECACHE = [
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function (evento) {
  evento.waitUntil(
    caches.open(NOMBRE_CACHE)
      .then(function (cache) {
        return cache.addAll(ARCHIVOS_PRECACHE);
      })
  );
});

self.addEventListener('activate', function (evento) {
  evento.waitUntil(
    caches.keys().then(function (nombres) {
      return Promise.all(
        nombres
          .filter(function (nombre) { return nombre !== NOMBRE_CACHE; })
          .map(function (nombre) { return caches.delete(nombre); })
      );
    })
  );
});

self.addEventListener('fetch', function (evento) {
  evento.respondWith(
    caches.match(evento.request)
      .then(function (respuestaCache) {
        return respuestaCache || fetch(evento.request);
      })
      .catch(function () {
        return caches.match('./index.html');
      })
  );
});
```

### 3.6 Detección manual de instalación en iOS

Safari **nunca** dispara `beforeinstallprompt`. Hay que detectar el dispositivo y mostrar instrucciones manuales:

```javascript
var esIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
var yaInstaladoIOS = window.navigator.standalone === true;

if (esIOS && !yaInstaladoIOS) {
  document.getElementById('aviso-ios').hidden = false;
  // Texto sugerido: "Para instalar: toca el botón Compartir
  // y luego 'Agregar a pantalla de inicio'."
}
```

---

## 4. Fase 2 — Flujo de Pre-Permiso y Control de Cámara

### 4.1 Liberar el hardware entre cambios de cámara

```javascript
var flujoActivo = null;

function detenerCamaraActiva() {
  if (flujoActivo) {
    flujoActivo.getTracks().forEach(function (pista) {
      pista.stop();
    });
    flujoActivo = null;
  }
}
```

### 4.2 Encender la cámara con `getUserMedia` y diagnóstico de errores

```javascript
var visorVideo = document.getElementById('visor-camara');
var modoCamaraActual = 'environment'; // 'environment' = trasera, 'user' = frontal
var elementoEstado = document.getElementById('estado-camara');

function iniciarCamara(modoCamara) {
  detenerCamaraActiva();

  var restricciones = {
    video: { facingMode: modoCamara },
    audio: false
  };

  elementoEstado.textContent = 'Solicitando acceso a la cámara...';

  navigator.mediaDevices.getUserMedia(restricciones)
    .then(function (flujo) {
      flujoActivo = flujo;
      visorVideo.srcObject = flujo;
      modoCamaraActual = modoCamara;
      elementoEstado.textContent = 'Cámara activa (' + modoCamara + ')';
    })
    .catch(function (error) {
      if (error.name === 'NotAllowedError') {
        elementoEstado.textContent = 'Permiso denegado. Debes habilitarlo manualmente en la configuración del navegador.';
      } else if (error.name === 'NotFoundError') {
        elementoEstado.textContent = 'Este dispositivo no tiene esa cámara disponible.';
      } else {
        elementoEstado.textContent = 'Error al iniciar la cámara: ' + error.message;
      }
    })
    .finally(function () {
      console.log('Intento de inicio de cámara finalizado.');
    });
}
```

### 4.3 Flujo de Pre-Permiso (desacoplar intención del acceso real)

```javascript
var avisoPermiso = document.getElementById('aviso-permiso');
var btnPedirCamara = document.getElementById('btn-pedir-camara');
var btnConfirmarPermiso = document.getElementById('btn-confirmar-permiso');

// 1er clic: solo muestra la tarjeta explicativa, NO toca el hardware.
btnPedirCamara.addEventListener('click', function () {
  avisoPermiso.hidden = false;
});

// 2do clic: consentimiento consciente -> ahora sí se invoca getUserMedia.
btnConfirmarPermiso.addEventListener('click', function () {
  avisoPermiso.hidden = true;
  iniciarCamara(modoCamaraActual);
});
```

---

## 5. Desafío de Ensamblado 2 — Estructura HTML y Alternancia de Lentes

Checklist de lo que debes construir en `index.html` / `app.js`:

- [ ] **Video compatible con móviles:**
  ```html
  <video id="visor-camara" autoplay playsinline muted></video>
  ```
  `playsinline` es indispensable para que iOS/Safari no abra el video en pantalla completa.

- [ ] **Tarjeta de Aviso Ético** (`#aviso-permiso`, oculta por defecto con `hidden`):
  ```html
  <div id="aviso-permiso" hidden>
    <p>Esta aplicación requiere acceso a tu cámara únicamente para mostrar
       una vista previa local en pantalla. Ninguna imagen se envía a
       servidores externos.</p>
    <button id="btn-confirmar-permiso">Permitir y continuar</button>
  </div>
  ```

- [ ] **Botón de cambio de cámara** (`#btn-alternar-camara`):
  ```javascript
  document.getElementById('btn-alternar-camara').addEventListener('click', function () {
    modoCamaraActual = (modoCamaraActual === 'environment') ? 'user' : 'environment';
    iniciarCamara(modoCamaraActual);
  });
  ```

- [ ] **Botón de apagado** (`#btn-apagar-camara`):
  ```javascript
  document.getElementById('btn-apagar-camara').addEventListener('click', function () {
    detenerCamaraActiva();
    visorVideo.srcObject = null;
    elementoEstado.textContent = 'Cámara apagada.';
  });
  ```

---

## 6. Despliegue en GitHub Pages y Verificación en Móvil

### 6.1 Auditoría en DevTools (escritorio)

1. Abre la URL HTTPS de GitHub Pages.
2. `F12` → pestaña **Application** → **Manifest**.
3. Confirma que no haya errores en los iconos ni advertencias de instalabilidad.

### 6.2 Instalación en el teléfono

1. Abre la URL en el móvil (Chrome en Android o Safari en iOS).
2. Pulsa **Instalar App** (Android) o **Compartir → Agregar a pantalla de inicio** (iOS).
3. Verifica que la app abra en ventana **standalone**, sin barra de direcciones.

### 6.3 Prueba de consentimiento y sensores

1. Pulsa el botón para preparar la cámara.
2. Verifica que aparezca el aviso explicativo **antes** del diálogo nativo.
3. Otorga el permiso y comprueba la alternancia entre cámara trasera y frontal.
4. Verifica que el botón de apagado libere correctamente el sensor.

---

## 7. ¡Notas Críticas para usuarios con iPhone! (iOS / WebKit)

Apple maneja reglas distintas a Android/Chrome. Ajustes **obligatorios** si vas a presentar en iPhone:

1. **No existe `beforeinstallprompt`:** Safari nunca lo dispara. Detecta iOS y `!window.navigator.standalone` para mostrar instrucciones manuales (ver sección 3.6).
2. **Icono de pantalla de inicio:** agrega en el `<head>`:
   ```html
   <link rel="apple-touch-icon" href="./icons/icon-192.png">
   ```
3. **Evitar pantalla completa automática en el video:** el `<video>` debe llevar siempre el atributo `playsinline` (y de preferencia `muted` + `autoplay`), de lo contrario iOS abre un reproductor nativo en pantalla completa en vez de la vista previa en línea.

---

## 8. Objetivos Técnicos de la Práctica (resumen)

| Objetivo | Detalle |
|---|---|
| Instalabilidad | `manifest.json` con identidad, colores, `display: standalone` e iconos físicos exactos (192x192 y 512x512), rutas relativas `./` |
| UX Ética (Pre-Permiso) | Aviso explicativo visible antes de llamar `getUserMedia`, evitando bloqueos irreversibles del permiso |
| Control de hardware | Encender cámara, alternar `environment`/`user`, liberar el sensor con `track.stop()` en cada cambio |

---

## 9. Estado actual de este proyecto

Esta carpeta (`pwa-camara-instalable` en el Escritorio) ya contiene el proyecto **completo y funcional**:

- ✅ `manifest.json`
- ✅ `index.html` (con video, tarjeta de pre-permiso, botones de cámara)
- ✅ `styles.css`
- ✅ `app.js` — **cada línea comentada en un lenguaje muy simple**, explicando qué hace y por qué, sin usar `async/await`
- ✅ `sw.js` — Service Worker con estrategia Cache First, también comentado paso a paso
- ✅ `icons/icon-192.png` y `icons/icon-512.png` (generados automáticamente, 192x192 y 512x512 exactos)

### Próximos pasos para ti

1. Abre la carpeta y revisa los comentarios de `app.js` y `sw.js` — están escritos como un cuento para que se entienda fácil.
2. (Opcional) Reemplaza los iconos generados por unos propios con tu diseño, manteniendo los mismos nombres y tamaños.
3. Inicializa un repositorio Git en esta carpeta y súbelo a GitHub como `pwa-camara-instalable`.
4. Activa GitHub Pages (rama `main`, carpeta raíz).
5. Prueba instalación y cámara desde un teléfono real antes de la clase, siguiendo la sección 6 de esta guía.
