#!/bin/bash
# ============================================
# 맥북 초기 세팅 스크립트
# 아이맥과 동일한 환경 자동 구성
# ============================================

set -e
echo ""
echo "========================================="
echo "  모티브이노베이션 맥북 세팅 시작"
echo "========================================="
echo ""

# 색상
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

step() { echo -e "${GREEN}[$1/8]${NC} $2"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }

# ─────────────────────────────────────
# 1. Homebrew 설치 (없으면)
# ─────────────────────────────────────
step 1 "Homebrew 확인..."
if ! command -v brew &>/dev/null; then
  echo "Homebrew 설치 중... (비밀번호 입력 필요)"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  # Apple Silicon Mac 경로 추가
  if [ -f "/opt/homebrew/bin/brew" ]; then
    echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
    eval "$(/opt/homebrew/bin/brew shellenv)"
  fi
  echo "✅ Homebrew 설치 완료"
else
  echo "✅ Homebrew 이미 설치됨"
fi

# ─────────────────────────────────────
# 2. Git 설정
# ─────────────────────────────────────
step 2 "Git 설정..."
git config --global user.name "motiveinno-jpg"
git config --global user.email "creative@mo-tive.com"
echo "✅ Git 설정 완료"

# ─────────────────────────────────────
# 3. Node.js 설치 (Claude Code 필요)
# ─────────────────────────────────────
step 3 "Node.js 확인..."
if ! command -v node &>/dev/null; then
  brew install node
  echo "✅ Node.js 설치 완료"
else
  echo "✅ Node.js 이미 설치됨 ($(node -v))"
fi

# ─────────────────────────────────────
# 4. Claude Code CLI 설치
# ─────────────────────────────────────
step 4 "Claude Code CLI 설치..."
if ! command -v claude &>/dev/null; then
  npm install -g @anthropic-ai/claude-code
  echo "✅ Claude Code 설치 완료"
else
  echo "✅ Claude Code 이미 설치됨"
fi

# ─────────────────────────────────────
# 5. 프로젝트 클론
# ─────────────────────────────────────
step 5 "motive-team 프로젝트 클론..."
cd ~
if [ -d "motive-team" ]; then
  echo "✅ motive-team 이미 존재 — pull 실행"
  cd motive-team && git pull origin main --quiet
else
  echo "GitHub 토큰을 입력해주세요 (아이맥 .git/config에서 확인 가능):"
  read -s GH_TOKEN
  git clone "https://motiveinno-jpg:${GH_TOKEN}@github.com/motiveinno-jpg/motive-team.git"
  cd motive-team
  echo "✅ 프로젝트 클론 완료"
fi

# ─────────────────────────────────────
# 6. Git Hooks 설정 (아이맥과 동일)
# ─────────────────────────────────────
step 6 "Git Hooks 설정..."

# pre-commit: .html → .htm 자동 동기화
cat > .git/hooks/pre-commit << 'HOOK'
#!/bin/bash
PAIRS=("whistle-app" "buyer-app" "admin" "whistle-main" "whistle-landing" "buyer" "global-landing" "global-buyer-landing" "buyer-landing" "terms-of-service" "terms-of-service-en" "privacy-policy" "privacy-policy-en" "refund-policy" "refund-policy-en")
SYNCED=0
for name in "${PAIRS[@]}"; do
  html="${name}.html"
  htm="${name}.htm"
  if git diff --cached --name-only | grep -q "^${html}$"; then
    if [ -f "$html" ]; then
      cp "$html" "$htm"
      git add "$htm"
      SYNCED=$((SYNCED + 1))
      echo "🔄 Auto-synced: ${html} → ${htm}"
    fi
  fi
done
if [ $SYNCED -gt 0 ]; then
  echo "✅ ${SYNCED}개 .htm 파일 자동 동기화 완료"
fi
exit 0
HOOK
chmod +x .git/hooks/pre-commit

# post-commit: 커밋 후 자동 push
cat > .git/hooks/post-commit << 'HOOK'
#!/bin/bash
echo "🚀 자동 push 중..."
git push origin main 2>&1
if [ $? -eq 0 ]; then
  echo "✅ 자동 push 완료 — 모든 디바이스에서 최신 상태"
else
  echo "⚠️ push 실패 — 네트워크 확인 필요"
fi
HOOK
chmod +x .git/hooks/post-commit

echo "✅ Git Hooks 설정 완료 (pre-commit + post-commit)"

# ─────────────────────────────────────
# 7. 자동 동기화 (5분마다)
# ─────────────────────────────────────
step 7 "자동 동기화 서비스 설정..."

# 동기화 스크립트
mkdir -p ~/.claude/hooks/scripts ~/.claude/logs
cat > ~/.claude/hooks/scripts/auto-git-sync.sh << 'SYNC'
#!/bin/bash
REPO_DIR="$HOME/motive-team"
if [ -d "$REPO_DIR/.git" ]; then
  cd "$REPO_DIR"
  git fetch origin main --quiet 2>/dev/null
  if [ -z "$(git status --porcelain)" ]; then
    git pull origin main --quiet 2>/dev/null
  else
    git stash --quiet 2>/dev/null
    git pull origin main --quiet 2>/dev/null
    git stash pop --quiet 2>/dev/null
  fi
fi
SYNC
chmod +x ~/.claude/hooks/scripts/auto-git-sync.sh

# launchd 서비스 (5분마다 자동 pull)
mkdir -p ~/Library/LaunchAgents
cat > ~/Library/LaunchAgents/com.motive.git-auto-sync.plist << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.motive.git-auto-sync</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>${HOME}/.claude/hooks/scripts/auto-git-sync.sh</string>
    </array>
    <key>StartInterval</key>
    <integer>300</integer>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${HOME}/.claude/logs/git-sync.log</string>
    <key>StandardErrorPath</key>
    <string>${HOME}/.claude/logs/git-sync-error.log</string>
    <key>WorkingDirectory</key>
    <string>${HOME}/motive-team</string>
</dict>
</plist>
PLIST

launchctl unload ~/Library/LaunchAgents/com.motive.git-auto-sync.plist 2>/dev/null
launchctl load ~/Library/LaunchAgents/com.motive.git-auto-sync.plist
echo "✅ 5분 자동 동기화 서비스 활성화"

# ─────────────────────────────────────
# 8. Tailscale 설치 (아이맥 원격 접속용)
# ─────────────────────────────────────
step 8 "Tailscale 확인..."
if ! command -v tailscale &>/dev/null; then
  brew install --cask tailscale
  echo "✅ Tailscale 설치 완료 — 앱을 열어서 로그인해주세요"
else
  echo "✅ Tailscale 이미 설치됨"
fi

# ─────────────────────────────────────
# 완료
# ─────────────────────────────────────
echo ""
echo "========================================="
echo "  🎉 맥북 세팅 완료!"
echo "========================================="
echo ""
echo "  설치된 것:"
echo "  ✅ Homebrew"
echo "  ✅ Node.js + Claude Code CLI"
echo "  ✅ motive-team 프로젝트"
echo "  ✅ Git Hooks (자동 .htm 동기화 + 자동 push)"
echo "  ✅ 5분 자동 동기화 서비스"
echo "  ✅ Tailscale (아이맥 원격 접속)"
echo ""
echo "  다음 할 일:"
echo "  1. 터미널에서: claude  (Claude Code 로그인)"
echo "  2. Claude Desktop 앱 설치: https://claude.ai/download"
echo "  3. Tailscale 앱 열어서 로그인"
echo ""
echo "  사용법:"
echo "  • 터미널 열고 cd ~/motive-team && claude"
echo "  • 아이맥에서 하던 작업 그대로 이어서 가능"
echo "========================================="
