import argparse
import os
import sys

from .config import load
from .paths import session_directory
from .server import serve
from .store import Store
from .sync import Sync


def main():
    parser = argparse.ArgumentParser(description="BSS lokalni terminalski simulator (sintetički podaci)")
    parser.add_argument("--session", required=True, help="Naziv privatne bss-terminal-bench sesije koju je izradio launcher")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535:
        parser.error("Port mora biti između 1024 i 65535.")
    os.umask(0o077)
    try:
        directory = session_directory(args.session)
        store = Store(directory / "state", load(directory / "config.json"))
    except Exception:
        print("Terminal nije pokrenut. Provjerite privatnu konfiguraciju, prava, identitet i postojeći red.", file=sys.stderr)
        return 1
    try:
        serve(store, Sync(store), args.port)
    except KeyboardInterrupt:
        pass
    finally:
        store.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
