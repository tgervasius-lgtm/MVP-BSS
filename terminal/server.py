"""Loopback-only synthetic bench UI. Not a production web server or kiosk release."""
import hmac
import json
import secrets
import sqlite3
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from .protocol import encode

ASSETS = Path(__file__).parent / "ui"
INVALID_REQUEST = "Neispravan zahtjev."


class Handler(BaseHTTPRequestHandler):
    def log_message(self, _format, *args):
        # Suppress default request logging: browser inputs must not enter logs.
        return

    def setup(self):
        super().setup()
        self.connection.settimeout(5)

    def send(self, code, data, content_type="application/json; charset=utf-8"):
        payload = data if isinstance(data, bytes) else encode(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Security-Policy", "default-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
        self.end_headers()
        self.wfile.write(payload)

    def allowed(self, mutation=False):
        host = f"127.0.0.1:{self.server.server_port}"
        if self.headers.get("Host") != host:
            return False
        if mutation:
            return (self.headers.get("Origin") == f"http://127.0.0.1:{self.server.server_port}"
                    and self.headers.get("Content-Type") == "application/json"
                    and hmac.compare_digest(self.headers.get("X-BSS-Local-Token", ""), self.server.token))
        return self.headers.get("Sec-Fetch-Site") in (None, "none", "same-origin")

    def do_GET(self):
        if not self.allowed():
            self.send(403, {"error": "Pristup nije dopušten."})
            return
        assets = {"/": ("index.html", "text/html; charset=utf-8"),
                  "/ui.js": ("ui.js", "text/javascript; charset=utf-8"),
                  "/ui.css": ("ui.css", "text/css; charset=utf-8")}
        if self.path in assets:
            name, content_type = assets[self.path]
            self.send(200, (ASSETS / name).read_bytes(), content_type)
        elif self.path == "/state":
            try:
                self.send(200, {**self.server.store.snapshot(), "connection": self.server.sync.state,
                                "paused": self.server.sync.paused, "token": self.server.token,
                                "cards": [card["label"] for card in self.server.store.config["cards"]]})
            except sqlite3.Error:
                self.send(503, {"error": "Red nije dostupan; potrebna je provjera."})
        else:
            self.send(404, {"error": "Nije pronađeno."})

    def do_POST(self):
        if not self.allowed(mutation=True):
            self.send(403, {"error": "Pristup nije dopušten."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 1 <= length <= 4096 or self.headers.get("Transfer-Encoding"):
                raise ValueError(INVALID_REQUEST)
            value = json.loads(self.rfile.read(length))
            if self.path == "/capture":
                self.capture(value)
            elif self.path == "/connection":
                if set(value) != {"paused"} or type(value["paused"]) is not bool:
                    raise ValueError(INVALID_REQUEST)
                self.server.sync.paused = value["paused"]
                self.send(200, {"paused": self.server.sync.paused})
            else:
                self.send(404, {"error": "Nije pronađeno."})
        except (ValueError, TypeError, KeyError, AttributeError):
            self.send(400, {"error": "Zahtjev nije prihvaćen. Provjerite karticu i pokušaj."})
        except (sqlite3.Error, OSError, RuntimeError):
            self.send(503, {"error": "Upis nije potvrđen. Potrebna je provjera lokalnog reda."})

    def capture(self, value):
        store = self.server.store
        if (set(value) != {"card", "eventType", "requestId", "trustedFixtureClock"}
                or type(value["card"]) is not int
                or not 0 <= value["card"] < len(store.config["cards"])
                or type(value["trustedFixtureClock"]) is not bool):
            raise ValueError(INVALID_REQUEST)
        event = store.capture_hash(store.config["cards"][value["card"]]["hash"],
            value["eventType"], value["requestId"],
            clock_status="trusted" if value["trustedFixtureClock"] else "uncertain")
        self.send(200, {"sequence": event["sequence"], "localCommitted": True,
                        "clockStatus": event["clockStatus"]})


class LocalServer(ThreadingHTTPServer):
    daemon_threads = False
    block_on_close = True

    def __init__(self, store, sync, port):
        self.store, self.sync = store, sync
        self.token = secrets.token_urlsafe(32)
        super().__init__(("127.0.0.1", port), Handler)


def make_server(store, sync, port=8765):
    return LocalServer(store, sync, port)


def serve(store, sync, port):
    server = make_server(store, sync, port)
    worker = threading.Thread(target=sync.run, name="bss-sync", daemon=False)
    worker.start()
    print(f"BSS testni terminal: http://127.0.0.1:{server.server_port}", flush=True)
    try:
        server.serve_forever(poll_interval=0.25)
    finally:
        server.server_close()
        sync.stop.set()
        worker.join()
