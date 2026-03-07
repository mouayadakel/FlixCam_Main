#!/usr/bin/env bash
# Run Next.js build. If storage/uploads is a symlink pointing outside the project,
# Turbopack fails; temporarily replace it with an empty dir for the build, then restore.
set -e
cd "$(dirname "$0")/.."
HOME_FLIXCAM="${HOME_FLIXCAM:-/home/flixcam}"

# Ensure production env file exists before Prisma-powered build steps run.
if [[ ! -e .env ]]; then
  if [[ -f "$HOME_FLIXCAM/config/.env.production" ]]; then
    ln -sfn "$HOME_FLIXCAM/config/.env.production" .env
    echo "Linked .env -> $HOME_FLIXCAM/config/.env.production"
  else
    echo "ERROR: Missing .env in $(pwd)"
    echo "Create $(pwd)/.env or provide $HOME_FLIXCAM/config/.env.production"
    exit 1
  fi
fi

UPLOADS_LINK=
if [[ -L storage/uploads ]]; then
  UPLOADS_LINK="$(readlink -f storage/uploads)"
  rm -f storage/uploads
  mkdir -p storage/uploads
fi
rm -rf .next
if npx next build "$@"; then
  BUILD_OK=1
else
  BUILD_OK=
fi
if [[ -n "$UPLOADS_LINK" ]]; then
  rm -rf storage/uploads
  ln -sf "$UPLOADS_LINK" storage/uploads
fi
[[ -n "$BUILD_OK" ]] && exit 0 || exit 1
