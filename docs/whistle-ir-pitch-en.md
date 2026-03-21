# WHISTLE AI — Investor Pitch Deck

**Confidential** | MOTIVE Innovation Inc. / MOTIVE Global, Inc. | March 2026

---

## 1. EXECUTIVE SUMMARY

**Whistle AI** is the **world's first AI-powered end-to-end global export platform** — connecting manufacturers and buyers across borders.

We deliver AI-driven market analysis, buyer matching, automated documentation, and secure escrow payments — **all within a single platform**. Starting from Korea, expanding globally.

> **For less than the salary of one employee, anyone in the world can easily connect to global export products.**

---

## 2. THE PROBLEM

### The Export Reality for Korean SMEs

| Metric | Value |
|--------|-------|
| Korea SME Exports (2025) | **$118.6B** (+6.9% YoY) |
| Exporting SMEs (2025) | **98,219 companies** |
| % of SMEs That Export | **~1.3%** |
| #1 Reason for Not Exporting | "The process is too complex" |

### The Market Gap

**Korea's domestic market is saturated.**
- Korean distribution = Naver or Coupang (duopoly)
- Thousands of new brands launch every year, but the domestic market is already full
- **These products need to go overseas. But Korea has zero export platforms.**

Alibaba (China), Amazon (US), Faire (US) — all foreign platforms. **There is not a single global export platform built from Korea, for Korean manufacturers.** This gap exists globally for SME manufacturers worldwide.

Whistle AI fills this void.

### Core Pain Points

1. **Information Asymmetry** — Understanding HS codes, FTA benefits, and certification requirements requires expensive specialists ($3K–$20K per engagement)
2. **Fragmented Process** — Market research (Vendor A) → Documents (B) → Logistics (C) → Payment (D) — each handled separately
3. **Buyer Access** — Dependent on Alibaba listings or trade shows ($5K+ per event), with uncertain matching quality
4. **Cost Burden** — Initial export costs of $20K–$70K (customs broker + forwarder + translation + marketing)
5. **No Platform** — No dedicated export platform exists in Korea (or most manufacturing countries)

---

## 3. THE SOLUTION

### Whistle AI: 6-Service Chain

```
AI Export Analysis → Certification → Buyer Matching → Auto Documentation → Secure Payment → Logistics
```

| Service | Description | vs. Traditional |
|---------|-------------|----------------|
| **AI Export Analysis** | Product URL/image → AI auto-generates HS code, FTA simulation, market analysis, margin calculation | 2 weeks → **5 minutes** |
| **Certification Tracking** | Auto-identifies required certifications (FDA, CE, KC) by target country + progress tracking | Manual research → **Auto-mapped** |
| **AI Buyer Matching** | AI recommends optimal buyers based on product characteristics + integrated chat | Trade shows ($5K) → **From $99/mo** |
| **Auto Documentation** | PI/CI/PL/CO/SC export documents generated automatically + inline cost calculator | $300-500/doc → **Unlimited** |
| **Secure Escrow** | 3-stage fund release: Order Accepted → Shipment Confirmed → Delivery Confirmed | Trust uncertainty → **Platform guaranteed** |
| **Logistics/Customs** | Real-time shipment tracking + customs simulation | Individual forwarder contracts → **Unified management** |

---

## 4. TECHNOLOGY

### AI Analysis Engine v7 — Core Tech Stack

| Domain | Detail |
|--------|--------|
| **Multimodal AI** | Claude Sonnet + Vision API — reads images/URLs to extract product characteristics |
| **3-Expert Panel** | Customs broker (15yr) / Logistics expert (20yr) / Trade specialist (12yr) simulated consensus |
| **Real-time Data** | UN Comtrade, Korea Customs Service, World Bank, live exchange rate APIs |
| **HS Code Classification** | Automated 10-digit HS code matching (Edge Function) |
| **FTA Simulator** | 21 FTA agreements, 59 countries tariff simulation |
| **Cost/Margin Calculator** | 5-tab integrated: HS/FTA/Cost/Logistics/Margin |
| **Escrow Payment** | Stripe manual capture — 3-stage fund release |

### Architecture

- **Frontend:** Vanilla JS SPA (zero framework → ultra-lightweight, fast loading)
- **Backend:** Supabase (Auth + PostgreSQL + RLS + Realtime + Edge Functions)
- **Payments:** Stripe (Global) + Toss Payments (Korea)
- **Hosting:** Cloudflare Pages (Global CDN)
- **Security:** 100% Row Level Security, Rate Limiting, XSS Protection

### Database — 14 Tables

```
users, companies, products, analyses, projects, buyers, matchings,
documents, service_requests, voucher_records, search_logs,
contact_requests, shipping_rates, tariff_rates
```

---

## 5. BUSINESS MODEL

### 5-Pillar Revenue Structure

| Revenue Stream | Description | Est. Mix |
|---------------|-------------|----------|
| **SaaS Subscriptions** | Monthly plans (4 tiers) | 40% |
| **Escrow Fees** | 2.5% of transaction value (0% initial partner benefit) | 25% |
| **Government Vouchers** | Korea export voucher program execution | 15% |
| **Alibaba Agency** | Official agency commission | 10% |
| **Premium Services** | AI matching, expert consultation | 10% |

### Pricing

| Plan | Monthly | Key Offering |
|------|---------|-------------|
| **Free** | $0 | 1 lifetime AI analysis, 3 products, 1 project |
| **Starter** | **$99/mo** | 10 AI analyses/mo, 20 products, 20 projects, 20 buyer chats/mo |
| **Pro** | **$199/mo** | 50 AI analyses/mo, unlimited products, 50 projects, AI buyer matching 3/mo |
| **Enterprise** | **$449/mo** | 200 AI analyses/mo, everything unlimited |

### Upgrade Story

```
Free → "Validate export potential" → Starter ($99) → "Get started" → Pro ($199) → "Scale up" → Enterprise ($449) → "High-volume"
```

---

## 6. MARKET SIZE

### TAM / SAM / SOM

| Segment | Calculation | Size |
|---------|-------------|------|
| **TAM** | Korea SaaS Market (2024) | **$3.14B** (projected $5.62B by 2030) |
| **SAM** | 98,219 exporting SMEs × $199/mo avg | **$234M/yr** |
| **SOM (Y1)** | 1,000 companies × $149/mo avg | **$1.79M/yr** |

### Global Expansion Market

| Segment | Size |
|---------|------|
| Global B2B Trade | **$21T+** |
| Global B2B E-commerce (2027 proj.) | **$20.9T** |
| Southeast Asia Export Market | **$1.6T** (rapidly growing) |

### Growth Drivers

- **Market void**: No AI-native export platform exists globally for SME manufacturers
- Korea's domestic market saturated (Naver/Coupang duopoly) — brands must go global
- Korean government's "2030 Export $1 Trillion" national goal
- Surging global demand for K-brands (K-Food, K-Beauty, K-Culture)
- Phase 2: Expand to Southeast Asia / Latin America manufacturers

---

## 7. COMPETITIVE LANDSCAPE

| Feature | Whistle AI | Rinda Global | TradeIt | Export Agencies |
|---------|-----------|--------------|---------|----------------|
| AI Analysis | v7 Engine (Vision+Live Data) | Basic consulting | Manual | None |
| HS Code Auto | 10-digit auto-classify | Manual entry | Partial | Expert-dependent |
| FTA Simulation | 21 FTAs, 59 countries | None | Partial | Report-based |
| Auto Documents | 5 types instant | None | Templates | Per-document fee |
| Buyer Matching | AI-powered auto | Manual brokerage | DB search | Network-dependent |
| Secure Payment | Built-in escrow | None | None | None |
| Price | From $99/mo | Per-transaction | $500+/mo | $10K+ per project |

### Key Differentiators

1. **End-to-End** — Analysis to payment in one platform (competitors: fragmented)
2. **AI Native** — Minimal human dependency, 5-minute analysis (competitors: days to weeks)
3. **Live Data** — UN Comtrade/Customs/Exchange rate real-time integration (competitors: static data)
4. **Alibaba Korea Official Agency** — Direct integration with world's largest B2B platform

---

## 8. TEAM

### MOTIVE Innovation Inc. — Built by Platform Veterans, Not Just Technologists

Whistle AI was not built by a tech startup in a vacuum.
It was built by **a team that understands platform mechanics from the inside, has consulted 5,000+ manufacturers hands-on, and has executed thousands of marketing campaigns in the field.**

**CEO Heewoong Chae**
- **Distribution platform veteran** (Wemakeprice and major e-commerce platforms) — deep understanding of platform structure and seller ecosystems
- **5,000+ manufacturers/brands consulted** — directly executed design, marketing, and education programs that drove real revenue growth
- **2023: Trained 1,700 SME owners** in e-commerce market entry (offline education + hands-on workshops)
- **2025: 600+ online marketing consulting engagements and campaigns directly executed**
- Holds massive manufacturer/seller database, extensive government program track record

> **Every feature in this platform is not theoretical. It was born from real problems encountered while working with 5,000+ manufacturers — now solved with AI.**

**Team (6 members)**

| Name | Role | Expertise | Experience |
|------|------|-----------|------------|
| Heewoong Chae | CEO | PM, Strategy, E-commerce | 10+ years |
| Junho Yeon | VP Operations | Government Programs/PM | 8 years |
| Kyungwon Lee | Team Lead | Social Media Operations | 7 years |
| Kwangmin Lim | Team Lead | Video Production | 7 years |
| Jaewan Song | Unit Lead | Performance Marketing | 9 years |
| Sohee Sung | Team Lead | Business Administration | 10 years |

### Strategic Partnerships

- **Alibaba Korea Official Agency** — Direct integration with the world's largest B2B platform
- Export Voucher Program Executor registration in progress
- **MOTIVE Global, Inc.** (Delaware C-Corp) — US entity established via Stripe Atlas
- **Mercury Bank** — US banking approved (March 2026)

---

## 9. TRACTION

| Metric | Status |
|--------|--------|
| Product Status | **LIVE** (whistle-ai.com) |
| AI Analysis Engine | **v7** complete (URL crawling + Vision + 3-expert panel + live data) |
| Database | **14 tables**, 100% RLS enforced |
| Export Documents | **5 types** auto-generated (PI/CI/PL/CO/SC) |
| FTA Coverage | **21 FTAs, 59 countries** |
| Payment System | **Stripe LIVE** (4 products created) |
| US Corporation | **Delaware C-Corp** established (Stripe Atlas) |
| Mercury Bank | **Approved** (March 19, 2026) |
| QA Bugs Fixed | **310+** issues resolved (March 14, 2026) |

---

## 10. FINANCIAL PROJECTIONS

| Metric | 2026 | 2027 | 2028 |
|--------|------|------|------|
| Paying Customers | 500 | 1,500 | 4,000 |
| MRR | $75K | $250K | $700K |
| ARR | **$900K** | **$3.0M** | **$8.4M** |
| Escrow GMV | $2M | $10M | $30M |
| Escrow Fees | $50K | $250K | $750K |
| **Total Revenue** | **$950K** | **$3.25M** | **$9.15M** |

### Unit Economics

| Metric | Value |
|--------|-------|
| CAC (Projected) | $500 |
| LTV (Projected) | $36,000 |
| LTV/CAC | **72x** |
| Monthly Burn Rate | $15K (current minimal ops) |

---

## 11. USE OF FUNDS

| Area | Allocation | Detail |
|------|-----------|--------|
| Product Development | 40% | AI Engine v8, Logistics API, Mobile App |
| Sales & Marketing | 30% | Customer acquisition, manufacturer onboarding, partnership expansion |
| Hiring | 20% | Full-stack developer, B2B sales, Customer Success |
| Operations | 10% | Infrastructure, legal, certifications |

### Milestones

| Timeline | Goal |
|----------|------|
| 2026 Q2 | 100 paying customers, export voucher executor registration |
| 2026 Q3 | $30K MRR, Alibaba HQ API integration |
| 2026 Q4 | 500 paying customers, $1M escrow GMV |
| 2027 Q2 | Global launch (Southeast Asia manufacturer expansion) |

---

## 12. VISION

> **"Not a service that just talks — we build a service that has never existed before, connecting manufacturers and buyers with unprecedented convenience. Anyone in the world can easily access global export products, for less than the salary of a single employee."**
>
> — Heewoong Chae, CEO

Whistle AI is **democratizing exports**.

Global export — once exclusive to large corporations — is now accessible to **every manufacturer worldwide** starting at $99/month, powered by AI technology and real-time data. Starting from Korea, expanding to every manufacturing country on earth.

---

**Contact**
- CEO Heewoong Chae | creative@mo-tive.com
- Web: https://whistle-ai.com
- US Corp: MOTIVE Global, Inc. (Delaware)
- KR Corp: MOTIVE Innovation Inc.

*This document is confidential and intended solely for the recipient.*
