# FlixCam VPS paths — single source of truth.
# Source this in scripts:  . "$(dirname "$0")/paths.config.sh"   (from vps-migration/)
# Or from repo root:      . "$(dirname "$0")/scripts/vps-migration/paths.config.sh"
#
# Override with env: export PRODUCTION_APP_PATH=/home/flixcam/public_html/app

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-.}")" 2>/dev/null && pwd)"
# If SCRIPT_DIR is vps-migration, REPO_APP is app root (parent of scripts/)
[[ -n "$SCRIPT_DIR" ]] && [[ "$(basename "$SCRIPT_DIR")" == "vps-migration" ]] && REPO_APP="$(cd "$SCRIPT_DIR/../.." 2>/dev/null && pwd)" || REPO_APP=""

# Home on VPS (parent of public_html, apps, scripts, etc.)
HOME_FLIXCAM="${HOME_FLIXCAM:-/home/flixcam}"

# Production app directory. Default: single-app layout (public_html/app).
# Keep production path pinned to the real server layout.
PRODUCTION_APP_PATH="${PRODUCTION_APP_PATH:-$HOME_FLIXCAM/public_html/app}"

# Derived paths (used by backup, nginx, etc.)
SHARED_UPLOADS="${SHARED_UPLOADS:-$HOME_FLIXCAM/shared/uploads}"
SHARED_BACKUPS="${SHARED_BACKUPS:-$HOME_FLIXCAM/shared/backups}"
CONFIG_DIR="${CONFIG_DIR:-$HOME_FLIXCAM/config}"
LOGS_DIR="${LOGS_DIR:-$HOME_FLIXCAM/logs}"
PM2_CONFIG_DIR="${PM2_CONFIG_DIR:-$HOME_FLIXCAM/pm2}"
SCRIPTS_DIR="${SCRIPTS_DIR:-$HOME_FLIXCAM/scripts}"

# Export for subshells
export HOME_FLIXCAM PRODUCTION_APP_PATH SHARED_UPLOADS SHARED_BACKUPS CONFIG_DIR LOGS_DIR PM2_CONFIG_DIR SCRIPTS_DIR REPO_APP
