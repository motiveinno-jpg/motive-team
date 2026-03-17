#!/bin/bash
# ══════════════════════════════════════════════════════════════
# MOTIVE AI Team — PC 자동 셋업 (원라인 설치)
# curl -fsSL https://raw.githubusercontent.com/motiveinno-jpg/motive-team/main/pc-setup.sh | sudo bash
# ══════════════════════════════════════════════════════════════

set -euo pipefail

LOG="/home/motive/setup.log"
exec > >(tee -a "$LOG") 2>&1

echo ""
echo "═══════════════════════════════════════════"
echo "  MOTIVE AI Team — PC Auto Setup"
echo "  $(date)"
echo "═══════════════════════════════════════════"
echo ""

# ── 1. 시스템 업데이트 + 기본 패키지 ──
echo "[1/7] System packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq \
  curl wget git build-essential unzip zip jq htop tmux \
  openssh-server ufw \
  python3 python3-pip python3-venv \
  ffmpeg imagemagick \
  chromium-browser fonts-noto-cjk \
  docker.io

systemctl enable ssh
systemctl start ssh
systemctl enable docker
systemctl start docker

# motive 사용자 docker 그룹 추가
usermod -aG docker motive 2>/dev/null || true

echo "✅ System packages done"

# ── 2. Node.js 22 LTS ──
echo "[2/7] Node.js..."
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -qq nodejs
fi
echo "✅ Node.js $(node -v)"

# ── 3. Bun ──
echo "[3/7] Bun..."
if ! su - motive -c 'command -v bun' &>/dev/null; then
  su - motive -c 'curl -fsSL https://bun.sh/install | bash'
fi
echo "✅ Bun installed"

# ── 4. Claude Code CLI ──
echo "[4/7] Claude Code CLI..."
npm install -g @anthropic-ai/claude-code 2>/dev/null || true
echo "✅ Claude Code CLI installed"

# ── 5. Tailscale VPN ──
echo "[5/7] Tailscale VPN..."
if ! command -v tailscale &>/dev/null; then
  curl -fsSL https://tailscale.com/install.sh | sh
fi
systemctl enable tailscaled
systemctl start tailscaled
echo "✅ Tailscale installed"

# ── 6. Git + Repos ──
echo "[6/7] Git + Repos..."
su - motive -c 'git config --global user.name "MOTIVE AI Bot"'
su - motive -c 'git config --global user.email "ai-bot@mo-tive.com"'
su - motive -c 'mkdir -p ~/repos && cd ~/repos && git clone https://github.com/motiveinno-jpg/motive-team.git 2>/dev/null || true'

# ── 7. Worker 태스크 큐 ──
echo "[7/7] Worker setup..."
su - motive -c 'mkdir -p ~/tasks ~/tasks/done'

cat > /home/motive/worker-loop.sh << 'WORKER'
#!/bin/bash
TASK_DIR="$HOME/tasks"
DONE_DIR="$HOME/tasks/done"
mkdir -p "$TASK_DIR" "$DONE_DIR"
echo "[$(date)] Worker started on $(hostname)"
while true; do
  TASK=$(ls -1t "$TASK_DIR"/*.task 2>/dev/null | head -1)
  if [[ -n "$TASK" ]]; then
    TASK_NAME=$(basename "$TASK" .task)
    echo "[$(date)] Processing: $TASK_NAME"
    PROMPT=$(cat "$TASK")
    claude -p "$PROMPT" --output-format json > "$DONE_DIR/${TASK_NAME}.result" 2>&1
    mv "$TASK" "$DONE_DIR/${TASK_NAME}.task"
    echo "[$(date)] Completed: $TASK_NAME"
  fi
  sleep 10
done
WORKER

chmod +x /home/motive/worker-loop.sh
chown motive:motive /home/motive/worker-loop.sh

# SSH 배너
cat > /etc/motd << 'BANNER'
══════════════════════════════════════
  MOTIVE AI Worker PC
  User: motive / Pass: motive2026!

  다음 단계:
  sudo tailscale up
  (Tailscale 링크 열고 승인)
══════════════════════════════════════
BANNER

echo ""
echo "═══════════════════════════════════════════════════"
echo "  ✅ Setup Complete!"
echo "═══════════════════════════════════════════════════"
echo ""
echo "  IP: $(hostname -I | awk '{print $1}')"
echo "  SSH: ssh motive@$(hostname -I | awk '{print $1}')"
echo "  User: motive / Pass: motive2026!"
echo ""
echo "  다음 단계:"
echo "  1. sudo tailscale up  (Tailscale VPN 연결)"
echo "  2. 화면에 나오는 URL 열어서 승인"
echo "  3. 아이맥에서 SSH 연결"
echo ""
echo "═══════════════════════════════════════════════════"
