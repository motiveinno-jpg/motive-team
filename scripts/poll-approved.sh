#!/bin/bash
# Poll for approved tasks from Supabase
# Used by Claude Opus session to detect CEO approvals in real-time

SB_URL="https://lylktgxngrlxmsldxdqj.supabase.co"
SB_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5bGt0Z3huZ3JseG1zbGR4ZHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MTQ2OTAsImV4cCI6MjA4NzM5MDY5MH0.8kgcDCMBT_STf43MVkeUUiq-K6r-Ytp3nUQ6d-nL2D0"

curl -s "${SB_URL}/rest/v1/ai_team_tasks?status=eq.approved&select=id,title,category,priority,description,current_state,improvement,expected_effect" \
  -H "apikey: ${SB_KEY}" \
  -H "Authorization: Bearer ${SB_KEY}"
