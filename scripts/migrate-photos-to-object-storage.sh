#!/usr/bin/env bash
# Phase 9a — Document bulk photo migration (run when S3/R2 is configured).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PHOTOS="${PUBLIC_UPLOADS_PATH:-$ROOT/public/photos}"

if [[ ! -d "$PHOTOS" ]]; then
  echo "No photos dir: $PHOTOS"
  exit 0
fi

count="$(find "$PHOTOS" -type f | wc -l)"
size="$(du -sh "$PHOTOS" | awk '{print $1}')"

echo "Photos on disk: $count files ($size)"
echo "Configure S3_BUCKET, S3_PUBLIC_URL, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY in .env"
echo "Then use rclone or aws cli to sync:"
echo "  rclone sync $PHOTOS remote:flixcam-photos/"
