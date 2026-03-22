#!/usr/bin/env bash
# pc2-qa-setup.sh
# Deploys atlas-qa-watcher.sh to PC2 (Atlas) and configures it as a systemd service
# Run from the iMac (dev machine)

set -euo pipefail

PC2_HOST="motive@100.119.156.59"
PC2_REPO="/home/motive/motive-team"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WATCHER_SCRIPT="${SCRIPT_DIR}/atlas-qa-watcher.sh"
REMOTE_SCRIPT_DIR="/home/motive/motive-team/scripts"
SERVICE_NAME="atlas-qa-watcher"

echo "=== Atlas QA Watcher - PC2 Setup ==="
echo ""

# --- Step 1: Verify watcher script exists ---
if [[ ! -f "$WATCHER_SCRIPT" ]]; then
    echo "ERROR: ${WATCHER_SCRIPT} not found"
    exit 1
fi
echo "[1/5] Watcher script found"

# --- Step 2: Copy watcher script to PC2 ---
echo "[2/5] Copying watcher script to PC2..."
ssh "$PC2_HOST" "mkdir -p ${REMOTE_SCRIPT_DIR}"
scp "$WATCHER_SCRIPT" "${PC2_HOST}:${REMOTE_SCRIPT_DIR}/atlas-qa-watcher.sh"
ssh "$PC2_HOST" "chmod +x ${REMOTE_SCRIPT_DIR}/atlas-qa-watcher.sh"
echo "  Copied to ${REMOTE_SCRIPT_DIR}/atlas-qa-watcher.sh"

# --- Step 3: Verify repo exists on PC2 ---
echo "[3/5] Verifying repo on PC2..."
ssh "$PC2_HOST" "cd ${PC2_REPO} && git status --short" || {
    echo "ERROR: Repo not found at ${PC2_REPO} on PC2"
    exit 1
}
echo "  Repo OK"

# --- Step 4: Create systemd service ---
echo "[4/5] Creating systemd service..."

UNIT_FILE="[Unit]
Description=Atlas QA Watcher - monitors git commits for QA
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=motive
Group=motive
WorkingDirectory=${PC2_REPO}
ExecStart=/usr/bin/env bash ${REMOTE_SCRIPT_DIR}/atlas-qa-watcher.sh
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${SERVICE_NAME}
Environment=HOME=/home/motive

[Install]
WantedBy=multi-user.target"

ssh "$PC2_HOST" "cat > /tmp/${SERVICE_NAME}.service << 'UNIT_EOF'
${UNIT_FILE}
UNIT_EOF
sudo mv /tmp/${SERVICE_NAME}.service /etc/systemd/system/${SERVICE_NAME}.service
sudo chmod 644 /etc/systemd/system/${SERVICE_NAME}.service"

echo "  Service file created at /etc/systemd/system/${SERVICE_NAME}.service"

# --- Step 5: Enable and start the service ---
echo "[5/5] Enabling and starting service..."
ssh "$PC2_HOST" "sudo systemctl daemon-reload && \
    sudo systemctl enable ${SERVICE_NAME} && \
    sudo systemctl restart ${SERVICE_NAME}"

# --- Verify ---
echo ""
echo "=== Verifying ==="
ssh "$PC2_HOST" "sudo systemctl status ${SERVICE_NAME} --no-pager -l" || true

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Useful commands (run on PC2 or via ssh):"
echo "  Status:   sudo systemctl status ${SERVICE_NAME}"
echo "  Logs:     sudo journalctl -u ${SERVICE_NAME} -f"
echo "  Stop:     sudo systemctl stop ${SERVICE_NAME}"
echo "  Restart:  sudo systemctl restart ${SERVICE_NAME}"
echo "  Disable:  sudo systemctl disable ${SERVICE_NAME}"
