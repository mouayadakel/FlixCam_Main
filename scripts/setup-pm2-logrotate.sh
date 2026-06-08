#!/usr/bin/env bash
# Install and configure pm2-logrotate on the VPS (run once as root).
set -euo pipefail

if ! command -v pm2 >/dev/null 2>&1; then
  echo "pm2 not found"
  exit 1
fi

pm2 install pm2-logrotate || true
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 14
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
pm2 set pm2-logrotate:workerInterval 3600
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'

echo "pm2-logrotate configured"
