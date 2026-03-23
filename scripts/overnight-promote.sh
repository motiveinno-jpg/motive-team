#!/usr/bin/env bash
# overnight-promote.sh — Automated overnight marketing tasks for Whistle AI
#
# Crontab example (run every day at 3:00 AM KST):
#   0 3 * * * /Users/motive/motive-team/scripts/overnight-promote.sh >> /var/log/overnight-promote.log 2>&1
#
# Required environment variables:
#   INDEXNOW_KEY          — IndexNow API key
#   SUPABASE_URL          — Supabase project URL (e.g. https://xxx.supabase.co)
#   SUPABASE_SERVICE_KEY  — Supabase service_role key
#   TELEGRAM_BOT_TOKEN    — Telegram bot token (@motive_hajun_bot)
#   TELEGRAM_CHAT_ID      — CEO chat ID for notifications

set -euo pipefail

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log_error() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
}

# ---------------------------------------------------------------------------
# Environment validation
# ---------------------------------------------------------------------------
REQUIRED_VARS=(INDEXNOW_KEY SUPABASE_URL SUPABASE_SERVICE_KEY TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID)
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    MISSING_VARS+=("$var")
  fi
done

if [[ ${#MISSING_VARS[@]} -gt 0 ]]; then
  log_error "Missing required environment variables: ${MISSING_VARS[*]}"
  exit 1
fi

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
SITE_HOST="whistle-ai.com"
SITEMAP_URL="https://${SITE_HOST}/sitemap.xml"

INDEXNOW_URLS=(
  "https://${SITE_HOST}/ko"
  "https://${SITE_HOST}/en"
  "https://${SITE_HOST}/ko#partner"
  "https://${SITE_HOST}/en#partner"
)

INDEXNOW_ENDPOINTS=(
  "https://api.indexnow.org/indexnow"
  "https://www.bing.com/indexnow"
  "https://yandex.com/indexnow"
  "https://searchadvisor.naver.com/indexnow"
)

COMPETITOR_SITES=(
  "https://tradelinx.co.kr"
  "https://buykorea.org"
  "https://ec21.com"
)

REPORT_DATE=$(date '+%Y-%m-%d')

# ---------------------------------------------------------------------------
# 1. IndexNow Submission
# ---------------------------------------------------------------------------
indexnow_submit() {
  log "=== IndexNow Submission ==="

  local payload
  payload=$(cat <<JSONEOF
{
  "host": "${SITE_HOST}",
  "key": "${INDEXNOW_KEY}",
  "urlList": [
    "https://${SITE_HOST}/ko",
    "https://${SITE_HOST}/en",
    "https://${SITE_HOST}/ko#partner",
    "https://${SITE_HOST}/en#partner"
  ]
}
JSONEOF
)

  for endpoint in "${INDEXNOW_ENDPOINTS[@]}"; do
    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" \
      -X POST "$endpoint" \
      -H "Content-Type: application/json" \
      -d "$payload" \
      --connect-timeout 10 \
      --max-time 30) || true

    if [[ "$http_code" -ge 200 && "$http_code" -lt 300 ]]; then
      log "  IndexNow OK ($http_code): $endpoint"
    else
      log_error "  IndexNow failed ($http_code): $endpoint"
    fi
  done
}

# ---------------------------------------------------------------------------
# 2. SEO Ping (Google & Bing sitemaps)
# ---------------------------------------------------------------------------
seo_ping() {
  log "=== SEO Sitemap Ping ==="

  local google_code
  google_code=$(curl -s -o /dev/null -w "%{http_code}" \
    "https://www.google.com/ping?sitemap=${SITEMAP_URL}" \
    --connect-timeout 10 \
    --max-time 30) || true
  log "  Google ping: HTTP $google_code"

  local bing_code
  bing_code=$(curl -s -o /dev/null -w "%{http_code}" \
    "https://www.bing.com/ping?sitemap=${SITEMAP_URL}" \
    --connect-timeout 10 \
    --max-time 30) || true
  log "  Bing ping: HTTP $bing_code"
}

# ---------------------------------------------------------------------------
# 3. Daily Report — query Supabase for key metrics
# ---------------------------------------------------------------------------
supabase_query() {
  local sql="$1"
  curl -s \
    "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
    -H "apikey: ${SUPABASE_SERVICE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"$sql\"}" \
    --connect-timeout 10 \
    --max-time 30 2>/dev/null || echo "error"
}

supabase_count() {
  local table="$1"
  local filter="${2:-}"
  local url="${SUPABASE_URL}/rest/v1/${table}?select=count"

  if [[ -n "$filter" ]]; then
    url="${url}&${filter}"
  fi

  local result
  result=$(curl -s \
    "$url" \
    -H "apikey: ${SUPABASE_SERVICE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
    -H "Prefer: count=exact" \
    -H "Range: 0-0" \
    -I \
    --connect-timeout 10 \
    --max-time 30 2>/dev/null) || true

  # Extract count from Content-Range header: */N
  local count
  count=$(echo "$result" | grep -i 'content-range' | sed 's/.*\///' | tr -d '[:space:]') || true

  if [[ -z "$count" || "$count" == "0" ]]; then
    echo "0"
  else
    echo "$count"
  fi
}

generate_report() {
  log "=== Daily Report Generation ==="

  local today="${REPORT_DATE}"

  local total_users
  total_users=$(supabase_count "users")
  log "  Total users: $total_users"

  local today_analyses
  today_analyses=$(supabase_count "analyses" "created_at=gte.${today}T00:00:00Z&created_at=lt.${today}T23:59:59Z")
  log "  Analyses today: $today_analyses"

  local today_emails
  today_emails=$(supabase_count "outreach_sends" "sent_at=gte.${today}T00:00:00Z&sent_at=lt.${today}T23:59:59Z")
  log "  Outreach emails today: $today_emails"

  local today_contacts
  today_contacts=$(supabase_count "outreach_contacts" "created_at=gte.${today}T00:00:00Z&created_at=lt.${today}T23:59:59Z")
  log "  New contacts today: $today_contacts"

  # Build report message
  DAILY_REPORT=$(cat <<MSG
[Whistle AI Daily Report]
Date: ${today}

Total Users: ${total_users}
Analyses Today: ${today_analyses}
Outreach Emails Today: ${today_emails}
New Contacts Today: ${today_contacts}

-- overnight-promote.sh
MSG
)

  log "  Report generated."
}

# ---------------------------------------------------------------------------
# 4. Telegram Bot Notification
# ---------------------------------------------------------------------------
send_telegram() {
  log "=== Telegram Notification ==="

  if [[ -z "${DAILY_REPORT:-}" ]]; then
    log_error "  No report to send. Skipping."
    return
  fi

  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -H "Content-Type: application/json" \
    -d "$(jq -n \
      --arg chat_id "$TELEGRAM_CHAT_ID" \
      --arg text "$DAILY_REPORT" \
      '{chat_id: $chat_id, text: $text, parse_mode: "HTML"}')" \
    --connect-timeout 10 \
    --max-time 30) || true

  if [[ "$http_code" -ge 200 && "$http_code" -lt 300 ]]; then
    log "  Telegram sent OK ($http_code)"
  else
    log_error "  Telegram send failed ($http_code)"
  fi
}

# ---------------------------------------------------------------------------
# 5. Competitor Monitoring
# ---------------------------------------------------------------------------
monitor_competitors() {
  log "=== Competitor Monitoring ==="

  for site in "${COMPETITOR_SITES[@]}"; do
    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" \
      -L "$site" \
      --connect-timeout 10 \
      --max-time 30) || true
    log "  ${site} — HTTP $http_code"
  done
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  log "=========================================="
  log "overnight-promote.sh started"
  log "=========================================="

  indexnow_submit
  seo_ping
  generate_report
  send_telegram
  monitor_competitors

  log "=========================================="
  log "overnight-promote.sh completed"
  log "=========================================="
}

main
