"""Two durable commits before feedback; all immutable evidence survives restart."""
import json
import os
import shutil
import sqlite3
import threading
import time
from pathlib import Path
from uuid import uuid4

from .config import identity, validate
from .protocol import encode, hash_card, receipt, utc_now, uuid_value


class Store:
    def __init__(self, directory, config, *, now=utc_now, fault=lambda _stage: None):
        self.config = validate(config)
        self.now, self.fault = now, fault
        self.lock = threading.RLock()
        self.directory = Path(directory)
        if self.directory.is_symlink():
            raise ValueError("Red zahtijeva vlastitu lokalnu mapu.")
        self.directory.mkdir(mode=0o700, parents=True, exist_ok=True)
        if os.name != "nt" and self.directory.stat().st_mode & 0o077:
            raise ValueError("Mapa reda zahtijeva prava 0700.")
        for name in ("queue.sqlite3", "queue.sqlite3-wal", "queue.sqlite3-shm", "agent.lock"):
            if (self.directory / name).is_symlink():
                raise ValueError("Poveznice nisu dopuštene u mapi reda.")
        self.file_lock = open(self.directory / "agent.lock", "a+b")
        try:
            self._lock_process()
            self.db = sqlite3.connect(self.directory / "queue.sqlite3", isolation_level=None,
                                      check_same_thread=False, timeout=0.25)
            self.db.row_factory = sqlite3.Row
            if self.db.execute("PRAGMA journal_mode=WAL").fetchone()[0] != "wal":
                raise RuntimeError("WAL nije dostupan.")
            self.db.execute("PRAGMA synchronous=FULL")
            if self.db.execute("PRAGMA synchronous").fetchone()[0] != 2:
                raise RuntimeError("Trajni upis nije dostupan.")
            if self.db.execute("PRAGMA quick_check").fetchone()[0] != "ok":
                raise RuntimeError("Provjera reda nije prošla.")
            self._schema()
        except BaseException:
            if hasattr(self, "db"):
                self.db.close()
            self.file_lock.close()
            raise

    def _lock_process(self):
        if os.name == "nt":
            import msvcrt
            if self.file_lock.seek(0, 2) == 0:
                self.file_lock.write(b"0")
                self.file_lock.flush()
            self.file_lock.seek(0)
            msvcrt.locking(self.file_lock.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(self.file_lock, fcntl.LOCK_EX | fcntl.LOCK_NB)

    def _schema(self):
        self.db.executescript("""
          CREATE TABLE IF NOT EXISTS identity (singleton INTEGER PRIMARY KEY CHECK(singleton=1), fingerprint TEXT NOT NULL);
          CREATE TABLE IF NOT EXISTS events (
            sequence INTEGER PRIMARY KEY AUTOINCREMENT,
            request_id TEXT UNIQUE NOT NULL, card_hash TEXT NOT NULL,
            event_type TEXT NOT NULL, created_at REAL NOT NULL,
            payload TEXT NOT NULL, status TEXT NOT NULL,
            code TEXT, server_result TEXT, attempts INTEGER NOT NULL DEFAULT 0,
            next_retry REAL NOT NULL DEFAULT 0);
          CREATE TRIGGER IF NOT EXISTS immutable_event BEFORE UPDATE OF payload ON events
            WHEN OLD.status != 'preparing' BEGIN SELECT RAISE(ABORT, 'immutable event'); END;
          CREATE TRIGGER IF NOT EXISTS immutable_capture BEFORE UPDATE OF sequence,request_id,card_hash,event_type,created_at ON events
            BEGIN SELECT RAISE(ABORT, 'immutable capture'); END;
          CREATE TRIGGER IF NOT EXISTS retained_event BEFORE DELETE ON events
            BEGIN SELECT RAISE(ABORT, 'retain evidence'); END;
        """)
        fingerprint = identity(self.config)
        self.db.execute("INSERT OR IGNORE INTO identity VALUES (1, ?)", (fingerprint,))
        if self.db.execute("SELECT fingerprint FROM identity").fetchone()[0] != fingerprint:
            raise ValueError("Identitet reda ne odgovara konfiguraciji; sačuvajte red i izvornu konfiguraciju.")
        # Never invent acknowledgement of a capture interrupted before receipt commit.
        self.db.execute("UPDATE events SET status='interrupted', code='LOCAL_CAPTURE_INTERRUPTED' WHERE status='preparing'")
        self.db.execute("UPDATE events SET next_retry=min(next_retry, ?) WHERE status='queued'", (time.time() + 60,))

    def capture(self, uid, event_type, request_id, *, clock_status="uncertain"):
        return self.capture_hash(hash_card(uid, self.config["rfidPepper"]), event_type,
                                 request_id, clock_status=clock_status)

    def capture_hash(self, card_hash, event_type, request_id, *, clock_status="uncertain"):
        """Simulator receives a configured synthetic hash; future readers use capture()."""
        uuid_value(request_id)
        if event_type not in ("check_in", "check_out") or clock_status not in ("trusted", "uncertain"):
            raise ValueError("Neispravan događaj.")
        if card_hash not in {card["hash"] for card in self.config["cards"]}:
            raise ValueError("Kartica nije na testnom popisu.")
        with self.lock:
            existing = self.db.execute("SELECT * FROM events WHERE request_id=?", (request_id,)).fetchone()
            if existing:
                if existing["card_hash"] != card_hash or existing["event_type"] != event_type:
                    raise ValueError("Identifikator pokušaja već je iskorišten.")
                if existing["status"] in ("preparing", "interrupted"):
                    raise ValueError("Prethodni upis prekinut; potrebna je provjera.")
                return json.loads(existing["payload"])
            previous = self.db.execute("SELECT * FROM events ORDER BY sequence DESC LIMIT 1").fetchone()
            if (previous and previous["card_hash"] == card_hash and previous["event_type"] == event_type
                    and 0 <= time.time() - previous["created_at"] < 2
                    and previous["status"] not in ("preparing", "interrupted", "rejected")):
                return json.loads(previous["payload"])
            if (self.db.execute("SELECT count(*) FROM events").fetchone()[0] >= 100000
                    or shutil.disk_usage(self.directory).free < 32 * 1024 * 1024):
                raise RuntimeError("Nema dovoljno prostora; događaj nije potvrđen.")
            event = {"deviceEventId": str(uuid4()), "occurredAt": self.now(),
                     "eventType": event_type, "cardUidHash": card_hash,
                     "acknowledgementKeyId": self.config["acknowledgementKeyId"],
                     "acknowledgementKeyVersion": self.config["acknowledgementKeyVersion"],
                     "clockStatus": clock_status, "deviceClockOffsetSeconds": 0}
            self.db.execute("BEGIN IMMEDIATE")
            try:
                row = self.db.execute("INSERT INTO events(request_id,card_hash,event_type,created_at,payload,status) VALUES(?,?,?,?,?,'preparing')",
                                      (request_id, card_hash, event_type, time.time(), encode(event)))
                event["sequence"] = row.lastrowid
                if event["sequence"] > 9007199254740991:
                    raise RuntimeError("Raspon brojača iscrpljen.")
                self.db.execute("UPDATE events SET payload=? WHERE sequence=?", (encode(event), event["sequence"]))
                self.fault("before_event_commit")
                self.db.execute("COMMIT")
            except BaseException:
                self.db.execute("ROLLBACK")
                raise
            self.fault("after_event_commit")
            event["acknowledgedAt"] = self.now()
            if event["acknowledgedAt"] < event["occurredAt"]:
                self.db.execute("UPDATE events SET status='interrupted',code='CLOCK_MOVED_BACKWARD' WHERE sequence=?", (event["sequence"],))
                raise RuntimeError("Sat se promijenio tijekom upisa; događaj nije potvrđen.")
            event["acknowledgementSignature"] = receipt(self.config, event)
            self.db.execute("UPDATE events SET payload=?,status='queued' WHERE sequence=?", (encode(event), event["sequence"]))
            self.fault("after_receipt_commit")
            return event

    def pending(self):
        with self.lock:
            # Never let a later event overtake an earlier pending retry.
            rows = self.db.execute("SELECT * FROM events WHERE status='queued' ORDER BY sequence LIMIT 100").fetchall()
            if not rows or rows[0]["next_retry"] > time.time():
                return []
            return [dict(row) for row in rows]

    def retry(self, rows, delay, code):
        with self.lock, self.db:
            self.db.executemany("UPDATE events SET attempts=attempts+1,next_retry=?,code=? WHERE sequence=? AND status='queued'",
                                [(time.time() + delay, code, row["sequence"]) for row in rows])

    def complete(self, rows, response):
        results = response["results"]
        with self.lock:
            self.db.execute("BEGIN IMMEDIATE")
            try:
                for row, result in zip(rows, results):
                    status = result["status"]
                    self.db.execute("UPDATE events SET status=?,code=?,server_result=?,next_retry=0 WHERE sequence=? AND status='queued'",
                                    (status, result.get("code"), encode(result), row["sequence"]))
                self.db.execute("COMMIT")
            except BaseException:
                self.db.execute("ROLLBACK")
                raise

    def snapshot(self):
        with self.lock:
            counts = dict(self.db.execute("SELECT status,count(*) FROM events GROUP BY status").fetchall())
            latest = self.db.execute("SELECT sequence,event_type,status,code FROM events ORDER BY sequence DESC LIMIT 1").fetchone()
            return {"counts": counts, "latest": dict(latest) if latest else None,
                    "sequence": latest["sequence"] if latest else 0}

    def close(self):
        self.db.close()
        self.file_lock.close()
