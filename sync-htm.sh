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
