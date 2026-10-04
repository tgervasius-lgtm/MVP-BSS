"""Bench CLI can access only this program's private temporary sessions."""
import os
import re
import tempfile
from pathlib import Path

SESSION_NAME = re.compile(r"bss-terminal-(?:bench|test|unit)-[A-Za-z0-9_-]{6,64}")


def session_directory(name):
    if not isinstance(name, str) or not SESSION_NAME.fullmatch(name):
        raise ValueError("Neispravan naziv testne sesije.")
    root = Path(tempfile.gettempdir()).resolve(strict=True)
    directory = root / name
    if directory.is_symlink() or directory.resolve(strict=True).parent != root:
        raise ValueError("Sesija mora biti neposredno u privatnoj privremenoj mapi.")
    if not directory.is_dir():
        raise ValueError("Testna sesija ne postoji.")
    if os.name != "nt" and (directory.stat().st_uid != os.getuid() or directory.stat().st_mode & 0o077):
        raise ValueError("Testna sesija mora pripadati trenutnom korisniku uz prava 0700.")
    return directory


def session_file(value, expected_name):
    path = Path(value)
    if not path.is_absolute() or path.name != expected_name or ".." in path.parts:
        raise ValueError("Putanja nije datoteka ili mapa ove testne sesije.")
    directory = session_directory(path.parent.name)
    if path.parent != directory or path.is_symlink():
        raise ValueError("Putanja napušta testnu sesiju.")
    return directory / expected_name
