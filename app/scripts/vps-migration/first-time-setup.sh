#!/usr/bin/env bash
# FlixCam first-time production setup. Run ONCE on the VPS.
# Run from: /home/flixcam/scripts/first-time-setup.sh
# Copy paths.config.sh to same dir to override PRODUCTION_APP_PATH (default: public_html/app).

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
[[ -f "$SCRIPT_DIR/paths.config.sh" ]] && . "$SCRIPT_DIR/paths.config.sh"
HOME_FLIXCAM="${HOME_FLIXCAM:-/home/flixcam}"
APP_DIR="${PRODUCTION_APP_PATH:-$HOME_FLIXCAM/public_html/app}"
CONFIG_DIR="${CONFIG_DIR:-$HOME_FLIXCAM/config}"

echo "=============================================="
echo " FlixCam First-Time Production Setup"
echo "=============================================="
echo "App dir: $APP_DIR"
echo ""

if [[ ! -d "$APP_DIR" ]]; then
  echo "ERROR: Production app not found at $APP_DIR"
  echo "Set PRODUCTION_APP_PATH or ensure app exists (e.g. public_html/app or run flixcam-migration.sh)."
  exit 1
fi

# .env may be in app dir or symlinked from config
ENV_FILE="$APP_DIR/.env"
if [[ -L "$ENV_FILE" ]]; then
  ENV_FILE="$(realpath "$ENV_FILE")"
fi
if [[ ! -f "$APP_DIR/.env" ]]; then
  echo "ERROR: No .env at $APP_DIR/.env"
  echo "Copy from .env.production.template and fill in values:"
  echo "  cp /path/to/repo/.env.production.template $APP_DIR/.env"
  echo "  nano $APP_DIR/.env"
  exit 1
fi

# --- Step 1: Verify critical .env variables ---
echo "[1/10] Verifying .env configuration..."
MISSING=
for var in NODE_ENV APP_ENV PORT APP_URL NEXTAUTH_URL DATABASE_URL NEXTAUTH_SECRET; do
  if ! grep -q "^${var}=" "$APP_DIR/.env" 2>/dev/null; then
    MISSING="$MISSING $var"
  fi
done
if [[ -n "$MISSING" ]]; then
  echo "  WARNING: Missing or empty in .env:$MISSING"
  echo "  Fix .env and re-run this script."
  exit 1
fi
grep -q "NODE_ENV=production" "$APP_DIR/.env" || { echo "  ERROR: NODE_ENV must be production"; exit 1; }
grep -q "PORT=3000" "$APP_DIR/.env" || { echo "  ERROR: PORT must be 3000 for production"; exit 1; }
echo "  OK: Critical variables present"

# --- Step 2: Install dependencies ---
echo ""
echo "[2/10] Installing dependencies (production only)..."
cd "$APP_DIR"
npm ci --omit=dev 2>/dev/null || npm install --omit=dev
echo "  OK: Dependencies installed"

# --- Step 3: Prisma generate ---
echo ""
echo "[3/10] Generating Prisma Client..."
npx prisma generate
echo "  OK: Prisma Client generated"

# --- Step 4: Database migrations ---
echo ""
echo "[4/10] Running database migrations..."
npx prisma migrate deploy
echo "  OK: Migrations applied"

# --- Step 5: Seed database ---
echo ""
echo "[5/10] Seeding database..."
if npm run db:seed 2>/dev/null; then
  echo "  OK: Seed completed"
else
  echo "  WARNING: Seed failed or not found (tsx prisma/seed.ts). You may run manually: npm run db:seed"
fi

# --- Step 6: Build ---
echo ""
echo "[6/10] Building Next.js application..."
# Turbopack fails if storage/uploads is a symlink pointing outside project; use empty dir for build then restore
UPLOADS_LINK=
if [[ -L "$APP_DIR/storage/uploads" ]]; then
  UPLOADS_LINK="$(readlink -f "$APP_DIR/storage/uploads")"
  rm -f "$APP_DIR/storage/uploads"
  mkdir -p "$APP_DIR/storage/uploads"
fi
rm -rf .next
npm run build
if [[ ! -d .next ]]; then
  echo "  ERROR: Build failed (no .next directory)"
  [[ -n "$UPLOADS_LINK" ]] && rm -rf "$APP_DIR/storage/uploads" && ln -sf "$UPLOADS_LINK" "$APP_DIR/storage/uploads"
  exit 1
fi
if [[ -n "$UPLOADS_LINK" ]]; then
  rm -rf "$APP_DIR/storage/uploads"
  ln -sf "$UPLOADS_LINK" "$APP_DIR/storage/uploads"
fi
echo "  OK: Build completed"

# --- Step 7: PM2 start ---
echo ""
echo "[7/10] Starting with PM2..."
mkdir -p "$HOME_FLIXCAM/logs/production"
if pm2 describe flixcam-production &>/dev/null; then
  pm2 restart flixcam-production --update-env
  echo "  OK: Restarted flixcam-production"
else
  pm2 start "$HOME_FLIXCAM/pm2/ecosystem.config.js" --only flixcam-production
  echo "  OK: Started flixcam-production"
fi
pm2 save
echo "  Run 'pm2 startup' and execute the printed command to enable on reboot."

# --- Step 8: Nginx reminder ---
echo ""
echo "[8/10] Nginx configuration"
if [[ -f "$HOME_FLIXCAM/shared/nginx/production.conf" ]]; then
  echo "  Copy to system: sudo cp $HOME_FLIXCAM/shared/nginx/production.conf /etc/nginx/conf.d/flixcam-production.conf"
  echo "  Then: sudo nginx -t && sudo systemctl reload nginx"
else
  echo "  WARNING: $HOME_FLIXCAM/shared/nginx/production.conf not found. Copy from repo scripts/vps-migration/nginx/production.conf"
fi

# --- Step 9: Backups ---
echo ""
echo "[9/10] Backups"
if [[ -x "$HOME_FLIXCAM/scripts/backup-db.sh" ]]; then
  "$HOME_FLIXCAM/scripts/backup-db.sh" production 2>/dev/null && echo "  OK: Initial backup run" || echo "  WARNING: Backup script failed (check DATABASE_URL)"
  echo "  Add to crontab: 0 2 * * * $HOME_FLIXCAM/scripts/backup-db.sh production"
else
  echo "  Copy backup-db.sh to $HOME_FLIXCAM/scripts/ and run manually."
fi

# --- Step 10: Verification ---
echo ""
echo "[10/10] Verification..."
sleep 3
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000 | grep -qE '200|301|302'; then
  echo "  OK: App responding on http://localhost:3000"
else
  echo "  WARNING: App not responding on port 3000. Check: pm2 logs flixcam-production"
fi
pm2 list | grep -E "flixcam-production|online" || true
echo ""
echo "=============================================="
echo " First-time setup complete."
echo " Next: Configure Nginx/SSL and test https://flixcam.rent"
echo "=============================================="
