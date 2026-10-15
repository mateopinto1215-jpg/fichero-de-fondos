"""Arma los estilos automáticos del Fichero para MKTSignals, con las fuentes embebidas (woff2 en base64):

  estilos/mktsignals-fichero.user.css   para la extensión Stylus (computadoras y Firefox para Android)
  estilos/mktsignals-fichero.user.js    el mismo estilo como script: app Userscripts en Safari (iPhone, iPad, Mac),
                                        Tampermonkey o Violentmonkey

Uso: python estilos/armar_userstyle.py <carpeta con los .woff2 de @fontsource>
Después conviene regenerar también el marcador: python estilos/armar_marcador.py
"""
import base64
import json
import re
import sys
from pathlib import Path

from armar_marcador import minificar, sin_envoltorio

AQUI = Path(__file__).parent
REPO = "matepin/fichero-de-fondos"
RAW = f"https://raw.githubusercontent.com/{REPO}/main/estilos"
FUENTES = [  # (familia, peso, archivo)
    ("Fx IBM Plex Sans", 400, "ibm-plex-sans-latin-400-normal.woff2"),
    ("Fx IBM Plex Sans", 500, "ibm-plex-sans-latin-500-normal.woff2"),
    ("Fx IBM Plex Sans", 600, "ibm-plex-sans-latin-600-normal.woff2"),
    ("Fx Source Serif 4", 500, "source-serif-4-latin-500-normal.woff2"),
    ("Fx Source Serif 4", 600, "source-serif-4-latin-600-normal.woff2"),
]


def version(src: str) -> str:
    return re.search(r"@version\s+(\S+)", src).group(1)


def script(css: str, ver: str) -> str:
    return f"""// ==UserScript==
// @name         Fichero de Fondos — colores en MKTSignals
// @namespace    github.com/{REPO}
// @version      {ver}
// @description  Muestra funds.mktsignals.org con la tipografía y los colores del Fichero de Fondos (claro y oscuro), sin tocar nada. Solo cambia cómo lo ves en tu navegador; no lee ni copia datos del sitio.
// @author       Mateo
// @match        https://funds.mktsignals.org/*
// @run-at       document-start
// @inject-into  content
// @grant        none
// @noframes
// @updateURL    {RAW}/mktsignals-fichero.user.js
// @downloadURL  {RAW}/mktsignals-fichero.user.js
// ==/UserScript==
// Generado por estilos/armar_userstyle.py desde mktsignals-fichero.src.css: no editar a mano.
// Fuentes IBM Plex Sans y Source Serif 4 bajo SIL Open Font License 1.1.

(function () {{
  'use strict';
  var ID = 'fichero-estilo-auto';
  var s = document.createElement('style');
  s.id = ID;
  s.textContent = {json.dumps(css, ensure_ascii=False)};
  function poner() {{
    var p = document.head || document.documentElement;
    if (p && !document.getElementById(ID)) p.appendChild(s);
  }}
  poner();
  // Al terminar de cargar, se mueve al final del <head> para que quede por encima de los estilos del sitio.
  document.addEventListener('DOMContentLoaded', function () {{ if (document.head) document.head.appendChild(s); }});
  // Se observa el documento entero: cubre el caso en que el script corre antes de que exista <html> y,
  // como el sitio es una aplicación de una sola página, vuelve a poner el estilo si al navegar se pierde.
  new MutationObserver(poner).observe(document, {{ childList: true, subtree: true }});
}})();
"""


def main() -> None:
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
    js = script(minificar(sin_envoltorio(out)), version(src))
    (AQUI / "mktsignals-fichero.user.js").write_text(js, encoding="utf-8")
    print(f"OK: user.css {len(out)//1024} KB, user.js {len(js)//1024} KB")


if __name__ == "__main__":
    main()
