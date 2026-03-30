-- Add 'cancelled' to allowed analysis statuses
-- Client code already uses 'cancelled' for user-initiated analysis cancellation
ALTER TABLE analyses DROP CONSTRAINT IF EXISTS analyses_status_check;
ALTER TABLE analyses ADD CONSTRAINT analyses_status_check
  CHECK (status = ANY (ARRAY['pending', 'analyzing', 'completed', 'review', 'approved', 'failed', 'cancelled']));
