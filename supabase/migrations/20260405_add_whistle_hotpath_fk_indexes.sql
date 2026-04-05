-- Whistle hot-path FK indexes for launch performance
-- Excludes alibaba_* (paused) and LeanOS-only accounting tables

-- Chat
CREATE INDEX IF NOT EXISTS idx_chat_action_cards_channel_id ON public.chat_action_cards(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_action_cards_message_id ON public.chat_action_cards(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_channels_company_id ON public.chat_channels(company_id);
CREATE INDEX IF NOT EXISTS idx_chat_channels_created_by ON public.chat_channels(created_by);
CREATE INDEX IF NOT EXISTS idx_chat_channels_deal_id ON public.chat_channels(deal_id);
CREATE INDEX IF NOT EXISTS idx_chat_events_channel_id ON public.chat_events(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_events_user_id ON public.chat_events(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_files_message_id ON public.chat_files(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_user_id ON public.chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_mentions_message_id ON public.chat_mentions(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_mentions_user_id ON public.chat_mentions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_id ON public.chat_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to_id ON public.chat_messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON public.chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_reactions_user_id ON public.chat_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_ceo_chat_messages_user_id ON public.ceo_chat_messages(user_id);

-- Buyers
CREATE INDEX IF NOT EXISTS idx_buyer_saved_products_product_id ON public.buyer_saved_products(product_id);
CREATE INDEX IF NOT EXISTS idx_buyer_verifications_user_id ON public.buyer_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_buyers_verified_by ON public.buyers(verified_by);

-- Deals
CREATE INDEX IF NOT EXISTS idx_deals_company_id ON public.deals(company_id);
CREATE INDEX IF NOT EXISTS idx_deal_assignments_deal_id ON public.deal_assignments(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_assignments_user_id ON public.deal_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_classifications_company_id ON public.deal_classifications(company_id);
CREATE INDEX IF NOT EXISTS idx_deal_classifications_deal_id ON public.deal_classifications(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_documents_created_by ON public.deal_documents(created_by);
CREATE INDEX IF NOT EXISTS idx_deal_events_actor_user_id ON public.deal_events(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_deal_files_company_id ON public.deal_files(company_id);
CREATE INDEX IF NOT EXISTS idx_deal_files_deal_id ON public.deal_files(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_files_uploaded_by ON public.deal_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_deal_invites_created_by ON public.deal_invites(created_by);
CREATE INDEX IF NOT EXISTS idx_deal_invites_deal_id ON public.deal_invites(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_milestones_deal_id ON public.deal_milestones(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_nodes_deal_id ON public.deal_nodes(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_nodes_parent_id ON public.deal_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_deal_participants_company_id ON public.deal_participants(company_id);

-- Disputes
CREATE INDEX IF NOT EXISTS idx_disputes_matching_id ON public.disputes(matching_id);
CREATE INDEX IF NOT EXISTS idx_disputes_resolved_by ON public.disputes(resolved_by);

-- Documents / signing
CREATE INDEX IF NOT EXISTS idx_doc_approvals_approver_id ON public.doc_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_doc_approvals_document_id ON public.doc_approvals(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_revisions_changed_by ON public.doc_revisions(changed_by);
CREATE INDEX IF NOT EXISTS idx_doc_revisions_document_id ON public.doc_revisions(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_templates_company_id ON public.doc_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_doc_templates_created_by ON public.doc_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_document_files_company_id ON public.document_files(company_id);
CREATE INDEX IF NOT EXISTS idx_document_files_uploaded_by ON public.document_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_document_folders_company_id ON public.document_folders(company_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_parent_id ON public.document_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_document_notifications_document_id ON public.document_notifications(document_id);
CREATE INDEX IF NOT EXISTS idx_document_notifications_user_id ON public.document_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_document_share_feedback_share_id ON public.document_share_feedback(share_id);
CREATE INDEX IF NOT EXISTS idx_document_share_views_share_id ON public.document_share_views(share_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_document_id ON public.document_shares(document_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_shared_by ON public.document_shares(shared_by);
CREATE INDEX IF NOT EXISTS idx_documents_company_id ON public.documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_revision_requested_by ON public.documents(revision_requested_by);
CREATE INDEX IF NOT EXISTS idx_documents_signed_by ON public.documents(signed_by);
CREATE INDEX IF NOT EXISTS idx_signature_requests_document_id ON public.signature_requests(document_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_signer_id ON public.signature_requests(signer_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_assigned_to ON public.review_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_review_requests_document_id ON public.review_requests(document_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_requested_by ON public.review_requests(requested_by);

-- Email / outreach
CREATE INDEX IF NOT EXISTS idx_email_events_email_queue_id ON public.email_events(email_queue_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_campaign_id ON public.email_queue(campaign_id);
CREATE INDEX IF NOT EXISTS idx_outreach_metrics_campaign_id ON public.outreach_metrics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_bl_outreach_campaigns_manufacturer_id ON public.bl_outreach_campaigns(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_bl_outreach_events_lead_id ON public.bl_outreach_events(lead_id);

-- Orders / quotes / payments (Whistle commerce)
CREATE INDEX IF NOT EXISTS idx_orders_buyer_company_id ON public.orders(buyer_company_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_company_id ON public.orders(seller_company_id);
CREATE INDEX IF NOT EXISTS idx_quotes_buyer_id ON public.quotes(buyer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_seller_id ON public.quotes(seller_id);
CREATE INDEX IF NOT EXISTS idx_quote_revisions_requested_by ON public.quote_revisions(requested_by);
CREATE INDEX IF NOT EXISTS idx_quote_tracking_company_id ON public.quote_tracking(company_id);
CREATE INDEX IF NOT EXISTS idx_quote_tracking_deal_id ON public.quote_tracking(deal_id);
CREATE INDEX IF NOT EXISTS idx_payment_milestones_buyer_id ON public.payment_milestones(buyer_id);
CREATE INDEX IF NOT EXISTS idx_payment_milestones_seller_id ON public.payment_milestones(seller_id);
CREATE INDEX IF NOT EXISTS idx_payment_milestones_verified_by ON public.payment_milestones(verified_by);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_reviewer_id ON public.payment_proofs(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_uploader_id ON public.payment_proofs(uploader_id);

-- Sanctions / compliance
CREATE INDEX IF NOT EXISTS idx_sanctions_log_user_id ON public.sanctions_log(user_id);
CREATE INDEX IF NOT EXISTS idx_sanctions_screenings_user_id ON public.sanctions_screenings(user_id);

-- Subscriptions / billing
CREATE INDEX IF NOT EXISTS idx_subscriptions_company_id ON public.subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON public.invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_company_id ON public.billing_events(company_id);

-- Partners / referrals / feedback
CREATE INDEX IF NOT EXISTS idx_partner_applications_reviewed_by ON public.partner_applications(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_partner_invitations_company_id ON public.partner_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_partner_invitations_invited_by ON public.partner_invitations(invited_by);
CREATE INDEX IF NOT EXISTS idx_partner_invitations_partner_id ON public.partner_invitations(partner_id);
CREATE INDEX IF NOT EXISTS idx_partners_company_id ON public.partners(company_id);
CREATE INDEX IF NOT EXISTS idx_partnership_inquiries_user_id ON public.partnership_inquiries(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_company_id ON public.referral_codes(company_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_user_id ON public.newsletter_subscribers(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_company_id ON public.feedback(company_id);
CREATE INDEX IF NOT EXISTS idx_invitations_accepted_by ON public.invitations(accepted_by);
CREATE INDEX IF NOT EXISTS idx_sp_reviews_reviewer_id ON public.sp_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON public.users(referred_by);
CREATE INDEX IF NOT EXISTS idx_trend_reports_user_id ON public.trend_reports(user_id);

-- Automation / sync
CREATE INDEX IF NOT EXISTS idx_auto_discovery_results_company_id ON public.auto_discovery_results(company_id);
CREATE INDEX IF NOT EXISTS idx_automation_credentials_company_id ON public.automation_credentials(company_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_company_id ON public.automation_runs(company_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_company_id ON public.sync_jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_company_id ON public.sync_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_validation_issues_rule_id ON public.validation_issues(rule_id);

-- AI team
CREATE INDEX IF NOT EXISTS idx_ai_team_activity_pc_id ON public.ai_team_activity(pc_id);
CREATE INDEX IF NOT EXISTS idx_ai_team_comments_task_id ON public.ai_team_comments(task_id);
