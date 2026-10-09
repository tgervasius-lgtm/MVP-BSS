"""Private bounded parser. Invoked only through the isolated Linux adapter."""
import csv
import ctypes
import io
import json
import resource
import sys
import pyexpat

MAX_BYTES = 1048576


def restrict():
    # Hard address-space bound includes native libraries, buffers and heap.
    # No RLIMIT_RSS claim (Linux ignores it), and no V8 heap approximation.
    for key, maximum in ((resource.RLIMIT_AS, 256 * 1024 * 1024), (resource.RLIMIT_CPU, 3),
                         (resource.RLIMIT_CORE, 0), (resource.RLIMIT_FSIZE, 0), (resource.RLIMIT_NPROC, 0)):
        resource.setrlimit(key, (maximum, maximum))
    if sys.platform != "linux" or pyexpat.version_info < (2, 6, 0):
        raise RuntimeError("unsupported runtime")
    lib = ctypes.CDLL("libseccomp.so.2")
    lib.seccomp_init.argtypes = [ctypes.c_uint32]
    lib.seccomp_init.restype = ctypes.c_void_p
    lib.seccomp_syscall_resolve_name.argtypes = [ctypes.c_char_p]
    lib.seccomp_rule_add.argtypes = [ctypes.c_void_p, ctypes.c_uint32, ctypes.c_int, ctypes.c_uint]
    lib.seccomp_load.argtypes = [ctypes.c_void_p]
    lib.seccomp_release.argtypes = [ctypes.c_void_p]
    context = lib.seccomp_init(0x7FFF0000)  # SCMP_ACT_ALLOW; restrict dangerous syscalls below.
    if not context:
        raise RuntimeError("sandbox unavailable")
    try:
        for name in ("clone", "clone3", "fork", "vfork", "execve", "execveat", "socket", "socketpair",
                     "connect", "bind", "listen", "accept", "accept4", "ptrace", "process_vm_readv",
                     "process_vm_writev", "mount", "umount2", "unshare", "setns", "io_uring_setup"):
            number = lib.seccomp_syscall_resolve_name(name.encode("ascii"))
            if number < 0 or lib.seccomp_rule_add(context, 0x00050001, number, 0) != 0:  # EPERM
                raise RuntimeError("sandbox unavailable")
        if lib.seccomp_load(context) != 0:
            raise RuntimeError("sandbox unavailable")
    finally:
        lib.seccomp_release(context)


def table(rows):
    from archive import require
    require(2 <= len(rows) <= 1001, "ROW_LIMIT")
    headers = rows[0]
    require(5 <= len(headers) <= 6 and all(isinstance(x, str) and x.strip() and len(x) <= 80 for x in headers), "INVALID_HEADERS")
    headers = [x.strip() for x in headers]
    require(len({x.casefold() for x in headers}) == len(headers), "INVALID_HEADERS")
    # No silent omission of internal empty records. Only trailing blank records
    # can be dropped, and still counted against the physical scan envelope.
    while len(rows) > 1 and all(v == "" for v in rows[-1]):
        rows.pop()
    require(len(rows) >= 2, "ROW_LIMIT")
    result = []
    for row in rows[1:]:
        require(len(row) <= len(headers), "COLUMN_LIMIT")
        row = row + [""] * (len(headers) - len(row))
        require(any(v != "" for v in row), "EMPTY_ROW")
        for value in row:
            require(type(value) in (str, int), "UNSUPPORTED_CELL")
            if isinstance(value, str):
                require(len(value) <= 1024 and "\x00" not in value, "CELL_LIMIT")
                require(not value.lstrip().startswith(("=", "+", "-", "@")), "FORMULA_LIKE_CELL")
        result.append(row)
    return {"version": "h2-tabular-v1", "headers": headers, "rows": result}


def parse(data, format_name, delimiter):
    from archive import require, xlsx
    require(0 < len(data) <= MAX_BYTES, "FILE_LIMIT")
    if format_name == "xlsx":
        return table(xlsx(data))
    require(format_name == "csv" and delimiter in (",", ";"), "INVALID_FORMAT")
    text = data.decode("utf-8-sig", errors="strict")
    require("\x00" not in text, "INVALID_ENCODING")
    csv.field_size_limit(1024)
    reader = csv.reader(io.StringIO(text, newline=""), delimiter=delimiter, strict=True)
    rows = []
    for row in reader:
        require(len(rows) < 1001 and len(row) <= 6, "ROW_LIMIT")
        # XLSX represents missing trailing blank cells sparsely; CSV must be
        # rectangular, including explicit empty optional-email cells.
        require(not rows or not row or len(row) == len(rows[0]), "RAGGED_CSV")
        rows.append(row)
    return table(rows)


def main():
    try:
        restrict()
    except Exception:
        print('{"error":"PARSER_UNAVAILABLE"}')
        return 3
    # -I ignores PYTHONPATH; only reviewed code in the read-only /parser mount.
    sys.path.insert(0, "/parser")
    try:
        from archive import Rejected
        data = sys.stdin.buffer.read(MAX_BYTES + 1)
        if len(sys.argv) != 3:
            raise Rejected("INVALID_FORMAT")
        result = parse(data, sys.argv[1], sys.argv[2])
        print(json.dumps(result, ensure_ascii=False, separators=(",", ":")))
        return 0
    except Rejected as error:
        print(json.dumps({"error": error.code}))
        return 2
    except (ValueError, UnicodeError, csv.Error, MemoryError, RecursionError):
        print('{"error":"INVALID_FILE"}')
        return 2
    except Exception:
        # XML/ZIP/parser exceptions may contain employee values: never expose.
        print('{"error":"INVALID_FILE"}')
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
