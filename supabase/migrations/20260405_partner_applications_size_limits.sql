-- Add size/enum CHECK constraints on public-facing partner_applications intake
ALTER TABLE public.partner_applications
  ADD CONSTRAINT partner_applications_company_name_len CHECK (char_length(company_name) <= 200),
  ADD CONSTRAINT partner_applications_contact_name_len CHECK (char_length(contact_name) <= 100),
  ADD CONSTRAINT partner_applications_email_len CHECK (char_length(email) <= 254),
  ADD CONSTRAINT partner_applications_phone_len CHECK (phone IS NULL OR char_length(phone) <= 40),
  ADD CONSTRAINT partner_applications_website_len CHECK (website IS NULL OR char_length(website) <= 500),
  ADD CONSTRAINT partner_applications_message_len CHECK (message IS NULL OR char_length(message) <= 4000),
  ADD CONSTRAINT partner_applications_other_description_len CHECK (other_description IS NULL OR char_length(other_description) <= 2000),
  ADD CONSTRAINT partner_applications_status_enum CHECK (status IN ('pending','approved','rejected','contacted'));
