#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# Pre-push safety check — run before git push to catch CI-breaking issues.
# Usage:  npm run prepush   OR   bash scripts/prepush-check.sh
# ──────────────────────────────────────────────────────────────────────
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

step() { echo -e "\n${GREEN}▶ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠  $1${NC}"; }
fail() { echo -e "${RED}✖  $1${NC}"; exit 1; }

# ── 1. Prisma schema validation ──────────────────────────────────────
step "Validating Prisma schema..."
npx prisma validate || fail "prisma validate failed"

# ── 2. Lint ──────────────────────────────────────────────────────────
step "Running lint..."
npm run lint || fail "lint failed"

# ── 3. Type check ────────────────────────────────────────────────────
step "Running type-check..."
npm run type-check || fail "type-check failed"

# ── 4. Migration safety scan ─────────────────────────────────────────
step "Scanning migrations for unsafe SQL..."
UNSAFE=0
for f in prisma/migrations/*/migration.sql; do
  # Look for DROP INDEX/COLUMN/TABLE without IF EXISTS (skip comments)
  if grep -Pn '^\s*DROP\s+(INDEX|TABLE)\s+(?!IF)' "$f" 2>/dev/null | grep -v '^.*--' > /dev/null 2>&1; then
    warn "Potentially unsafe DROP without IF EXISTS in: $f"
    grep -Pn '^\s*DROP\s+(INDEX|TABLE)\s+(?!IF)' "$f" 2>/dev/null | grep -v '^.*--' || true
    UNSAFE=1
  fi
  # Check for ALTER TABLE ... DROP COLUMN without defensive DO $$ block
  if grep -Pn '^\s*ALTER\s+TABLE.*DROP\s+COLUMN' "$f" 2>/dev/null | grep -v 'IF EXISTS' | grep -v '^.*--' > /dev/null 2>&1; then
    warn "ALTER TABLE DROP COLUMN without IF EXISTS guard in: $f"
    UNSAFE=1
  fi
done

if [ "$UNSAFE" -eq 1 ]; then
  warn "Found potentially unsafe migration SQL. Review above warnings."
  warn "Wrap DROP INDEX/TABLE with IF EXISTS, wrap DROP COLUMN in DO \$\$ blocks."
fi

# ── 5. Check migrations are tracked in git ───────────────────────────
step "Checking migration files are tracked..."
UNTRACKED=$(git ls-files --others --exclude-standard prisma/migrations/ 2>/dev/null || true)
if [ -n "$UNTRACKED" ]; then
  warn "Untracked migration files found — add them before push:"
  echo "$UNTRACKED"
fi

# ── Done ─────────────────────────────────────────────────────────────
echo -e "\n${GREEN}✅ Pre-push checks passed.${NC}"
echo "You can now: git add . && git commit -m '...' && git push"
