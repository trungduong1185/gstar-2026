#!/usr/bin/env bash
set -euo pipefail

# ─── Deploy GStar to VPS ────────────────────────────────────────────
# Usage: bash scripts/deploy-vps.sh
#
# Creates a timestamped release, rsyncs code (WITHOUT overwriting the
# production DB, uploads, or env), builds standalone, and restarts PM2.
# ────────────────────────────────────────────────────────────────────

VPS="root@139.180.186.230"
REMOTE_ROOT="/summitnewturingai/summit.newturing.ai/public_html/gstar"
LOCAL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REMOTE_REL="$REMOTE_ROOT/releases/$TIMESTAMP"

echo "▶ Release: $TIMESTAMP"

# 1. Create release dir on server
ssh "$VPS" "mkdir -p '$REMOTE_REL'"

# 2. Rsync code — exclude DB, uploads, env, node_modules, build artifacts
rsync -avz --delete \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.git' \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='.env.production' \
  --exclude='.DS_Store' \
  --exclude='.claude/' \
  --exclude='tsconfig.tsbuildinfo' \
  --exclude='data/' \
  --exclude='data-backup*' \
  --exclude='generated/' \
  -e ssh \
  "$LOCAL_DIR/" \
  "$VPS:$REMOTE_REL/" 2>&1 | tail -5

# 3. Copy persistent assets from current release (node_modules, env, data)
ssh "$VPS" bash -s "$REMOTE_REL" "$REMOTE_ROOT" <<'REMOTE'
set -e
REL="$1"
ROOT="$2"
CUR="$ROOT/current"

if [ -d "$CUR/node_modules" ]; then
  echo "▶ Copying node_modules from current..."
  cp -a "$CUR/node_modules" "$REL/node_modules"
fi

if [ -f "$CUR/.env.local" ]; then
  cp "$CUR/.env.local" "$REL/.env.local"
fi
REMOTE

# 4. Install deps + build
echo "▶ Installing deps + building on server..."
ssh "$VPS" bash -s "$REMOTE_REL" <<'REMOTE'
set -e
REL="$1"
cd "$REL"

bash scripts/install-production-deps.sh 2>&1 | tail -3
npm run build 2>&1 | tail -10
echo "BUILD_EXIT=$?"
REMOTE

# 5. Switch symlink + restart PM2
echo "▶ Switching symlink + restarting PM2..."
ssh "$VPS" bash -s "$REMOTE_REL" "$REMOTE_ROOT" <<'REMOTE'
set -e
REL="$1"
ROOT="$2"
LNK="$ROOT/current"

ln -sfn "$REL" "$LNK"
readlink -f "$LNK"

cd "$REL"

# Check if gstar is already in PM2, if not start it
if pm2 describe gstar > /dev/null 2>&1; then
  pm2 restart gstar --update-env 2>&1 | tail -3
else
  pm2 start ecosystem.config.cjs 2>&1 | tail -3
  pm2 save
fi

sleep 3
HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3010/)
echo "Health: HTTP $HTTP"

# 6. Clean old releases (keep last 2)
ls -dt "$ROOT"/releases/*/ | tail -n +3 | xargs rm -rf 2>/dev/null || true
echo "✓ Deploy complete"
REMOTE
