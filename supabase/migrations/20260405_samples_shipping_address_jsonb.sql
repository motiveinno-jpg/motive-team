-- 2026-04-05: Add structured shipping_address JSONB column to samples table
-- Reason: Global launch blocker #5 — address fields were freeform text without country/postal validation.
-- Buyer app (buyer-app.html) now collects structured address via _buildAddressFields/_validateAddress.
-- Stored shape: { country: ISO-2, line1, line2, city, state, postal }

ALTER TABLE IF EXISTS public.samples
  ADD COLUMN IF NOT EXISTS shipping_address jsonb;

COMMENT ON COLUMN public.samples.shipping_address IS
  'Structured shipping address captured via buyer-app validation. Keys: country (ISO-2), line1, line2, city, state, postal. See _validateAddress() in buyer-app.html.';
