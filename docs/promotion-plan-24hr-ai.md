# Whistle AI 24/7 FREE Promotion Automation Plan

> Last updated: 2026-03-22
> Budget: $0 (free methods only, no paid ads, no API costs)
> Infrastructure: 4 AI PCs (Ubuntu 24.04 + Tailscale VPN + Claude Code Headless)

---

## Table of Contents

1. [Infrastructure Overview](#1-infrastructure-overview)
2. [Content Factory (PC3)](#2-content-factory-pc3--247-content-production)
3. [SEO & GEO-SEO (PC4)](#3-seo--geo-seo-pc4--n8n-automation)
4. [Community & Outreach (PC1/PC2)](#4-community--outreach-pc1pc2)
5. [24-Hour Daily Schedule](#5-24-hour-daily-schedule)
6. [n8n Workflows](#6-n8n-workflows-to-create)
7. [Key Metrics](#7-key-metrics-to-track)
8. [Week 1 Launch Blitz](#8-week-1-launch-blitz)
9. [overnight-promote.sh Integration](#9-overnight-promotesh-integration)
10. [Cron Schedules](#10-cron-schedules)
11. [Risk Mitigation](#11-risk-mitigation)

---

## 1. Infrastructure Overview

### PC Assignments

| PC | Hostname | Tailscale IP | Role | Primary Hours |
|----|----------|-------------|------|---------------|
| PC1 | pc1-dev | 100.107.202.33 | Dev + Korean outreach | 09:00-18:00 KST |
| PC2 | pc2-qa | 100.119.156.59 | QA + English outreach | 09:00-18:00 KST |
| PC3 | pc3-content | 100.116.2.80 | Content factory (24/7) | 00:00-24:00 KST |
| PC4 | (pending) | TBD | n8n + SEO ops | 00:00-24:00 KST |

### Tool Constraints (NO API Costs)

- Claude Code: headless worker on each PC (subscription-based)
- ChatGPT: browser automation via Playwright (web subscription only)
- Genspark: browser automation via Playwright (web only)
- Midjourney: browser automation via Playwright (web only)
- n8n: self-hosted on PC4 (free)
- All social media: browser automation, no paid APIs

### Control Center

```bash
# From iMac (command center)
motive status          # Check all 4 PCs
motive content "..."   # Route task to PC3
motive run pc4 "..."   # Direct command to PC4
motive verify "..."    # 3-way cross-verification
```

### Telegram Alerts

All automated tasks report to CEO via @motive_hajun_bot:
- Task completion notifications
- Error alerts requiring manual intervention
- Daily summary report at 22:00 KST
- Weekly metrics digest every Monday 09:00 KST

---

## 2. Content Factory (PC3 -- 24/7 Content Production)

### 2.1 Korean Channels (Manufacturing/Export Focused)

#### A. Naver Blog (네이버 블로그)

**Frequency**: 3 posts/week (Mon, Wed, Fri)
**Goal**: Rank for Korean export-related keywords

**Content Categories (rotate weekly)**:

| Week | Mon | Wed | Fri |
|------|-----|-----|-----|
| 1 | 수출바우처 활용법 | HS코드 분류 가이드 | FTA 혜택 사례 |
| 2 | AI 수출분석 소개 | PI/CI/PL 작성법 | 국가별 인증 정리 |
| 3 | K-Beauty 수출 트렌드 | 관세 계산 방법 | 수출 초보 FAQ |
| 4 | K-Food 해외진출 | 원산지증명서 가이드 | 성공 사례 인터뷰 |

**SEO Targeting (Korean)**:
- Primary: 수출 방법, 수출바우처, HS코드 조회, AI 수출 분석
- Secondary: PI 작성, 원산지증명서, FTA 활용, 관세 계산
- Long-tail: 중소기업 수출 시작, 화장품 수출 절차, 식품 수출 인증

**Automation Script** (PC3):
```bash
#!/bin/bash
# ~/tasks/naver-blog-publish.sh
# Runs: Mon/Wed/Fri at 08:00 KST

TOPIC=$(cat ~/content-calendar/$(date +%Y-%m-%d)-naver.topic)
KEYWORDS=$(cat ~/content-calendar/$(date +%Y-%m-%d)-naver.keywords)

# Step 1: Generate draft with Claude Code (headless)
claude --headless "Write a 2000-word Korean Naver blog post about: $TOPIC
Target keywords: $KEYWORDS
Include: practical tips, data points, CTA to whistle-ai.com
Format: Naver blog HTML with proper headings and images
Tone: professional but accessible for SME manufacturers"

# Step 2: Generate thumbnail via Midjourney (browser automation)
playwright run ~/scripts/midjourney-thumbnail.js --prompt "$TOPIC thumbnail"

# Step 3: Publish via Naver blog automation
playwright run ~/scripts/naver-blog-post.js \
  --title "$TOPIC" \
  --content ~/drafts/latest-naver.html \
  --thumbnail ~/images/latest-thumbnail.png

# Step 4: Submit to IndexNow
curl -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json" \
  -d "{\"host\":\"blog.naver.com\",\"key\":\"$INDEXNOW_KEY\",\"urlList\":[\"$PUBLISHED_URL\"]}"

# Step 5: Notify CEO
~/ai-team-setup/control-center/telegram-bot.sh \
  "Naver blog published: $TOPIC - $PUBLISHED_URL"
```

#### B. Naver Cafe (네이버 카페)

**Target Communities** (join and provide value, NOT spam):
1. 수출입무역 실무자 모임 (export/import practitioners)
2. 중소기업 CEO 모임 (SME CEO community)
3. 화장품 제조/수출 (cosmetics manufacturing/export)
4. 식품 제조/수출 (food manufacturing/export)
5. 해외진출 중소기업 (SMEs going global)
6. 알리바바 셀러 모임 (Alibaba sellers)

**Strategy**:
- Week 1-2: Join, read, understand community rules
- Week 3-4: Start answering questions about export procedures
- Week 5+: Share Naver blog links when relevant (answer first, link second)
- Never: Direct promote. Always provide value first

**Engagement Script** (PC3, daily at 10:00 KST):
```bash
#!/bin/bash
# ~/tasks/naver-cafe-engage.sh
# Browse target cafes, find unanswered export questions
# Draft helpful answers mentioning whistle-ai.com naturally

playwright run ~/scripts/naver-cafe-scanner.js \
  --cafes "export-cafe-list.json" \
  --keywords "수출,HS코드,관세,FTA,PI,인보이스,원산지" \
  --action "find-unanswered"

# Claude generates helpful answers
claude --headless "Review these questions and draft helpful answers.
Rules: Be genuinely helpful. Mention Whistle AI only if directly relevant.
Never spam. Each answer should standalone as valuable advice."
```

#### C. Brunch (브런치)

**Frequency**: 1 long-form article/week (Thursday)
**Focus**: Thought leadership, CEO personal brand

**Article Series**:
1. "AI가 바꾸는 수출의 미래" (How AI transforms export)
2. "한국 제조사, 글로벌 시장에서 살아남기" (Korean manufacturers surviving globally)
3. "수출 첫걸음: 내가 겪은 실수들" (First steps in export: mistakes I made)
4. "HS코드의 숨겨진 비밀" (Hidden secrets of HS codes)
5. "FTA 혜택, 왜 대부분 놓치는가" (Why most miss FTA benefits)

#### D. LinkedIn (Korean)

**CEO Personal Profile**:
- 2 posts/week (Tue, Thu) in Korean
- Topics: Export industry insights, AI in trade, company milestones
- Engage with 10+ posts/day from Korean export community

**Company Page (MOTIVE Innovation)**:
- 1 post/week (Wed)
- Product updates, case studies, team highlights

#### E. Instagram (@whistle.ai or company account)

**Frequency**: 5 posts/week
**Content Mix**:
- Mon: Export tip carousel (5-slide infographic)
- Tue: K-Brand success story (with permission)
- Wed: Behind the scenes / team
- Thu: Data visualization (export stats, market trends)
- Fri: Reel/Short (30s export tip)

**Visual Style**: Dark premium (matching brand-guidelines.html)

**Automation** (PC3):
```bash
#!/bin/bash
# ~/tasks/instagram-create.sh

# Generate carousel images using GIMP scripting
gimp -i -b '(script-fu-console-run "carousel-template.scm")' -b '(gimp-quit 0)'

# Alternative: Midjourney for hero images
playwright run ~/scripts/midjourney-generate.js \
  --prompt "minimalist dark infographic about Korean export statistics"

# Schedule via Instagram web (browser automation)
playwright run ~/scripts/instagram-post.js \
  --images ~/content/instagram/$(date +%Y-%m-%d)/ \
  --caption ~/content/instagram/$(date +%Y-%m-%d)/caption.txt
```

#### F. YouTube Shorts

**Frequency**: 2/week (Tue, Fri)
**Format**: 30-60 second vertical video
**Topics**:
- "HS코드 30초 분류법" (30-sec HS code classification)
- "FTA 혜택 한눈에 보기" (FTA benefits at a glance)
- "수출 서류 자동완성 데모" (Auto-fill export docs demo)
- "이 나라에 수출하면 관세 0%?" (Export to this country = 0% tariff?)

**Production Pipeline** (PC3):
```bash
# Step 1: Generate script with Claude
claude --headless "Write a 45-second YouTube Shorts script about: $TOPIC
Format: [Visual] | [Voiceover] | [Text overlay]
Hook in first 3 seconds. CTA: whistle-ai.com"

# Step 2: Create visuals using ffmpeg + GIMP templates
ffmpeg -f lavfi -i color=c=0x0a0a0a:s=1080x1920:d=45 \
  -vf "drawtext=fontfile=Pretendard.ttf:text='$TEXT':fontcolor=white" \
  -c:v libx264 output.mp4

# Step 3: Add text overlays and transitions
ffmpeg -i output.mp4 -vf "subtitles=captions.srt:force_style='FontSize=24'" final.mp4

# Step 4: Upload via YouTube Studio browser automation
playwright run ~/scripts/youtube-upload.js --file final.mp4 --type shorts
```

### 2.2 English Channels (Global Reach)

#### A. Medium

**Frequency**: 1 article/week (Wednesday)
**Publications to target**: The Startup, Towards AI, Better Programming

**Article Topics**:
1. "How AI is Revolutionizing International Trade for SMEs"
2. "The Hidden Complexity of HS Code Classification"
3. "Building an AI-Powered Export Management Platform"
4. "Why Korean Manufacturers Are the World's Best-Kept Secret"
5. "FTA Optimization: How Small Businesses Leave Money on the Table"
6. "From K-Beauty to Global Shelves: The Digital Export Pipeline"
7. "Real-time Tariff Calculation: Why It Matters for Cross-Border Trade"
8. "The $500B Problem: Connecting Manufacturers with Global Buyers"

**SEO Keywords**: AI export platform, HS code classifier, FTA calculator, Korean manufacturer sourcing, trade automation

#### B. LinkedIn (English)

**CEO Profile (English posts)**:
- 1 post/week (Friday)
- Topics: Global trade insights, building in public, AI + trade
- Engage with international trade community

**Company Page (MOTIVE Global)**:
- 1 post/week (Thursday)
- Product announcements, partnership news, industry analysis

#### C. Twitter/X (@WhistleAI)

**Frequency**: 1 tweet/day + 10 engagements/day
**Content Rotation**:
- Mon: Trade data/statistics with visualization
- Tue: Product feature highlight
- Wed: Industry news commentary
- Thu: Thread about export/trade topic
- Fri: Community highlight or case study
- Sat: Retweet relevant trade content + add insight
- Sun: Week ahead preview or industry trend

**Engagement Rules**:
- Follow and engage with: trade journalists, export consultants, logistics companies
- Reply to trade-related discussions with genuine insights
- Use hashtags: #TradeAutomation #AIExport #KoreanManufacturing #GlobalTrade

#### D. Reddit (Value-First Approach)

**Target Subreddits**:
| Subreddit | Size | Strategy |
|-----------|------|----------|
| r/smallbusiness | 2M+ | Answer export/import questions |
| r/ecommerce | 700K+ | Share cross-border insights |
| r/Entrepreneur | 3M+ | Building in public stories |
| r/internationaltrade | 15K | Deep trade expertise |
| r/supplychain | 50K+ | Supply chain optimization tips |
| r/FulfillmentByAmazon | 100K+ | Help sellers source from Korea |
| r/koreanbeauty | 300K+ | K-Beauty sourcing insights |

**Rules (strictly enforced)**:
- Minimum 2-week lurking period per subreddit before first post
- 10:1 ratio: 10 helpful comments for every 1 mention of Whistle
- Never post direct links in first month
- Build karma through genuine expertise sharing
- If asked "what do you use?", then mention Whistle naturally

**Account Building Script** (PC2):
```bash
#!/bin/bash
# ~/tasks/reddit-engage.sh
# Runs daily at 14:00 KST (optimal US morning)

# Scan for relevant unanswered questions
playwright run ~/scripts/reddit-scanner.js \
  --subreddits "smallbusiness,ecommerce,internationaltrade" \
  --keywords "export,import,manufacturer,Korea,tariff,customs,HS code" \
  --sort "new" \
  --unanswered-only true

# Generate helpful responses (NO promotion)
claude --headless "Draft helpful Reddit responses to these trade questions.
Rules:
- Be genuinely helpful and specific
- Share real knowledge about export/import
- DO NOT mention any product or company
- Write like an experienced trade professional
- Keep each response 100-300 words"
```

#### E. Product Hunt (Launch Preparation)

**Target Launch Date**: After 50+ active users achieved
**Preparation Timeline** (4 weeks before):

| Week | Action |
|------|--------|
| -4 | Create maker profile, start following/upvoting |
| -3 | Build teaser page, collect early supporters list |
| -2 | Prepare all assets (logo, screenshots, video, tagline) |
| -1 | Invite supporters, schedule launch, prepare responses |
| Launch | Post at 00:01 PST, respond to every comment within 30 min |

**Assets Needed**:
- Tagline: "AI-powered export management for manufacturers going global"
- 5 screenshots showing key features
- 90-second demo video
- Maker story (why we built this)
- First comment prepared (detailed explanation)

#### F. Hacker News (Show HN)

**Post Title**: "Show HN: Whistle AI -- AI export management for Korean manufacturers"
**Timing**: Tuesday or Wednesday, 9-10 AM EST
**Preparation**:
- Write a concise, technical explanation (what it does, how it works, tech stack)
- Prepare for tough questions about AI accuracy, pricing, competition
- Have live demo ready
- Be honest about limitations

#### G. IndieHackers (Building in Public)

**Frequency**: Bi-weekly milestone update
**Narrative Thread**: "From 0 to global: building an AI trade platform with $0 marketing budget"
**Topics**:
1. Why we chose export management (market analysis)
2. Technical decisions (Vanilla JS at 16K+ lines -- the good and bad)
3. Revenue milestone updates
4. User acquisition strategies that worked/failed
5. Alibaba partnership story

---

## 3. SEO & GEO-SEO (PC4 -- n8n Automation)

### 3.1 Traditional SEO

#### IndexNow Submissions

```bash
#!/bin/bash
# ~/tasks/indexnow-submit.sh
# Runs after every content publish and every git push

INDEXNOW_KEY="your-indexnow-key"
URLS=(
  "https://whistle-ai.com/"
  "https://whistle-ai.com/ko"
  "https://whistle-ai.com/buyer"
  "https://whistle-ai.com/app"
  "https://whistle-ai.com/app/buyer"
  "https://whistle-ai.com/terms/en"
  "https://whistle-ai.com/privacy/en"
)

# Add any newly published content URLs
if [ -f ~/content/published-urls-today.txt ]; then
  while IFS= read -r url; do
    URLS+=("$url")
  done < ~/content/published-urls-today.txt
fi

# Submit to IndexNow (covers Bing, Yandex, Seznam, Naver)
curl -s -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json" \
  -d "{
    \"host\": \"whistle-ai.com\",
    \"key\": \"$INDEXNOW_KEY\",
    \"urlList\": $(printf '%s\n' "${URLS[@]}" | jq -R . | jq -s .)
  }"
```

#### Google Search Console Monitoring

```bash
#!/bin/bash
# ~/tasks/gsc-check.sh
# Runs daily at 07:00 KST via browser automation

playwright run ~/scripts/gsc-monitor.js \
  --site "whistle-ai.com" \
  --check "coverage,performance,sitemaps" \
  --export ~/reports/gsc-$(date +%Y-%m-%d).json

# Alert if issues found
if jq '.issues | length > 0' ~/reports/gsc-$(date +%Y-%m-%d).json; then
  ~/ai-team-setup/control-center/telegram-bot.sh \
    "GSC alert: $(jq '.issues | length' ~/reports/gsc-*.json) issues found"
fi
```

#### Keyword Rank Tracking

**Primary Keywords (Korean)**:
| Keyword | Current | Target | Priority |
|---------|---------|--------|----------|
| 수출 관리 플랫폼 | unranked | Top 10 | P0 |
| AI 수출 분석 | unranked | Top 5 | P0 |
| HS코드 자동분류 | unranked | Top 10 | P0 |
| FTA 혜택 계산기 | unranked | Top 10 | P1 |
| 수출바우처 활용 | unranked | Top 20 | P1 |
| 수출 서류 자동화 | unranked | Top 10 | P1 |
| 수출 초보 가이드 | unranked | Top 20 | P2 |
| PI 인보이스 작성 | unranked | Top 10 | P2 |

**Primary Keywords (English)**:
| Keyword | Current | Target | Priority |
|---------|---------|--------|----------|
| AI export platform | unranked | Top 20 | P0 |
| HS code classifier | unranked | Top 10 | P0 |
| Korean manufacturer sourcing | unranked | Top 20 | P1 |
| FTA calculator | unranked | Top 20 | P1 |
| export management software | unranked | Top 30 | P1 |
| trade document automation | unranked | Top 20 | P2 |

#### Schema.org Markup

Verify and maintain on whistle-ai.com:
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Whistle AI",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "description": "AI-powered export management platform for manufacturers",
  "url": "https://whistle-ai.com",
  "provider": {
    "@type": "Organization",
    "name": "MOTIVE Innovation",
    "url": "https://whistle-ai.com"
  },
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
    "description": "Free AI export analysis"
  }
}
```

Also add FAQ schema for common export questions on landing pages.

### 3.2 GEO-SEO (AI Search Optimization)

**Goal**: Appear in ChatGPT, Claude, Perplexity, Google AI Overviews

#### llms.txt Setup

Create and maintain `/llms.txt` at whistle-ai.com root:
```
# Whistle AI
> AI-powered export management platform for Korean manufacturers going global

## About
Whistle AI is a comprehensive export management platform that uses artificial intelligence to help Korean manufacturers (K-Beauty, K-Food, K-Fashion) expand into global markets. Features include AI-powered HS code classification, FTA benefit calculation, export document automation (PI, CI, PL, CO), and buyer-manufacturer matching.

## Key Features
- AI Export Analysis: Comprehensive market analysis for any product
- HS Code Classifier: AI-powered automatic tariff classification
- FTA Calculator: Real-time free trade agreement benefit calculation
- Document Automation: Generate PI, CI, PL, CO, and 14+ export documents
- Buyer Matching: Connect manufacturers with verified global buyers
- Cost Simulator: Calculate all export costs including freight, insurance, duties
- Escrow Payments: Secure transaction system via Stripe

## Company
- Korean entity: MOTIVE Innovation (모티브이노베이션)
- US entity: MOTIVE Global, Inc. (Delaware C-Corp)
- Website: https://whistle-ai.com
- Founded: 2026

## Pricing
- Free: 1 AI analysis + 3 product listings
- Starter: $99/month (20 analyses/month)
- Professional: $199/month (50 analyses/month)
- Enterprise: $449/month (unlimited)
```

#### robots.txt AI Crawler Configuration

```
User-agent: *
Allow: /

# Explicitly allow AI crawlers
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Anthropic
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Bytespider
Allow: /

Sitemap: https://whistle-ai.com/sitemap.xml
```

#### AI Citation Strategy

Create "quotable" content that AI models will reference:

1. **Definitive guides** with unique data:
   - "Complete Guide to HS Code Classification for Korean Products"
   - "FTA Benefits by Country: 2026 Updated Rates"
   - "Korean Export Regulations: What Manufacturers Need to Know"

2. **Statistical content** (AI models love citing specific numbers):
   - "Korea exported $XX billion in cosmetics in 2025"
   - "Average time to classify HS codes manually: 45 minutes vs 30 seconds with AI"
   - "FTA utilization rate among Korean SMEs: only 35%"

3. **Structured data** that models can parse:
   - Tables of HS codes by industry
   - FTA rate comparison charts
   - Country-specific export requirement lists

#### GEO-SEO Audit Schedule

```bash
# Run weekly via geo-seo-claude skills
# ~/tasks/geo-seo-audit.sh

# 1. Full GEO audit
claude --headless --skill geo-seo "Run full GEO audit for whistle-ai.com"

# 2. Citation probability check
claude --headless --skill geo-seo "Check citation probability for whistle-ai.com"

# 3. AI crawler access verification
claude --headless --skill geo-seo "Verify AI crawler access for whistle-ai.com"

# 4. Schema validation
claude --headless --skill geo-seo "Validate schema markup for whistle-ai.com"

# Export report
mv ~/geo-seo-report.json ~/reports/geo-seo-$(date +%Y-%m-%d).json
```

### 3.3 On-Page SEO Checklist

For every new page or content piece:
- [ ] Title tag: primary keyword + brand (under 60 chars)
- [ ] Meta description: with CTA (under 160 chars)
- [ ] H1: one per page, includes primary keyword
- [ ] H2/H3: includes secondary keywords naturally
- [ ] Internal links: 3-5 to related pages
- [ ] Image alt text: descriptive, includes keyword where natural
- [ ] URL: short, keyword-rich, lowercase with hyphens
- [ ] Open Graph tags: for social sharing
- [ ] Canonical URL: set to avoid duplicate content
- [ ] Hreflang: ko/en versions linked

---

## 4. Community & Outreach (PC1/PC2)

### 4.1 Korean Organizations

#### Government & Trade Organizations

| Organization | Action | Timeline |
|-------------|--------|----------|
| 한국무역협회 (KITA) | Register on TradeKorea, apply for buyer matching | Week 1 |
| KOTRA | Register on buyKOREA, join online seminars | Week 1 |
| 중소벤처기업부 | Apply for export voucher program | Week 2 |
| 중소기업중앙회 | Partnership proposal as AI export tool | Week 2 |
| 한국산업단지공단 (KICOX) | Contact for industrial park manufacturer access | Week 3 |
| 수출지원센터 (14 locations) | Send partnership proposal to each | Week 3-4 |
| 대한상공회의소 | Propose joint export seminar | Week 4 |

#### Industry-Specific Associations

| Association | Industry | Approach |
|-------------|----------|----------|
| 대한화장품산업연구원 | K-Beauty | Offer free AI analysis demo |
| 한국건강기능식품협회 | K-Food/Health | Export regulation guide |
| 한국섬유산업연합회 | K-Fashion | FTA benefit calculator demo |
| 한국기계산업진흥회 | Machinery | HS code classification demo |
| 한국제약바이오협회 | Pharma | Export documentation demo |

#### Outreach Script (PC1):
```bash
#!/bin/bash
# ~/tasks/korean-org-outreach.sh
# Runs daily at 10:00 KST, processes 3 organizations per day

# Load today's targets from outreach queue
TARGETS=$(cat ~/outreach/korean-orgs-queue.json | jq '.[0:3]')

for target in $(echo "$TARGETS" | jq -c '.[]'); do
  ORG_NAME=$(echo "$target" | jq -r '.name')
  CONTACT=$(echo "$target" | jq -r '.contact')
  TYPE=$(echo "$target" | jq -r '.type')

  # Generate personalized outreach email
  claude --headless "Write a Korean business email to $ORG_NAME ($TYPE).
  Purpose: Propose partnership/collaboration for AI export management.
  Tone: Respectful, professional Korean business language (존대말).
  Include: Brief intro of Whistle AI, specific value for their members,
  proposed collaboration format (free seminar, demo, co-marketing).
  Length: Under 300 words. No English jargon."

  # Queue for manual review before sending
  mv ~/drafts/latest-email.txt ~/outreach/review/$ORG_NAME-$(date +%Y%m%d).txt
done

# Notify CEO for review
~/ai-team-setup/control-center/telegram-bot.sh \
  "3 outreach emails drafted for review: ~/outreach/review/"
```

### 4.2 Online Communities

#### Korean Communities

| Platform | Community | Members | Approach |
|----------|-----------|---------|----------|
| 카카오 오픈채팅 | 수출입 실무자 방 | varies | Answer questions, share tips |
| 카카오 오픈채팅 | 화장품 제조/수출 | varies | K-Beauty export expertise |
| 네이버 카페 | 수출입 무역 실무 | 50K+ | Weekly helpful posts |
| 네이버 카페 | 중소기업 CEO | 30K+ | Share AI tools for export |
| 페이스북 그룹 | 알리바바 셀러 모임 | 10K+ | Cross-border trade tips |
| 페이스북 그룹 | 수출입 무역 정보 | 20K+ | Regulatory updates |

#### English/Global Communities

| Platform | Community | Approach |
|----------|-----------|----------|
| LinkedIn Groups | International Trade Professionals | Share insights weekly |
| LinkedIn Groups | Supply Chain Management | Cross-border logistics tips |
| Facebook Groups | Import/Export Business | Answer sourcing questions |
| Facebook Groups | Amazon FBA Sellers | Korean sourcing insights |
| Quora | Trade/Export topics | Write detailed answers |
| Discord | eCommerce servers | Contribute to trade channels |
| Slack | IndieHackers community | Building in public updates |

### 4.3 Cold Outreach to Manufacturers

**Data Sources (public, free)**:
- 공정거래위원회 사업자등록 조회
- KITA 수출입 업체 검색
- TradeKorea 제조사 디렉토리
- 알리바바 Korean supplier listings
- 스마트스토어/쿠팡/11번가 자체제작 셀러 검색

**Outreach Cadence**:
- Day 1: Initial email (value-first, not salesy)
- Day 4: Follow-up with free resource (export guide PDF)
- Day 8: Case study or demo video
- Day 15: Final follow-up with free analysis offer
- No response after Day 15: Move to nurture list (monthly newsletter)

**Email Template Structure**:
```
Subject: {company_name}님, AI로 수출 비용 30% 절감하는 방법

{company_name} 대표님께,

[1줄: 그 회사 제품/수출 상황에 대한 구체적 언급]
[2줄: 구체적 문제점 지적 (예: HS코드 오분류로 인한 관세 초과납부)]
[3줄: 휘슬 AI가 어떻게 해결하는지]
[4줄: 무료 분석 1회 제안]

CTA: whistle-ai.com에서 무료 AI 수출 분석 받아보세요.
```

### 4.4 University & Education

| Target | Action |
|--------|--------|
| 무역학과 (Trade departments) | Offer free platform for student projects |
| 창업지원센터 (Startup centers) | Demo sessions for export-oriented startups |
| 수출아카데미 (KITA/KOTRA) | Propose as supplementary AI tool |

---

## 5. 24-Hour Daily Schedule

### Master Cron Schedule (All PCs, KST)

```
┌─────────────┬────────────────────────────────────────────────────────┐
│ Time (KST)  │ Activity                                               │
├─────────────┼────────────────────────────────────────────────────────┤
│ 00:00-01:00 │ [PC3] Generate next-day blog drafts (Korean)           │
│ 01:00-02:00 │ [PC3] Generate next-day social media captions          │
│ 02:00-03:00 │ [PC3] Create Instagram carousel templates              │
│ 03:00-04:00 │ [PC3] Generate Medium article draft (English)          │
│ 04:00-05:00 │ [PC4] Competitor website change scan                   │
│ 05:00-06:00 │ [PC4] SEO rank check + IndexNow submissions           │
│ 06:00-07:00 │ [PC4] Google Search Console monitoring                 │
│ 07:00-08:00 │ [PC3] Thumbnail/image generation for day's content     │
│ 08:00-09:00 │ [PC3] Publish Naver blog post (Mon/Wed/Fri)            │
│             │ [PC4] Morning SEO report → Telegram                    │
│ 09:00-10:00 │ [PC1] Korean community engagement (Naver Cafe)         │
│             │ [PC2] English community engagement (Reddit/LinkedIn)    │
│ 10:00-11:00 │ [PC1] Korean outreach emails (3/day)                   │
│             │ [PC3] Instagram post publish                            │
│ 11:00-12:00 │ [PC1] Naver Cafe question answering                    │
│             │ [PC2] Reddit/Quora question answering                   │
│ 12:00-13:00 │ [PC3] YouTube Shorts creation (Tue/Fri)                │
│ 13:00-14:00 │ [PC1] Partnership follow-ups                           │
│             │ [PC2] LinkedIn engagement (English)                     │
│ 14:00-15:00 │ [PC2] Twitter/X posting and engagement                 │
│             │ [PC1] LinkedIn posting (Korean)                         │
│ 15:00-16:00 │ [PC4] Afternoon analytics snapshot                     │
│             │ [PC3] Content performance review                        │
│ 16:00-17:00 │ [PC1] Manufacturer database scan (public sources)      │
│             │ [PC2] Global buyer community engagement                 │
│ 17:00-18:00 │ [PC4] Daily metrics compilation                        │
│             │ [PC3] Next-day content calendar finalization             │
│ 18:00-19:00 │ [PC3] Brunch article publish (Thursday)                │
│             │ [PC3] Medium article publish (Wednesday)                │
│ 19:00-20:00 │ [PC2] US-timezone community engagement (peak hours)    │
│ 20:00-21:00 │ [PC2] IndieHackers / HN engagement                    │
│ 21:00-22:00 │ [PC4] Competitor monitoring deep scan                  │
│ 22:00-23:00 │ [PC4] Daily summary → CEO Telegram report              │
│             │ [PC3] Content backlog management                        │
│ 23:00-00:00 │ [PC4] Market research + trend scanning                 │
│             │ [PC3] Content template preparation                      │
└─────────────┴────────────────────────────────────────────────────────┘
```

### Weekend Schedule (Reduced)

```
Saturday:
  08:00 [PC3] Instagram post
  10:00 [PC2] Reddit/Twitter engagement (US audience active)
  14:00 [PC4] Weekly metrics compilation
  18:00 [PC3] Content batch creation for next week

Sunday:
  08:00 [PC3] Instagram post
  10:00 [PC2] Light community engagement
  14:00 [PC3] Week-ahead content calendar creation
  20:00 [PC4] Weekly report → CEO Telegram
```

---

## 6. n8n Workflows to Create

### Workflow 1: Content Calendar Automation

**Trigger**: Cron (Sunday 14:00 KST)
**Flow**:
```
[Cron Trigger] → [HTTP: Fetch trending export keywords from Google Trends]
                → [Claude Code: Generate week's content topics]
                → [Write File: Save to ~/content-calendar/week-{N}.json]
                → [Telegram: Send calendar to CEO for approval]
                → [Wait for approval]
                → [Split: Create individual task files for each day]
                → [Write Files: ~/tasks/scheduled/YYYY-MM-DD-{platform}.json]
```

**Data Schema** (content-calendar/week-N.json):
```json
{
  "week": 13,
  "year": 2026,
  "items": [
    {
      "date": "2026-03-23",
      "platform": "naver-blog",
      "topic": "2026년 화장품 수출 필수 인증 총정리",
      "keywords": ["화장품 수출", "해외인증", "FDA", "CPNP"],
      "status": "draft",
      "assignedTo": "pc3"
    }
  ]
}
```

### Workflow 2: Social Media Post Scheduler

**Trigger**: Cron (daily 07:30 KST)
**Flow**:
```
[Cron Trigger] → [Read File: Today's scheduled posts]
                → [Switch: By platform]
                  ├→ [Instagram] → [Playwright: Post via browser] → [Log result]
                  ├→ [Twitter/X] → [Playwright: Post via browser] → [Log result]
                  ├→ [LinkedIn]  → [Playwright: Post via browser] → [Log result]
                  └→ [Naver]     → [Playwright: Post via browser] → [Log result]
                → [Merge results]
                → [Write: Update status in content calendar]
                → [Telegram: Summary of posts published]
```

### Workflow 3: SEO Rank Tracker

**Trigger**: Cron (daily 05:00 KST)
**Flow**:
```
[Cron Trigger] → [Read: keyword-list.json]
                → [Loop: For each keyword]
                  → [Playwright: Google search (incognito)]
                  → [Extract: Position of whistle-ai.com in results]
                  → [Store: keyword, position, date, URL]
                → [Aggregate results]
                → [Write: ~/reports/seo-ranks/YYYY-MM-DD.json]
                → [Compare: vs previous day]
                → [IF: Significant change (>5 positions)]
                  → [Telegram: Alert CEO of ranking change]
                → [Weekly: Generate trend chart (ffmpeg/GIMP)]
```

### Workflow 4: Competitor Website Change Monitor

**Trigger**: Cron (daily 04:00 + 21:00 KST)
**Competitors**:
- tradlinx.com (트레드링스)
- tradekorea.com (TradeKorea)
- buykorea.org (buyKOREA)
- silkroad.alibaba.com (Alibaba Trade)
- customs.ai (if exists)

**Flow**:
```
[Cron Trigger] → [Loop: For each competitor URL]
                  → [HTTP/Playwright: Fetch page content]
                  → [Hash: Compare with previous snapshot]
                  → [IF: Changed]
                    → [Diff: Extract what changed]
                    → [Claude Code: Analyze significance]
                    → [Store: Change log with timestamp]
                → [Daily: Aggregate changes]
                → [IF: Significant changes detected]
                  → [Telegram: Alert with summary]
                → [Weekly: Competitive intelligence report]
```

### Workflow 5: Manufacturer Database Builder

**Trigger**: Cron (daily 16:00 KST)
**Sources** (public data only):
- KITA trade directory (tradekorea.com/member search)
- KOTRA buyKOREA seller listings
- Naver smart store "자체제작" sellers
- Coupang "제조사 직영" sellers

**Flow**:
```
[Cron Trigger] → [Read: Last scan position/page]
                → [Playwright: Navigate to source]
                → [Extract: Company name, category, contact (if public)]
                → [Deduplicate: Against existing database]
                → [Classify: By industry (Beauty/Food/Fashion/Other)]
                → [Score: Export-readiness signals]
                → [Write: Append to ~/data/manufacturers.jsonl]
                → [Update: Scan position for next run]
                → [IF: 50+ new entries today]
                  → [Telegram: New manufacturers found summary]
```

### Workflow 6: Email Outreach Sequences

**Trigger**: Cron (daily 09:30 KST) + Event (new manufacturer in database)
**Requires**: Resend configured (free tier: 100 emails/day)

**Flow**:
```
[Cron Trigger] → [Read: Outreach queue]
                → [Filter: Ready for next touch (based on cadence)]
                → [Loop: Max 10 per day]
                  → [Claude Code: Personalize email template]
                  → [Queue: CEO review (if first contact)]
                  → [OR: Auto-send (if follow-up)]
                  → [Log: Send timestamp, template used]
                → [Update: Outreach status]
                → [Track: Open rates, click rates (Resend webhooks)]
```

**Sequence Templates**:
```
Touch 1 (Day 0):  "AI로 수출 비용 절감하는 방법" (value intro)
Touch 2 (Day 4):  "수출 가이드 PDF 공유" (free resource)
Touch 3 (Day 8):  "AI 수출 분석 무료 체험" (free trial offer)
Touch 4 (Day 15): "마지막 안내: 무료 분석 기회" (final follow-up)
```

### Workflow 7: Analytics Dashboard Aggregator

**Trigger**: Cron (daily 17:00 KST + weekly Monday 09:00 KST)
**Flow**:
```
[Cron Trigger] → [Parallel]
                  ├→ [Playwright: Cloudflare Analytics → Extract visits/pageviews]
                  ├→ [Supabase: Query sign-ups, analyses run today]
                  ├→ [Read: Today's content publish count]
                  ├→ [Read: Today's SEO rank positions]
                  ├→ [Playwright: Instagram insights (if available)]
                  └→ [Read: Outreach stats]
                → [Merge: All data sources]
                → [Write: ~/reports/daily/YYYY-MM-DD.json]
                → [Generate: ASCII chart summary]
                → [Telegram: Daily metrics to CEO]

[Weekly Monday] → [Aggregate: Last 7 daily reports]
                 → [Calculate: WoW changes, trends]
                 → [Claude Code: Generate insights and recommendations]
                 → [Telegram: Weekly digest with insights]
```

**Daily Report Format** (Telegram):
```
📊 Whistle AI Daily Report (2026-03-22)

Website:
  Visits: 142 (+12% vs yesterday)
  Unique: 89
  Top pages: /ko (45), /app (32), /buyer (12)

Users:
  New sign-ups: 3
  Analyses run: 7
  Active users: 15

Content:
  Published: 2 (Naver blog, Instagram)
  Engagement: 45 likes, 12 comments

SEO:
  "AI 수출 분석": #23 (+2)
  "HS코드 분류": #31 (new)

Outreach:
  Emails sent: 8
  Responses: 2
  Meetings booked: 0
```

### Workflow 8: Naver Blog Auto-Publisher

**Trigger**: Cron (Mon/Wed/Fri 08:00 KST)
**Flow**:
```
[Cron Trigger] → [Read: Today's content from calendar]
                → [Claude Code: Generate full blog post in Korean]
                → [Playwright: Login to Naver Blog]
                → [Playwright: Create new post]
                  → [Set title]
                  → [Paste formatted content]
                  → [Add tags/categories]
                  → [Add images from ~/content/images/]
                → [Playwright: Publish]
                → [Extract: Published URL]
                → [HTTP: IndexNow submission]
                → [Telegram: Published notification with URL]
```

### Workflow 9: Instagram Content Pipeline

**Trigger**: Cron (daily 10:00 KST)
**Flow**:
```
[Cron Trigger] → [Read: Today's Instagram content plan]
                → [Switch: Content type]
                  ├→ [Carousel] → [GIMP batch: Create slides from template]
                  ├→ [Single]   → [Midjourney: Generate image]
                  └→ [Reel]     → [ffmpeg: Create video from assets]
                → [Claude Code: Generate caption + hashtags]
                → [Playwright: Post to Instagram]
                → [Log: Post URL, engagement baseline]
                → [Telegram: Posted notification]
```

### Workflow 10: Weekly GEO-SEO Audit

**Trigger**: Cron (Sunday 06:00 KST)
**Flow**:
```
[Cron Trigger] → [Claude Code + geo-seo skills: Run full audit]
                → [Compare: vs last week's scores]
                → [Identify: Top 3 improvement areas]
                → [Claude Code: Generate action items]
                → [Write: ~/reports/geo-seo/week-{N}.json]
                → [Telegram: Weekly GEO-SEO report to CEO]
```

---

## 7. Key Metrics to Track

### Tier 1: Revenue Indicators (check daily)

| Metric | Source | Target (Month 1) | Target (Month 3) |
|--------|--------|-------------------|-------------------|
| New sign-ups | Supabase | 50 | 300 |
| AI analyses run | Supabase | 100 | 1,000 |
| Paid conversions | Stripe | 2 | 15 |
| MRR | Stripe | $198 | $2,000 |

### Tier 2: Traffic Indicators (check daily)

| Metric | Source | Target (Month 1) | Target (Month 3) |
|--------|--------|-------------------|-------------------|
| Website visits | Cloudflare | 3,000 | 20,000 |
| Unique visitors | Cloudflare | 1,500 | 10,000 |
| Bounce rate | Cloudflare | <60% | <45% |
| Avg time on site | Cloudflare | >2 min | >3 min |
| Referral visits | Cloudflare | 500 | 5,000 |

### Tier 3: Content Performance (check weekly)

| Metric | Source | Target (Month 1) | Target (Month 3) |
|--------|--------|-------------------|-------------------|
| Blog posts published | Content log | 12 | 48 |
| Social media posts | Content log | 30 | 120 |
| Total social engagement | Platform analytics | 500 | 5,000 |
| Naver blog visitors | Naver analytics | 2,000 | 15,000 |
| Medium article views | Medium stats | 1,000 | 10,000 |
| YouTube Shorts views | YouTube Studio | 5,000 | 50,000 |

### Tier 4: SEO Performance (check weekly)

| Metric | Source | Target (Month 1) | Target (Month 3) |
|--------|--------|-------------------|-------------------|
| Keywords in top 50 | Rank tracker | 5 | 20 |
| Keywords in top 10 | Rank tracker | 0 | 5 |
| Backlinks acquired | GSC | 10 | 50 |
| GEO-SEO score | geo-seo-claude | 40/100 | 70/100 |
| AI search citations | Manual check | 1 | 10 |

### Tier 5: Outreach Performance (check weekly)

| Metric | Source | Target (Month 1) | Target (Month 3) |
|--------|--------|-------------------|-------------------|
| Outreach emails sent | Email log | 100 | 500 |
| Response rate | Email log | 5% | 10% |
| Meetings booked | CRM | 5 | 20 |
| Partnerships signed | Manual | 1 | 5 |
| Community posts | Content log | 20 | 80 |

### Tracking Infrastructure

```bash
# ~/tasks/metrics-collector.sh
# Runs daily at 17:00 KST

REPORT_DIR=~/reports/daily
TODAY=$(date +%Y-%m-%d)
REPORT_FILE="$REPORT_DIR/$TODAY.json"

mkdir -p "$REPORT_DIR"

# Collect from all sources
echo '{' > "$REPORT_FILE"

# Cloudflare (browser automation)
playwright run ~/scripts/cloudflare-analytics.js >> "$REPORT_FILE"

# Supabase (direct query via CLI)
echo '"signups":' >> "$REPORT_FILE"
# Query Supabase for today's sign-ups
# (using Supabase CLI or edge function)

# Content log
POSTS_TODAY=$(find ~/content/published/$TODAY -type f 2>/dev/null | wc -l)
echo "\"content_published\": $POSTS_TODAY," >> "$REPORT_FILE"

echo '}' >> "$REPORT_FILE"
```

---

## 8. Week 1 Launch Blitz

### Pre-Launch Checklist (Day 0, before starting)

- [ ] Verify whistle-ai.com is fully functional (all routes returning 200)
- [ ] Confirm free AI analysis works end-to-end
- [ ] Set up all social media accounts (if not done)
- [ ] Prepare 7 days of content in advance
- [ ] Create content templates (Instagram carousel, blog post, email)
- [ ] Set up IndexNow key on whistle-ai.com
- [ ] Deploy llms.txt and update robots.txt
- [ ] Verify Schema.org markup
- [ ] Set up basic n8n workflows (at least: rank tracker, analytics)
- [ ] Test Telegram bot notifications

### Day 1 (Monday): Foundation

| Time | PC | Action |
|------|-----|--------|
| 08:00 | PC3 | Publish cornerstone blog: "AI 수출분석 플랫폼, 휘슬 AI 소개" |
| 09:00 | PC4 | Submit all URLs to IndexNow |
| 09:30 | PC1 | Register on TradeKorea (tradekorea.com) |
| 10:00 | PC1 | Register on buyKOREA (buykorea.org) |
| 10:30 | PC2 | Create/optimize LinkedIn company page (English) |
| 11:00 | PC3 | Post Instagram launch announcement |
| 12:00 | PC2 | Post on Twitter/X: "We just launched..." |
| 13:00 | PC1 | Post on LinkedIn (Korean): CEO launch announcement |
| 14:00 | PC2 | Post on LinkedIn (English): Company launch |
| 15:00 | PC3 | Create YouTube Shorts: "30초로 보는 AI 수출분석" |
| 16:00 | PC4 | Set up competitor monitoring workflows |
| 18:00 | PC3 | Prepare Day 2 content |
| 22:00 | PC4 | Run first daily metrics report |

### Day 2 (Tuesday): Content Seeding

| Time | PC | Action |
|------|-----|--------|
| 08:00 | PC3 | Publish Naver blog: "HS코드 자동분류, AI로 30초만에" |
| 09:00 | PC1 | Join 3 Naver Cafes (export-related) |
| 10:00 | PC3 | Instagram carousel: "수출 서류 체크리스트" |
| 11:00 | PC2 | Reddit: Answer 5 questions in r/smallbusiness (no promotion) |
| 12:00 | PC3 | Upload YouTube Short |
| 13:00 | PC1 | LinkedIn Korean post: "HS코드 분류의 숨겨진 비용" |
| 14:00 | PC2 | Twitter thread: "5 things Korean manufacturers get wrong about export" |
| 15:00 | PC4 | First SEO rank baseline measurement |
| 16:00 | PC1 | Identify 20 target manufacturers from public directories |
| 18:00 | PC3 | Start Medium article draft |

### Day 3 (Wednesday): Outreach Begins

| Time | PC | Action |
|------|-----|--------|
| 08:00 | PC3 | Publish Naver blog: "FTA 혜택, 당신의 회사는 얼마나 놓치고 있나요?" |
| 09:00 | PC1 | Send first 5 outreach emails to manufacturers |
| 10:00 | PC3 | Instagram post: FTA savings infographic |
| 11:00 | PC2 | Publish Medium article: "How AI is Changing International Trade" |
| 12:00 | PC1 | Naver Cafe: Answer 3 export questions |
| 13:00 | PC2 | LinkedIn English: Share Medium article |
| 14:00 | PC2 | Reddit: Contribute to r/ecommerce discussion |
| 15:00 | PC1 | Contact KITA about membership/partnership |
| 16:00 | PC4 | IndexNow submit all new content URLs |
| 18:00 | PC3 | Brunch article draft |

### Day 4 (Thursday): Thought Leadership

| Time | PC | Action |
|------|-----|--------|
| 08:00 | PC3 | Publish Brunch: "AI가 바꾸는 무역의 미래" |
| 09:00 | PC1 | Follow up on Day 3 outreach emails |
| 10:00 | PC3 | Instagram carousel: "AI 수출분석 결과 예시" |
| 11:00 | PC2 | Quora: Write detailed answer about Korean export |
| 12:00 | PC3 | YouTube Short: "FTA 혜택 한눈에 보기" |
| 13:00 | PC1 | LinkedIn Korean post: CEO thought leadership |
| 14:00 | PC2 | LinkedIn English post: Company milestone |
| 15:00 | PC1 | Send 5 more outreach emails |
| 16:00 | PC2 | Twitter: Trade industry news commentary |
| 18:00 | PC4 | Mid-week metrics review + adjust strategy |

### Day 5 (Friday): Amplification

| Time | PC | Action |
|------|-----|--------|
| 08:00 | PC3 | Publish Naver blog: "수출 초보 CEO를 위한 A to Z 가이드" |
| 09:00 | PC1 | Register on EC21 (ec21.com) |
| 10:00 | PC3 | Instagram Reel: Quick export tip |
| 11:00 | PC2 | Reddit: Answer questions + share insight (week 1 exception: build karma) |
| 12:00 | PC3 | Upload YouTube Short |
| 13:00 | PC1 | Cross-post best Naver blog content to LinkedIn |
| 14:00 | PC2 | Twitter/X: Week summary thread |
| 15:00 | PC1 | Send partnership proposal to 수출지원센터 |
| 16:00 | PC4 | Full SEO ranking check |
| 18:00 | PC3 | Batch create next week's visual assets |

### Day 6 (Saturday): Engagement Focus

| Time | PC | Action |
|------|-----|--------|
| 08:00 | PC3 | Instagram post (lighter, weekend-appropriate content) |
| 10:00 | PC2 | Heavy Reddit/Twitter engagement (US weekend = active) |
| 14:00 | PC4 | Week 1 metrics compilation |
| 16:00 | PC3 | Create next week's content calendar draft |
| 18:00 | PC1 | Review all outreach responses, draft follow-ups |

### Day 7 (Sunday): Review & Plan

| Time | PC | Action |
|------|-----|--------|
| 08:00 | PC3 | Instagram post |
| 10:00 | PC4 | Comprehensive Week 1 report generation |
| 12:00 | PC3 | Finalize Week 2 content calendar |
| 14:00 | all | Strategy adjustment based on Week 1 data |
| 16:00 | PC3 | Batch prepare Week 2 content drafts |
| 20:00 | PC4 | Week 1 report → CEO Telegram |

### Week 1 Targets

| Metric | Target |
|--------|--------|
| Blog posts published | 5 (Naver 3, Brunch 1, Medium 1) |
| Social media posts | 14 (Instagram 7, LinkedIn 4, Twitter 7) |
| YouTube Shorts | 3 |
| Reddit contributions | 15+ comments (helpful, no promotion) |
| Outreach emails sent | 15 |
| Organizations contacted | 5 |
| B2B platforms registered | 3 (TradeKorea, buyKOREA, EC21) |
| New sign-ups | 10-20 |

---

## 9. overnight-promote.sh Integration

The existing `overnight-promote.sh` script should be integrated into the n8n orchestration layer. Create an enhanced version that runs from PC4:

### Enhanced Script: promote-24hr.sh

```bash
#!/bin/bash
# ~/tasks/promote-24hr.sh
# Master promotion script that orchestrates all PCs
# Called by cron every hour, routes tasks based on time

HOUR=$(date +%H)
DAY=$(date +%u)  # 1=Mon, 7=Sun
LOG=~/logs/promote-$(date +%Y-%m-%d).log

log() { echo "[$(date +%H:%M:%S)] $1" >> "$LOG"; }

# ─── NIGHT SHIFT (00:00-06:00) ─── Content Creation ───
if [ "$HOUR" -ge 0 ] && [ "$HOUR" -lt 6 ]; then
  log "NIGHT: Content creation phase"

  # PC3: Generate content for today
  ssh pc3 "~/tasks/generate-daily-content.sh" &

  # PC4: IndexNow + sitemap refresh
  ~/tasks/indexnow-submit.sh
  log "IndexNow submitted"

  # PC4: Competitor scan (2 AM and 4 AM only)
  if [ "$HOUR" -eq 2 ] || [ "$HOUR" -eq 4 ]; then
    ~/tasks/competitor-scan.sh
    log "Competitor scan completed"
  fi

# ─── MORNING (06:00-09:00) ─── SEO + Preparation ───
elif [ "$HOUR" -ge 6 ] && [ "$HOUR" -lt 9 ]; then
  log "MORNING: SEO phase"

  # PC4: SEO rank check
  if [ "$HOUR" -eq 6 ]; then
    ~/tasks/seo-rank-check.sh
    log "SEO ranks checked"
  fi

  # PC4: Google Search Console
  if [ "$HOUR" -eq 7 ]; then
    ~/tasks/gsc-check.sh
    log "GSC checked"
  fi

  # PC3: Prepare today's publish queue
  if [ "$HOUR" -eq 7 ]; then
    ssh pc3 "~/tasks/prepare-publish-queue.sh"
    log "Publish queue prepared"
  fi

  # PC3: Publish scheduled content (8 AM)
  if [ "$HOUR" -eq 8 ]; then
    ssh pc3 "~/tasks/publish-scheduled.sh"
    log "Scheduled content published"
  fi

# ─── BUSINESS HOURS (09:00-18:00) ─── Engagement + Outreach ───
elif [ "$HOUR" -ge 9 ] && [ "$HOUR" -lt 18 ]; then
  log "BUSINESS: Engagement phase"

  # PC1: Korean engagement (9-12)
  if [ "$HOUR" -ge 9 ] && [ "$HOUR" -lt 12 ]; then
    ssh pc1 "~/tasks/korean-engage.sh --hour=$HOUR"
  fi

  # PC2: English engagement (9-12, 14-17)
  if [ "$HOUR" -ge 9 ] && [ "$HOUR" -lt 12 ] || \
     [ "$HOUR" -ge 14 ] && [ "$HOUR" -lt 17 ]; then
    ssh pc2 "~/tasks/english-engage.sh --hour=$HOUR"
  fi

  # PC1: Outreach (10, 13, 15)
  if [ "$HOUR" -eq 10 ] || [ "$HOUR" -eq 13 ] || [ "$HOUR" -eq 15 ]; then
    ssh pc1 "~/tasks/korean-org-outreach.sh"
  fi

  # PC3: Social media posting (10, 12, 14)
  if [ "$HOUR" -eq 10 ] || [ "$HOUR" -eq 12 ] || [ "$HOUR" -eq 14 ]; then
    ssh pc3 "~/tasks/social-post.sh --hour=$HOUR"
  fi

  # PC4: Afternoon analytics (15:00)
  if [ "$HOUR" -eq 15 ]; then
    ~/tasks/metrics-collector.sh --snapshot
    log "Afternoon metrics snapshot"
  fi

  # PC4: Daily metrics (17:00)
  if [ "$HOUR" -eq 17 ]; then
    ~/tasks/metrics-collector.sh --full
    log "Full daily metrics collected"
  fi

# ─── EVENING (18:00-21:00) ─── Planning + US Engagement ───
elif [ "$HOUR" -ge 18 ] && [ "$HOUR" -lt 21 ]; then
  log "EVENING: Planning phase"

  # PC3: Long-form content publishing (18:00)
  if [ "$HOUR" -eq 18 ]; then
    ssh pc3 "~/tasks/publish-longform.sh"
  fi

  # PC2: US-timezone engagement (19-20, peak US morning)
  if [ "$HOUR" -ge 19 ] && [ "$HOUR" -lt 21 ]; then
    ssh pc2 "~/tasks/us-engage.sh"
  fi

  # PC3: Next-day content finalization (20:00)
  if [ "$HOUR" -eq 20 ]; then
    ssh pc3 "~/tasks/finalize-tomorrow.sh"
  fi

# ─── LATE NIGHT (21:00-24:00) ─── Reports + Research ───
elif [ "$HOUR" -ge 21 ]; then
  log "LATE: Reporting phase"

  # PC4: Competitor deep scan (21:00)
  if [ "$HOUR" -eq 21 ]; then
    ~/tasks/competitor-scan.sh --deep
    log "Deep competitor scan"
  fi

  # PC4: Daily report to CEO (22:00)
  if [ "$HOUR" -eq 22 ]; then
    ~/tasks/daily-report.sh
    log "Daily report sent"
  fi

  # PC4: Market research (23:00)
  if [ "$HOUR" -eq 23 ]; then
    ~/tasks/market-research.sh
    log "Market research completed"
  fi
fi

# Weekly tasks (run regardless of hour)
# Monday 09:00: Weekly digest
if [ "$DAY" -eq 1 ] && [ "$HOUR" -eq 9 ]; then
  ~/tasks/weekly-digest.sh
  log "Weekly digest sent"
fi

# Sunday 14:00: Next week planning
if [ "$DAY" -eq 7 ] && [ "$HOUR" -eq 14 ]; then
  ~/tasks/weekly-planning.sh
  log "Weekly planning completed"
fi

# Sunday 06:00: GEO-SEO audit
if [ "$DAY" -eq 7 ] && [ "$HOUR" -eq 6 ]; then
  ~/tasks/geo-seo-audit.sh
  log "GEO-SEO audit completed"
fi

log "Hour $HOUR tasks completed"
```

---

## 10. Cron Schedules

### PC3 (Content) - /etc/crontab or crontab -e

```cron
# Content Factory - PC3
SHELL=/bin/bash
PATH=/usr/local/bin:/usr/bin:/bin
HOME=/home/motive

# Content generation (overnight)
0 0 * * * ~/tasks/generate-blog-draft.sh --lang ko 2>&1 >> ~/logs/cron.log
0 1 * * * ~/tasks/generate-social-captions.sh 2>&1 >> ~/logs/cron.log
0 2 * * * ~/tasks/generate-carousel-images.sh 2>&1 >> ~/logs/cron.log
0 3 * * 3 ~/tasks/generate-medium-draft.sh 2>&1 >> ~/logs/cron.log
0 4 * * 4 ~/tasks/generate-brunch-draft.sh 2>&1 >> ~/logs/cron.log

# Publishing
0 8 * * 1,3,5 ~/tasks/naver-blog-publish.sh 2>&1 >> ~/logs/cron.log
0 10 * * * ~/tasks/instagram-post.sh 2>&1 >> ~/logs/cron.log
0 12 * * 2,5 ~/tasks/youtube-shorts-upload.sh 2>&1 >> ~/logs/cron.log
0 18 * * 3 ~/tasks/medium-publish.sh 2>&1 >> ~/logs/cron.log
0 18 * * 4 ~/tasks/brunch-publish.sh 2>&1 >> ~/logs/cron.log

# Image generation
0 7 * * * ~/tasks/generate-thumbnails.sh 2>&1 >> ~/logs/cron.log

# Content planning
0 14 * * 0 ~/tasks/create-weekly-calendar.sh 2>&1 >> ~/logs/cron.log
0 20 * * * ~/tasks/finalize-tomorrow-content.sh 2>&1 >> ~/logs/cron.log
```

### PC4 (Ops/n8n) - /etc/crontab or crontab -e

```cron
# Operations - PC4
SHELL=/bin/bash
PATH=/usr/local/bin:/usr/bin:/bin
HOME=/home/motive

# Master orchestrator (runs every hour)
0 * * * * ~/tasks/promote-24hr.sh 2>&1 >> ~/logs/promote.log

# SEO
0 5 * * * ~/tasks/seo-rank-check.sh 2>&1 >> ~/logs/seo.log
0 6 * * * ~/tasks/indexnow-submit.sh 2>&1 >> ~/logs/seo.log
0 7 * * * ~/tasks/gsc-check.sh 2>&1 >> ~/logs/seo.log
0 6 * * 0 ~/tasks/geo-seo-audit.sh 2>&1 >> ~/logs/seo.log

# Competitor monitoring
0 4 * * * ~/tasks/competitor-scan.sh 2>&1 >> ~/logs/competitor.log
0 21 * * * ~/tasks/competitor-scan.sh --deep 2>&1 >> ~/logs/competitor.log

# Analytics & Reporting
0 15 * * * ~/tasks/metrics-collector.sh --snapshot 2>&1 >> ~/logs/metrics.log
0 17 * * * ~/tasks/metrics-collector.sh --full 2>&1 >> ~/logs/metrics.log
0 22 * * * ~/tasks/daily-report.sh 2>&1 >> ~/logs/report.log
0 9 * * 1 ~/tasks/weekly-digest.sh 2>&1 >> ~/logs/report.log

# Market research
0 23 * * * ~/tasks/market-research.sh 2>&1 >> ~/logs/research.log

# Log rotation
0 0 * * 0 find ~/logs -name "*.log" -mtime +30 -delete
```

### PC1 (Dev + Korean Outreach) - /etc/crontab

```cron
# Korean Outreach - PC1
SHELL=/bin/bash
PATH=/usr/local/bin:/usr/bin:/bin
HOME=/home/motive

# Community engagement
0 9 * * 1-5 ~/tasks/naver-cafe-engage.sh 2>&1 >> ~/logs/engage.log
0 11 * * 1-5 ~/tasks/naver-cafe-answer.sh 2>&1 >> ~/logs/engage.log
0 14 * * 1-5 ~/tasks/linkedin-korean-post.sh 2>&1 >> ~/logs/social.log

# Outreach
0 10 * * 1-5 ~/tasks/korean-org-outreach.sh 2>&1 >> ~/logs/outreach.log
0 13 * * 1-5 ~/tasks/outreach-followup.sh 2>&1 >> ~/logs/outreach.log
0 16 * * 1-5 ~/tasks/manufacturer-scan.sh 2>&1 >> ~/logs/outreach.log
```

### PC2 (QA + English Outreach) - /etc/crontab

```cron
# English Outreach - PC2
SHELL=/bin/bash
PATH=/usr/local/bin:/usr/bin:/bin
HOME=/home/motive

# Community engagement
0 9 * * 1-5 ~/tasks/reddit-engage.sh 2>&1 >> ~/logs/engage.log
0 11 * * 1-5 ~/tasks/quora-answer.sh 2>&1 >> ~/logs/engage.log
0 14 * * 1-5 ~/tasks/twitter-post.sh 2>&1 >> ~/logs/social.log
0 14 * * 1-5 ~/tasks/linkedin-english-post.sh 2>&1 >> ~/logs/social.log

# US timezone engagement
0 19 * * * ~/tasks/us-engage.sh 2>&1 >> ~/logs/engage.log
0 20 * * * ~/tasks/indiehackers-update.sh 2>&1 >> ~/logs/engage.log
```

### iMac (Control Center) - launchd plist

```xml
<!-- ~/Library/LaunchAgents/com.motive.promote-monitor.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.motive.promote-monitor</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>/Users/motive/ai-team-setup/control-center/promote-monitor.sh</string>
  </array>
  <key>StartInterval</key>
  <integer>1800</integer>  <!-- Every 30 minutes -->
  <key>StandardOutPath</key>
  <string>/Users/motive/logs/promote-monitor.log</string>
  <key>StandardErrorPath</key>
  <string>/Users/motive/logs/promote-monitor-error.log</string>
  <key>RunAtLoad</key>
  <true/>
</dict>
</plist>
```

---

## 11. Risk Mitigation

### Platform Bans / Rate Limiting

| Risk | Mitigation |
|------|------------|
| Naver/Instagram account ban | Max 3 posts/day per platform; vary posting times by +/- 30 min |
| Reddit shadowban | Strict 10:1 help-to-promotion ratio; no links in first month |
| LinkedIn connection limits | Max 20 connections/day; personalize every request |
| Twitter rate limits | Max 15 tweets/day (including replies); spread across hours |
| IP blocking | Use Tailscale for different exit nodes; rotate user agents |
| CAPTCHA challenges | Pause automation, notify CEO, manual intervention |

### Content Quality

| Risk | Mitigation |
|------|------------|
| AI-generated content detected | Human review queue for all long-form content before publish |
| Factual errors in export advice | Cross-verify export regulations against KITA/KOTRA databases |
| Stale information | Monthly review of all published content; update or archive |
| Brand inconsistency | All content follows brand-guidelines.html; templates enforced |

### Operational Risks

| Risk | Mitigation |
|------|------------|
| PC goes offline | promote-24hr.sh detects via SSH timeout; alert CEO; redistribute tasks |
| Browser session expires | Daily session refresh at 06:00; backup cookies stored |
| Disk space full | Weekly cleanup of old logs/images; alert at 80% capacity |
| n8n workflow failure | Retry 3x with backoff; alert after 3rd failure; manual fallback |

### Escalation Protocol

```
Level 1 (Auto-handle): Retry failed tasks, refresh sessions
Level 2 (Telegram alert): Repeated failures, account warnings
Level 3 (Pause + CEO review): Account suspension risk, content quality issue
Level 4 (Full stop): Account banned, legal concern, security breach
```

---

## Appendix A: Directory Structure

```
~/
├── tasks/                     # Executable task scripts
│   ├── promote-24hr.sh       # Master orchestrator
│   ├── naver-blog-publish.sh
│   ├── instagram-post.sh
│   ├── reddit-engage.sh
│   ├── korean-org-outreach.sh
│   ├── seo-rank-check.sh
│   ├── competitor-scan.sh
│   ├── metrics-collector.sh
│   ├── daily-report.sh
│   ├── weekly-digest.sh
│   └── scheduled/            # Auto-generated daily task files
├── content/
│   ├── calendar/             # Weekly content calendars
│   ├── drafts/               # Content awaiting review
│   ├── published/            # Archive of published content
│   │   └── YYYY-MM-DD/
│   ├── templates/            # Reusable content templates
│   │   ├── naver-blog.html
│   │   ├── instagram-carousel.psd
│   │   ├── youtube-short.json
│   │   └── email-outreach.txt
│   └── images/               # Generated images
├── scripts/                   # Playwright automation scripts
│   ├── naver-blog-post.js
│   ├── instagram-post.js
│   ├── youtube-upload.js
│   ├── reddit-scanner.js
│   ├── cloudflare-analytics.js
│   ├── gsc-monitor.js
│   └── midjourney-generate.js
├── data/
│   ├── manufacturers.jsonl   # Scraped manufacturer database
│   ├── keywords.json         # Target keyword list
│   └── competitors.json      # Competitor URLs and hashes
├── outreach/
│   ├── queue/                # Pending outreach targets
│   ├── review/               # Emails awaiting CEO review
│   ├── sent/                 # Sent email archive
│   └── responses/            # Received responses
├── reports/
│   ├── daily/                # Daily metrics JSON
│   ├── weekly/               # Weekly digest reports
│   ├── seo-ranks/            # Daily keyword rankings
│   ├── geo-seo/              # Weekly GEO-SEO audits
│   └── competitors/          # Competitor change logs
└── logs/                      # Task execution logs
    ├── cron.log
    ├── promote.log
    ├── seo.log
    ├── engage.log
    ├── outreach.log
    └── metrics.log
```

## Appendix B: Quick Reference Commands

```bash
# Check overall system status
motive status

# Route a content task to PC3
motive content "Create Instagram carousel about FTA benefits"

# Run immediate outreach task on PC1
motive run pc1 "~/tasks/korean-org-outreach.sh"

# Check today's metrics
cat ~/reports/daily/$(date +%Y-%m-%d).json | jq .

# View this week's content calendar
cat ~/content/calendar/week-$(date +%V).json | jq .

# Check SEO rankings
cat ~/reports/seo-ranks/$(date +%Y-%m-%d).json | jq '.[] | select(.position < 50)'

# Force IndexNow submission
~/tasks/indexnow-submit.sh

# Send manual Telegram message to CEO
~/ai-team-setup/control-center/telegram-bot.sh "Custom message here"

# View promotion logs
tail -100 ~/logs/promote.log

# Emergency: Pause all promotion
touch ~/tasks/.PAUSE  # All scripts check for this file and skip if present
rm ~/tasks/.PAUSE     # Resume
```

## Appendix C: Content Templates

### Naver Blog Post Template

```
Title: [Primary Keyword] - [Value Proposition] | 휘슬 AI

Introduction (100 words):
- Hook with a relatable problem
- State what the reader will learn

Section 1 (300 words): The Problem
- Explain the challenge with specific examples
- Use Korean manufacturing context

Section 2 (400 words): The Solution
- Step-by-step guide
- Include screenshots or diagrams
- Reference official sources (관세청, KITA)

Section 3 (200 words): How Whistle AI Helps
- Brief, non-salesy mention
- Focus on the free features available

Conclusion (100 words):
- Summary of key takeaways
- CTA: "무료 AI 수출분석 받아보기 → whistle-ai.com"

Tags: 수출, HS코드, FTA, 관세, AI, 수출바우처, [specific topic tags]
```

### Instagram Carousel Template

```
Slide 1: Hook question (large text, dark background)
Slide 2: Problem statement with data point
Slide 3: Solution step 1
Slide 4: Solution step 2
Slide 5: Solution step 3
Slide 6: CTA → whistle-ai.com

Visual style: Dark (#0a0a0a) background, white text, accent blue (#3B82F6)
Font: Pretendard (Korean), Inter (English)
Image size: 1080x1080px
```

### Twitter Thread Template

```
1/ [Hook with surprising stat or claim]

2/ Here's why this matters for [target audience]:
[Problem explanation]

3/ Most people try to solve this by:
[Common but suboptimal approach]

4/ But there's a better way:
[Your insight or solution approach]

5/ Here's how it works:
[Step-by-step, practical advice]

6/ The result?
[Outcome with specific numbers if possible]

If you're exporting from Korea (or importing Korean products),
check out whistle-ai.com — we built an AI tool for exactly this.
```

---

*This plan is designed to run autonomously 24/7 with minimal CEO intervention. All promotional activities are free, use browser automation instead of paid APIs, and prioritize genuine value creation over spam. Review and adjust weekly based on metrics.*
