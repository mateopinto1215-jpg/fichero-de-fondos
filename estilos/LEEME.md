# Estilo personal para MKTSignals

`mktsignals-fichero.user.css` es un estilo de usuario para la extensión **Stylus**. Muestra funds.mktsignals.org con la tipografía y los colores del Fichero de Fondos, en modo claro y oscuro (sigue la configuración del sistema).

Solo cambia cómo se ve el sitio en tu navegador. No modifica el sitio ni copia sus datos.

## Instalar

1. Instalar Stylus: https://chromewebstore.google.com/detail/stylus/clngdbkpkpeebahjckkjfobafhncgmne
2. Abrir https://raw.githubusercontent.com/mateopinto1215-jpg/fichero-de-fondos/main/estilos/mktsignals-fichero.user.css
3. Stylus muestra la vista previa: tocar **Instalar estilo**.

Las actualizaciones se reciben desde la misma URL (Stylus → Buscar actualizaciones).

## Editar

Se modifica `mktsignals-fichero.src.css` y se regenera el archivo final, que trae las fuentes embebidas (el sitio no permite cargar fuentes externas):

```bash
npm pack @fontsource/ibm-plex-sans@5.1.1 @fontsource/source-serif-4@5.1.1   # en una carpeta aparte, descomprimir
python estilos/armar_userstyle.py <carpeta con los paquetes>
```

Fuentes: IBM Plex Sans y Source Serif 4, licencia SIL Open Font License 1.1.
