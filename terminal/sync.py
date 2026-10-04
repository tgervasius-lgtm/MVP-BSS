"""Single ordered background sender; transport failures never acknowledge data."""
import json
import random
import threading
import time
from urllib.error import HTTPError
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener
from uuid import uuid4

from .protocol import EVENT_PATH, HEARTBEAT_PATH, VERSION, encode, request_headers, utc_now


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError("Preusmjeravanje terminalskog zahtjeva nije dopušteno.")


class Transport:
    def __init__(self, config):
        self.config = config
        self.opener = build_opener(ProxyHandler({}), NoRedirect())

    def post(self, path, payload):
        body = encode(payload).encode()
        headers = request_headers(self.config, path, body, utc_now(), str(uuid4()))
        request = Request(self.config["apiOrigin"] + path, data=body, headers=headers, method="POST")
        with self.opener.open(request, timeout=5) as response:
            if response.status == 204 and path == HEARTBEAT_PATH:
                return None
            if response.status != 200 or response.headers.get_content_type() != "application/json":
                raise ValueError("Neispravan odgovor servera.")
            data = response.read(262145)
            if len(data) > 262144:
                raise ValueError("Odgovor servera je prevelik.")
            return json.loads(data)


def validate_response(batch, response):
    if not isinstance(response, dict) or response.get("batchId") != batch["batchId"]:
        raise ValueError("Odgovor ne pripada paketu.")
    results = response.get("results")
    if not isinstance(results, list) or len(results) != len(batch["events"]):
        raise ValueError("Nepotpun odgovor servera.")
    for event, result in zip(batch["events"], results):
        if (not isinstance(result, dict) or result.get("deviceEventId") != event["deviceEventId"]
                or result.get("status") not in ("synced", "duplicate", "rejected", "reconciliation_required")
                or (result.get("code") is not None and
                    (not isinstance(result["code"], str) or len(result["code"]) > 128))):
            raise ValueError("Nepotvrđen ishod događaja.")


class Sync:
    def __init__(self, store, transport=None):
        self.store = store
        self.transport = transport or Transport(store.config)
        self.stop = threading.Event()
        self.guard = threading.Lock()
        self.paused = False
        self.state = "waiting"
        self.last_heartbeat = 0

    def once(self):
        with self.guard:
            if self.paused:
                self.state = "paused"
                return
            rows = self.store.pending()
            if rows:
                events = [json.loads(row["payload"]) for row in rows]
                batch = {"batchId": str(uuid4()), "sentAt": utc_now(), "events": events}
                try:
                    response = self.transport.post(EVENT_PATH, batch)
                    validate_response(batch, response)
                    self.store.complete(rows, response)
                    self.state = "online"
                except Exception as error:
                    # Never log remote bodies, request signatures, credentials or UIDs.
                    code = "SYNC_AUTH_REQUIRED" if isinstance(error, HTTPError) and error.code in (401, 403) else "SYNC_RETRY"
                    delay = 60 if code == "SYNC_AUTH_REQUIRED" else min(60, 2 ** min(rows[0]["attempts"] + 1, 6)) + random.random()
                    self.store.retry(rows, delay, code)
                    self.state = "auth_error" if code == "SYNC_AUTH_REQUIRED" else "offline"
                    return
            if time.monotonic() - self.last_heartbeat >= 60:
                self.last_heartbeat = time.monotonic()
                snapshot = self.store.snapshot()
                try:
                    self.transport.post(HEARTBEAT_PATH, {
                        "sentAt": utc_now(), "sequence": max(1, snapshot["sequence"]),
                        "queueDepth": snapshot["counts"].get("queued", 0), "softwareVersion": VERSION})
                    self.state = "online"
                except Exception:
                    self.state = "offline"

    def run(self):
        while not self.stop.is_set():
            try:
                self.once()
            except Exception:
                self.state = "storage_error"
            self.stop.wait(1)
