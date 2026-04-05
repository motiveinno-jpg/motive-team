-- Restrict signature_requests RLS from authenticated-sees-all to proper per-role policies
DROP POLICY IF EXISTS authenticated_all ON public.signature_requests;

-- Admin full access
CREATE POLICY sig_req_admin_all ON public.signature_requests
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Sender owns their requests
CREATE POLICY sig_req_sender_all ON public.signature_requests
  FOR ALL TO authenticated
  USING (sent_by = auth.uid())
  WITH CHECK (sent_by = auth.uid());

-- Signer can read their assigned request
CREATE POLICY sig_req_signer_select ON public.signature_requests
  FOR SELECT TO authenticated
  USING (
    signer_id = auth.uid()
    OR signer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Signer can update their assigned request (to sign)
CREATE POLICY sig_req_signer_update ON public.signature_requests
  FOR UPDATE TO authenticated
  USING (
    signer_id = auth.uid()
    OR signer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (
    signer_id = auth.uid()
    OR signer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
