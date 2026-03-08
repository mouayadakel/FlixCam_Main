#!/usr/bin/env bash
# DEPRECATED: This script previously deployed to public_html/FlixCam_Main/FlixCam_Main,
# which has been removed. The app now runs directly from the repo root (/home/flixcam.rent).
#
# This script now redirects to server-build-restart.sh.
# Preferred usage:
#   ./scripts/pull-and-deploy.sh          # pull + build + restart
#   ./scripts/server-build-restart.sh     # build + restart only
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "⚠️  deploy-to-flixcam-main.sh is DEPRECATED."
echo "    Redirecting to server-build-restart.sh..."
echo ""
exec "$SCRIPT_DIR/server-build-restart.sh"
