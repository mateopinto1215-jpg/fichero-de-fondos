"""Arma estilos/mktsignals-fichero.user.css: inserta las fuentes (woff2 en base64) en el estilo fuente.
Uso: python estilos/armar_userstyle.py <carpeta con los .woff2 de @fontsource>"""
import base64
import sys
from pathlib import Path

AQUI = Path(__file__).parent
FUENTES = [  # (familia, peso, archivo)
    ("Fx IBM Plex Sans", 400, "ibm-plex-sans-latin-400-normal.woff2"),
    ("Fx IBM Plex Sans", 500, "ibm-plex-sans-latin-500-normal.woff2"),
    ("Fx IBM Plex Sans", 600, "ibm-plex-sans-latin-600-normal.woff2"),
    ("Fx Source Serif 4", 500, "source-serif-4-latin-500-normal.woff2"),
    ("Fx Source Serif 4", 600, "source-serif-4-latin-600-normal.woff2"),
]
carpeta = Path(sys.argv[1])
bloques = []
for fam, peso, nombre in FUENTES:
    ruta = next(carpeta.rglob(nombre))
    b64 = base64.b64encode(ruta.read_bytes()).decode()
    bloques.append(f'@font-face{{font-family:"{fam}";font-style:normal;font-weight:{peso};font-display:swap;'
                   f'src:url(data:font/woff2;base64,{b64}) format("woff2")}}')
src = (AQUI / "mktsignals-fichero.src.css").read_text(encoding="utf-8")
out = src.replace("__FONTS__", "\n".join(bloques))
(AQUI / "mktsignals-fichero.user.css").write_text(out, encoding="utf-8")
print(f"OK: {len(out)//1024} KB")
