"""Arma el marcador (bookmarklet) «Colores Fichero» a partir de mktsignals-fichero.src.css.

El marcador sirve en cualquier navegador, sin extensiones: estando en funds.mktsignals.org se toca y
la página toma los colores del Fichero; se toca de nuevo y vuelve a sus colores originales.
Lleva el mismo estilo que el de Stylus pero sin las fuentes embebidas (para que el marcador sea
corto): usa IBM Plex Sans / Source Serif 4 si están instaladas y, si no, las del sistema.

Uso: python estilos/armar_marcador.py
Genera:
  site/marcador.js                   la página del Fichero lo usa para el botón de instalación
  estilos/marcador-mktsignals.txt    el código para copiar y pegar como dirección de un marcador
"""
import json
import re
from pathlib import Path

AQUI = Path(__file__).parent
RAIZ = AQUI.parent

AVISO_OTRO_SITIO = ("Este marcador se usa estando en funds.mktsignals.org: "
                    "abrí ahí un fondo o el screener y tocalo de nuevo.")


def sin_envoltorio(css: str) -> str:
    """Quita el encabezado ==UserStyle== y el envoltorio @-moz-document domain(...) { ... } propios de Stylus."""
    css = re.sub(r"/\* ==UserStyle==.*?==/UserStyle== \*/", "", css, flags=re.S)
    inicio = css.index("@-moz-document")
    return css[css.index("{", inicio) + 1: css.rindex("}")]


def css_para_marcador() -> str:
    src = sin_envoltorio((AQUI / "mktsignals-fichero.src.css").read_text(encoding="utf-8"))
    src = src.replace("__FONTS__", "")
    # Sin fuentes embebidas: se quitan sus nombres y quedan las alternativas.
    src = src.replace('"Fx Source Serif 4",', "").replace('"Fx IBM Plex Sans",', "")
    return minificar(src)


def minificar(css: str) -> str:
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    css = re.sub(r"\s+", " ", css)
    css = re.sub(r"\s*([{};,>])\s*", r"\1", css)
    css = re.sub(r":\s+", ":", css)
    css = css.replace(";}", "}").strip()
    # Variables más cortas: --fx-surface-2 -> --f7, etc.
    nombres = sorted(set(re.findall(r"--fx-[a-z0-9-]+", css)), key=lambda n: (-len(n), n))
    for i, n in enumerate(nombres):
        css = re.sub(re.escape(n) + r"(?![a-z0-9-])", f"--f{i:x}", css)
    return css


def codigo_js(css: str) -> str:
    return (
        "(function(){var d=document,w=window,I='fichero-estilo';"
        "if(!/(^|\\.)mktsignals\\.org$/.test(location.hostname)){alert(" + json.dumps(AVISO_OTRO_SITIO, ensure_ascii=False) + ");return}"
        "var o=d.getElementById(I);"
        "if(o){if(w.__fichero)w.__fichero.disconnect();w.__fichero=null;o.remove();return}"
        "var s=d.createElement('style');s.id=I;s.textContent=" + json.dumps(css, ensure_ascii=False) + ";"
        # La página es una aplicación de una sola página: si al navegar se pierde el estilo, se vuelve a poner.
        "var m=function(){if(!d.getElementById(I))(d.head||d.documentElement).appendChild(s)};"
        "m();w.__fichero=new MutationObserver(m);w.__fichero.observe(d.documentElement,{childList:true,subtree:true})})()"
    )


def como_url(js: str) -> str:
    # El navegador decodifica los %XX antes de ejecutar el marcador: se codifican los caracteres que
    # podrían cambiar al pegar la dirección (espacios, %, #, comillas, llaves y similares).
    seguros = set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.!~*'();/?:@&=+$,")
    out = []
    for ch in js:
        if ch in seguros:
            out.append(ch)
        else:
            out.append("".join(f"%{b:02X}" for b in ch.encode("utf-8")))
    return "javascript:" + "".join(out)


def main() -> None:
    css = css_para_marcador()
    url = como_url(codigo_js(css))
    (RAIZ / "site" / "marcador.js").write_text(
        "// Generado por estilos/armar_marcador.py: no editar a mano.\n"
        "window.MARCADOR_FICHERO = " + json.dumps(url) + ";\n", encoding="utf-8")
    (AQUI / "marcador-mktsignals.txt").write_text(url + "\n", encoding="utf-8")
    print(f"OK: CSS {len(css)/1024:.1f} KB, marcador {len(url)/1024:.1f} KB")


if __name__ == "__main__":
    main()
