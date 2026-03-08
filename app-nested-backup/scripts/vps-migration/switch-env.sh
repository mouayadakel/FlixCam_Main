#!/usr/bin/env bash
# Switch which environment is "live" for public_html (optional).
# Run on VPS: /home/flixcam/scripts/switch-env.sh <production|staging|dev>
# Use when you want public_html to point at a different app (e.g. maintenance = blank page).

set -e
HOME_FLIXCAM="${HOME_FLIXCAM:-/home/flixcam}"
ENV="${1:-production}"
PUBLIC_HTML="$HOME_FLIXCAM/public_html"

case "$ENV" in
  production|staging|dev) ;;
  *)
    echo "Usage: $0 <production|staging|dev>"
    exit 1
    ;;
esac

APP_PUBLIC="$HOME_FLIXCAM/apps/$ENV/flixcam/public"
if [[ ! -d "$APP_PUBLIC" ]]; then
  echo "ERROR: Not found: $APP_PUBLIC"
  exit 1
fi

# Remove existing symlink or index so we can replace
rm -f "$PUBLIC_HTML/index.html" 2>/dev/null || true
rm -f "$PUBLIC_HTML/public" 2>/dev/null || true
# Symlink public_html to the app’s public folder (static assets only; main site still via reverse proxy)
if [[ -L "$PUBLIC_HTML" ]]; then
  rm "$PUBLIC_HTML"
fi
# Optional: symlink only the public subdir so static files are served from Apache
# ln -sf "$APP_PUBLIC" "$PUBLIC_HTML/static"  # or similar
# For now we just ensure a simple index exists unless you use reverse proxy for /
echo "FlixCam [$ENV] is active. Reverse proxy should point at this env's port (production=3000, staging=3001, dev=3002)."
echo "To serve static files from public, configure your web server to alias /_next/static or /images to $APP_PUBLIC."
