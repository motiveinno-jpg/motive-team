-- Add unique index on webhook event ID for atomic idempotency
-- Prevents race condition where two concurrent webhooks with the same event ID
-- both pass the existence check before either writes the log entry
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_debug_log_message_unique
ON webhook_debug_log (message) WHERE message IS NOT NULL;
