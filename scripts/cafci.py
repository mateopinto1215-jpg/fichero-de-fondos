"""
Conector CAFCI -> datos del Fichero de Fondos (sección Argentina).

Fuente oficial: Cámara Argentina de Fondos Comunes de Inversión (estadisticas.cafci.org.ar).
  1. /consulta-de-fondos.json        catálogo completo (fondos + clases, gestora, categoría, etc.)
  2. /fondos/{fondo}?clase={clase}   ficha de cada clase (cuotaparte, patrimonio, rendimientos,
                                      honorarios, calificación, cartera)

Salidas:
  site/data/fondos-ar.json   una fila por clase, lista para la web
  data/vcp/AAAA-MM.csv       historial diario de cuotaparte y patrimonio (se acumula día a día)
  data/ultima-corrida.json   resumen de la corrida (cantidades, errores)

Uso:
  python scripts/cafci.py                 corrida completa
  python scripts/cafci.py --limit 30      prueba con las primeras 30 clases
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime, timedelta
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from dateutil.relativedelta import relativedelta

BASE = "https://estadisticas.cafci.org.ar"
ROOT = Path(__file__).resolve().parent.parent
OUT_JSON = ROOT / "site" / "data" / "fondos-ar.json"
HIST_DIR = ROOT / "data" / "vcp"
RUN_JSON = ROOT / "data" / "ultima-corrida.json"

UA = "FicheroDeFondos/1.0 (+https://github.com/mateopinto1215-jpg/fichero-de-fondos)"
WORKERS = 4          # pedidos simultáneos: bajo a propósito, para no cargar el sitio de CAFCI
PAUSA = 0.25         # segundos entre pedidos de cada worker
REINTENTOS = 3


# ---------------------------------------------------------------- red
_session = requests.Session()
_session.headers.update({"User-Agent": UA, "Accept-Language": "es-AR,es;q=0.9"})


def get(url: str, **kw) -> requests.Response:
    ultimo = None
    for i in range(REINTENTOS):
        try:
            r = _session.get(url, timeout=40, **kw)
            if r.status_code == 200:
                return r
            ultimo = f"HTTP {r.status_code} ({r.headers.get('server','?')}): {r.text[:120]!r}"
            if r.status_code in (404, 410):
                break
        except requests.RequestException as e:
            ultimo = str(e)
        time.sleep(2 * (i + 1))
    raise RuntimeError(f"{url}: {ultimo}")


# ---------------------------------------------------------------- parseo de números/fechas
def num_ar(s: str | None) -> float | None:
    """'4.509.280.084.420,87' -> 4509280084420.87 ; '18,85 %' -> 18.85 ; '1.7425' -> 1.7425"""
    if s is None:
        return None
    s = s.strip().replace("%", "").replace("\xa0", " ").strip()
    if not s or s in {"—", "-", "–"} or not re.search(r"\d", s):
        return None
    s = re.sub(r"[^\d,.\-]", "", s)
    if "," in s:                       # formato argentino: punto miles, coma decimal
        s = s.replace(".", "").replace(",", ".")
    elif s.count(".") > 1:             # solo puntos de miles
        s = s.replace(".", "")
    try:
        return float(s)
    except ValueError:
        return None


def fecha_ar(texto: str | None) -> str | None:
    m = re.search(r"(\d{1,2})/(\d{1,2})/(\d{4})", texto or "")
    if not m:
        return None
    d, mo, y = map(int, m.groups())
    return f"{y:04d}-{mo:02d}-{d:02d}"


def txt(el) -> str:
    return re.sub(r"\s+", " ", el.get_text(" ", strip=True)) if el else ""


# ---------------------------------------------------------------- ficha
PERIODOS = {           # etiqueta en la ficha -> clave
    "7 días": "d7",
    "1 mes": "m1",
    "90 días": "d90",
    "180 días": "d180",
    "en el año": "ytd",
    "12 meses": "m12",
}


def dias_periodo(clave: str, f: date) -> int:
    """Días corridos que CAFCI usa para anualizar cada período (TNA sobre días corridos)."""
    if clave == "d7":
        return 7
    if clave == "d90":
        return 90
    if clave == "m1":
        return (f - (f - relativedelta(months=1))).days
    if clave == "d180":
        return (f - (f - relativedelta(months=6))).days
    if clave == "ytd":
        return max(1, (f - date(f.year - 1, 12, 31)).days)
    if clave == "m12":
        return (f - (f - relativedelta(years=1))).days
    raise KeyError(clave)


def parse_ficha(html: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    out: dict = {}

    # Rendimientos (TNA) + valor de cuotaparte
    sec = soup.select_one("#consulta")
    if sec:
        out["f_rend"] = fecha_ar(txt(sec.find("h3")))
        tna = {}
        for tr in sec.select("table tr"):
            celdas = [txt(td) for td in tr.find_all("td")]
            if len(celdas) < 2:
                continue
            etiqueta = celdas[0].lower()
            if etiqueta.startswith("valor cuotaparte"):
                out["vcp_mil"] = num_ar(celdas[1])
                continue
            for k_txt, k in PERIODOS.items():
                if etiqueta == k_txt:
                    tna[k] = num_ar(celdas[1])
        out["tna"] = tna

    # Patrimonio y cuotaparte
    sec = soup.select_one("#cuotaparte")
    if sec:
        t = txt(sec)
        out["f_val"] = fecha_ar(t)
        m = re.search(r"Patrimonio bajo administraci[oó]n:\s*([\d.,]+)", t)
        out["patrimonio"] = num_ar(m.group(1)) if m else None
        m = re.search(r"Valor por cada cuotaparte:\s*([\d.,]+)", t)
        out["vcp"] = num_ar(m.group(1)) if m else None

    # Cartera (viene como JSON en el gráfico de torta)
    sec = soup.select_one("#cartera")
    if sec:
        out["f_cart"] = fecha_ar(txt(sec))
        el = sec.select_one("[data-pie-chart-items-value]")
        items = []
        if el:
            try:
                for it in json.loads(el["data-pie-chart-items-value"]):
                    nombre = (it.get("nombre") or "").strip()
                    pct = it.get("porcentaje")
                    if nombre and pct is not None:
                        items.append([nombre, round(float(pct), 2)])
            except (ValueError, TypeError):
                pass
        out["cartera"] = items

    # Calificación
    sec = soup.select_one("#calificacion")
    if sec:
        filas = [[txt(td) for td in tr.find_all("td")] for tr in sec.select("table tr")]
        filas = [f for f in filas if len(f) >= 2 and not f[0].lower().startswith("calificadora")]
        out["calif"] = [[f[0], f[1], fecha_ar(f[2]) if len(f) > 2 else None] for f in filas if f[1]]

    # Honorarios: filas alternadas encabezado / valores
    sec = soup.select_one("#honorarios")
    if sec:
        filas = [[txt(td) for td in tr.find_all("td")] for tr in sec.select("table tr")]
        hon = {}
        for enc, val in zip(filas[0::2], filas[1::2]):
            for e, v in zip(enc, val):
                hon[e.lower()] = num_ar(v)
        out["hon"] = {
            "gerente": hon.get("honorarios de la gerente"),
            "depositaria": hon.get("honorarios de la depositaria"),
            "ingreso": hon.get("comisión de ingreso"),
            "rescate": hon.get("comisión de egreso"),
            "transferencia": hon.get("comisión de transferencia"),
            "gastos": hon.get("gastos ordinarios de gestión"),
            "exito": hon.get("comisión de éxito"),
        }
    return out


def rendimientos_directos(tna: dict, f_rend: str | None) -> dict:
    """Pasa TNA (sobre días corridos) a rendimiento directo del período, en %."""
    if not f_rend:
        return {}
    f = date.fromisoformat(f_rend)
    res = {}
    for k, v in tna.items():
        if v is None:
            continue
        res[k] = round(v * dias_periodo(k, f) / 365, 4)
    return res


# ---------------------------------------------------------------- catálogo
def bajar_catalogo() -> dict:
    return get(f"{BASE}/consulta-de-fondos.json", headers={"Accept": "application/json"}).json()


def nombre(x) -> str | None:
    return (x or {}).get("nombre") if isinstance(x, dict) else None


def filas_catalogo(cat: dict) -> list[dict]:
    filas = []
    for f in cat["fondos"]:
        for c in f.get("clases") or []:
            filas.append({
                "fid": f["id"], "cid": c["id"],
                "n": (c.get("nombre") or f.get("nombre") or "").strip(),
                "fondo": (f.get("nombre") or "").strip(),
                "g": nombre(f.get("sociedad_gerente")),
                "dep": nombre(f.get("sociedad_depositaria")),
                "t": nombre(f.get("tipo_renta")),
                "tm": nombre(f.get("tipo_renta_mixta")),
                "geo": nombre(f.get("region")),
                "dur": nombre(f.get("duration")),
                "bm": nombre(f.get("benchmark")),
                "hz": nombre(f.get("horizonte")),
                "ccy": nombre(c.get("moneda")) or nombre(f.get("moneda")),
                "liq": f.get("dias_liquidacion"),
                "obj": (f.get("objetivo") or "").strip(),
                "cnv": f.get("codigo_cnv"),
                "ini": f.get("inicio"),
                "td": f.get("tipo_dinero"),
                "min": c.get("inversion_minima"),
                "bbg": (c.get("ticker_bloomberg") or "").strip() or None,
                "isin": (c.get("ticker_isin") or "").strip() or None,
                "susc": c.get("suscripcion"),
            })
    return filas


def dolar_oficial() -> float | None:
    """Tipo de cambio oficial (venta) solo para ordenar/filtrar patrimonios en una misma escala."""
    try:
        j = get("https://dolarapi.com/v1/dolares/oficial").json()
        v = float(j.get("venta") or 0)
        return v if v > 0 else None
    except Exception:  # noqa: BLE001
        return None


# ---------------------------------------------------------------- corrida
def procesar(fila: dict) -> dict:
    url = f"{BASE}/fondos/{fila['fid']}?clase={fila['cid']}"
    html = get(url).text
    time.sleep(PAUSA)
    d = parse_ficha(html)
    fila = dict(fila)
    fila["url"] = url
    fila["f"] = d.get("f_val") or d.get("f_rend")
    fila["fr"] = d.get("f_rend")
    fila["vcp"] = d.get("vcp")
    fila["pat"] = d.get("patrimonio")
    fila["tna"] = {k: v for k, v in (d.get("tna") or {}).items() if v is not None}
    fila["r"] = rendimientos_directos(fila["tna"], d.get("f_rend"))
    fila["hon"] = d.get("hon") or {}
    h = fila["hon"]
    partes = [h.get("gerente"), h.get("depositaria"), h.get("gastos")]
    fila["cost"] = round(sum(p for p in partes if p), 4) if any(p is not None for p in partes) else None
    fila["calif"] = d.get("calif") or []
    fila["cart"] = d.get("cartera") or []
    fila["fc"] = d.get("f_cart")
    return fila


def guardar_historial(filas: list[dict]) -> int:
    HIST_DIR.mkdir(parents=True, exist_ok=True)
    nuevas = 0
    por_mes: dict[str, list] = {}
    for f in filas:
        if f.get("f") and f.get("vcp") is not None:
            por_mes.setdefault(f["f"][:7], []).append(f)
    for mes, lista in por_mes.items():
        p = HIST_DIR / f"{mes}.csv"
        vistos = set()
        if p.exists():
            with p.open(newline="", encoding="utf-8") as fh:
                for row in csv.DictReader(fh):
                    vistos.add((row["fecha"], row["clase"]))
        nuevo_archivo = not p.exists()
        with p.open("a", newline="", encoding="utf-8") as fh:
            w = csv.writer(fh)
            if nuevo_archivo:
                w.writerow(["fecha", "fondo", "clase", "vcp", "patrimonio"])
            for f in lista:
                key = (f["f"], str(f["cid"]))
                if key in vistos:
                    continue
                w.writerow([f["f"], f["fid"], f["cid"], f["vcp"], f["pat"]])
                nuevas += 1
    return nuevas


def variacion_diaria(filas: list[dict]) -> None:
    """Rendimiento del último día con dato, usando el historial acumulado."""
    archivos = sorted(HIST_DIR.glob("*.csv"))[-2:]
    hist: dict[str, list[tuple[str, float]]] = {}
    for p in archivos:
        with p.open(newline="", encoding="utf-8") as fh:
            for row in csv.DictReader(fh):
                try:
                    hist.setdefault(row["clase"], []).append((row["fecha"], float(row["vcp"])))
                except (ValueError, KeyError):
                    continue
    for f in filas:
        serie = sorted(hist.get(str(f["cid"]), []))
        if f.get("f") and len(serie) >= 2 and serie[-1][0] == f["f"]:
            (f0, v0), (f1, v1) = serie[-2], serie[-1]
            dias = (date.fromisoformat(f1) - date.fromisoformat(f0)).days
            if v0 and 0 < dias <= 7:
                f["r"]["dia"] = round((v1 / v0 - 1) * 100, 4)
                f["diaN"] = dias


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="procesar solo N clases (prueba)")
    args = ap.parse_args()

    t0 = time.time()
    cat = bajar_catalogo()
    filas = filas_catalogo(cat)
    print(f"Catálogo CAFCI: {len(cat['fondos'])} fondos, {len(filas)} clases (generado {cat.get('generated_at')})")
    if args.limit:
        filas = filas[: args.limit]

    resultado, errores = [], []
    with ThreadPoolExecutor(WORKERS) as ex:
        futs = {ex.submit(procesar, f): f for f in filas}
        for i, fut in enumerate(as_completed(futs), 1):
            try:
                resultado.append(fut.result())
            except Exception as e:  # noqa: BLE001
                base = dict(futs[fut])
                base["url"] = f"{BASE}/fondos/{base['fid']}?clase={base['cid']}"
                base["err"] = True
                resultado.append(base)
                errores.append(f"{base['fid']}/{base['cid']}: {e}")
            if i % 250 == 0:
                print(f"  {i}/{len(filas)} fichas…", flush=True)

    # Si una corrida falla de forma masiva (CAFCI caído, bloqueo), no pisamos los datos buenos.
    ok = [r for r in resultado if not r.get("err")]
    if len(ok) < 0.5 * len(filas):
        print(f"::error title=Conector CAFCI::Solo {len(ok)} de {len(filas)} fichas OK. Ejemplo: {(errores or ['-'])[0][:300]}")
        print(f"ERROR: solo {len(ok)} de {len(filas)} fichas OK. No se actualizan los datos.", file=sys.stderr)
        for e in errores[:20]:
            print("  ", e, file=sys.stderr)
        return 1

    nuevas = guardar_historial(ok)
    variacion_diaria(ok)
    resultado.sort(key=lambda r: (r["n"] or "").lower())

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "generado": datetime.now().astimezone().isoformat(timespec="minutes"),
        "catalogo_cafci": cat.get("generated_at"),
        "usd_ars": dolar_oficial(),
        "fondos": len({r["fid"] for r in resultado}),
        "clases": resultado,
    }
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    RUN_JSON.parent.mkdir(parents=True, exist_ok=True)
    RUN_JSON.write_text(json.dumps({
        "fecha": payload["generado"],
        "clases": len(filas), "ok": len(ok), "errores": len(errores),
        "historial_filas_nuevas": nuevas, "segundos": round(time.time() - t0),
        "muestra_errores": errores[:30],
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Listo: {len(ok)}/{len(filas)} clases OK, {len(errores)} errores, "
          f"{nuevas} filas nuevas de historial, {round(time.time() - t0)} s")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:  # noqa: BLE001
        # En GitHub Actions, "::error::" se muestra como anotación de la corrida
        print(f"::error title=Conector CAFCI::{type(e).__name__}: {str(e)[:400]}")
        raise
