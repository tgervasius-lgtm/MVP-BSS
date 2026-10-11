"""Synthetic Linux/CI proof; touches only its own random tmpfs fixture."""
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile


if os.environ.get("BSS_PDF_PARENT_SYNTHETIC_CI") != "synthetic-ci-only" or os.geteuid() != 0:
    raise SystemExit("Requires explicit synthetic CI marker and isolated CI root")
if subprocess.check_output(["/usr/bin/stat", "-f", "-c", "%T", "/dev/shm"], text=True).strip() != "tmpfs":
    raise SystemExit("Requires tmpfs; no disk fallback")

parent = Path(tempfile.mkdtemp(prefix="bss-parent-proof-", dir="/dev/shm"))
child = parent / "private"
child.mkdir(mode=0o700)
child.joinpath("synthetic.txt").write_text("synthetic-no-personal-data")
child.joinpath("synthetic.txt").chmod(0o600)


def unprivileged():
    os.setgroups([])
    os.setgid(65534)
    os.setuid(65534)


def attempt(operation):
    return subprocess.run(
        [sys.executable, "-I", "-B", "-c", operation, str(child), str(parent / "renamed")],
        preexec_fn=unprivileged, capture_output=True, text=True, timeout=5, check=False,
    )


try:
    parent.chmod(0o777)
    rename = "import os,sys; os.rename(sys.argv[1],sys.argv[2])"
    exposed = attempt(rename)
    if exposed.returncode != 0:
        raise RuntimeError("Non-sticky cross-UID rename reproduction unavailable")
    parent.joinpath("renamed").rename(child)
    parent.chmod(0o1777)
    protected = attempt(rename)
    if protected.returncode == 0 or "PermissionError" not in protected.stderr or not child.is_dir():
        raise RuntimeError("Sticky parent failed to reject cross-UID rename")
    read = attempt("from pathlib import Path; import sys; Path(sys.argv[1],'synthetic.txt').read_bytes()")
    if read.returncode == 0 or "PermissionError" not in read.stderr:
        raise RuntimeError("Private child failed to reject cross-UID read")
    print("PASS: non-sticky rename reproduced; sticky rename and private-input read denied")
finally:
    shutil.rmtree(parent)
