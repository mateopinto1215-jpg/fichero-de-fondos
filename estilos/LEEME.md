# Personalización de MKTSignals

Todo se configura una vez por dispositivo desde el recuadro «MKTSignals con los colores del Fichero» de la sección **Internacional** (detecta si estás en computadora, iPhone/iPad o Android y muestra los pasos). Solo cambia cómo se ve el sitio en tu navegador: no modifica MKTSignals ni copia sus datos.

| Dispositivo | Automático (se configura una vez) | Sin instalar nada |
|---|---|---|
| Computadora (Chrome, Edge, Firefox) | Extensión Stylus + `mktsignals-fichero.user.css` | Marcador «Colores Fichero» |
| iPhone, iPad, Mac con Safari | App gratis **Userscripts** + `mktsignals-fichero.user.js` | Marcador «Colores Fichero» |
| Android | Firefox + Stylus + `mktsignals-fichero.user.css` | Marcador en Chrome (desde la barra de direcciones) |

## 1. Estilo automático

### Stylus (computadoras y Firefox para Android)

1. Instalar Stylus: Chrome/Edge https://chromewebstore.google.com/detail/stylus/clngdbkpkpeebahjckkjfobafhncgmne · Firefox https://addons.mozilla.org/es-ES/firefox/addon/styl-us/ · Firefox para Android https://addons.mozilla.org/es-ES/android/addon/styl-us/
2. Abrir https://raw.githubusercontent.com/matepin/fichero-de-fondos/main/estilos/mktsignals-fichero.user.css
3. Stylus muestra la vista previa: tocar **Instalar estilo**.

Con Chrome y la cuenta de Google, la extensión se instala sola en las otras computadoras; para que pase también el estilo, activar en las opciones de Stylus la sincronización en la nube. Las actualizaciones se reciben desde la misma URL.

### Userscripts (Safari en iPhone, iPad y Mac)

1. Instalar la app gratis Userscripts: https://apps.apple.com/app/id1463298887 y abrirla una vez (si pide una carpeta para los scripts, elegir cualquiera).
2. Activar la extensión: Ajustes › Apps › Safari › Extensiones › Userscripts (iOS 17: Ajustes › Safari › Extensiones) y en «Otros sitios web» elegir Permitir.
3. En Safari abrir https://raw.githubusercontent.com/matepin/fichero-de-fondos/main/estilos/mktsignals-fichero.user.js, tocar el botón de extensiones de la barra de direcciones › Userscripts › Instalar.

`mktsignals-fichero.user.js` también funciona con Tampermonkey o Violentmonkey. Se ejecuta al inicio de la página (sin parpadeo de los colores originales) y vuelve a poner el estilo si al navegar se pierde.

### Editar

Se modifica `mktsignals-fichero.src.css` y se regeneran el `.user.css` y el `.user.js`, que traen las fuentes embebidas (el sitio no permite cargar fuentes externas), y el marcador:

```bash
npm pack @fontsource/ibm-plex-sans@5.1.1 @fontsource/source-serif-4@5.1.1   # en una carpeta aparte, descomprimir
python estilos/armar_userstyle.py <carpeta con los paquetes>
python estilos/armar_marcador.py
```

Fuentes: IBM Plex Sans y Source Serif 4, licencia SIL Open Font License 1.1.

## 2. Marcador «Colores Fichero» (sin instalar nada)

Un marcador (bookmarklet) que, tocado estando en funds.mktsignals.org, pinta la página con los colores del Fichero; tocado de nuevo, vuelve a los originales. Funciona en computadoras, iPhone/iPad (Safari) y Android (Chrome, desde la barra de direcciones). Se toca una vez por pestaña; dentro de la misma pestaña se mantiene al navegar. No lleva las fuentes embebidas (para que sea corto): usa IBM Plex Sans / Source Serif 4 si están instaladas y, si no, las del sistema.

- Código para pegar como dirección de un marcador: `marcador-mktsignals.txt`
- Se genera con `python estilos/armar_marcador.py` (escribe también `site/marcador.js`, que usa la página).

## 3. Botón «Volver al Fichero» (Tampermonkey)

`mktsignals-volver.user.js` agrega en funds.mktsignals.org un botón fijo abajo a la izquierda con dos enlaces: **Fichero · Argentina** e **Internacional**. Solo agrega esos enlaces; no lee ni cambia los datos del sitio.

### Instalar

1. Instalar Tampermonkey: https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo
2. En Chrome, abrir `chrome://extensions`, entrar a **Detalles** de Tampermonkey y activar **Permitir secuencias de comandos del usuario** (en algunas versiones: activar el **Modo de desarrollador** arriba a la derecha).
3. Abrir https://raw.githubusercontent.com/matepin/fichero-de-fondos/main/estilos/mktsignals-volver.user.js y tocar **Instalar**.
