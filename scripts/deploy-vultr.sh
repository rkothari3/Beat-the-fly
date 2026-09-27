#!/usr/bin/env bash
# Run on the Vultr box after git pull. Keeps server/.env (Tiger) untouched.
set -euo pipefail

ROOT="${DEPLOY_ROOT:-/var/www/beat-the-fly}"
API_URL="${VITE_API_URL:-https://www.beattheflyapp.tech}"

cd "$ROOT"

if [[ -d .git ]]; then
  git fetch origin
  git reset --hard "origin/${DEPLOY_BRANCH:-main}"
fi

cd "$ROOT/server"
npm install --omit=dev

cd "$ROOT/app"
npm install
export VITE_API_URL="$API_URL"
npm run build

# Match API — env comes from server/.env (DATABASE_URL), not from git
cd "$ROOT/server"
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi
pm2 delete beat-match >/dev/null 2>&1 || true
pm2 start index.mjs --name beat-match
pm2 save

nginx -t && systemctl reload nginx
echo "Deployed $(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo local) → $API_URL"
