"""Exercise the real HTTP backend. Node owns the disposable PostgreSQL fixture."""
import json
import sys
from uuid import uuid4

from terminal.config import load
from terminal.protocol import EVENT_PATH
from terminal.store import Store
from terminal.sync import Sync, Transport

config = load(sys.argv[1])
store = Store(sys.argv[2], config)
transport = Transport(config)


class LoseResponse:
    def post(self, path, payload):
        result = transport.post(path, payload)
        if path == EVENT_PATH:
            assert all(row["status"] == "synced" for row in result["results"]), result
            raise TimeoutError("synthetic response loss after server commit")
        return result


event = store.capture("04112233", "check_in", str(uuid4()), clock_status="trusted")
Sync(store, LoseResponse()).once()
assert store.snapshot()["counts"] == {"queued": 1}
store.close()
store = Store(sys.argv[2], config)
# This test advances only local retry scheduling, never immutable event time.
store.db.execute("UPDATE events SET next_retry=0")
Sync(store, transport).once()
assert store.snapshot()["counts"] == {"duplicate": 1}, store.snapshot()
store.capture("04112233", "check_out", str(uuid4()), clock_status="trusted")
Sync(store, transport).once()
store.capture("04AABBCC", "check_in", str(uuid4()))
Sync(store, transport).once()
assert store.snapshot()["counts"] == {"duplicate": 1, "synced": 1, "reconciliation_required": 1}, store.snapshot()
snapshot = store.snapshot()
store.close()
print(json.dumps({"eventId": event["deviceEventId"], **snapshot}))
