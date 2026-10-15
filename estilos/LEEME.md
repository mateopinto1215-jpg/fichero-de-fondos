# Personalización de MKTSignals

## 1. Marcador «Colores Fichero» (cualquier dispositivo, sin instalar nada)

Un marcador (bookmarklet) que, tocado estando en funds.mktsignals.org, pinta la página con los colores del Fichero; tocado de nuevo, vuelve a los originales. Funciona en computadoras, iPhone/iPad (Safari) y Android (Chrome, desde la barra de direcciones). Se toca una vez por pestaña; dentro de la misma pestaña se mantiene al navegar.

La sección **Internacional** del Fichero tiene el recuadro «MKTSignals con los colores del Fichero» con el botón para arrastrar, el botón para copiar el código y los pasos por dispositivo.

Es el mismo estilo que el de Stylus, sin las fuentes embebidas (para que el marcador sea corto): usa IBM Plex Sans / Source Serif 4 si están instaladas y, si no, las del sistema.

- Código para pegar como dirección de un marcador: `marcador-mktsignals.txt`
- Se genera desde `mktsignals-fichero.src.css` con `python estilos/armar_marcador.py` (escribe también `site/marcador.js`, que usa la página).

## 2. Estilo del Fichero (Stylus)

`mktsignals-fichero.user.css` es un estilo de usuario para la extensión **Stylus**. Muestra funds.mktsignals.org con la tipografía y los colores del Fichero de Fondos, en modo claro y oscuro (sigue la configuración del sistema).

Solo cambia cómo se ve el sitio en tu navegador. No modifica el sitio ni copia sus datos.

### Instalar

1. Instalar Stylus: https://chromewebstore.google.com/detail/stylus/clngdbkpkpeebahjckkjfobafhncgmne
2. Abrir https://raw.githubusercontent.com/matepin/fichero-de-fondos/main/estilos/mktsignals-fichero.user.css
3. Stylus muestra la vista previa: tocar **Instalar estilo**.

Las actualizaciones se reciben desde la misma URL (Stylus → Buscar actualizaciones).

### Editar

Se modifica `mktsignals-fichero.src.css` y se regenera el archivo final, que trae las fuentes embebidas (el sitio no permite cargar fuentes externas). Después, regenerar también el marcador con `python estilos/armar_marcador.py`.

```bash
npm pack @fontsource/ibm-plex-sans@5.1.1 @fontsource/source-serif-4@5.1.1   # en una carpeta aparte, descomprimir
python estilos/armar_userstyle.py <carpeta con los paquetes>
```

Fuentes: IBM Plex Sans y Source Serif 4, licencia SIL Open Font License 1.1.

## 3. Botón «Volver al Fichero» (Tampermonkey)

`mktsignals-volver.user.js` agrega en funds.mktsignals.org un botón fijo abajo a la izquierda con dos enlaces: **Fichero · Argentina** e **Internacional**. Solo agrega esos enlaces; no lee ni cambia los datos del sitio.

### Instalar

1. Instalar Tampermonkey: https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo
2. En Chrome, abrir `chrome://extensions`, entrar a **Detalles** de Tampermonkey y activar **Permitir secuencias de comandos del usuario** (en algunas versiones: activar el **Modo de desarrollador** arriba a la derecha).
3. Abrir https://raw.githubusercontent.com/matepin/fichero-de-fondos/main/estilos/mktsignals-volver.user.js y tocar **Instalar**.
