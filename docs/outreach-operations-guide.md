# Whistle AI — Outreach Operations Guide (2026-04-03)

> CEO Action Required items marked with **[CEO]**

---

## 1. Email Infrastructure Setup

### 1.1 Outreach Domain (Cold Email)
**[CEO] mail.whistle-ai.com 설정 필요**

Cold email은 반드시 메인 도메인과 분리해야 합니다. 이유:
- 메인 도메인 (whistle-ai.com) 평판 보호
- Cold email 반송/스팸 신고가 트랜잭션 이메일에 영향 주지 않음

**설정 단계:**
1. Cloudflare DNS에서 서브도메인 생성: `mail.whistle-ai.com`
2. SPF 레코드 추가: `v=spf1 include:_spf.instantly.ai ~all`
3. DKIM 레코드 추가: Instantly.ai 대시보드에서 제공하는 DKIM 값
4. DMARC 레코드 추가: `v=DMARC1; p=none; rua=mailto:dmarc@whistle-ai.com`
5. MX 레코드 설정 (Instantly.ai 또는 Google Workspace)

### 1.2 Instantly.ai Setup
**[CEO] 가입 + 구독 필요 ($30/mo Growth 플랜 권장)**

URL: https://instantly.ai

왜 Instantly.ai?
- Cold email 전용 플랫폼 (TOS 위반 없음)
- 워밍업 자동화 (새 도메인 평판 구축)
- 시퀀스 자동화 (Day 1 → Day 3 → Day 7 팔로업)
- A/B 테스트
- 바운스/언서브 자동 처리

Setup:
1. 가입 후 `mail.whistle-ai.com` 연결
2. 워밍업 2주 진행 (하루 10~20통씩 증가)
3. 캠페인 생성: 아래 5개 캠페인 참조

### 1.3 Resend (Transactional Only)
- 이미 설정 완료 (Pro $20/mo)
- 용도: 인증 이메일, 비밀번호 리셋, 알림, 뉴스레터
- **절대 cold outreach에 사용 금지** (TOS 위반 → 계정 정지)

---

## 2. Active Campaigns

| # | Campaign | Target | Status | Channel |
|---|----------|--------|--------|---------|
| 1 | Global Manufacturer Founding Partner | Global manufacturers (US/EU/JP/SEA) | **Active** | Instantly.ai |
| 2 | KR Manufacturer Export Voucher | Korean SMEs with export voucher | **Active** | Instantly.ai |
| 3 | Global Buyer Sourcing | Importers/distributors worldwide | **Active** | Instantly.ai |
| 4 | JP Manufacturer Cross-border | Japanese manufacturers | Draft | Instantly.ai |
| 5 | DE Manufacturer EU Export | German manufacturers | Draft | Instantly.ai |

---

## 3. Lead Sources

### 3.1 Apollo.io (Primary)
- API key already configured in Edge Functions
- Search criteria:
  - **Manufacturers**: "manufacturer" OR "OEM" OR "ODM" + industry filters
  - **Buyers**: "importer" OR "distributor" OR "procurement" + region filters
- Monthly enrichment budget: ~500 contacts/month (free tier)

### 3.2 Manual Sources
- 알리바바 코리아 파트너십 통한 국내 제조사 리스트
- 수출바우처 수행기관 DB
- KOTRA 해외시장 조사보고서
- Trade show exhibitor lists (CES, Canton Fair, etc.)
- LinkedIn Sales Navigator (검색 후 수동 추가)

### 3.3 Inbound
- whistle-ai.com 회원가입 (자동 leads 테이블 연동)
- LinkedIn DM 응답
- Reddit/Community 유입

---

## 4. Email Sequences

### Campaign 1: Global Manufacturer Founding Partner
**Target**: Manufacturers with export potential, any country

**Day 1 — Introduction**
```
Subject: {company_name} + Whistle AI — Founding Partner Invitation (50 spots)

Hi {contact_name},

I'm reaching out because {company_name} caught my attention as a company 
with strong export potential.

We're launching Whistle AI, an AI-powered export management platform that 
analyzes your product's export readiness across 13 dimensions — target markets, 
HS codes, FTA benefits, compliance requirements, and competitor landscape — 
in under 2 minutes.

We're selecting 50 companies globally as Founding Partners:
- 3 free AI export analyses (normally $14/each)
- 1 month free Starter plan ($99 value)
- Priority feature requests
- Direct line to our founding team

Would you be open to a quick look? Here's a 2-minute demo:
https://whistle-ai.com/en

Best,
Heewoong Chae
CEO, Whistle AI (MOTIVE Innovation)
```

**Day 3 — Follow-up (if no open)**
```
Subject: Re: {company_name} + Whistle AI

Hi {contact_name},

Just following up on my previous email. 

One thing I forgot to mention — our AI analysis covers:
✅ Market size & demand analysis for your product category
✅ Optimal HS code classification & tariff calculations  
✅ FTA utilization strategy (Korea has FTAs with 59 countries)
✅ Regulatory compliance by target country
✅ Competitor pricing & positioning

Here's what a sample report looks like: [link]

Only {remaining_spots} Founding Partner spots left.

Best,
Heewoong
```

**Day 7 — Value add (if opened but no reply)**
```
Subject: Quick export insight for {company_name}

Hi {contact_name},

I ran a quick analysis on {industry} exports from {country}:

- Top 3 target markets: {markets}
- Average tariff rate: {rate}%
- FTA savings potential: up to {savings}%

Want to see the full analysis for {company_name}'s specific products?
Takes 2 minutes, completely free for Founding Partners.

→ https://whistle-ai.com/app

Best,
Heewoong
```

### Campaign 2: KR Manufacturer Export Voucher
**(한국어 — 수출바우처 보유 기업)**

**Day 1**
```
제목: {회사명} 대표님, 수출바우처로 AI 수출 진단 무료로 받으세요

{담당자명}님, 안녕하세요.
모티브이노베이션 채희웅입니다.

{회사명}의 제품이 해외에서 어떤 경쟁력을 갖고 있는지,
AI가 13개 항목을 2분 안에 분석해드립니다.

수출바우처 수행기관으로 등록되어 있어,
바우처 보유 시 전액 무료로 이용 가능합니다.

분석 항목:
• HS코드 자동 분류 + 관세율 계산
• FTA 활용 전략 (59개국)
• 타겟 시장 규제/인증 요건
• 경쟁사 가격 포지셔닝
• 바이어 매칭 + 1:1 채팅

→ 무료 진단 시작: https://whistle-ai.com/ko

궁금하신 점 있으시면 편하게 답장 주세요.

채희웅 드림
(주)모티브이노베이션 대표
whistle-ai.com
```

### Campaign 3: Global Buyer Sourcing
**Target**: Importers, distributors, procurement managers

**Day 1**
```
Subject: Source verified products from Korea & Asia — 0% commission on first deal

Hi {contact_name},

Looking for reliable suppliers in Korea or Asia?

Whistle AI connects you with verified manufacturers — 
with full product analysis, compliance documentation, 
and escrow-protected transactions.

For buyers, it's completely free to join:
✅ Browse verified products from 13+ countries
✅ AI-powered supplier matching
✅ Built-in escrow payment protection
✅ Real-time chat with manufacturers
✅ 0% commission on your first deal

Currently onboarding buyers from {region}. 
Interested in a quick walkthrough?

→ https://whistle-ai.com/en

Best,
Heewoong Chae
CEO, Whistle AI
```

---

## 5. n8n Automation Workflows

### W1: Lead Import (Apollo.io → Supabase)
- Trigger: Daily cron (2 AM KST)
- Steps: Apollo search → deduplicate → score → insert to `leads` table
- Target: 10-20 new leads/day

### W2: Email Sequence Dispatcher
- Trigger: Every 30 min
- Steps: Check `email_queue` for pending → send via Instantly.ai API → update status
- Rate limit: Max 50/day during warmup, 200/day after

### W3: Event Tracking
- Trigger: Instantly.ai webhook
- Steps: Open/click/reply events → update `email_events` + `email_queue` → score adjustment

### W4: Lead Scoring Engine
- Trigger: On new event
- Scoring: Open +5, Click +15, Reply +30, Signup +50, Analysis +25
- Score > 50 → Telegram alert to CEO
- Score > 80 → Auto-assign to high-priority follow-up

### W5: Daily Report
- Trigger: 9 AM KST daily
- Content: New leads, emails sent, opens, replies, signups
- Channel: Telegram bot (@motive_hajun_bot)

---

## 6. Target Numbers (First 30 Days)

| Metric | Week 1 | Week 2 | Week 3 | Week 4 | Total |
|--------|--------|--------|--------|--------|-------|
| Leads added | 50 | 100 | 100 | 100 | 350 |
| Emails sent | 50 | 150 | 200 | 200 | 600 |
| Opens (target 30%) | 15 | 45 | 60 | 60 | 180 |
| Replies (target 5%) | 3 | 8 | 10 | 10 | 31 |
| Signups (target 2%) | 1 | 3 | 4 | 4 | 12 |
| Founding Partners | 2 | 5 | 5 | 5 | 17 |

---

## 7. Compliance Checklist

- [ ] CAN-SPAM: Include physical address + unsubscribe link in every email
- [ ] GDPR: Legitimate interest basis for B2B outreach (EU recipients)
- [ ] Korean Anti-Spam Act: Business emails to business addresses are permitted
- [ ] Instantly.ai warmup: 2 weeks before scaling volume
- [ ] Bounce rate < 5% (pause campaign if exceeded)
- [ ] Unsubscribe rate < 1% (revise messaging if exceeded)
- [ ] Reply handling: Respond within 4 hours during business hours

---

## 8. CEO Daily Checklist

1. Check Telegram alerts for high-score leads (score > 50)
2. Reply to any email responses within 4 hours
3. Review daily metrics report (9 AM)
4. Approve/reject new lead batches in admin dashboard
5. Weekly: Review campaign performance, adjust messaging

---

## 9. Immediate Next Steps

### [CEO] Required Actions:
1. **Sign up for Instantly.ai** ($30/mo Growth plan)
2. **Set up mail.whistle-ai.com** in Cloudflare DNS (instructions in 1.1)
3. **Start email warmup** (2 weeks, automatic via Instantly.ai)
4. **Review and approve** email sequences above

### Automated (No CEO action needed):
1. ✅ Supabase tables created (leads, email_queue, email_events, outreach_metrics)
2. ✅ 5 campaigns created in DB
3. ✅ 50 Founding Partner promo codes generated
4. ✅ Landing pages updated with country + promo code fields
5. ✅ Outreach templates ready (5 languages)
6. ⏳ n8n workflows (ready to deploy when PC4 is set up)
