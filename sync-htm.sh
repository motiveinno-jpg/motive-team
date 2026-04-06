#!/bin/bash
# .html → .htm 자동 동기화 스크립트
# Cloudflare Pretty URLs 308 우회를 위해 .htm 파일 필수 동기화

set -e

PAIRS=(
  "whistle-app"
  "buyer-app"
  "admin"
  "whistle-main"
  "whistle-landing"
  "buyer"
  "global-landing"
  "global-buyer-landing"
  "buyer-landing"
  "terms-of-service"
  "terms-of-service-en"
  "privacy-policy"
  "privacy-policy-en"
  "refund-policy"
  "refund-policy-en"
  "domestic-analysis"
)

CHANGED=0
for name in "${PAIRS[@]}"; do
  html="${name}.html"
  htm="${name}.htm"
  if [ -f "$html" ]; then
    if [ ! -f "$htm" ] || ! diff -q "$html" "$htm" > /dev/null 2>&1; then
      cp "$html" "$htm"
      echo "✅ ${html} → ${htm} 동기화"
      CHANGED=$((CHANGED + 1))
    fi
  fi
done

if [ $CHANGED -eq 0 ]; then
  echo "✅ 모든 .htm 파일이 이미 동기화 상태입니다"
else
  echo "📋 총 ${CHANGED}개 파일 동기화 완료"
fi

# SW 캐시 버전 자동 갱신 (배포 시마다 새 버전으로 캐시 무효화)
SW_FILE="sw.js"
if [ -f "$SW_FILE" ]; then
  NEW_VERSION="whistle-v$(date '+%Y%m%d-%H%M')"
  CURRENT=$(grep -o "whistle-v[0-9A-Z_-]*" "$SW_FILE" | head -1)
  if [ "$CURRENT" != "$NEW_VERSION" ]; then
    sed -i '' "s/${CURRENT}/${NEW_VERSION}/g" "$SW_FILE" 2>/dev/null || \
    sed -i "s/${CURRENT}/${NEW_VERSION}/g" "$SW_FILE"
    echo "🔄 SW 캐시 버전 갱신: ${CURRENT} → ${NEW_VERSION}"
  fi
fi
