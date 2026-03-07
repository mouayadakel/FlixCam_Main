#!/bin/bash
# ====================================
# SAFE NODE UPGRADE SCRIPT
# ====================================
# Usage: bash scripts/safe-node-upgrade.sh
# Or:    chmod +x scripts/safe-node-upgrade.sh && ./scripts/safe-node-upgrade.sh

set -e  # Exit on any error

# Load nvm if available
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

cd "/Users/mohammedalakel/Desktop/WEBSITE/FlixCamFinal 3"

echo "📌 Current Node: $(node --version)"

# 1. Install Node 20.20 (safest - same LTS line)
nvm install 20.20.0
nvm use 20.20.0

echo "✅ New Node: $(node --version)"

# 2. Clean install (KEEP package-lock.json - project rules require it)
rm -rf node_modules
npm ci

# 3. Fix available vulnerabilities
npm audit fix || true

# 4. Prisma check
npx prisma generate
npx prisma migrate status

# 5. Remove build lock only (don't kill next dev - user may have it running)
rm -f .next/lock 2>/dev/null || true
# Kill only stuck next build processes, not next dev
pkill -f "next build" 2>/dev/null || true
sleep 2

npm run build

# 6. Final report
echo ""
echo "====== FINAL STATUS ======"
echo "Node: $(node --version)"
echo "npm: $(npm --version)"
npm audit 2>&1 | tail -10
echo "=========================="
echo "✅ Done - check for errors above"
echo ""
echo "⚠️  Run 'nvm use 20.20.0' in your terminal to keep this Node version."
