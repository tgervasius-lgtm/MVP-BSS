"""Bounded OOXML inspection using Python's ZIP/XML implementations.

Only the reviewed tabular subset is supported; no workbook calculations,
external resources, recovery guesses, extraction to disk or macro execution.
"""
import io
import posixpath
import re
import stat
import struct
import zipfile
import zlib
import xml.etree.ElementTree as ET

S = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
P = "http://schemas.openxmlformats.org/package/2006/relationships"
C = "http://schemas.openxmlformats.org/package/2006/content-types"
MAX_ENTRY = 5 * 1024 * 1024
MAX_EXPANDED = 10 * 1024 * 1024
WORKBOOK = "xl/workbook.xml"
SHARED_STRINGS = "xl/sharedStrings.xml"
STYLES = "xl/styles.xml"
ALLOWED = re.compile(r"(?:\[Content_Types\]\.xml|_rels/\.rels|docProps/(?:app|core)\.xml|xl/(?:workbook\.xml|_rels/workbook\.xml\.rels|styles\.xml|sharedStrings\.xml|theme/theme\d+\.xml|worksheets/sheet\d+\.xml))\Z", re.ASCII)
REL_TYPES = {R + "/" + x for x in ("officeDocument", "worksheet", "styles", "theme", "sharedStrings", "extended-properties")}
REL_TYPES.add("http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties")
CONTENT_TYPES = {
    "application/vnd.openxmlformats-package.relationships+xml", "application/xml",
    "application/vnd.openxmlformats-package.core-properties+xml",
    "application/vnd.openxmlformats-officedocument.extended-properties+xml",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml",
    "application/vnd.openxmlformats-officedocument.theme+xml",
    # ExcelJS declares this default even in workbooks containing no VML part.
    # Actual VML files/relationships remain outside the archive allowlist.
    "application/vnd.openxmlformats-officedocument.vmlDrawing",
}


class Rejected(Exception):
    def __init__(self, code):
        self.code = code


def require(ok, code="UNSUPPORTED_XLSX"):
    if not ok:
        raise Rejected(code)


def bounded_xml(data):
    text = data.decode("utf-8-sig", errors="strict")
    require("\x00" not in text and not re.search(r"<!\s*(?:DOCTYPE|ENTITY)", text, re.I), "UNSAFE_XML")
    declaration = re.match(r"\s*<\?xml\b.*?\?>", text, re.S)
    if declaration:
        encoding = re.search(r"encoding\s*=\s*['\"]([^'\"]+)", declaration[0], re.I)
        require(not encoding or encoding[1].lower() in ("utf-8", "utf8", "us-ascii"), "UNSAFE_XML")
    root = ET.fromstring(text)
    # Bound nesting/work, even for metadata that does not become output cells.
    pending = [(root, 0)]
    count = 0
    while pending:
        element, depth = pending.pop()
        count += 1
        require(count <= 50000 and depth <= 32, "XML_LIMIT")
        pending.extend((child, depth + 1) for child in element)
    return root


def inflated(z, info, data):
    # ZipExtFile bounds reads by the advertised *uncompressed* size. Inspect
    # actual DEFLATE output independently so a forged small size/CRC cannot
    # conceal trailing decompressed content. zipfile still validates each local
    # header/name/overlap before this bounded stdlib-zlib scan.
    with z.open(info):
        # Opening alone performs zipfile's local-header/name/overlap checks.
        # Reading here would trust the advertised size instead of actual output.
        pass
    offset = info.header_offset
    require(offset >= 0 and data[offset:offset + 4] == b"PK\x03\x04", "INVALID_FORMAT")
    flags, method = struct.unpack_from("<HH", data, offset + 6)
    require(flags == info.flag_bits and method == info.compress_type, "INVALID_FORMAT")
    name_size, extra_size = struct.unpack_from("<HH", data, offset + 26)
    start = offset + 30 + name_size + extra_size
    require(start + info.compress_size <= len(data), "INVALID_FORMAT")
    compressed = data[start:start + info.compress_size]
    if info.compress_type == zipfile.ZIP_STORED:
        yield compressed
        return
    decoder = zlib.decompressobj(-15)
    tail = compressed
    while tail:
        chunk = decoder.decompress(tail, 65536)
        tail = decoder.unconsumed_tail
        yield chunk
    require(decoder.eof and not decoder.unused_data, "INVALID_FORMAT")


def validate_entry(info, seen):
    name = info.filename
    require(name not in seen, "DUPLICATE_ENTRY")
    seen.add(name)
    require(name == info.orig_filename and not re.search(r"[\\\x00:%]", name)
            and not name.startswith("/") and all(p not in ("", ".", "..") for p in name.rstrip("/").split("/")), "UNSAFE_PATH")
    mode = info.external_attr >> 16
    require(stat.S_IFMT(mode) in (0, stat.S_IFREG, stat.S_IFDIR), "UNSAFE_PATH")
    require(not info.flag_bits & 1 and info.compress_type in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED), "INVALID_FORMAT")
    if info.is_dir():
        require(name in ("_rels/", "docProps/", "xl/", "xl/_rels/", "xl/theme/", "xl/worksheets/") and info.file_size == 0)
    else:
        require(ALLOWED.fullmatch(name), "UNSUPPORTED_PART")
        require(info.file_size <= MAX_ENTRY and info.file_size <= max(1, info.compress_size) * 100, "ARCHIVE_LIMIT")


def read_entry(z, info, data, total):
    chunks = []
    size = 0
    crc = 0
    for chunk in inflated(z, info, data):
        size += len(chunk)
        total += len(chunk)
        require(size <= MAX_ENTRY and size <= max(1, info.compress_size) * 100
                and total <= MAX_EXPANDED and total <= len(data) * 100, "ARCHIVE_LIMIT")
        crc = zlib.crc32(chunk, crc)
        chunks.append(chunk)
    require(size == info.file_size, "INVALID_FORMAT")
    require(crc == info.CRC, "INVALID_FORMAT")
    return bounded_xml(b"".join(chunks)), total


def archive(data):
    require(data.startswith(b"PK\x03\x04"), "INVALID_FORMAT")
    result = {}
    total = 0
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        entries = z.infolist()
        require(0 < len(entries) <= 100, "ARCHIVE_LIMIT")
        seen = set()
        for info in entries:
            validate_entry(info, seen)
            if info.is_dir():
                continue
            result[info.filename], total = read_entry(z, info, data, total)
    for mandatory in ("[Content_Types].xml", "_rels/.rels", WORKBOOK, "xl/_rels/workbook.xml.rels"):
        require(mandatory in result, "INVALID_FORMAT")
    ct = result["[Content_Types].xml"]
    require(ct.tag == f"{{{C}}}Types")
    overrides = {}
    defaults = {}
    for entry in ct:
        require(entry.get("ContentType") in CONTENT_TYPES, "UNSUPPORTED_PART")
        if entry.tag == f"{{{C}}}Override":
            target = entry.get("PartName", "")
            require(target.startswith("/") and target[1:] in result and target not in overrides)
            overrides[target] = entry.get("ContentType")
        else:
            require(entry.tag == f"{{{C}}}Default" and entry.get("Extension") in ("rels", "xml", "vml"))
            require(entry.get("Extension") not in defaults)
            defaults[entry.get("Extension")] = entry.get("ContentType")
    require(overrides.get("/xl/workbook.xml") == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml")
    return result


def relationships(root, base, parts):
    require(root.tag == f"{{{P}}}Relationships")
    result = {}
    for rel in root:
        require(rel.tag == f"{{{P}}}Relationship" and rel.get("Type") in REL_TYPES, "UNSAFE_RELATIONSHIP")
        require(rel.get("TargetMode", "Internal") == "Internal", "UNSAFE_RELATIONSHIP")
        raw = rel.get("Target", "")
        require(raw and not re.search(r"[\\:%?#\x00]", raw), "UNSAFE_RELATIONSHIP")
        target = posixpath.normpath(raw[1:] if raw.startswith("/") else posixpath.join(base, raw))
        require(target in parts and not target.startswith("../"), "UNSAFE_RELATIONSHIP")
        ident = rel.get("Id", "")
        require(ident and ident not in result, "UNSAFE_RELATIONSHIP")
        result[ident] = (rel.get("Type"), target)
    return result


def plain_text(parent):
    children = list(parent)
    require(len(children) == 1 and children[0].tag == f"{{{S}}}t" and len(children[0]) == 0, "UNSUPPORTED_CELL")
    value = children[0].text or ""
    require(len(value) <= 1024 and "\x00" not in value, "CELL_LIMIT")
    return value


def coordinate(value):
    match = re.fullmatch(r"([A-F])([1-9]\d{0,3})", value or "", re.ASCII)
    require(match and int(match[2]) <= 1001, "CELL_LIMIT")
    return int(match[2]), ord(match[1]) - ord("A")


def workbook_document(parts):
    rootrels = relationships(parts["_rels/.rels"], "", parts)
    require([t for kind, t in rootrels.values() if kind == R + "/officeDocument"] == [WORKBOOK])
    wb = parts[WORKBOOK]
    require(wb.tag == f"{{{S}}}workbook")
    require(len(wb.findall(f"{{{S}}}sheets")) == 1, "SHEET_LIMIT")
    sheets = wb.find(f"{{{S}}}sheets")
    require(sheets is not None and len(sheets) == 1, "SHEET_LIMIT")
    sheet = sheets[0]
    require(sheet.tag == f"{{{S}}}sheet" and sheet.get("state", "visible") == "visible", "HIDDEN_DATA")
    for node in wb.iter():
        require(node.tag.split("}")[-1] not in ("definedNames", "externalReferences", "extLst"), "UNSUPPORTED_PART")
    rels = relationships(parts["xl/_rels/workbook.xml.rels"], "xl", parts)
    selected = rels.get(sheet.get(f"{{{R}}}id"))
    require(selected and selected[0] == R + "/worksheet")
    sheet_parts = [n for n in parts if n.startswith("xl/worksheets/")]
    require(sheet_parts == [selected[1]], "SHEET_LIMIT")
    for kind, expected in (("sharedStrings", SHARED_STRINGS), ("styles", STYLES)):
        require([t for k, t in rels.values() if k == R + "/" + kind] == ([expected] if expected in parts else []))
    return parts[selected[1]]


def shared_strings(parts):
    strings = []
    if SHARED_STRINGS in parts:
        sst = parts[SHARED_STRINGS]
        require(sst.tag == f"{{{S}}}sst" and len(sst) <= 6006, "CELL_LIMIT")
        for item in sst:
            require(item.tag == f"{{{S}}}si")
            strings.append(plain_text(item))
    return strings


def cell_formats(parts):
    # Excel stores dates as numeric cells + styles. Never silently use them as IDs.
    formats = [0]
    if STYLES in parts:
        require(len(parts[STYLES].findall(f"{{{S}}}cellXfs")) == 1)
        styles = parts[STYLES].find(f"{{{S}}}cellXfs")
        require(styles is not None and 0 < len(styles) <= 6006)
        formats = [int(x.get("numFmtId", "0")) for x in styles]
    return formats


def sheet_body(document):
    require(document.tag == f"{{{S}}}worksheet")
    for node in document.iter():
        local = node.tag.split("}")[-1]
        require(local not in ("f", "hyperlinks", "drawing", "legacyDrawing", "oleObjects", "extLst", "mergeCells", "tableParts"), "UNSUPPORTED_CELL")
        require(node.get("hidden", "0") in ("0", "false"), "HIDDEN_DATA")
        if local == "col":
            require(1 <= int(node.get("min", "0")) <= int(node.get("max", "0")) <= 6, "CELL_LIMIT")
    require(len(document.findall(f"{{{S}}}dimension")) <= 1, "CELL_LIMIT")
    dimension = document.find(f"{{{S}}}dimension")
    if dimension is not None:
        for end in dimension.get("ref", "").split(":"):
            coordinate(end)
    require(len(document.findall(f"{{{S}}}sheetData")) == 1, "ROW_LIMIT")
    body = document.find(f"{{{S}}}sheetData")
    require(body is not None and len(body) <= 1001, "ROW_LIMIT")
    return body


def numeric_value(raw, number_format):
    require(number_format in (0, 1), "UNSUPPORTED_CELL")
    if not raw:
        return ""
    require(re.fullmatch(r"(?:0|[1-9]\d{0,2})(?:\.0+)?", raw, re.ASCII) and float(raw) <= 366, "UNSUPPORTED_CELL")
    return int(float(raw))


def cell_value(cell, formats, strings):
    style = int(cell.get("s", "0"))
    require(0 <= style < len(formats), "UNSUPPORTED_CELL")
    children = list(cell)
    kind = cell.get("t", "n")
    if kind == "inlineStr":
        require(len(children) == 1 and children[0].tag == f"{{{S}}}is", "UNSUPPORTED_CELL")
        return plain_text(children[0])
    require(len(children) <= 1 and (not children or children[0].tag == f"{{{S}}}v"), "UNSUPPORTED_CELL")
    raw = children[0].text or "" if children else ""
    if kind == "s":
        require(re.fullmatch(r"\d{1,4}", raw, re.ASCII) and int(raw) < len(strings), "UNSUPPORTED_CELL")
        return strings[int(raw)]
    if kind == "n":
        return numeric_value(raw, formats[style])
    raise Rejected("UNSUPPORTED_CELL")


def worksheet_rows(body, formats, strings):
    rows = []
    for row in body:
        require(row.tag == f"{{{S}}}row" and int(row.get("r", "0")) == len(rows) + 1, "SPARSE_DATA")
        require(len(row) <= 6, "CELL_LIMIT")
        values = []
        for cell in row:
            require(cell.tag == f"{{{S}}}c" and not any(k in cell.attrib for k in ("cm", "vm")), "UNSUPPORTED_CELL")
            r, col = coordinate(cell.get("r"))
            require(r == len(rows) + 1 and col >= len(values), "SPARSE_DATA")
            values.extend([""] * (col - len(values)))
            values.append(cell_value(cell, formats, strings))
        rows.append(values)
    return rows


def xlsx(data):
    parts = archive(data)
    document = workbook_document(parts)
    strings = shared_strings(parts)
    formats = cell_formats(parts)
    return worksheet_rows(sheet_body(document), formats, strings)
