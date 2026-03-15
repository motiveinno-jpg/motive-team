#!/bin/bash
# Whistle AI — Git Push + Cloudflare Pages 동시 배포
# 사용법: ./deploy.sh 또는 bash deploy.sh

set -e

echo "📦 Git Push..."
git push origin main

echo ""
echo "☁️ Cloudflare Pages 배포..."
npx wrangler pages deploy . --project-name=whistle-ai --commit-dirty=true

echo ""
echo "✅ 배포 완료!"
echo "   GitHub Pages: https://motiveinno-jpg.github.io/motive-team/"
echo "   Cloudflare:   https://whistle-ai.com"
