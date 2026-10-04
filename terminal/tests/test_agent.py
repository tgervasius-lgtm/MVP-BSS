import copy
import json
import os
import sqlite3
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from contextlib import closing
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from uuid import uuid4

from terminal.config import identity, load, validate
from terminal.paths import session_directory, session_file
from terminal.protocol import EVENT_PATH, hash_card, receipt
from terminal.server import make_server
from terminal.store import Store
from terminal.sync import Sync, Transport, validate_response

UID = "04:11:22:33"


def config():
    pepper = "synthetic-bench-pepper-for-unit-tests"
    return {"mode": "synthetic-bench", "apiOrigin": "http://127.0.0.1:4173",
            "terminalId": str(uuid4()), "acknowledgementKeyId": str(uuid4()),
            "acknowledgementKeyVersion": 1, "deviceCredential": "synthetic-device-credential-unit-tests",
            "rfidPepper": pepper, "cards": [{"hash": hash_card(UID, pepper), "label": "Testni radnik"}]}


class TestAgent(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="bss-terminal-unit-")
        self.state_path = Path(self.temp.name) / "state"
        self.addCleanup(self.temp.cleanup)
        self.cfg = config()
        self.store = Store(self.state_path, self.cfg)
        self.addCleanup(lambda: self.store.close())

    def capture(self, **kwargs):
        return self.store.capture(UID, "check_in", str(uuid4()), **kwargs)

    def ready_again(self):
        self.store.db.execute("UPDATE events SET next_retry=0")

    def test_durable_receipt_and_readback_before_positive_feedback(self):
        observations = []

        def inspect(stage):
            with closing(sqlite3.connect(self.state_path / "queue.sqlite3")) as other:
                row = other.execute("SELECT status,payload FROM events").fetchone()
                observations.append((stage, row))

        self.store.fault = inspect
        event = self.capture()
        self.assertIsNone(observations[0][1])
        self.assertEqual(observations[1][1][0], "preparing")
        self.assertNotIn("acknowledgedAt", json.loads(observations[1][1][1]))
        self.assertEqual(observations[2][1][0], "queued")
        self.assertEqual(json.loads(observations[2][1][1]), event)
        self.assertEqual(receipt(self.cfg, event), event["acknowledgementSignature"])
        self.assertEqual(event["clockStatus"], "uncertain")
        self.assertEqual(self.store.db.execute("PRAGMA synchronous").fetchone()[0], 2)

    def test_immutable_evidence_and_same_attempt(self):
        request_id = str(uuid4())
        event = self.store.capture(UID, "check_in", request_id)
        self.assertEqual(self.store.capture(UID, "check_in", request_id), event)
        with self.assertRaises(ValueError):
            self.store.capture(UID, "check_out", request_id)
        with self.assertRaises(sqlite3.IntegrityError):
            self.store.db.execute("UPDATE events SET payload='{}'")
        with self.assertRaises(sqlite3.IntegrityError):
            self.store.db.execute("DELETE FROM events")

    def test_debounce_restart_and_monotonic_sequence(self):
        event = self.capture()
        self.store.close()
        self.store = Store(self.state_path, self.cfg)
        self.assertEqual(self.capture(), event)
        second = self.store.capture(UID, "check_out", str(uuid4()))
        self.assertEqual(second["sequence"], 2)
        self.assertNotEqual(event["deviceEventId"], second["deviceEventId"])

    def test_real_process_crashes_at_commit_boundaries(self):
        self.store.close()
        for stage, expected in [("before_event_commit", {}), ("after_event_commit", {"interrupted": 1}),
                                ("after_receipt_commit", {"queued": 1})]:
            with self.subTest(stage=stage), tempfile.TemporaryDirectory(prefix="bss-terminal-unit-") as directory:
                cfg_path = Path(directory) / "config.json"
                cfg_path.write_text(json.dumps(self.cfg))
                script = (
                    "import json,os,sys; from terminal.store import Store; from uuid import uuid4; "
                    "s=Store(sys.argv[1],json.load(open(sys.argv[2])),fault=lambda x:os._exit(71) if x==sys.argv[3] else None); "
                    "s.capture('04112233','check_in',str(uuid4()))")
                result = subprocess.run([sys.executable, "-c", script, str(Path(directory) / "state"), str(cfg_path), stage], check=False)
                self.assertEqual(result.returncode, 71)
                recovered = Store(Path(directory) / "state", self.cfg)
                self.assertEqual(recovered.snapshot()["counts"], expected)
                recovered.close()
        self.store = Store(self.state_path, self.cfg)

    def test_identity_binding_and_single_writer(self):
        with self.assertRaises(OSError):
            Store(self.state_path, self.cfg)
        self.store.close()
        changed = {**self.cfg, "apiOrigin": "http://127.0.0.1:9999"}
        self.assertNotEqual(identity(changed), identity(self.cfg))
        with self.assertRaises(ValueError):
            Store(self.state_path, changed)
        self.store = Store(self.state_path, self.cfg)

    def test_storage_full_unknown_card_and_clock_rollback_fail_closed(self):
        with patch("terminal.store.shutil.disk_usage") as disk:
            disk.return_value.free = 0
            with self.assertRaises(RuntimeError):
                self.capture()
        with self.assertRaises(ValueError):
            self.store.capture("FFFFFFFF", "check_in", str(uuid4()))
        self.assertEqual(self.store.snapshot()["sequence"], 0)
        times = iter(["2026-10-04T12:00:00.000Z", "2026-10-04T11:59:59.000Z"])
        self.store.now = lambda: next(times)
        with self.assertRaises(RuntimeError):
            self.capture()
        self.assertEqual(self.store.snapshot()["counts"], {"interrupted": 1})

    def test_lost_server_response_preserves_payload_and_retry_order(self):
        event = self.capture()
        self.store.capture(UID, "check_out", str(uuid4()))
        seen = []

        class Backend:
            def post(self, path, batch):
                if path != EVENT_PATH:
                    return None
                seen.append(copy.deepcopy(batch))
                if len(seen) == 1:
                    raise TimeoutError("response lost after commit")
                return {"batchId": batch["batchId"], "results": [
                    {"deviceEventId": e["deviceEventId"], "status": "duplicate"} for e in batch["events"]]}

        sender = Sync(self.store, Backend())
        sender.once()
        self.assertEqual(self.store.snapshot()["counts"], {"queued": 2})
        sender.once()
        self.assertEqual(len(seen), 1)
        self.ready_again()
        sender.once()
        self.assertEqual(seen[0]["events"], seen[1]["events"])
        self.assertEqual(seen[1]["events"][0], event)
        self.assertEqual(self.store.snapshot()["counts"], {"duplicate": 2})

    def test_malformed_response_never_dequeues(self):
        event = self.capture()
        batch = {"batchId": str(uuid4()), "events": [event]}
        good = {"batchId": batch["batchId"], "results": [{"deviceEventId": event["deviceEventId"], "status": "synced"}]}
        validate_response(batch, good)
        for response in [None, {}, {**good, "batchId": str(uuid4())}, {**good, "results": []},
                         {**good, "results": good["results"] * 2},
                         {**good, "results": [{"deviceEventId": event["deviceEventId"], "status": "queued"}]}]:
            with self.assertRaises(ValueError):
                validate_response(batch, response)

    def test_network_does_not_block_capture_and_failure_remains_visible(self):
        self.capture()
        started, release = threading.Event(), threading.Event()

        class Slow:
            def post(self, _path, _batch):
                started.set()
                release.wait(3)
                raise TimeoutError()

        sender = Sync(self.store, Slow())
        worker = threading.Thread(target=sender.once)
        worker.start()
        self.assertTrue(started.wait(2))
        before = time.monotonic()
        self.store.capture(UID, "check_out", str(uuid4()))
        self.assertLess(time.monotonic() - before, 1)
        release.set()
        worker.join()
        self.assertEqual(self.store.snapshot()["counts"], {"queued": 2})
        self.assertEqual(sender.state, "offline")

    def test_private_ui_host_origin_token_and_no_credentials(self):
        sender = Sync(self.store)
        server = make_server(self.store, sender, 0)
        worker = threading.Thread(target=server.serve_forever)
        worker.start()
        self.addCleanup(lambda: (server.shutdown(), worker.join(), server.server_close()))
        origin = f"http://127.0.0.1:{server.server_port}"
        with urlopen(origin + "/state") as response:
            body = response.read()
            state = json.loads(body)
        self.assertNotIn(self.cfg["deviceCredential"].encode(), body)
        self.assertNotIn(self.cfg["rfidPepper"].encode(), body)
        for headers in [{}, {"Host": "attacker.invalid"},
                        {"Origin": "https://attacker.invalid", "X-BSS-Local-Token": state["token"]}]:
            request = Request(origin + "/connection", data=b'{"paused":true}',
                              headers={"Content-Type": "application/json", **headers})
            with self.assertRaises(HTTPError) as error:
                urlopen(request)
            self.assertEqual(error.exception.code, 403)
        request = Request(origin + "/connection", data=b'{"paused":true}', headers={
            "Content-Type": "application/json", "Origin": origin, "X-BSS-Local-Token": state["token"]})
        with urlopen(request) as response:
            self.assertEqual(response.status, 200)
        self.assertTrue(sender.paused)

    def test_cli_session_and_fixed_file_boundaries(self):
        directory = Path(self.temp.name)
        cfg_path = directory / "config.json"
        cfg_path.write_text(json.dumps(self.cfg), encoding="utf-8")
        cfg_path.chmod(0o600)
        self.assertEqual(load(cfg_path), self.cfg)
        self.assertEqual(session_directory(directory.name), directory)
        for name in ("../outside", str(directory), "unrelated-session", "file:queue?mode=memory"):
            with self.assertRaises(ValueError):
                session_directory(name)
        for path in (directory / "secrets.json", directory / ".." / "config.json",
                     Path("config.json"), directory / "state" / "config.json"):
            with self.assertRaises(ValueError):
                load(path)
        with self.assertRaises(ValueError):
            session_file(directory / "file:queue?mode=memory", "state")
        result = subprocess.run([sys.executable, "-m", "terminal", "--session", "../outside"],
                                capture_output=True, text=True, check=False)
        self.assertEqual(result.returncode, 1)
        self.assertNotIn("Traceback", result.stderr)

    def test_session_rejects_linked_files_and_shared_permissions(self):
        # Windows link/ACL qualification remains a separate physical deployment task.
        if os.name == "nt":
            self.assertEqual(session_file(self.state_path, "state"), self.state_path)
            return
        directory = Path(self.temp.name)
        target = directory / "target.json"
        target.write_text(json.dumps(self.cfg))
        (directory / "config.json").symlink_to(target)
        with self.assertRaises(ValueError):
            load(directory / "config.json")
        self.store.close()
        (self.state_path / "agent.lock").unlink()
        (self.state_path / "agent.lock").symlink_to(target)
        with self.assertRaises(ValueError):
            Store(self.state_path, self.cfg)
        (self.state_path / "agent.lock").unlink()
        self.store = Store(self.state_path, self.cfg)
        directory.chmod(0o755)
        try:
            with self.assertRaises(ValueError):
                session_directory(directory.name)
        finally:
            directory.chmod(0o700)

    def test_production_and_remote_configuration_rejected(self):
        for changes in [{"mode": "production"}, {"apiOrigin": "http://example.com:80"},
                        {"apiOrigin": "http://127.0.0.1:80/leak"}, {"acknowledgementKeyVersion": True}]:
            with self.assertRaises(ValueError):
                validate({**self.cfg, **changes})


if __name__ == "__main__":
    unittest.main()
