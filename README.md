# Fichero de Fondos

Web que centraliza, ordena y filtra fondos comunes de inversión. Esta versión incluye la sección **Argentina**, con datos oficiales de la Cámara Argentina de Fondos Comunes de Inversión (CAFCI), actualizados automáticamente cada día hábil.

## Cómo funciona

1. **GitHub Actions** (`.github/workflows/actualizar.yml`) corre de lunes a viernes a las 23:15 y repasa a las 09:15 (hora de Buenos Aires).
2. `scripts/cafci.py` baja el catálogo completo de CAFCI (`consulta-de-fondos.json`) y la ficha de cada clase (cuotaparte, patrimonio, rendimientos, honorarios, calificación y cartera).
3. Guarda el historial diario de cuotapartes en `data/vcp/` (permite calcular el rendimiento del día) y genera `site/data/fondos-ar.json`.
4. Publica la carpeta `site/` en **GitHub Pages**.

Si una corrida falla de forma masiva (por ejemplo, CAFCI caído), no se publican datos nuevos y la web sigue mostrando los del día anterior.

## Correr a mano

En la pestaña **Actions** → «Actualizar fondos y publicar» → **Run workflow**. El campo «limite» permite probar con pocas clases.

Localmente:

```bash
pip install -r requirements.txt
python scripts/test_parser.py
python scripts/cafci.py --limit 30
cd site && python -m http.server
```

## Archivos

| Ruta | Qué es |
|---|---|
| `scripts/cafci.py` | Conector a CAFCI |
| `scripts/test_parser.py` | Prueba del lector de fichas |
| `site/index.html`, `site/app-ar.js`, `site/estilos.css` | La web |
| `data/vcp/AAAA-MM.csv` | Historial diario de cuotaparte y patrimonio por clase |
| `data/ultima-corrida.json` | Resumen de la última actualización (cantidades y errores) |

Los datos son de carácter informativo y no constituyen una recomendación de inversión.
