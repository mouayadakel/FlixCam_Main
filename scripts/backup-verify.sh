#!/usr/bin/env bash
#
# Verify backup integrity:
# - SHA256SUM verification
# - Tar readability/listing verification
# - Optional extraction smoke test to a temp directory
#
# Usage:
#   scripts/backup-verify.sh /backup/daily/backup-daily-full-*.tar.gz
#   scripts/backup-verify.sh /backup/daily/backup-daily-full-*.tar.bz2
#
set -euo pipefail

ARCHIVE_PATH="${1:-}"
if [[ -z "$ARCHIVE_PATH" ]]; then
  echo "Usage: backup-verify.sh /path/to/backup-*.tar.(gz|bz2)" >&2
  exit 2
fi

if [[ ! -f "$ARCHIVE_PATH" ]]; then
  echo "Archive not found: $ARCHIVE_PATH" >&2
  exit 2
fi

SHA_FILE="${ARCHIVE_PATH}.sha256"
INDEX_FILE="${ARCHIVE_PATH}.index.txt"

echo "Verifying archive: $ARCHIVE_PATH"

if [[ -f "$SHA_FILE" ]]; then
  echo "- Checking SHA256SUMS via $SHA_FILE"
  (cd "$(dirname "$ARCHIVE_PATH")" && sha256sum -c "$(basename "$SHA_FILE")")
else
  echo "- WARNING: checksum file not found: $SHA_FILE"
fi

echo "- Checking tar readability (listing)"
tar -tf "$ARCHIVE_PATH" >/dev/null

if [[ -f "$INDEX_FILE" ]]; then
  echo "- Comparing generated listing to stored index (best-effort)"
  tmp_listing="$(mktemp)"
  tar -tf "$ARCHIVE_PATH" > "$tmp_listing"
  if ! diff -q "$tmp_listing" "$INDEX_FILE" >/dev/null 2>&1; then
    echo "  WARNING: index differs from current tar listing (archive still readable)."
  fi
  rm -f "$tmp_listing"
else
  echo "- WARNING: index file not found: $INDEX_FILE"
fi

echo "- Optional smoke test: extracting manifest + db report (if present)"
tmp_dir="$(mktemp -d)"
cleanup() { rm -rf "$tmp_dir" || true; }
trap cleanup EXIT

# Try to extract a small subset; ignore if paths don’t exist (older backups).
tar -xf "$ARCHIVE_PATH" -C "$tmp_dir" --wildcards --no-anchored \
  '*/meta/db-dumps.txt' '*/manifests/*.json' '*/meta/*' 2>/dev/null || true

echo "OK: backup verified (checksum+tar)."
