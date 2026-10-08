#!/usr/bin/env bash
set -euo pipefail

# CI-only installation; deployment provisioning still requires owner approval.
# Official Apache-2.0 upstream Linux x86_64 release, locked to the reviewed digest.
test "${CI:-}" = "true"
test "$(uname -m)" = "x86_64"
archive_dir="$(mktemp -d)"
trap 'rm -rf "$archive_dir"' EXIT
curl --fail --silent --show-error --location --retry 2 --max-time 120 \
  https://github.com/qpdf/qpdf/releases/download/v12.4.2/qpdf-12.4.2-bin-linux-x86_64.zip \
  --output "$archive_dir/qpdf.zip"
printf '%s  %s\n' db367d897829f22c4198ce1094143c9d467bd6ee7dfabc44ba6f02056b24f8b1 "$archive_dir/qpdf.zip" | sha256sum --check --strict
sudo install -d -m 755 /opt/bss-qpdf/12.4.2
sudo unzip -q "$archive_dir/qpdf.zip" -d /opt/bss-qpdf/12.4.2
/opt/bss-qpdf/12.4.2/bin/qpdf --version
