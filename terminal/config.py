"""Private, explicit bench provisioning; never use a production RFID pepper here."""
import hashlib
import json
import os
import re
from pathlib import Path
from urllib.parse import urlsplit

from .protocol import encode, uuid_value


def validate(config):
    # This first slice is deliberately local/synthetic. Remote pairing, managed
    # secret delivery and a trustworthy device clock are separate #132 work.
    if config.get("mode") != "synthetic-bench":
        raise ValueError("Ova verzija prihvaća samo synthetic-bench konfiguraciju.")
    url = urlsplit(config.get("apiOrigin", ""))
    if (url.scheme != "http" or url.hostname != "127.0.0.1" or not url.port
            or url.username or url.password or url.path or url.query or url.fragment):
        raise ValueError("Testni API mora biti http://127.0.0.1:PORT.")
    uuid_value(config.get("terminalId"))
    uuid_value(config.get("acknowledgementKeyId"))
    version = config.get("acknowledgementKeyVersion")
    if type(version) is not int or not 1 <= version <= 2147483647:
        raise ValueError("Neispravna verzija ključa.")
    for key in ("deviceCredential", "rfidPepper"):
        value = config.get(key)
        if not isinstance(value, str) or not 32 <= len(value) <= 256 or "\n" in value:
            raise ValueError("Nedostaje valjana testna vjerodajnica.")
    cards = config.get("cards")
    if not isinstance(cards, list) or not 1 <= len(cards) <= 30:
        raise ValueError("Nedostaje popis testnih kartica.")
    for card in cards:
        if (set(card) != {"hash", "label"} or not re.fullmatch(r"[a-f0-9]{64}", card["hash"])
                or not isinstance(card["label"], str) or not 1 <= len(card["label"]) <= 60):
            raise ValueError("Neispravan zapis testne kartice.")
    if len({card["hash"] for card in cards}) != len(cards):
        raise ValueError("Ponovljena testna kartica.")
    return config


def load(path):
    path = Path(path)
    if path.is_symlink() or path.stat().st_size > 16384:
        raise ValueError("Neispravna konfiguracijska datoteka.")
    if os.name != "nt" and path.stat().st_mode & 0o077:
        raise ValueError("Konfiguracija zahtijeva prava 0600.")
    return validate(json.loads(path.read_text(encoding="utf-8")))


def identity(config):
    # Bind a queue to both server origin and device/key/card-hashing identity.
    keys = ("mode", "apiOrigin", "terminalId", "acknowledgementKeyId",
            "acknowledgementKeyVersion", "deviceCredential", "rfidPepper")
    return hashlib.sha256(encode({key: config[key] for key in keys}).encode()).hexdigest()
