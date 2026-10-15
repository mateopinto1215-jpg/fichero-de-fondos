# Fichero de Fondos

Página personal que centraliza fondos comunes de inversión, protegida con contraseña:

- **Argentina**: datos oficiales de CAFCI y CNV, actualizados automáticamente cada día hábil.
- **Internacional**: buscador y accesos directos a MKTSignals (funds.mktsignals.org), con una lista propia de fondos guardados en el navegador. Para verlo con la apariencia del Fichero: marcador «Colores Fichero» (sin instalar nada, en cualquier dispositivo) o estilo de Stylus; ver `estilos/LEEME.md`.

## Contraseña

Los datos se publican **cifrados** (AES-GCM 256, clave derivada con PBKDF2-SHA256) con la contraseña guardada en el secreto `CLAVE_PAGINA` del repositorio (Settings → Secrets and variables → Actions). Sin ese secreto la actualización falla a propósito y no se publica nada sin cifrar. Para cambiar la contraseña, se edita el secreto y se corre el workflow a mano.

## Cómo funciona

1. **GitHub Actions** (`.github/workflows/actualizar.yml`) corre de lunes a viernes a las 15:15 y a las 21:15 (hora de Buenos Aires).
2. `scripts/argentinadatos.py` baja de [ArgentinaDatos](https://argentinadatos.com) (API pública y de código abierto) la información de todas las clases de FCI: cuotaparte, patrimonio, rendimientos, honorarios, calificación y cartera. ArgentinaDatos republica los datos de CAFCI/CNV con los mismos identificadores, así que cada clase enlaza a su ficha oficial en CAFCI.
3. Guarda el historial diario de cuotapartes en `data/vcp/`, genera los datos de la página y los cifra con la contraseña (`scripts/cifrar.py`).
4. Publica la carpeta `site/` en **GitHub Pages**.

Si una corrida trae datos incompletos, no se publica y la web sigue mostrando los del día anterior.

### Por qué no se consulta CAFCI directamente

El sitio de CAFCI responde «acceso denegado» (CloudFront 403) a los servidores de GitHub. `scripts/cafci.py` queda como conector alternativo: funciona desde una conexión con acceso (por ejemplo, una computadora personal) y genera exactamente el mismo archivo.

## Correr a mano

En la pestaña **Actions** → «Actualizar fondos y publicar» → **Run workflow**.

Localmente:

```bash
pip install -r requirements.txt
python scripts/argentinadatos.py
cd site && python -m http.server
```

## Archivos

| Ruta | Qué es |
|---|---|
| `scripts/argentinadatos.py` | Conector principal |
| `scripts/cafci.py` | Conector alternativo directo a CAFCI |
| `scripts/test_parser.py` | Prueba del lector de fichas de CAFCI |
| `site/index.html`, `site/app.js`, `site/app-ar.js`, `site/estilos.css` | La web (`app.js`: contraseña, pestañas e Internacional) |
| `site/marcador.js`, `estilos/armar_marcador.py` | Marcador «Colores Fichero» para MKTSignals (generado; ver `estilos/LEEME.md`) |
| `scripts/cifrar.py` | Cifra los datos con la contraseña |
| `data/vcp/AAAA-MM.csv` | Historial diario de cuotaparte y patrimonio por clase |
| `data/ultima-corrida.json` | Resumen de la última actualización |

Los datos son de carácter informativo y no constituyen una recomendación de inversión.
