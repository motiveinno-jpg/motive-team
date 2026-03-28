#!/bin/bash
# IndexNow URL Submission Script
# Submits all public URLs to IndexNow API for instant indexing by Bing, Yandex, and others.
#
# Usage:
#   bash indexnow-submit.sh                   # Submit all public URLs
#   bash indexnow-submit.sh --sitemap-ping    # Also ping Google Search Console
#
# Prerequisites:
#   1. Place your IndexNow key file at the site root: <key>.txt
#   2. Set INDEXNOW_KEY environment variable, or the script uses the key file found in the project.

set -euo pipefail

SITE_URL="https://whistle-ai.com"
INDEXNOW_ENDPOINT="https://api.indexnow.org/indexnow"

# Find IndexNow key from environment or key file
if [ -n "${INDEXNOW_KEY:-}" ]; then
  KEY="$INDEXNOW_KEY"
elif [ -f "$(dirname "$0")/indexnow-key.txt" ]; then
  KEY=$(cat "$(dirname "$0")/indexnow-key.txt" | tr -d '[:space:]')
else
  echo "ERROR: No IndexNow key found."
  echo "Set INDEXNOW_KEY env var or create indexnow-key.txt in the project root."
  echo ""
  echo "To generate a key:"
  echo "  1. Generate a UUID: uuidgen | tr -d '-' | tr '[:upper:]' '[:lower:]'"
  echo "  2. Save it to indexnow-key.txt"
  echo "  3. Create a verification file: cp indexnow-key.txt <key-value>.txt"
  echo "  4. Deploy the verification file to your site root"
  exit 1
fi

# All public URLs to submit
URLS=(
  "${SITE_URL}/"
  "${SITE_URL}/ko"
  "${SITE_URL}/en/"
  "${SITE_URL}/global-buyer/"
  "${SITE_URL}/buyer"
  "${SITE_URL}/partner"
  "${SITE_URL}/brief"
  "${SITE_URL}/terms"
  "${SITE_URL}/terms/en"
  "${SITE_URL}/privacy"
  "${SITE_URL}/privacy/en"
  "${SITE_URL}/refund-policy"
  "${SITE_URL}/refund-policy-en"
  # Blog pages — critical for SEO traffic
  "${SITE_URL}/blog"
  "${SITE_URL}/blog/export-voucher-guide"
  "${SITE_URL}/blog/hs-code-guide"
  "${SITE_URL}/blog/alibaba-listing-guide"
  "${SITE_URL}/blog/fta-savings-guide"
  "${SITE_URL}/blog/us-export-guide"
  "${SITE_URL}/blog/japan-export-guide"
  "${SITE_URL}/blog/cosmetics-export"
  "${SITE_URL}/blog/food-export"
  "${SITE_URL}/blog/export-documents"
  "${SITE_URL}/blog/ai-export-analysis"
  # Product pages
  "${SITE_URL}/app"
  "${SITE_URL}/app/buyer"
)

echo "=== IndexNow URL Submission ==="
echo "Site: ${SITE_URL}"
echo "Key:  ${KEY:0:8}..."
echo "URLs: ${#URLS[@]}"
echo ""

# Build JSON payload for batch submission
URL_LIST=""
for url in "${URLS[@]}"; do
  if [ -n "$URL_LIST" ]; then
    URL_LIST="${URL_LIST},"
  fi
  URL_LIST="${URL_LIST}\"${url}\""
done

PAYLOAD="{\"host\":\"whistle-ai.com\",\"key\":\"${KEY}\",\"keyLocation\":\"${SITE_URL}/${KEY}.txt\",\"urlList\":[${URL_LIST}]}"

echo "Submitting batch to IndexNow API..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "${INDEXNOW_ENDPOINT}" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d "${PAYLOAD}")

if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 202 ]; then
  echo "OK (HTTP ${HTTP_STATUS}) - URLs submitted successfully"
elif [ "$HTTP_STATUS" -eq 422 ]; then
  echo "WARN (HTTP 422) - Some URLs may be invalid or key not verified"
  echo "Make sure ${SITE_URL}/${KEY}.txt is accessible"
elif [ "$HTTP_STATUS" -eq 429 ]; then
  echo "WARN (HTTP 429) - Rate limited. Try again later."
else
  echo "ERROR (HTTP ${HTTP_STATUS}) - Submission failed"
fi

echo ""

# Google Search Console sitemap ping
if [ "${1:-}" = "--sitemap-ping" ]; then
  echo "=== Google Search Console Sitemap Ping ==="
  SITEMAP_URL="${SITE_URL}/sitemap.xml"

  echo "Pinging Google with sitemap: ${SITEMAP_URL}"
  GOOGLE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    "https://www.google.com/ping?sitemap=${SITEMAP_URL}")

  if [ "$GOOGLE_STATUS" -eq 200 ]; then
    echo "OK (HTTP ${GOOGLE_STATUS}) - Google notified"
  else
    echo "WARN (HTTP ${GOOGLE_STATUS}) - Google ping may have failed"
  fi

  echo ""
  echo "Pinging Bing with sitemap: ${SITEMAP_URL}"
  BING_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    "https://www.bing.com/ping?sitemap=${SITEMAP_URL}")

  if [ "$BING_STATUS" -eq 200 ]; then
    echo "OK (HTTP ${BING_STATUS}) - Bing notified"
  else
    echo "WARN (HTTP ${BING_STATUS}) - Bing ping may have failed"
  fi
fi

echo ""
echo "Done. URLs submitted for indexing."
