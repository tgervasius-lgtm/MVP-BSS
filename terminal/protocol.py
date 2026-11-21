"""Wire-compatible implementation of OpenAPI v1 / ADR-002 (no runtime dependencies)."""
import hashlib
import hmac
import json
import re
from datetime import datetime, timezone
from uuid import UUID

VERSION = "0.1.0-bench"
EVENT_PATH = "/api/v1/terminal/v1/events/batch"
HEARTBEAT_PATH = "/api/v1/terminal/v1/heartbeat"


def utc_now():
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def encode(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def uuid_value(value):
    if not isinstance(value, str) or str(UUID(value)) != value:
        raise ValueError("Neispravan identifikator.")
    return value


def hash_card(uid, pepper):
    if not isinstance(uid, str) or len(uid) > 128:
        raise ValueError("Neispravna kartica.")
    normalized = re.sub(r"[:\s-]", "", uid).upper()
    if not re.fullmatch(r"[0-9A-F]{8,64}", normalized) or len(normalized) % 2:
        raise ValueError("Neispravna kartica.")
    return hmac.new(pepper.encode(), normalized.encode(), hashlib.sha256).hexdigest()


def receipt(config, event):
    key_context = "\n".join(["BSS-TERMINAL-ACK-KEY-V1", config["terminalId"],
                              event["acknowledgementKeyId"], str(event["acknowledgementKeyVersion"])])
    key = hmac.new(config["deviceCredential"].encode(), key_context.encode(), hashlib.sha256).digest()
    fields = ["BSS-TERMINAL-ACK-V2", config["terminalId"], event["acknowledgementKeyId"],
              str(event["acknowledgementKeyVersion"]), event["deviceEventId"], str(event["sequence"]),
              event["occurredAt"], event["eventType"], event["cardUidHash"],
              str(event["deviceClockOffsetSeconds"]), event["clockStatus"], event["acknowledgedAt"]]
    return hmac.new(key, "\n".join(fields).encode(), hashlib.sha256).hexdigest()


def request_headers(config, path, body, timestamp, nonce):
    canonical = "\n".join(["POST", path, hashlib.sha256(body).hexdigest(), timestamp, nonce])
    signature = hmac.new(config["deviceCredential"].encode(), canonical.encode(), hashlib.sha256).hexdigest()
    return {"Content-Type": "application/json", "X-BSS-Device-Id": config["terminalId"],
            "X-BSS-Timestamp": timestamp, "X-BSS-Nonce": nonce, "X-BSS-Signature": signature}
