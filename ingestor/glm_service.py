"""
StormWatch — Serviço de ingestão GLM (GOES-19 / NOAA).

Faz polling do produto público GLM-L2-LCFA no bucket S3 da NOAA (sem
autenticação), parseia os arquivos netCDF4, filtra os flashes para a
América do Sul e mantém um buffer em memória das descargas recentes.

Expõe um JSON enxuto que o backend Node consome:
  GET /flashes  -> { updatedAt, count, flashes: [[lat, lon, t_ms], ...] }
  GET /health   -> estado do poller

Fonte: domínio público (obra do governo dos EUA) — NOAA Big Data Program.
Bucket: https://noaa-goes19.s3.amazonaws.com/GLM-L2-LCFA/
"""

import os
import time
import threading
import datetime as dt
import urllib.request
import xml.etree.ElementTree as ET
from collections import deque

import numpy as np
import netCDF4
from flask import Flask, jsonify

# ----------------------------- Config -----------------------------
BUCKET = os.getenv("GLM_BUCKET", "noaa-goes19")  # GOES-East atual
PRODUCT = "GLM-L2-LCFA"
PORT = int(os.getenv("GLM_PORT", "5055"))
POLL_SEC = int(os.getenv("GLM_POLL_SEC", "30"))
RETENTION_SEC = int(os.getenv("GLM_RETENTION_SEC", "900"))  # 15 min
FILES_PER_POLL = int(os.getenv("GLM_FILES_PER_POLL", "3"))

# Bounding box da América do Sul (lat/lon em graus).
SA_LAT_MIN, SA_LAT_MAX = -56.0, 13.0
SA_LON_MIN, SA_LON_MAX = -82.0, -34.0

S3_NS = "{http://s3.amazonaws.com/doc/2006-03-01/}"

# --------------------------- Estado ---------------------------
_lock = threading.Lock()
_flashes = deque()          # itens: (lat, lon, t_ms)
_seen = deque(maxlen=400)   # chaves de arquivos já processados (ordem)
_seen_set = set()
_state = {
    "ok": False,
    "last_poll": None,
    "last_file": None,
    "files_processed": 0,
    "buffer": 0,
    "error": None,
}


def _s3_list(prefix):
    url = f"https://{BUCKET}.s3.amazonaws.com/?list-type=2&prefix={prefix}&max-keys=1000"
    with urllib.request.urlopen(url, timeout=20) as r:
        root = ET.fromstring(r.read())
    return [e.text for e in root.iter(S3_NS + "Key")]


def _latest_keys(n):
    """Chaves dos arquivos GLM mais recentes (hora atual + anterior p/ rollover)."""
    now = dt.datetime.now(dt.timezone.utc)
    keys = []
    for delta in (1, 0):  # hora anterior primeiro, depois a atual
        h = now - dt.timedelta(hours=delta)
        doy = h.timetuple().tm_yday
        prefix = f"{PRODUCT}/{h.year}/{doy:03d}/{h.hour:02d}/"
        try:
            keys.extend(_s3_list(prefix))
        except Exception:
            pass
    keys.sort()
    return keys[-n:]


def _parse_file(key):
    """Baixa e parseia um arquivo GLM; devolve lista de (lat, lon, t_ms) na A. do Sul."""
    url = f"https://{BUCKET}.s3.amazonaws.com/{key}"
    with urllib.request.urlopen(url, timeout=40) as r:
        data = r.read()

    ds = netCDF4.Dataset("inmem.nc", mode="r", memory=data)
    try:
        lat = np.asarray(ds.variables["flash_lat"][:], dtype=float)
        lon = np.asarray(ds.variables["flash_lon"][:], dtype=float)
        tcs = getattr(ds, "time_coverage_start", None)
    finally:
        ds.close()

    if tcs:
        t_ms = int(
            dt.datetime.strptime(tcs[:19], "%Y-%m-%dT%H:%M:%S")
            .replace(tzinfo=dt.timezone.utc)
            .timestamp() * 1000
        )
    else:
        t_ms = int(time.time() * 1000)

    mask = (
        np.isfinite(lat) & np.isfinite(lon)
        & (lat >= SA_LAT_MIN) & (lat <= SA_LAT_MAX)
        & (lon >= SA_LON_MIN) & (lon <= SA_LON_MAX)
    )
    return [(float(a), float(o), t_ms) for a, o in zip(lat[mask], lon[mask])]


def _prune(now_ms):
    cutoff = now_ms - RETENTION_SEC * 1000
    while _flashes and _flashes[0][2] < cutoff:
        _flashes.popleft()


def _poll_once():
    new_files = 0
    for key in _latest_keys(FILES_PER_POLL):
        if key in _seen_set:
            continue
        flashes = _parse_file(key)
        with _lock:
            _seen.append(key)
            _seen_set.add(key)
            if len(_seen) == _seen.maxlen:
                # deque já descartou o mais antigo; sincroniza o set
                _seen_set.intersection_update(_seen)
            _flashes.extend(flashes)
            _prune(int(time.time() * 1000))
            _state["last_file"] = key.split("/")[-1]
            _state["files_processed"] += 1
            _state["buffer"] = len(_flashes)
        new_files += 1
    return new_files


def _poller():
    while True:
        try:
            _poll_once()
            with _lock:
                _state["ok"] = True
                _state["error"] = None
                _state["last_poll"] = dt.datetime.now(dt.timezone.utc).isoformat()
        except Exception as e:  # noqa: BLE001
            with _lock:
                _state["error"] = f"{type(e).__name__}: {e}"
        time.sleep(POLL_SEC)


# --------------------------- HTTP ---------------------------
app = Flask(__name__)


@app.get("/health")
def health():
    with _lock:
        return jsonify(dict(_state))


@app.get("/flashes")
def flashes():
    with _lock:
        data = list(_flashes)
        updated = _state["last_poll"]
    return jsonify(
        updatedAt=updated,
        count=len(data),
        flashes=[[round(la, 4), round(lo, 4), t] for (la, lo, t) in data],
    )


_poller_started = False
_poller_lock = threading.Lock()


def ensure_poller():
    """Inicia o poller uma única vez (idempotente)."""
    global _poller_started
    with _poller_lock:
        if _poller_started:
            return
        _poller_started = True
        threading.Thread(target=_poller, daemon=True).start()


# Inicia ao importar o módulo — cobre tanto a execução direta (`python
# glm_service.py`) quanto um servidor WSGI que importe `glm_service:app`.
# Nesse caso, use sempre 1 worker: o buffer de flashes é em memória.
ensure_poller()


if __name__ == "__main__":
    # Servidor de desenvolvimento. Em produção, sirva via WSGI (ex.: waitress).
    app.run(host=os.getenv("GLM_HOST", "127.0.0.1"), port=PORT, threaded=True)
