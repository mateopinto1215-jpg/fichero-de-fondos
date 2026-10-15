"""Sondeo de acceso: qué sitios de gestoras responden desde los servidores de GitHub Actions.
Uso: python scripts/sondeo.py scripts/sondeo-urls.txt
Imprime una anotación por URL (estado HTTP, servidor, tipo y tamaño) y guarda data/sondeo.json."""
import json
import sys
import time
from pathlib import Path

import requests

UA = "FicheroDeFondos/1.0 (+https://github.com/matepin/fichero-de-fondos)"
urls = [l.strip() for l in Path(sys.argv[1]).read_text().splitlines() if l.strip() and not l.startswith("#")]
out = []
for u in urls:
    try:
        r = requests.get(u, timeout=30, headers={"User-Agent": UA, "Accept": "*/*", "Accept-Language": "en"}, allow_redirects=True)
        res = {"url": u, "status": r.status_code, "final": r.url, "server": r.headers.get("server", ""),
               "type": r.headers.get("content-type", "")[:40], "bytes": len(r.content),
               "snippet": r.text[:160].replace("\n", " ") if "text" in r.headers.get("content-type", "") or "json" in r.headers.get("content-type", "") else ""}
    except Exception as e:  # noqa: BLE001
        res = {"url": u, "status": 0, "error": str(e)[:200]}
    out.append(res)
    lvl = "notice" if res.get("status") == 200 else "warning"
    print(f"::{lvl} title={res.get('status')} {u[:90]}::{res.get('server','')} | {res.get('type','')} | {res.get('bytes','')} B | {res.get('error', res.get('snippet',''))[:160]}")
    time.sleep(0.5)
Path("data").mkdir(exist_ok=True)
Path("data/sondeo.json").write_text(json.dumps(out, indent=1, ensure_ascii=False))
ok = sum(1 for r in out if r.get("status") == 200)
print(f"::notice title=Resumen::{ok}/{len(out)} URLs con 200")
from urllib.parse import urlparse
linea = " ".join(f"{r.get('status')}:{urlparse(r['url']).netloc.replace('www.','')}{'/' + urlparse(r['url']).path.strip('/').split('/')[0] if 'robots' not in r['url'] else ''}({(r.get('server') or '')[:10]})" for r in out)
for i in range(0, len(linea), 900):
    print(f"::error title=Tabla {i//900+1}::{linea[i:i+900]}")
