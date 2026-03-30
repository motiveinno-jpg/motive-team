-- Fix client_errors schema mismatch: client code sends error_type, message, stack, portal
-- but table only had error_message, error_stack. Add missing columns.
ALTER TABLE client_errors ADD COLUMN IF NOT EXISTS error_type text;
ALTER TABLE client_errors ADD COLUMN IF NOT EXISTS portal text;
ALTER TABLE client_errors ADD COLUMN IF NOT EXISTS message text;
ALTER TABLE client_errors ADD COLUMN IF NOT EXISTS stack text;

-- Add float interest rate config for admin revenue calculation
INSERT INTO revenue_config (config_key, config_value, description, is_active)
VALUES ('float_interest_rate', '{"annual_rate": 0.04, "currency": "KRW", "description": "Escrow float interest rate (annual)"}', 'Escrow 자금 보유 이자율 설정', true)
ON CONFLICT DO NOTHING;
