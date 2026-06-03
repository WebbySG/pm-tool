#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Pull-based self-deploy for pm-tool.
#
# Runs ON THE VPS (via cron). The VPS reaches OUT to GitHub over HTTPS (443) to
# check for new commits and, only when there are any, pulls + builds + restarts.
# This avoids needing GitHub Actions to SSH INTO the VPS (port 22), which is what
# was timing out.
#
# One-time setup on the VPS:
#   chmod +x /root/pm-tool/scripts/deploy.sh
#   ( crontab -l 2>/dev/null; echo "*/2 * * * * /bin/bash /root/pm-tool/scripts/deploy.sh" ) | crontab -
#
# Watch it:  tail -f /var/log/pm-tool-deploy.log
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_DIR="/root/pm-tool"
BRANCH="master"
LOG="/var/log/pm-tool-deploy.log"
LOCK="/tmp/pm-tool-deploy.lock"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >> "$LOG"; }

# Make node / npm / pm2 available under cron's minimal environment.
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1090
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" >/dev/null 2>&1 || true

# Prevent overlapping runs (a build can take longer than the cron interval).
exec 9>"$LOCK"
if ! flock -n 9; then
  log "another deploy is already running — skipping"
  exit 0
fi

cd "$REPO_DIR"

git fetch origin "$BRANCH" --quiet
LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse "origin/$BRANCH")"

if [ "$LOCAL" = "$REMOTE" ]; then
  exit 0   # already up to date — nothing to do
fi

log "new commit detected: ${LOCAL:0:7} -> ${REMOTE:0:7} — deploying"

# Reset tracked files to the remote (untracked files like .env.local are preserved).
git reset --hard "origin/$BRANCH" >> "$LOG" 2>&1

npm install --production=false >> "$LOG" 2>&1
npm run build >> "$LOG" 2>&1
pm2 restart pm-tool >> "$LOG" 2>&1

log "deploy complete (now at ${REMOTE:0:7})"
