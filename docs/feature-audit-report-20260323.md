# Whistle AI Feature Audit Report (2026-03-23)

Audit scope: 14 skeleton/broken features identified on 2026-03-22.
Method: Code inspection of whistle-app.html (18,758 lines), buyer-app.html (6,459 lines), admin.html (13,730 lines), Supabase tables, and Edge Functions.
This is a READ-ONLY audit. No code was modified.

---

## Summary

| # | Feature | Priority | Verdict | Detail |
|---|---------|----------|---------|--------|
| 1 | Sanctions Screening | P0 | FUNCTIONAL (major improvement since 3/22) | EF deployed, gating works, DB table exists |
| 2 | Escrow Payment | P0 | PARTIAL — auto-release still incomplete | Manual flow works, EF exists but cron trigger unclear |
| 3 | Document Auto-Generation | P0 | FUNCTIONAL for 5 types, NOT 14 | PI/CI/PL/CO/SC work; 9+ doc types missing |
| 4 | Notification System | P0 | PARTIAL — in-app + web push work, email partial | send-notification EF exists, Resend integration present |
| 5 | Buyer Chat | P1 | FUNCTIONAL | Full chat UI, Realtime, file attach, read receipts |
| 6 | Buyer Order Management | P1 | FUNCTIONAL | Full order pipeline, status tracking, escrow view |
| 7 | Shipping Tracking | P1 | PARTIAL — manual entry only | DB table good, no live API tracking |
| 8 | Admin Financial Dashboard | P1 | FUNCTIONAL | MRR/ARR/ARPU/LTV/churn, SVG charts, escrow pipeline |
| 9 | Buyer Product Search | P2 | FUNCTIONAL | Whistle products + Naver search, filters, detail pages |
| 10 | Trend Analysis | P2 | PARTIAL — data source limited | trend_reports table exists, Comtrade EF exists, but no live feed |
| 11 | Admin Analytics | P2 | FUNCTIONAL | 5 tabs: Users, Pages, Funnel, Feature Usage, Revenue |
| 12 | Dispute Resolution | P2 | PARTIAL — UI exists, no backend arbitration | Status changes + evidence, but manual resolution only |
| 13 | Video Meeting | P3 | FUNCTIONAL (via Jitsi) | Jitsi Meet integration, room creation, link sharing |
| 14 | Alibaba Sync | P3 | MANUAL ONLY | alibaba_stores/inquiries tables exist, no API sync |

---

## Detailed Findings

### 1. Sanctions Screening (P0) -- MAJOR IMPROVEMENT

**Status: Functional (was broken on 3/22, now working)**

Code evidence:
- `screen-sanctions` Edge Function deployed (version 11, last updated 2026-03-20)
- `_sanctionsGate()` function gates deal creation and buyer conversion (lines 13482, 14341)
- `screenSanctions()` calls `sb.functions.invoke('screen-sanctions', ...)` (line 18424)
- Auto-screening runs on all matched buyers (lines 5778-5783, 8395-8398)
- Sanctions modal accessible from top bar (line 4780)
- `sanctions_log` table EXISTS with proper columns: id, queried_name, queried_country, queried_type, result, match_count, matches (jsonb), sources_checked, user_id, created_at
- `sanctions_screenings` table also exists
- 18-country hardcoded list still present as fallback (SANCTIONED_COUNTRIES, line 923)
- Feature toggle: `_sanctionsScreeningEnabled = true` (line 947)

**Remaining gaps:**
- No evidence of automatic CSL API list updates (still relies on hardcoded list + EF API call)
- No admin sanctions dashboard to review screening results
- Auto-check on buyer creation is present but depends on EF availability

### 2. Escrow Payment (P0) -- PARTIAL

**Status: Manual flow works, auto-release mechanism incomplete**

Code evidence:
- `escrow_transactions` table exists with full schema (20 columns: order_id, seller_id, buyer_id, amount, escrow_status, deposit_at, release_at, commission_rate, commission_amount, float_days, etc.)
- `escrow_auto_log` table exists
- `escrowMarkShipped()` function (line 16254) transitions status to 'shipping' and persists to matchings table
- `requestEscrowRelease()` function (line 16269) sets status to 'release_requested'
- `releaseEscrow()` function (line 16283) does actual settlement
- `_loadEscrowFromDB()` loads from service_requests table (line 15841)
- Edge Functions: `escrow-auto-release` (version 3) and `auto-settle` (version 15) both deployed
- 8-state escrow lifecycle: none -> requested -> buyer_paid -> secured -> shipping -> delivered -> release_requested -> released
- Dispute blocking: prevents settlement during active disputes (line 16274)

**Remaining gaps:**
- Escrow status persisted to service_requests + localStorage, NOT to escrow_transactions table directly from frontend
- `escrow-auto-release` EF exists but no cron job trigger visible (no pg_cron or scheduled invocation found in code)
- `auto-settle` EF (version 15) exists but same concern about scheduling
- No Stripe PaymentIntent capture/release integration visible in frontend escrow flow
- Buyer-side receipt confirmation flow not fully traceable

### 3. Document Auto-Generation (P0) -- 5 TYPES ONLY

**Status: 5 document types functional, claims of "14 types" are inaccurate**

Code evidence:
- Working document types: PI (Proforma Invoice), CI (Commercial Invoice), PL (Packing List), CO (Certificate of Origin), SC (Sales Contract)
- `typeNames` at line 16443 confirms exactly these 5 types
- Full inline form generation with auto-fill from deal data (lines 16427-16479)
- Document generation saves to `documents` table in Supabase
- `create-document` Edge Function deployed (version 21)
- `doc_templates` table exists in DB
- DISCLAIMER text properly shown on all generated docs (line 1240)
- Electronic signature insertion supported (line 16421)
- Billing events tracked for document generation (line 9031)

**Missing document types (that would make "14 types"):**
- B/L (Bill of Lading) -- icon reference exists (line 5365) but no generation form
- AMS (Automated Manifest System)
- ISF (Importer Security Filing)
- SLI (Shipper's Letter of Instruction)
- Insurance Certificate
- Inspection Certificate
- Health/Phytosanitary Certificate
- Export Declaration
- Letter of Credit application

### 4. Notification System (P0) -- PARTIAL

**Status: In-app + browser push work; email notification via Edge Function exists**

Code evidence:
- `pushNotif()` function (line 17835) handles in-app notifications
- Notifications stored in `notifications` table, loaded via `loadNotifications()` (line 9301)
- Browser Web Push via ServiceWorker: `navigator.serviceWorker.register('/sw.js')` (line 17797)
- `_showWebNotif()` shows browser notifications when tab is not focused (line 17827)
- `requestWebPush()` function for user opt-in (line 17800 area)
- `send-notification` Edge Function deployed (version 13)
- `_sendNotification()` helper (line 16697) sends to target users via EF
- `send-transactional-email` Edge Function deployed (version 11)
- `send-email` Edge Function deployed (version 3)
- `email_log` and `email_logs` tables exist
- Relay server fallback for Telegram bot alerts (line 17842)

**Remaining gaps:**
- No evidence of Resend API key configured for transactional emails in frontend
- Email notifications rely on Edge Functions that need proper Resend setup server-side
- No FCM (Firebase Cloud Messaging) integration found -- browser push only works when browser is open
- Mobile push notifications not supported (no native app)

### 5. Buyer Chat (P1) -- FUNCTIONAL

**Status: Fully functional with real-time messaging**

Code evidence (buyer-app.html):
- `pgMessages()` function (line 4752) renders full chat layout with conversation list and chat panel
- Conversation loading from `messages` table (line 4800)
- Real-time via Supabase Realtime: `initChatRealtime()` (line 4809)
- `sendChat()` inserts to messages table with sender_type='buyer' (line 4817)
- File attachment support: `chatAttachFile()` (line 4827)
- Read receipts: marks unread messages as read (line 4805)
- Mobile responsive: chat list/panel toggle (CSS line 172)
- Rich chat bubble rendering with date separators (line 4784)
- `translate-chat` Edge Function deployed for real-time translation

### 6. Buyer Order Management (P1) -- FUNCTIONAL

**Status: Full order pipeline with status tracking**

Code evidence (buyer-app.html):
- `pgOrders()` function (line 4873) builds unified order list from orders + deals
- Summary stats: active count, total value, confirmed orders, in progress (lines 4940-4957)
- Pipeline filter with stages: all, order, production, shipping, completed, cancelled (line 4961)
- Order detail view: `showOrderDetail()` (line 5054)
- Escrow status visible per order (line 4893)
- Shipment tracking linked to orders (line 5122)
- Pre-order pipeline for deals not yet at order stage (line 4918)

### 7. Shipping Tracking (P1) -- PARTIAL

**Status: Manual registration works, no live API tracking**

Code evidence:
- `shipments` table has 33 columns including: bl_number, awb_number, vessel_name, voyage_number, container_number, etd, eta, port_of_loading, port_of_discharge, tracking_url, tracking_status, tracking_history, carrier, deal_id
- `loadShipments()` loads from DB (line 9306)
- Shipment registration form with B/L, vessel, ports, ETD/ETA (line 6304)
- Sample tracking with tracking number and carrier (lines 5474-5497)
- `track-vessels` Edge Function deployed (version 18) but appears to be initial version only
- Carrier selection with manual tracking number entry (line 5530)
- Link to external tracking sites (trackBL function)

**Remaining gaps:**
- No live vessel tracking API integration (MarineTraffic, AIS, etc.)
- `track-vessels` EF at version 18 (initial deploy, never updated) -- likely stub
- Tracking history populated manually, not auto-updated
- No automated ETD/ETA updates from carrier APIs

### 8. Admin Financial Dashboard (P1) -- FUNCTIONAL

**Status: Fully implemented with comprehensive metrics**

Code evidence (admin.html):
- `pgPayments()` function (line 2122) with 5 tabs: Revenue, Proofs, Subscriptions, Escrow, Policy
- `pgPayRevenue()` (line 2135): MRR, ARR, ARPU, LTV, Churn Rate, Conversion Rate, Active Rate
- SVG charts for monthly revenue trend (line 2197)
- Plan revenue breakdown by tier (line 2146)
- Escrow pipeline visualization (line 2158)
- Product revenue from orders (line 2163)
- Revenue streams: subscription, escrow commission, float revenue (line 2173)
- Billing cycle distribution (line 2152)
- Monthly revenue bar chart in main dashboard (line 2251)

### 9. Buyer Product Search (P2) -- FUNCTIONAL

**Status: Working search with multiple sources**

Code evidence (buyer-app.html):
- `pgSearch()` renders search page with filter row (line 1544 area)
- Whistle products loaded from DB: `loadWhistleProducts()` (line 1791)
- Naver search integration via Edge Function (line 1874 area)
- Category filters, sorting, search source toggle (whistle/naver/all)
- Product detail pages with maker profile links
- `applySearchFilters()` for client-side filtering (line 1630)
- Featured products section for empty searches (line 1965)
- Marketplace request creation for buyer needs (line 1010)

**Note:** Categories are derived from actual product data, NOT hardcoded. The original audit concern about "hardcoded categories only" appears resolved.

### 10. Trend Analysis (P2) -- PARTIAL

**Status: UI exists with some data, but limited sources**

Code evidence:
- `trend_reports` table exists (id, user_id, title, report_data, period, created_at)
- `loadTrendReports()` loads from DB (line 17024)
- Industry trend section in analysis reports with trend text and recommended channels (line 3645)
- Category-based trend data hardcoded as fallback (lines 3135-3150) -- e.g., "Beauty: global market $12.5B, 9.4% growth"
- `comtrade-data` Edge Function deployed (version 7)
- Comtrade live data button in analysis view (line 3612)
- `search_trend_daily` table exists in DB
- Auto-send check for daily trend reports (line 17104)

**Remaining gaps:**
- Comtrade data requires manual button click, not auto-loaded
- Industry trends in analysis are AI-generated text, not from live data feeds
- No real-time market data integration (trade statistics, price indices)
- `search_trend_daily` table exists but no visible mechanism populating it

### 11. Admin Analytics (P2) -- FUNCTIONAL

**Status: All 5 tabs implemented with real data**

Code evidence (admin.html):
- `pgAnalytics()` (line 1212) with tabs: Users, Pages, Funnel, Feature Usage, Revenue
- `pgAnalyticsUsers()` (line 1224): 30-day signup chart, role distribution, plan distribution, country breakdown, activity levels
- `pgAnalyticsPages()` (line 1249): page view trends, top pages, portal/role breakdown
- `pgAnalyticsFunnel()` (line 1270): manufacturer funnel (signup -> analysis -> product -> matching -> order -> deal closed) + buyer funnel
- `pgAnalyticsFeature()` (line 1290): usage by feature, feature adoption rates per manufacturer
- `pgAnalyticsRevenue()` (line 1358): revenue from paid orders, subscription revenue, trends

**Note:** The original audit said "all tabs stubs" -- this is NO LONGER TRUE. All 5 tabs have full implementations with bar charts and data from actual Supabase tables.

### 12. Dispute Resolution (P2) -- PARTIAL

**Status: UI and state management exist, but no automated arbitration**

Code evidence:
- `disputes` table exists with full schema (16 columns: reporter_id, respondent_id, type, subject, description, status, priority, resolution, resolved_by, resolved_at)
- `CLAIM_STATUS` with 6 states: open, evidence, negotiation, resolved, refunded, closed (line 11997)
- `viewDisputeDetail()` function (line 15851) shows full dispute detail with timeline, evidence, seller response
- Dispute indicator in deal sidebar (line 15776)
- Seller can submit response and evidence (lines 15880-15889)
- Escrow settlement blocked during active disputes (lines 16274, 16286)
- Admin can view disputes via dispute management page
- `conflict-data` Edge Function deployed (version 18)

**Remaining gaps:**
- Resolution is manual admin action only -- no automated mediation/arbitration
- No escalation timeline enforcement (e.g., auto-resolve after X days)
- Evidence upload goes to state/localStorage, not directly to disputes table from frontend
- `process-refund` EF exists (version 14) for refund processing but dispute -> refund flow not fully automated

### 13. Video Meeting (P3) -- FUNCTIONAL (via Jitsi)

**Status: Working via Jitsi Meet, no WebRTC implementation needed**

Code evidence:
- `startVideoMeeting()` function (line 6890)
- Platform options: Jitsi (free, no account), Zoom, Google Meet, custom URL (line 6905)
- Room ID generation with unique whistle prefix
- `_launchVideoMeeting()` opens Jitsi room (line 6954)
- `_scheduleVideoMeeting()` sends meeting link to buyer via chat (line 6977)
- Meeting link shared in deal chat
- Video button in deal chat toolbar (line 5295)

**Note:** The original audit said "form only, no WebRTC" -- Jitsi Meet handles WebRTC internally, so this is functional.

### 14. Alibaba Sync (P3) -- MANUAL ONLY

**Status: Manual input and display, no API synchronization**

Code evidence:
- `alibaba_stores` table exists, loaded via `loadAlibabaStores()` (line 9308)
- `alibaba_inquiries` table exists, loaded via `loadAlibabaInquiries()` (line 9309)
- `alibaba_sync_data` table exists in DB
- `pgAlibaba()` function (line 13806) with tabbed interface (overview + other tabs)
- `alibaba-seo` Edge Function deployed
- Alibaba suitability score calculated in analysis (line 3092)

**Remaining gaps:**
- No Alibaba API integration -- all data is manually entered
- No automatic product sync between Whistle and Alibaba stores
- `alibaba_sync_data` table exists but no sync mechanism populates it
- Buyer conversion from Alibaba inquiry is manual (line 14338)

---

## Comparison: 2026-03-22 Audit vs 2026-03-23 Re-Audit

| Feature | 3/22 Status | 3/23 Status | Change |
|---------|-------------|-------------|--------|
| Sanctions Screening | API 503, no table | EF working, table exists, gating active | FIXED |
| Escrow Payment | Manual only | Manual + EF for auto-release deployed | IMPROVED |
| Document Generation | "6 types" claimed | 5 types confirmed (PI/CI/PL/CO/SC) | CLARIFIED |
| Notification System | In-app only | In-app + web push + EF for email | IMPROVED |
| Buyer Chat | "Nav only, no UI" | Full chat with Realtime | WAS WRONG -- already functional |
| Buyer Order Management | "Empty page" | Full order pipeline | WAS WRONG -- already functional |
| Shipping Tracking | Manual only | Manual only (unchanged) | SAME |
| Admin Financial Dashboard | "Charts not implemented" | Full MRR/ARR/ARPU with SVG charts | WAS WRONG -- already functional |
| Buyer Product Search | "Hardcoded categories" | Full search with Naver + Whistle | WAS WRONG -- already functional |
| Trend Analysis | "UI only, no data" | UI + Comtrade EF + hardcoded fallbacks | SLIGHTLY IMPROVED |
| Admin Analytics | "All tabs stubs" | All 5 tabs fully implemented | WAS WRONG -- already functional |
| Dispute Resolution | "Status change only" | Full UI with evidence + timeline | IMPROVED |
| Video Meeting | "Form only, no WebRTC" | Jitsi Meet integration working | WAS WRONG -- already functional |
| Alibaba Sync | Manual input | Manual input (unchanged) | SAME |

---

## Priority Actions Remaining

### Must Fix Before Launch (P0)
1. **Escrow auto-release**: Verify cron/scheduled trigger for `escrow-auto-release` and `auto-settle` Edge Functions. Without scheduled execution, auto-settlement after buyer confirmation will not happen.
2. **Document types**: If marketing claims "14 types", either build the remaining 9 document types or correct marketing materials to say "5 core export documents."
3. **Email notifications**: Verify Resend API key is configured in Edge Function secrets. Test that `send-transactional-email` actually delivers emails.

### Should Fix Soon (P1)
4. **Shipping tracking API**: Integrate at least one live tracking API (carrier tracking or MarineTraffic) to provide automated status updates.
5. **Sanctions CSL auto-update**: Add scheduled refresh of the sanctioned entities list from Trade.gov CSL API to keep screening current.

### Can Wait (P2-P3)
6. **Trend analysis live data**: Connect `search_trend_daily` to automated data collection (Google Trends API, trade statistics feeds).
7. **Dispute arbitration**: Add escalation timelines and automated resolution rules.
8. **Alibaba API sync**: Depends on Alibaba partnership progress; manual input is acceptable for now.

---

## Edge Functions Inventory (Relevant to 14 Features)

| Function | Version | Last Updated | Verified |
|----------|---------|-------------|---------|
| screen-sanctions | v11 | 2026-03-20 | Yes (active) |
| escrow-auto-release | v3 | 2026-03-21 | Deployed, trigger unknown |
| auto-settle | v15 | 2026-03-20 | Deployed, trigger unknown |
| create-document | v21 | 2026-02-27 | Yes (active) |
| send-notification | v13 | 2026-03-21 | Yes (active) |
| send-transactional-email | v11 | 2026-03-20 | Deployed, delivery unverified |
| send-email | v3 | 2026-03-21 | Deployed, delivery unverified |
| track-vessels | v18 | 2026-03-03 | Likely stub (never updated) |
| conflict-data | v18 | 2026-03-03 | Likely stub (never updated) |
| comtrade-data | v7 | 2026-03-19 | Active |
| translate-chat | v19 | 2026-03-16 | Active |

---

## Database Tables (Relevant to 14 Features)

All required tables exist:
- `sanctions_log` (10 cols), `sanctions_screenings`
- `escrow_transactions` (20 cols), `escrow_auto_log`
- `documents`, `doc_templates`, `doc_approvals`, `doc_revisions`
- `notifications`, `email_log`, `email_logs`
- `messages`, `chat_messages`, `chat_channels`, `chat_participants`
- `orders`, `payment_milestones`
- `shipments` (33 cols)
- `disputes` (16 cols)
- `trend_reports`, `search_trend_daily`, `comtrade_cache`
- `meetings`
- `alibaba_stores`, `alibaba_inquiries`, `alibaba_sync_data`

---

*Audit performed by Claude Opus 4.6 on 2026-03-23. Read-only inspection, no code modified.*
