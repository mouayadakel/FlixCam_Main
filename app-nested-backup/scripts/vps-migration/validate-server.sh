#!/usr/bin/env bash
# Validate VPS structure and runtime assumptions.
# Run on VPS: /home/flixcam/scripts/validate-server.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
[[ -f "$SCRIPT_DIR/paths.config.sh" ]] && . "$SCRIPT_DIR/paths.config.sh"

HOME_FLIXCAM="${HOME_FLIXCAM:-/home/flixcam}"
PRODUCTION_APP_PATH="${PRODUCTION_APP_PATH:-$HOME_FLIXCAM/public_html/app}"
SHARED_UPLOADS="${SHARED_UPLOADS:-$HOME_FLIXCAM/shared/uploads}"
SHARED_BACKUPS="${SHARED_BACKUPS:-$HOME_FLIXCAM/shared/backups}"

FAIL=0

ok() { echo "OK: $1"; }
err() { echo "ERROR: $1"; FAIL=1; }

echo "=== FlixCam VPS validation ==="
echo "HOME_FLIXCAM=$HOME_FLIXCAM"
echo "PRODUCTION_APP_PATH=$PRODUCTION_APP_PATH"
echo ""

[[ -d "$PRODUCTION_APP_PATH" ]] && ok "Production app directory exists" || err "Missing app dir: $PRODUCTION_APP_PATH"
[[ -f "$PRODUCTION_APP_PATH/package.json" ]] && ok "package.json exists" || err "Missing package.json in $PRODUCTION_APP_PATH"
[[ -f "$PRODUCTION_APP_PATH/.env" ]] && ok ".env exists" || err "Missing .env in $PRODUCTION_APP_PATH"
[[ -d "$SHARED_UPLOADS" ]] && ok "shared uploads exists" || err "Missing shared uploads dir: $SHARED_UPLOADS"
[[ -d "$SHARED_BACKUPS" ]] && ok "shared backups exists" || err "Missing shared backups dir: $SHARED_BACKUPS"

if command -v pm2 >/dev/null 2>&1; then
  PM2_CWD=$(pm2 jlist 2>/dev/null | node -e '
    let s=""; process.stdin.on("data",d=>s+=d).on("end",()=>{
      try {
        const arr = JSON.parse(s||"[]");
        const p = arr.find(x => (x.name||"").includes("flixcam") && x.pm2_env && x.pm2_env.pm_cwd);
        process.stdout.write(p?.pm2_env?.pm_cwd || "");
      } catch { process.stdout.write(""); }
    });
  ')
  if [[ -n "$PM2_CWD" ]]; then
    [[ "$PM2_CWD" == "$PRODUCTION_APP_PATH" ]] \
      && ok "PM2 cwd matches PRODUCTION_APP_PATH" \
      || err "PM2 cwd mismatch: $PM2_CWD (expected $PRODUCTION_APP_PATH)"
  else
    echo "WARN: Could not detect PM2 app cwd (is app started?)"
  fi
else
  echo "WARN: pm2 not found on PATH"
fi

echo ""
if [[ $FAIL -eq 0 ]]; then
  echo "Validation PASSED"
  exit 0
else
  echo "Validation FAILED"
  exit 1
fi

