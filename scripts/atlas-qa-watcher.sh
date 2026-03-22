#!/usr/bin/env bash
# atlas-qa-watcher.sh
# QA watcher for PC2 (Atlas) - monitors git commits and reports changed HTML pages
# Runs on PC2 (100.119.156.59), checks for new commits every 60 seconds

set -euo pipefail

# --- Configuration ---
REPO_DIR="/home/motive/motive-team"
SUPABASE_URL="https://lylktgxngrlxmsldxdqj.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5bGt0Z3huZ3JseG1zbGR4ZHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MTQ2OTAsImV4cCI6MjA4NzM5MDY5MH0.8kgcDCMBT_STf43MVkeUUiq-K6r-Ytp3nUQ6d-nL2D0"
PC_NAME="PC2-Atlas"
CHECK_INTERVAL_SECONDS=60
STATE_FILE="/tmp/atlas-qa-watcher-last-commit"

# Pages to track for QA
TRACKED_PAGES=(
    "whistle-app.html"
    "whistle-app.htm"
    "whistle-landing.html"
    "whistle-landing.htm"
    "whistle.html"
    "whistle.htm"
    "buyer.html"
    "buyer.htm"
    "buyer-landing.html"
    "buyer-landing.htm"
    "index.html"
    "brand-guidelines.html"
)

# --- Functions ---

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

get_current_commit() {
    git -C "$REPO_DIR" rev-parse HEAD 2>/dev/null || echo ""
}

get_last_known_commit() {
    if [[ -f "$STATE_FILE" ]]; then
        cat "$STATE_FILE"
    else
        echo ""
    fi
}

save_commit() {
    echo "$1" > "$STATE_FILE"
}

is_tracked_page() {
    local file_path="$1"
    local filename
    filename=$(basename "$file_path")

    for page in "${TRACKED_PAGES[@]}"; do
        if [[ "$filename" == "$page" ]]; then
            return 0
        fi
    done
    return 1
}

report_to_supabase() {
    local commit_hash="$1"
    local commit_message="$2"
    local changed_pages="$3"
    local all_changed_files="$4"
    local commit_author="$5"
    local commit_timestamp="$6"

    local payload
    payload=$(cat <<ENDJSON
{
    "pc_name": "${PC_NAME}",
    "activity_type": "qa_commit_detected",
    "commit_hash": "${commit_hash}",
    "commit_message": $(echo "$commit_message" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read().strip()))'),
    "commit_author": $(echo "$commit_author" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read().strip()))'),
    "commit_timestamp": "${commit_timestamp}",
    "changed_pages": $(echo "$changed_pages" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read().strip()))'),
    "changed_files_count": $(echo "$all_changed_files" | grep -c '.' || echo 0),
    "details": $(echo "$all_changed_files" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read().strip()))'),
    "status": "pending_qa",
    "created_at": "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
}
ENDJSON
    )

    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "${SUPABASE_URL}/rest/v1/ai_team_activity" \
        -H "apikey: ${SUPABASE_ANON_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
        -H "Content-Type: application/json" \
        -H "Prefer: return=minimal" \
        -d "$payload")

    if [[ "$http_code" -ge 200 && "$http_code" -lt 300 ]]; then
        log "Reported to Supabase (HTTP ${http_code})"
        return 0
    else
        log "ERROR: Supabase report failed (HTTP ${http_code})"
        return 1
    fi
}

process_new_commits() {
    local last_commit="$1"
    local current_commit="$2"

    local commit_range
    if [[ -z "$last_commit" ]]; then
        commit_range="$current_commit~1..$current_commit"
    else
        commit_range="${last_commit}..${current_commit}"
    fi

    local commit_list
    commit_list=$(git -C "$REPO_DIR" log --format="%H" "$commit_range" 2>/dev/null || echo "")

    if [[ -z "$commit_list" ]]; then
        log "No new commits in range"
        return 0
    fi

    while IFS= read -r commit_hash; do
        [[ -z "$commit_hash" ]] && continue

        local commit_message
        commit_message=$(git -C "$REPO_DIR" log -1 --format="%s" "$commit_hash")

        local commit_author
        commit_author=$(git -C "$REPO_DIR" log -1 --format="%an" "$commit_hash")

        local commit_timestamp
        commit_timestamp=$(git -C "$REPO_DIR" log -1 --format="%aI" "$commit_hash")

        local all_changed_files
        all_changed_files=$(git -C "$REPO_DIR" diff-tree --no-commit-id --name-only -r "$commit_hash" 2>/dev/null || echo "")

        local changed_html_files
        changed_html_files=$(echo "$all_changed_files" | grep -E '\.(html|htm)$' || echo "")

        local changed_pages=""
        if [[ -n "$changed_html_files" ]]; then
            while IFS= read -r file; do
                [[ -z "$file" ]] && continue
                if is_tracked_page "$file"; then
                    if [[ -n "$changed_pages" ]]; then
                        changed_pages="${changed_pages}, ${file}"
                    else
                        changed_pages="$file"
                    fi
                fi
            done <<< "$changed_html_files"
        fi

        local short_hash="${commit_hash:0:8}"
        log "Commit ${short_hash}: ${commit_message}"

        if [[ -n "$changed_pages" ]]; then
            log "  Tracked pages changed: ${changed_pages}"
        fi

        if [[ -n "$changed_html_files" ]]; then
            log "  All HTML changes: $(echo "$changed_html_files" | tr '\n' ', ')"
        fi

        report_to_supabase \
            "$commit_hash" \
            "$commit_message" \
            "$changed_pages" \
            "$all_changed_files" \
            "$commit_author" \
            "$commit_timestamp" || true

    done <<< "$commit_list"
}

pull_latest() {
    git -C "$REPO_DIR" fetch origin 2>/dev/null || {
        log "WARNING: git fetch failed"
        return 1
    }
    git -C "$REPO_DIR" pull --ff-only origin main 2>/dev/null || {
        log "WARNING: git pull failed, trying reset"
        git -C "$REPO_DIR" reset --hard origin/main 2>/dev/null || true
    }
}

# --- Main Loop ---

log "Atlas QA Watcher starting"
log "Repo: ${REPO_DIR}"
log "Check interval: ${CHECK_INTERVAL_SECONDS}s"
log "Tracked pages: ${TRACKED_PAGES[*]}"

# Initialize state if needed
if [[ ! -f "$STATE_FILE" ]]; then
    current=$(get_current_commit)
    if [[ -n "$current" ]]; then
        save_commit "$current"
        log "Initialized with commit: ${current:0:8}"
    fi
fi

while true; do
    pull_latest || true

    current_commit=$(get_current_commit)
    last_commit=$(get_last_known_commit)

    if [[ -z "$current_commit" ]]; then
        log "ERROR: Could not read current commit"
        sleep "$CHECK_INTERVAL_SECONDS"
        continue
    fi

    if [[ "$current_commit" != "$last_commit" ]]; then
        log "New commits detected: ${last_commit:0:8}..${current_commit:0:8}"
        process_new_commits "$last_commit" "$current_commit"
        save_commit "$current_commit"
    fi

    sleep "$CHECK_INTERVAL_SECONDS"
done
