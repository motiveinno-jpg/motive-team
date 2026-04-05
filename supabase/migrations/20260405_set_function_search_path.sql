-- Pin search_path on SECURITY DEFINER / public functions to defend against search_path hijack
-- Mirrors Supabase advisor function_search_path_mutable remediation

ALTER FUNCTION public.deduct_analysis_credit(p_user_id uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.refund_analysis_credit(p_user_id uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_chat_summaries(uid uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_company_plan_slug() SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_my_company_id() SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_own_user_fields() SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_user_company_id() SET search_path = public, pg_catalog;
ALTER FUNCTION public.has_min_plan(min_plan text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_catalog;
ALTER FUNCTION public.current_company_id() SET search_path = public, pg_catalog;
ALTER FUNCTION public.current_role() SET search_path = public, pg_catalog;
ALTER FUNCTION public.is_admin() SET search_path = public, pg_catalog;
ALTER FUNCTION public.increment_campaign_counter(p_campaign_id uuid, p_field text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.increment_rfq_proposals(rfq_id_input uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.log_role_change() SET search_path = public, pg_catalog;
ALTER FUNCTION public.log_search_event(p_query text, p_category text, p_country text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.plan_rank(slug text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.block_empty_reports() SET search_path = public, pg_catalog;
ALTER FUNCTION public.sync_last_sign_in_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_ai_team_credentials_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_partner_applications_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_rfq_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_sp_rating_on_review() SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.search_customs_knowledge(query_text text, match_count integer, filter_category text, filter_country text) SET search_path = public, pg_catalog;
-- Vector functions need extensions schema
ALTER FUNCTION public.match_customs_knowledge(query_embedding vector, match_count integer, filter_category text, filter_country text) SET search_path = public, pg_catalog, extensions;
ALTER FUNCTION public.match_customs_knowledge(query_embedding text, match_count integer, filter_category text, filter_country text) SET search_path = public, pg_catalog, extensions;
