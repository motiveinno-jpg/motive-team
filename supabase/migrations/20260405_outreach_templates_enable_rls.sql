-- Enable RLS on outreach_templates and restrict to admins only
ALTER TABLE public.outreach_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY outreach_templates_admin_select ON public.outreach_templates
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

CREATE POLICY outreach_templates_admin_write ON public.outreach_templates
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );
