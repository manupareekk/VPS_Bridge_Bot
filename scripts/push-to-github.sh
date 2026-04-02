#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

ORIGIN_URL="https://github.com/manupareekk/VPS_Telegram_Bridge.git"

git add -A
git diff --staged --quiet || git commit -m "chore: sync before push"

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$ORIGIN_URL"
else
  git remote add origin "$ORIGIN_URL"
fi

git push -u origin main
echo "Pushed to $ORIGIN_URL"
