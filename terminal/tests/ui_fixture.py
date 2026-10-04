"""Standalone UI fixture; the real backend integration is a separate mandatory test."""
import tempfile
from terminal.server import serve
from terminal.store import Store
from terminal.sync import Sync
from terminal.tests.test_agent import config

with tempfile.TemporaryDirectory() as directory:
    store = Store(directory, {**config(), "apiOrigin": "http://127.0.0.1:9"})
    try:
        serve(store, Sync(store), 8766)
    except KeyboardInterrupt:
        pass
    finally:
        store.close()
