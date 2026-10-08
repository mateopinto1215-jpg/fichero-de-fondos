"""
Conector ArgentinaDatos -> datos del Fichero de Fondos (sección Argentina).

ArgentinaDatos (api.argentinadatos.com, API pública y de código abierto) republica en un solo
endpoint la información de los FCI que publican CAFCI / CNV: cuotaparte, patrimonio, rendimientos,
honorarios, calificaciones y composición de cartera de cada clase. Los ids de fondo y clase son
los mismos de CAFCI, así que cada clase enlaza a su ficha oficial en estadisticas.cafci.org.ar.

Salidas (mismo formato que scripts/cafci.py, la web no cambia):
  site/data/fondos-ar.json   una fila por clase
  data/vcp/AAAA-MM.csv       historial diario de cuotaparte y patrimonio
  data/ultima-corrida.json   resumen de la corrida
"""
from __future__ import annotations

import json
import re
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).parent))
from cafci import guardar_historial, dolar_oficial  # noqa: E402

API = "https://api.argentinadatos.com/v1/finanzas/fci/fondos"
CAFCI_FICHA = "https://estadisticas.cafci.org.ar/fondos/{fid}?clase={cid}"
ROOT = Path(__file__).resolve().parent.parent
OUT_JSON = ROOT / "site" / "data" / "fondos-ar.json"
RUN_JSON = ROOT / "data" / "ultima-corrida.json"
UA = "FicheroDeFondos/1.0 (+https://github.com/mateopinto1215-jpg/fichero-de-fondos)"

RENDS = [  # campo ArgentinaDatos, campo días, clave interna
    ("ultimos7Dias", "diasUltimos7Dias", "d7"),
    ("unMes", "diasUnMes", "m1"),
    ("noventaDias", "diasNoventaDias", "d90"),
    ("cientoOchentaDias", "diasCientoOchentaDias", "d180"),
    ("enElAnio", "diasEnElAnio", "ytd"),
    ("doceMeses", "diasDoceMeses", "m12"),
]


def bajar() -> dict:
    ultimo = None
    for i in range(4):
        try:
            r = requests.get(API, timeout=120, headers={"User-Agent": UA, "Accept": "application/json"})
            if r.status_code == 200:
                return r.json()
            ultimo = f"HTTP {r.status_code}: {r.text[:150]!r}"
        except requests.RequestException as e:
            ultimo = str(e)
        time.sleep(10 * (i + 1))
    raise RuntimeError(f"{API}: {ultimo}")


def f(x):
    try:
        return None if x is None else float(x)
    except (TypeError, ValueError):
        return None


def fila(c: dict) -> dict:
    fid, cid = c.get("fondoId"), c.get("claseId")
    nombre = (c.get("nombre") or "").strip()
    rend = c.get("rendimientos") or {}
    r, tna = {}, {}
    for campo, campo_dias, k in RENDS:
        v, dias = f(rend.get(campo)), f(rend.get(campo_dias))
        if v is None:
            continue
        r[k] = round(v, 4)
        if dias:
            tna[k] = round(v * 365 / dias, 4)
    if f(rend.get("variacionDiariaPct")) is not None:
        r["dia"] = round(f(rend["variacionDiariaPct"]), 4)
    h = c.get("honorarios") or {}
    hon = {
        "gerente": f(h.get("honorarioGerente")), "depositaria": f(h.get("honorarioDepositaria")),
        "gastos": f(h.get("gastosOrdinariosGestion")), "ingreso": f(h.get("comisionIngreso")),
        "rescate": f(h.get("comisionEgreso")), "transferencia": f(h.get("comisionTransferencia")),
        "exito": f(h.get("comisionExito")),
    }
    partes = [hon["gerente"], hon["depositaria"], hon["gastos"]]
    vcp_mil = f(rend.get("valorCuotaparte"))
    return {
        "fid": int(fid) if str(fid).isdigit() else fid,
        "cid": int(cid) if str(cid).isdigit() else cid,
        "n": nombre,
        "fondo": re.sub(r"\s*-\s*Clase\s+.+$", "", nombre),
        "g": c.get("administradora"), "dep": c.get("depositaria"),
        "t": c.get("tipoRenta"), "tm": None, "geo": c.get("region"), "dur": c.get("duracion"),
        "bm": c.get("benchmark"), "hz": c.get("horizonte"), "ccy": c.get("moneda"),
        "liq": c.get("plazoLiquidacionDias"), "obj": "", "cnv": c.get("codigoCNV"), "ini": None,
        "td": c.get("tipoDD"), "min": f(c.get("inversionMinima")), "bbg": None, "isin": None,
        "url": CAFCI_FICHA.format(fid=fid, cid=cid),
        "f": c.get("fecha"), "fr": c.get("fecha"),
        # CAFCI publica la cuotaparte "por mil"; la guardamos por unidad, como en su ficha
        "vcp": round(vcp_mil / 1000, 6) if vcp_mil is not None else None,
        "pat": f(c.get("patrimonio")),
        "tna": tna, "r": r, "hon": hon,
        "cost": round(sum(p for p in partes if p), 4) if any(p is not None for p in partes) else None,
        "calif": [[x.get("calificadora"), x.get("calificacion"), x.get("fecha")]
                  for x in (c.get("calificaciones") or []) if x.get("calificacion")],
        "cart": [[x.get("nombre"), round(f(x.get("porcentaje")) or 0, 2)]
                 for x in (c.get("composicionCartera") or []) if x.get("nombre")],
        "fc": None,
    }


def main() -> int:
    t0 = time.time()
    j = bajar()
    crudos = j.get("fondos") or []
    filas = [fila(c) for c in crudos if c.get("claseId")]
    con_datos = [x for x in filas if x["vcp"] is not None]
    print(f"ArgentinaDatos: {len(filas)} clases ({len(con_datos)} con cuotaparte), actualizado {j.get('fechaActualizacion')}")
    if len(con_datos) < 500:
        print(f"::error title=Conector ArgentinaDatos::Solo {len(con_datos)} clases con datos; no se actualiza la web.")
        return 1

    # Solo guardamos historial de clases con datos recientes (hay clases de fondos liquidados
    # cuyo último valor es de hace años).
    max_f = max(x["f"] for x in con_datos if x["f"])
    limite = (datetime.fromisoformat(max_f) - timedelta(days=10)).date().isoformat()
    recientes = [x for x in con_datos if x["f"] and x["f"] >= limite]
    nuevas = guardar_historial(recientes)
    filas.sort(key=lambda x: (x["n"] or "").lower())
    payload = {
        "generado": datetime.now().astimezone().isoformat(timespec="minutes"),
        "fuente": "ArgentinaDatos (datos de CAFCI/CNV)",
        "actualizacion_fuente": j.get("fechaActualizacion"),
        "usd_ars": dolar_oficial(),
        "fondos": len({x["fid"] for x in filas}),
        "clases": filas,
    }
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    RUN_JSON.parent.mkdir(parents=True, exist_ok=True)
    RUN_JSON.write_text(json.dumps({
        "fecha": payload["generado"], "fuente": payload["fuente"],
        "actualizacion_fuente": payload["actualizacion_fuente"],
        "clases": len(filas), "con_datos": len(con_datos), "con_datos_recientes": len(recientes),
        "historial_filas_nuevas": nuevas, "segundos": round(time.time() - t0),
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"::notice title=ArgentinaDatos::{len(filas)} clases, {len(con_datos)} con datos, fuente al {j.get('fechaActualizacion')}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:  # noqa: BLE001
        print(f"::error title=Conector ArgentinaDatos::{type(e).__name__}: {str(e)[:400]}")
        raise
