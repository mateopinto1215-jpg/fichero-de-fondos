"""Resumen de la sección Internacional: lee de la portada pública de MKTSignals las cifras que
publica (fondos, ETFs, clases, gestoras y fecha de los datos) y las agrega a los datos de la página.

Solo se lee la portada (permitida por su robots.txt), una vez por corrida. Si falla, se usan las
últimas cifras guardadas en data/internacional.json; nunca hace fallar la actualización.
"""
import json
import re
import sys
from datetime import datetime
from pathlib import Path

import requests

URL = "https://funds.mktsignals.org/"
UA = "FicheroDeFondos/1.0 (+https://github.com/mateopinto1215-jpg/fichero-de-fondos)"
ROOT = Path(__file__).resolve().parent.parent
DATOS = ROOT / "site" / "data" / "fondos-ar.json"
ULTIMO = ROOT / "data" / "internacional.json"


def entero(s: str) -> int:
    return int(s.replace(".", ""))


def leer_portada() -> dict:
    html = requests.get(URL, timeout=40, headers={"User-Agent": UA, "Accept-Language": "es"}).text
    texto = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", re.sub(r"<script[\s\S]*?</script>", " ", html.replace("<!-- -->", ""))))
    m = re.search(r"Fondos\s+([\d.]+)\s+ETFs\s+([\d.]+)\s+Clases\s*\(ISIN\)\s+([\d.]+)\s+Gestoras\s+([\d.]+)", texto)
    f = re.search(r"hasta\s+(\d{2})/(\d{2})/(\d{4})", texto)
    if not m:
        raise ValueError("no se encontraron las cifras en la portada")
    return {
        "fondos": entero(m.group(1)), "etfs": entero(m.group(2)), "clases": entero(m.group(3)), "gestoras": entero(m.group(4)),
        "datos_al": f"{f.group(3)}-{f.group(2)}-{f.group(1)}" if f else None,
        "consultado": datetime.now().astimezone().isoformat(timespec="minutes"),
        "fuente": URL,
    }


def main() -> int:
    try:
        res = leer_portada()
        ULTIMO.parent.mkdir(parents=True, exist_ok=True)
        ULTIMO.write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"::notice title=MKTSignals::{res['fondos']} fondos, {res['clases']} clases, {res['gestoras']} gestoras, datos al {res['datos_al']}")
    except Exception as e:  # noqa: BLE001
        res = json.loads(ULTIMO.read_text(encoding="utf-8")) if ULTIMO.exists() else None
        print(f"::warning title=MKTSignals::No se pudo leer la portada ({str(e)[:150]}); se usan las últimas cifras guardadas.")
    if res and DATOS.exists():
        datos = json.loads(DATOS.read_text(encoding="utf-8"))
        datos["internacional"] = res
        DATOS.write_text(json.dumps(datos, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
