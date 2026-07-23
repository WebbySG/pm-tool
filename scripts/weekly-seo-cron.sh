#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Daily weekly-SEO task generator trigger for pm-tool.
#
# Runs ON THE VPS (via cron). It POSTs to the local app, which ensures every
# project enrolled in pm_weekly_seo_plans has the current week's SEO task set
# (Article Upload (Week N) + Article 1/2/3 subtasks + Backlinks + GMB Post),
# carries unfinished articles forward into the new week (tagged carried-over)
# and writes a `missed` tombstone into the vacated slot so missed articles
# stay visible. Idempotent — safe to run daily; weekend runs no-op; if the VPS
# was down on Monday, the next weekday run catches up.
#
# One-time setup on the VPS:
#   1) Add to /root/pm-tool/.env.local (server-only, gitignored):
#        WEEKLY_SEO_CRON_SECRET=<a long random string>
#      (If unset, the route falls back to RENEWALS_CRON_SECRET, so if renewals
#       email is already configured nothing new is needed.)
#      Then: pm2 restart pm-tool
#   2) chmod +x /root/pm-tool/scripts/weekly-seo-cron.sh
#   3) Schedule daily at 01:00 SGT (17:00 UTC):
#        ( crontab -l 2>/dev/null; echo "0 17 * * * /bin/bash /root/pm-tool/scripts/weekly-seo-cron.sh" ) | crontab -
#
# Test without waiting for cron (dry run — reports what WOULD happen):
#   curl -sS -X POST "http://127.0.0.1:3000/api/weekly-seo/run?dry=1" -H "x-cron-secret: $WEEKLY_SEO_CRON_SECRET"
#
# Watch it:  tail -f /var/log/pm-tool-weekly-seo.log
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_DIR="/root/pm-tool"
LOG="/var/log/pm-tool-weekly-seo.log"
APP_URL="${APP_URL:-http://127.0.0.1:3000}"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >> "$LOG"; }

if [ -f "$REPO_DIR/.env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$REPO_DIR/.env.local"
  set +a
fi

SECRET="${WEEKLY_SEO_CRON_SECRET:-${RENEWALS_CRON_SECRET:-}}"
if [ -z "$SECRET" ]; then
  log "WEEKLY_SEO_CRON_SECRET / RENEWALS_CRON_SECRET not set in .env.local — skipping"
  exit 0
fi

RESP="$(curl -fsS -X POST "$APP_URL/api/weekly-seo/run" \
  -H "x-cron-secret: $SECRET" 2>>"$LOG" || true)"

log "weekly-seo run: ${RESP:-<no response>}"
