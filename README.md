# Fichero de Fondos

Web que centraliza, ordena y filtra fondos comunes de inversión. Esta versión incluye la sección **Argentina**, con los datos oficiales de CAFCI y CNV, actualizados automáticamente cada día hábil.

## Cómo funciona

1. **GitHub Actions** (`.github/workflows/actualizar.yml`) corre de lunes a viernes a las 15:15 y a las 21:15 (hora de Buenos Aires).
2. `scripts/argentinadatos.py` baja de [ArgentinaDatos](https://argentinadatos.com) (API pública y de código abierto) la información de todas las clases de FCI: cuotaparte, patrimonio, rendimientos, honorarios, calificación y cartera. ArgentinaDatos republica los datos de CAFCI/CNV con los mismos identificadores, así que cada clase enlaza a su ficha oficial en CAFCI.
3. Guarda el historial diario de cuotapartes en `data/vcp/` y genera `site/data/fondos-ar.json`.
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
| `site/index.html`, `site/app-ar.js`, `site/estilos.css` | La web |
| `data/vcp/AAAA-MM.csv` | Historial diario de cuotaparte y patrimonio por clase |
| `data/ultima-corrida.json` | Resumen de la última actualización |

Los datos son de carácter informativo y no constituyen una recomendación de inversión.
