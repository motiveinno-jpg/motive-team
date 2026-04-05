-- Drop duplicate indexes on marketing_events flagged by performance advisor
DROP INDEX IF EXISTS public.idx_marketing_events_campaign_id;
DROP INDEX IF EXISTS public.idx_marketing_events_type;
-- Kept: idx_marketing_events_campaign, idx_marketing_events_event_type, idx_marketing_events_created_at
