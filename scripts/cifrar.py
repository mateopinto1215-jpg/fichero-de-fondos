"""Cifra los datos de la página con la contraseña (secreto CLAVE_PAGINA de GitHub).

site/data/fondos-ar.json  ->  site/data/fondos-ar.enc.json   (y borra el archivo sin cifrar)

Formato: gzip(JSON) cifrado con AES-GCM 256; la clave se deriva de la contraseña con
PBKDF2-SHA256 (600.000 iteraciones, sal fija del sitio). Debe coincidir con site/app.js.
"""
import base64
import gzip
import json
import os
import sys
from pathlib import Path

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

SAL = b"fichero-de-fondos|v1"
ITER = 600_000
ROOT = Path(__file__).resolve().parent.parent
ENTRADA = ROOT / "site" / "data" / "fondos-ar.json"
SALIDA = ROOT / "site" / "data" / "fondos-ar.enc.json"


def clave(password: str) -> bytes:
    return PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=SAL, iterations=ITER).derive(password.encode("utf-8"))


def cifrar(datos: bytes, password: str) -> dict:
    iv = os.urandom(12)
    ct = AESGCM(clave(password)).encrypt(iv, gzip.compress(datos, 9), None)
    return {"v": 1, "kdf": "PBKDF2-SHA256", "iter": ITER, "iv": base64.b64encode(iv).decode(), "ct": base64.b64encode(ct).decode()}


def main() -> int:
    password = os.environ.get("CLAVE_PAGINA", "")
    if not password:
        print("::error title=Falta la contraseña::Cargá el secreto CLAVE_PAGINA en GitHub (Settings → Secrets and variables → Actions). No se publica nada sin cifrar.")
        return 1
    if len(password) < 8:
        print("::warning title=Contraseña corta::Conviene usar al menos 12 caracteres.")
    datos = ENTRADA.read_bytes()
    paquete = cifrar(datos, password)
    SALIDA.write_text(json.dumps(paquete, separators=(",", ":")), encoding="utf-8")
    ENTRADA.unlink()
    print(f"::notice title=Datos cifrados::{len(datos)//1024} KB → {SALIDA.stat().st_size//1024} KB cifrados")
    return 0


if __name__ == "__main__":
    sys.exit(main())
