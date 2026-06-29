#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Daily renewal-reminder email trigger for pm-tool.
#
# Runs ON THE VPS (via cron). It POSTs to the local app, which looks up every
# active + unpaid renewal that's inside its lead window (or overdue) and emails
# ONE digest (sent from leon@webby.sg via Titan SMTP) to the configured
# recipients, then stamps each so it's emailed at most once per day until paid.
#
# In-app/push reminders are handled SEPARATELY by the pg_cron job
# `pm-billing-reminders-daily` — this script only adds email and does not touch
# that path, so email is purely additive.
#
# One-time setup on the VPS:
#   1) Add these to /root/pm-tool/.env.local (server-only, gitignored):
#        SMTP_HOST=smtp.titan.email
#        SMTP_PORT=465
#        SMTP_USER=leon@webby.sg
#        SMTP_PASS=<leon@webby.sg mailbox password>
#        SMTP_FROM=Webby SG <leon@webby.sg>
#        RENEWALS_CRON_SECRET=<a long random string>
#        RENEWALS_NOTIFY_EMAILS=webdwebbysg@gmail.com   # optional, comma-separated
#      Then rebuild/restart so Next picks them up:  pm2 restart pm-tool
#   2) chmod +x /root/pm-tool/scripts/renewals-cron.sh
#   3) Schedule once a day (08:00 SGT = 00:00 UTC shown here):
#        ( crontab -l 2>/dev/null; echo "0 0 * * * /bin/bash /root/pm-tool/scripts/renewals-cron.sh" ) | crontab -
#
# Test without waiting for cron (dry run — lists what WOULD send, sends nothing):
#   curl -sS -X POST "http://127.0.0.1:3000/api/renewals/run?dry=1" -H "x-cron-secret: $RENEWALS_CRON_SECRET"
#
# Watch it:  tail -f /var/log/pm-tool-renewals.log
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_DIR="/root/pm-tool"
LOG="/var/log/pm-tool-renewals.log"
# Hit the app locally; it already runs on :3000 under pm2.
APP_URL="${APP_URL:-http://127.0.0.1:3000}"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >> "$LOG"; }

# Load RENEWALS_CRON_SECRET (and anything else) from .env.local.
if [ -f "$REPO_DIR/.env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$REPO_DIR/.env.local"
  set +a
fi

if [ -z "${RENEWALS_CRON_SECRET:-}" ]; then
  log "RENEWALS_CRON_SECRET not set in .env.local — skipping"
  exit 0
fi

RESP="$(curl -fsS -X POST "$APP_URL/api/renewals/run" \
  -H "x-cron-secret: $RENEWALS_CRON_SECRET" 2>>"$LOG" || true)"

log "renewals run: ${RESP:-<no response>}"
