#!/usr/bin/env bash
#
# marketing-outreach.sh — Trigger marketing email campaigns via Supabase Edge Functions
#
# Usage:
#   bash marketing-outreach.sh --campaign korean_mfg
#   bash marketing-outreach.sh --campaign global_buyer --dry-run
#   bash marketing-outreach.sh --campaign-id <uuid>
#   bash marketing-outreach.sh --list
#
# Environment variables (required):
#   SUPABASE_URL          — Supabase project URL
#   SUPABASE_SERVICE_KEY  — Supabase service_role key
#
# Can be sourced from .env file in the same directory.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${SCRIPT_DIR}/.gstack/marketing-logs"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
LOG_FILE="${LOG_DIR}/campaign_${TIMESTAMP}.log"

# ─── Load environment ──────────────────────────────────────

if [[ -f "${SCRIPT_DIR}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${SCRIPT_DIR}/.env"
  set +a
fi

if [[ -f "${SCRIPT_DIR}/key.sh" ]]; then
  # shellcheck disable=SC1091
  source "${SCRIPT_DIR}/key.sh"
fi

# ─── Validate environment ─────────────────────────────────

if [[ -z "${SUPABASE_URL:-}" ]]; then
  echo "ERROR: SUPABASE_URL is not set" >&2
  exit 1
fi

if [[ -z "${SUPABASE_SERVICE_KEY:-}" ]]; then
  echo "ERROR: SUPABASE_SERVICE_KEY is not set" >&2
  exit 1
fi

# ─── Parse arguments ──────────────────────────────────────

CAMPAIGN_TYPE=""
CAMPAIGN_ID=""
DRY_RUN=false
LIST_MODE=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --campaign)
      CAMPAIGN_TYPE="$2"
      shift 2
      ;;
    --campaign-id)
      CAMPAIGN_ID="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --list)
      LIST_MODE=true
      shift
      ;;
    --help|-h)
      echo "Usage: bash marketing-outreach.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --campaign TYPE     Campaign type: korean_mfg, global_buyer, global_mfg, newsletter"
      echo "  --campaign-id UUID  Run a specific campaign by ID"
      echo "  --dry-run           Preview recipients without sending"
      echo "  --list              List active campaigns"
      echo "  --help              Show this help"
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

# ─── Ensure log directory exists ──────────────────────────

mkdir -p "${LOG_DIR}"

# ─── Helper: log with timestamp ───────────────────────────

log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
  echo "$msg" | tee -a "${LOG_FILE}"
}

# ─── List campaigns ───────────────────────────────────────

if [[ "${LIST_MODE}" == "true" ]]; then
  log "Fetching active campaigns..."

  RESPONSE=$(curl -s -w "\n%{http_code}" \
    "${SUPABASE_URL}/rest/v1/marketing_campaigns?status=in.(draft,scheduled,running)&order=created_at.desc&limit=20" \
    -H "apikey: ${SUPABASE_SERVICE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
    -H "Content-Type: application/json")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')

  if [[ "$HTTP_CODE" == "200" ]]; then
    log "Active campaigns:"
    echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
  else
    log "ERROR: Failed to fetch campaigns (HTTP ${HTTP_CODE})"
    echo "$BODY" >> "${LOG_FILE}"
  fi
  exit 0
fi

# ─── Validate campaign selection ──────────────────────────

if [[ -z "${CAMPAIGN_TYPE}" && -z "${CAMPAIGN_ID}" ]]; then
  echo "ERROR: Either --campaign or --campaign-id is required" >&2
  echo "Run with --help for usage" >&2
  exit 1
fi

# ─── Build request body ──────────────────────────────────

REQUEST_BODY="{}"
if [[ -n "${CAMPAIGN_ID}" ]]; then
  REQUEST_BODY="{\"campaign_id\":\"${CAMPAIGN_ID}\",\"dry_run\":${DRY_RUN}}"
elif [[ -n "${CAMPAIGN_TYPE}" ]]; then
  REQUEST_BODY="{\"campaign_type\":\"${CAMPAIGN_TYPE}\",\"dry_run\":${DRY_RUN}}"
fi

# ─── Run campaign ─────────────────────────────────────────

CAMPAIGN_LABEL="${CAMPAIGN_TYPE:-${CAMPAIGN_ID}}"
log "Starting campaign: ${CAMPAIGN_LABEL} (dry_run=${DRY_RUN})"
log "Request: POST ${SUPABASE_URL}/functions/v1/run-marketing-campaign"

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  "${SUPABASE_URL}/functions/v1/run-marketing-campaign" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  --data "${REQUEST_BODY}" \
  --max-time 300)

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

# ─── Process response ────────────────────────────────────

if [[ "$HTTP_CODE" == "200" ]]; then
  log "Campaign completed successfully"
  log "Response:"
  echo "$BODY" | python3 -m json.tool 2>/dev/null | tee -a "${LOG_FILE}" || echo "$BODY" | tee -a "${LOG_FILE}"
else
  log "ERROR: Campaign failed (HTTP ${HTTP_CODE})"
  echo "$BODY" | python3 -m json.tool 2>/dev/null | tee -a "${LOG_FILE}" || echo "$BODY" | tee -a "${LOG_FILE}"
  exit 1
fi

log "Log saved to: ${LOG_FILE}"
