#!/usr/bin/env python3
"""Build the deterministic BSS Frontend v1.0.0 documentation handoff ZIP."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import tempfile
import zipfile
from pathlib import Path, PurePosixPath


PACKAGE_NAME = "BSS-Frontend-v1.0.0-Handoff"
ZIP_NAME = "BSS_Frontend_v1.0.0_Handoff.zip"
VERSION = "1.0.0"
RELEASE_TAG = "frontend-v1.0.0"
RELEASE_COMMIT = "bf880587beaa03db8428ca4edc47c643ff64c6df"
APP_BASELINE = "91323c7cdbbbbf7b965c4926c94a11af6d31bf62"
FREEZE_DATE = "2026-07-13"
REPOSITORY = "https://github.com/tgervasius-lgtm/MVP-BSS"
PRODUCTION_URL = "https://mvp-bss.pages.dev/"

SOURCE_FILES = (
    "BSS_FRONTEND_RELEASE_V1.md",
    "BSS_BACKEND_HANDOFF_V1.md",
    "BSS_SCREEN_MAP_V1.md",
    "BSS_DESIGN_SYSTEM_V1.md",
    "BSS_REPORTING_PROFILE_V1.md",
    "BSS_FRONTEND_FINAL_REVIEW_V1.md",
    "BSS_MVP_SCOPE_FREEZE_V1.md",
    "BSS_SHARED_LEAVE_CALENDAR_SCOPE_V1_1.md",
    "bss-frontend-handoff-v1.json",
    "bss-mvp-scope-v1.json",
    "openapi/bss-mvp-api-v1.yaml",
    "BACKEND_MVP_PLAN.md",
    "BSS_TECHNICAL_AUDIT_V1.md",
    "BSS_REFACTOR_V1.md",
    "CLOUDFLARE_DEPLOYMENT.md",
    "BSS_BRAND_BOOK_V1.md",
    "output/pdf/BSS_BRAND-BOOK_v1.0_11.07.2026.pdf",
    "package.json",
)

SOURCE_DIRECTORIES = (
    "design-system",
    "brand-book",
)

README = f"""# BSS Frontend v1.0.0 Handoff

Ovo je službeni dokumentacijski paket zamrznutog BSS frontend demonstratora za predaju backend programeru.

| Stavka | Vrijednost |
| --- | --- |
| Verzija | `{VERSION}` |
| Git tag | `{RELEASE_TAG}` |
| Release commit | `{RELEASE_COMMIT}` |
| Provjereni aplikacijski baseline | `{APP_BASELINE}` |
| Datum freezea | {FREEZE_DATE}. |
| Repozitorij | {REPOSITORY} |
| Produkcijski demonstrator | {PRODUCTION_URL} |
| Status | Frontend frozen; OpenAPI v1 odobren; Backend Faza A nije uključena u ZIP |

## Preporučeni redoslijed čitanja

1. `BSS_FRONTEND_RELEASE_V1.md` — službeni status, funkcije, ograničenja i freeze pravila.
2. `BSS_BACKEND_HANDOFF_V1.md` — arhitektura, sigurnosne granice i redoslijed integracije.
3. `openapi/bss-mvp-api-v1.yaml` — odobreni OpenAPI 3.1 ugovor v1; 40 putanja i 51 operacija.
4. `BSS_SCREEN_MAP_V1.md` + `bss-frontend-handoff-v1.json` — ekrani, uloge, domene i strojno čitljiv ugovor.
5. `BSS_REPORTING_PROFILE_V1.md` — XLSX/CSV format, kontrole i metapodaci.
6. `BSS_DESIGN_SYSTEM_V1.md` + `design-system/` — zaključani UI ugovor i živi vodič.
7. `BSS_MVP_SCOPE_FREEZE_V1.md` + `bss-mvp-scope-v1.json` — zaključani opseg i eksplicitna isključenja.
8. `BSS_SHARED_LEAVE_CALENDAR_SCOPE_V1_1.md` — privatnosna granica zajedničkog godišnjeg; nije backend v1 ugovor.

## Dodatne tehničke reference

- `BACKEND_MVP_PLAN.md` — fazni plan backend rada.
- `BSS_TECHNICAL_AUDIT_V1.md` — tehnički nalaz i rizici.
- `BSS_REFACTOR_V1.md` — granice dovršenog frontend refactora.
- `CLOUDFLARE_DEPLOYMENT.md` — postojeći deployment kontekst.
- `BSS_BRAND_BOOK_V1.md`, `brand-book/` i `output/pdf/` — Brand Book dokumentacija, živi vodič i završni PDF.
- `BSS_FRONTEND_FINAL_REVIEW_V1.md` — završna UX/UI i handoff provjera.

## Važne granice

- Backend Contract Review je završen; implementacija slijedi odobreni verzionirani ugovor.
- Frontend demo podaci nisu službena evidencija i ne sadrže stvarni backend, bazu ni autentikaciju.
- Serverski RBAC, tenant/scope provjere, audit i poslovni izračuni moraju biti provedeni na backendu.
- `sharedLeave`, PDF/PDF-A poslovni izvoz i ostale v1.1 stavke ne ulaze u backend v1 bez zasebne odluke.
- Aplikacijski source nije dupliciran u ovom ZIP-u; službeni kod nalazi se u repozitoriju na tagu `{RELEASE_TAG}`.

## Integritet paketa

- `MANIFEST.json` navodi svaku sadržanu datoteku, veličinu i SHA-256.
- `SHA256SUMS.txt` omogućuje provjeru svih datoteka unutar paketa.
- ZIP se gradi deterministički isključivo iz službenog release taga.
"""


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_source(source: Path) -> None:
    missing = [item for item in SOURCE_FILES if not (source / item).is_file()]
    missing += [item for item in SOURCE_DIRECTORIES if not (source / item).is_dir()]
    if missing:
        raise SystemExit("Nedostaju obvezne release datoteke: " + ", ".join(missing))

    release = (source / "BSS_FRONTEND_RELEASE_V1.md").read_text(encoding="utf-8")
    if RELEASE_TAG not in release or APP_BASELINE not in release:
        raise SystemExit("Release dokument nije usklađen s očekivanim tagom i baselineom.")

    handoff = json.loads((source / "bss-frontend-handoff-v1.json").read_text(encoding="utf-8"))
    if handoff.get("status") != "FRONTEND_FROZEN_BACKEND_CONTRACT_APPROVED":
        raise SystemExit("Handoff manifest nema frozen status.")
    if handoff.get("release", {}).get("tag") != RELEASE_TAG:
        raise SystemExit("Handoff manifest nema očekivani release tag.")
    if handoff.get("baseline", {}).get("commit") != APP_BASELINE:
        raise SystemExit("Handoff manifest nema očekivani aplikacijski baseline.")

    openapi = (source / "openapi/bss-mvp-api-v1.yaml").read_text(encoding="utf-8")
    paths_section = re.search(r"^paths:\n([\s\S]*?)^components:", openapi, re.MULTILINE)
    path_count = len(re.findall(r"^  /[^\n]+:", paths_section.group(1) if paths_section else "", re.MULTILINE))
    operation_count = len(re.findall(r"^      operationId:", openapi, re.MULTILINE))
    if (path_count, operation_count) != (40, 51):
        raise SystemExit(
            f"OpenAPI inventar nije zaključan: pronađeno {path_count} putanja i {operation_count} operacija."
        )


def source_inventory(source: Path) -> list[tuple[Path, PurePosixPath]]:
    inventory: list[tuple[Path, PurePosixPath]] = []
    for relative in SOURCE_FILES:
        path = source / relative
        if path.is_symlink():
            raise SystemExit(f"Simbolička poveznica nije dopuštena u paketu: {relative}")
        inventory.append((path, PurePosixPath(relative)))

    for directory in SOURCE_DIRECTORIES:
        root = source / directory
        for path in sorted(root.rglob("*")):
            if path.is_symlink():
                raise SystemExit(f"Simbolička poveznica nije dopuštena u paketu: {path}")
            if path.is_file():
                inventory.append((path, PurePosixPath(path.relative_to(source).as_posix())))

    destinations = [str(relative) for _, relative in inventory]
    if len(destinations) != len(set(destinations)):
        raise SystemExit("Inventar sadrži duplicirane putanje.")
    return sorted(inventory, key=lambda item: str(item[1]))


def write_text(path: Path, value: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(value.rstrip() + "\n", encoding="utf-8", newline="\n")


def build_package(source: Path, output_dir: Path) -> tuple[Path, dict[str, object]]:
    validate_source(source)
    inventory = source_inventory(source)
    output_dir.mkdir(parents=True, exist_ok=True)
    zip_path = output_dir / ZIP_NAME

    with tempfile.TemporaryDirectory(prefix="bss-handoff-") as temporary:
        package_root = Path(temporary) / PACKAGE_NAME
        package_root.mkdir()

        for source_path, relative in inventory:
            destination = package_root / Path(*relative.parts)
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source_path, destination)

        write_text(package_root / "README.md", README)
        package_info = {
            "package": "BSS Frontend v1.0.0 Handoff",
            "version": VERSION,
            "status": "FRONTEND_FROZEN_BACKEND_CONTRACT_APPROVED",
            "freezeDate": FREEZE_DATE,
            "releaseTag": RELEASE_TAG,
            "releaseCommit": RELEASE_COMMIT,
            "applicationBaseline": APP_BASELINE,
            "repository": REPOSITORY,
            "productionUrl": PRODUCTION_URL,
            "sourcePolicy": "Documentation and design references copied from the immutable release tag",
            "containsApplicationSource": False,
            "containsBackendImplementation": False,
        }
        write_text(
            package_root / "PACKAGE_INFO.json",
            json.dumps(package_info, ensure_ascii=False, indent=2, sort_keys=True),
        )

        payload_paths = sorted(
            path for path in package_root.rglob("*") if path.is_file()
        )
        manifest_entries = [
            {
                "path": path.relative_to(package_root).as_posix(),
                "bytes": path.stat().st_size,
                "sha256": sha256(path),
            }
            for path in payload_paths
        ]
        manifest = {
            "schemaVersion": 1,
            "package": "BSS Frontend v1.0.0 Handoff",
            "releaseTag": RELEASE_TAG,
            "releaseCommit": RELEASE_COMMIT,
            "fileCount": len(manifest_entries),
            "files": manifest_entries,
        }
        write_text(
            package_root / "MANIFEST.json",
            json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True),
        )

        checksum_paths = sorted(
            path
            for path in package_root.rglob("*")
            if path.is_file() and path.name != "SHA256SUMS.txt"
        )
        checksum_text = "\n".join(
            f"{sha256(path)}  {path.relative_to(package_root).as_posix()}"
            for path in checksum_paths
        )
        write_text(package_root / "SHA256SUMS.txt", checksum_text)

        if zip_path.exists():
            zip_path.unlink()
        zip_timestamp = (2026, 7, 13, 0, 0, 0)
        with zipfile.ZipFile(
            zip_path,
            mode="w",
            compression=zipfile.ZIP_DEFLATED,
            compresslevel=9,
        ) as archive:
            for path in sorted(item for item in package_root.rglob("*") if item.is_file()):
                relative = path.relative_to(package_root).as_posix()
                archive_name = f"{PACKAGE_NAME}/{relative}"
                info = zipfile.ZipInfo(archive_name, date_time=zip_timestamp)
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = 0o100644 << 16
                info.create_system = 3
                archive.writestr(info, path.read_bytes(), compresslevel=9)

    with zipfile.ZipFile(zip_path) as archive:
        corrupt = archive.testzip()
        if corrupt:
            raise SystemExit(f"ZIP provjera nije prošla za datoteku: {corrupt}")
        archive_names = set(archive.namelist())
        for required in (
            f"{PACKAGE_NAME}/README.md",
            f"{PACKAGE_NAME}/BSS_FRONTEND_RELEASE_V1.md",
            f"{PACKAGE_NAME}/BSS_BACKEND_HANDOFF_V1.md",
            f"{PACKAGE_NAME}/openapi/bss-mvp-api-v1.yaml",
            f"{PACKAGE_NAME}/MANIFEST.json",
            f"{PACKAGE_NAME}/SHA256SUMS.txt",
        ):
            if required not in archive_names:
                raise SystemExit(f"ZIP ne sadrži obveznu datoteku: {required}")

    summary = {
        "zip": str(zip_path),
        "bytes": zip_path.stat().st_size,
        "sha256": sha256(zip_path),
        "payloadFiles": len(manifest_entries),
        "archiveFiles": len(archive_names),
        "releaseTag": RELEASE_TAG,
        "releaseCommit": RELEASE_COMMIT,
    }
    return zip_path, summary


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True, help="Checkout službenog release taga")
    parser.add_argument("--output-dir", type=Path, required=True, help="Odredište ZIP paketa")
    args = parser.parse_args()

    _, summary = build_package(args.source.resolve(), args.output_dir.resolve())
    print(json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
