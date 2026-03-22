# Whistle AI 24시간 무료 홍보 자동화 플랜

> 최종 업데이트: 2026-03-22
> 예산: 0원 (무료 방법만, 유료 광고 없음, API 비용 없음)
> 인프라: AI PC 4대 (Ubuntu 24.04 + Tailscale VPN + Claude Code Headless)

---

## 목차

1. [인프라 개요](#1-인프라-개요)
2. [콘텐츠 팩토리 (PC3)](#2-콘텐츠-팩토리-pc3--247-콘텐츠-생산)
3. [SEO & GEO-SEO (PC4)](#3-seo--geo-seo-pc4--n8n-자동화)
4. [커뮤니티 & 아웃리치 (PC1/PC2)](#4-커뮤니티--아웃리치-pc1pc2)
5. [24시간 일일 스케줄](#5-24시간-일일-스케줄)
6. [n8n 워크플로우](#6-n8n-워크플로우-생성-목록)
7. [핵심 지표](#7-핵심-추적-지표)
8. [1주차 런칭 블리츠](#8-1주차-런칭-블리츠)
9. [overnight-promote.sh 연동](#9-overnight-promotesh-연동)
10. [크론 스케줄](#10-크론-스케줄)
11. [리스크 대응](#11-리스크-대응)

---

## 1. 인프라 개요

### PC 역할 배정

| PC | 호스트명 | Tailscale IP | 역할 | 주요 운영시간 |
|----|----------|-------------|------|---------------|
| PC1 | pc1-dev | 100.107.202.33 | 개발 + 한국어 아웃리치 | 09:00-18:00 KST |
| PC2 | pc2-qa | 100.119.156.59 | QA + 영문 아웃리치 | 09:00-18:00 KST |
| PC3 | pc3-content | 100.116.2.80 | 콘텐츠 팩토리 (24/7) | 00:00-24:00 KST |
| PC4 | (대기중) | TBD | n8n + SEO 운영 | 00:00-24:00 KST |

### 도구 제약 (API 비용 절대 없음)

- Claude Code: 각 PC에서 headless 워커 (구독 기반)
- ChatGPT: Playwright 브라우저 자동화 (웹 구독만)
- Genspark: Playwright 브라우저 자동화 (웹만)
- Midjourney: Playwright 브라우저 자동화 (웹만)
- n8n: PC4에서 셀프호스팅 (무료)
- 모든 소셜미디어: 브라우저 자동화, 유료 API 없음

### 컨트롤 센터

```bash
# 아이맥 (지휘소)에서 실행
motive status          # 4대 PC 상태 확인
motive content "..."   # PC3에 콘텐츠 작업 할당
motive run pc4 "..."   # PC4에 직접 명령
motive verify "..."    # 3자 교차검증 (Claude×ChatGPT×Genspark)
```

### 텔레그램 알림

모든 자동화 작업은 @motive_hajun_bot을 통해 대표님에게 보고:
- 작업 완료 알림
- 수동 처리 필요한 오류 알림
- 일일 요약 리포트 매일 22:00 KST
- 주간 지표 다이제스트 매주 월요일 09:00 KST

---

## 2. 콘텐츠 팩토리 (PC3 — 24/7 콘텐츠 생산)

### 2.1 한국어 채널 (제조/수출 중심)

#### A. 네이버 블로그

**빈도**: 주 3회 (월, 수, 금)
**목표**: 수출 관련 한국어 키워드 검색 순위 확보

**콘텐츠 카테고리 (주간 로테이션)**:

| 주차 | 월 | 수 | 금 |
|------|-----|-----|-----|
| 1 | 수출바우처 활용법 | HS코드 분류 가이드 | FTA 혜택 사례 |
| 2 | AI 수출분석 소개 | PI/CI/PL 작성법 | 국가별 인증 정리 |
| 3 | K-Beauty 수출 트렌드 | 관세 계산 방법 | 수출 초보 FAQ |
| 4 | K-Food 해외진출 | 원산지증명서 가이드 | 성공 사례 인터뷰 |

**SEO 타겟 키워드**:
- 핵심: 수출 방법, 수출바우처, HS코드 조회, AI 수출 분석
- 보조: PI 작성, 원산지증명서, FTA 활용, 관세 계산
- 롱테일: 중소기업 수출 시작, 화장품 수출 절차, 식품 수출 인증

**자동화 스크립트** (PC3):
```bash
#!/bin/bash
# ~/tasks/naver-blog-publish.sh
# 실행: 월/수/금 08:00 KST

TOPIC=$(cat ~/content-calendar/$(date +%Y-%m-%d)-naver.topic)
KEYWORDS=$(cat ~/content-calendar/$(date +%Y-%m-%d)-naver.keywords)

# 1단계: Claude Code로 초안 생성 (headless)
claude --headless "2000자 분량의 네이버 블로그 글 작성: $TOPIC
타겟 키워드: $KEYWORDS
포함: 실용적 팁, 데이터 포인트, whistle-ai.com CTA
형식: 적절한 헤딩과 이미지가 포함된 네이버 블로그 HTML
톤: 전문적이지만 중소제조사가 이해하기 쉽게"

# 2단계: Midjourney로 썸네일 생성 (브라우저 자동화)
playwright run ~/scripts/midjourney-thumbnail.js --prompt "$TOPIC 썸네일"

# 3단계: 네이버 블로그 자동화로 발행
playwright run ~/scripts/naver-blog-post.js \
  --title "$TOPIC" \
  --content ~/drafts/latest-naver.html \
  --thumbnail ~/images/latest-thumbnail.png

# 4단계: IndexNow 제출
curl -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json" \
  -d "{\"host\":\"blog.naver.com\",\"key\":\"$INDEXNOW_KEY\",\"urlList\":[\"$PUBLISHED_URL\"]}"

# 5단계: 대표님에게 알림
~/ai-team-setup/control-center/telegram-bot.sh \
  "네이버 블로그 발행 완료: $TOPIC - $PUBLISHED_URL"
```

#### B. 네이버 카페

**타겟 커뮤니티** (가입 후 가치 제공, 스팸 절대 금지):
1. 수출입무역 실무자 모임
2. 중소기업 CEO 모임
3. 화장품 제조/수출
4. 식품 제조/수출
5. 해외진출 중소기업
6. 알리바바 셀러 모임

**전략**:
- 1~2주: 가입, 글 읽기, 커뮤니티 규칙 이해
- 3~4주: 수출 절차 관련 질문에 답변 시작
- 5주+: 관련성 있을 때 네이버 블로그 링크 공유 (답변 먼저, 링크 나중에)
- 절대 금지: 직접 홍보. 항상 가치 제공이 먼저

**참여 스크립트** (PC3, 매일 10:00 KST):
```bash
#!/bin/bash
# ~/tasks/naver-cafe-engage.sh
# 타겟 카페 탐색, 미답변 수출 질문 찾기
# 자연스럽게 whistle-ai.com 언급하는 유용한 답변 작성

playwright run ~/scripts/naver-cafe-scanner.js \
  --cafes "export-cafe-list.json" \
  --keywords "수출,HS코드,관세,FTA,PI,인보이스,원산지" \
  --action "find-unanswered"

# Claude로 도움이 되는 답변 생성
claude --headless "이 질문들을 검토하고 유용한 답변을 작성해주세요.
규칙: 진심으로 도움이 되어야 합니다. Whistle AI는 직접 관련이 있을 때만 언급.
스팸 절대 금지. 각 답변은 독자적으로 가치있는 조언이어야 합니다."
```

#### C. 브런치

**빈도**: 주 1회 장편 기사 (목요일)
**포커스**: 사고 리더십, CEO 개인 브랜드

**기사 시리즈**:
1. "AI가 바꾸는 수출의 미래"
2. "한국 제조사, 글로벌 시장에서 살아남기"
3. "수출 첫걸음: 내가 겪은 실수들"
4. "HS코드의 숨겨진 비밀"
5. "FTA 혜택, 왜 대부분 놓치는가"

#### D. 링크드인 (한국어)

**CEO 개인 프로필**:
- 주 2회 포스팅 (화, 목) 한국어
- 주제: 수출산업 인사이트, AI와 무역, 회사 마일스톤
- 한국 수출 커뮤니티의 게시물 10건+/일 참여

**회사 페이지 (모티브이노베이션)**:
- 주 1회 포스팅 (수)
- 제품 업데이트, 사례 연구, 팀 하이라이트

#### E. 인스타그램 (@whistle.ai 또는 회사 계정)

**빈도**: 주 5회
**콘텐츠 믹스**:
- 월: 수출 팁 캐러셀 (5슬라이드 인포그래픽)
- 화: K-브랜드 성공 스토리 (허가 받고)
- 수: 비하인드 / 팀
- 목: 데이터 시각화 (수출 통계, 시장 트렌드)
- 금: 릴/쇼츠 (30초 수출 팁)

**비주얼 스타일**: 다크 프리미엄 (brand-guidelines.html 참고)

**자동화** (PC3):
```bash
#!/bin/bash
# ~/tasks/instagram-create.sh

# GIMP 스크립팅으로 캐러셀 이미지 생성
gimp -i -b '(script-fu-console-run "carousel-template.scm")' -b '(gimp-quit 0)'

# 또는: Midjourney로 히어로 이미지
playwright run ~/scripts/midjourney-generate.js \
  --prompt "미니멀 다크 인포그래픽 한국 수출 통계"

# 인스타그램 웹으로 스케줄 (브라우저 자동화)
playwright run ~/scripts/instagram-post.js \
  --images ~/content/instagram/$(date +%Y-%m-%d)/ \
  --caption ~/content/instagram/$(date +%Y-%m-%d)/caption.txt
```

#### F. 유튜브 쇼츠

**빈도**: 주 2회 (화, 금)
**형식**: 30~60초 세로 영상
**주제**:
- "HS코드 30초 분류법"
- "FTA 혜택 한눈에 보기"
- "수출 서류 자동완성 데모"
- "이 나라에 수출하면 관세 0%?"

**제작 파이프라인** (PC3):
```bash
# 1단계: Claude로 스크립트 생성
claude --headless "45초 유튜브 쇼츠 스크립트 작성: $TOPIC
형식: [화면] | [나레이션] | [텍스트 오버레이]
처음 3초에 후킹. CTA: whistle-ai.com"

# 2단계: ffmpeg + GIMP 템플릿으로 비주얼 제작
ffmpeg -f lavfi -i color=c=0x0a0a0a:s=1080x1920:d=45 \
  -vf "drawtext=fontfile=Pretendard.ttf:text='$TEXT':fontcolor=white" \
  -c:v libx264 output.mp4

# 3단계: 자막/전환 효과 추가
ffmpeg -i output.mp4 -vf "subtitles=captions.srt:force_style='FontSize=24'" final.mp4

# 4단계: 유튜브 스튜디오 브라우저 자동화로 업로드
playwright run ~/scripts/youtube-upload.js --file final.mp4 --type shorts
```

### 2.2 영문 채널 (글로벌 도달)

#### A. Medium

**빈도**: 주 1회 (수요일)
**타겟 퍼블리케이션**: The Startup, Towards AI, Better Programming

**기사 주제**:
1. "How AI is Revolutionizing International Trade for SMEs"
2. "The Hidden Complexity of HS Code Classification"
3. "Building an AI-Powered Export Management Platform"
4. "Why Korean Manufacturers Are the World's Best-Kept Secret"
5. "FTA Optimization: How Small Businesses Leave Money on the Table"
6. "From K-Beauty to Global Shelves: The Digital Export Pipeline"
7. "Real-time Tariff Calculation: Why It Matters for Cross-Border Trade"
8. "The $500B Problem: Connecting Manufacturers with Global Buyers"

**SEO 키워드**: AI export platform, HS code classifier, FTA calculator, Korean manufacturer sourcing, trade automation

#### B. 링크드인 (영문)

**CEO 프로필 (영문 포스트)**:
- 주 1회 (금요일)
- 주제: 글로벌 무역 인사이트, 빌딩 인 퍼블릭, AI + 무역
- 국제 무역 커뮤니티 참여

**회사 페이지 (MOTIVE Global)**:
- 주 1회 (목요일)
- 제품 발표, 파트너십 뉴스, 산업 분석

#### C. 트위터/X (@WhistleAI)

**빈도**: 1트윗/일 + 10건 참여/일
**콘텐츠 로테이션**:
- 월: 무역 데이터/통계 시각화
- 화: 제품 기능 하이라이트
- 수: 산업 뉴스 코멘트
- 목: 수출/무역 주제 쓰레드
- 금: 커뮤니티 하이라이트 또는 사례
- 토: 관련 무역 콘텐츠 리트윗 + 인사이트 추가
- 일: 다음 주 프리뷰 또는 산업 트렌드

**참여 규칙**:
- 팔로우 및 참여 대상: 무역 기자, 수출 컨설턴트, 물류 기업
- 무역 관련 토론에 진짜 인사이트로 답글
- 해시태그: #TradeAutomation #AIExport #KoreanManufacturing #GlobalTrade

#### D. 레딧 (가치 먼저 접근)

**타겟 서브레딧**:
| 서브레딧 | 규모 | 전략 |
|-----------|------|----------|
| r/smallbusiness | 200만+ | 수출입 질문 답변 |
| r/ecommerce | 70만+ | 크로스보더 인사이트 공유 |
| r/Entrepreneur | 300만+ | 빌딩 인 퍼블릭 스토리 |
| r/internationaltrade | 1.5만 | 심화 무역 전문지식 |
| r/supplychain | 5만+ | 공급망 최적화 팁 |
| r/FulfillmentByAmazon | 10만+ | 한국 소싱 도움 |
| r/koreanbeauty | 30만+ | K-Beauty 소싱 인사이트 |

**규칙 (엄격 적용)**:
- 서브레딧당 최소 2주 관찰 후 첫 게시
- 10:1 비율: 도움 댓글 10개당 Whistle 언급 1개
- 첫 한 달은 직접 링크 절대 금지
- 진짜 전문지식 공유로 카르마 축적
- "뭐 쓰세요?" 물어볼 때만 자연스럽게 Whistle 언급

**계정 빌딩 스크립트** (PC2):
```bash
#!/bin/bash
# ~/tasks/reddit-engage.sh
# 매일 14:00 KST 실행 (미국 시간 오전 최적)

# 관련 미답변 질문 스캔
playwright run ~/scripts/reddit-scanner.js \
  --subreddits "smallbusiness,ecommerce,internationaltrade" \
  --keywords "export,import,manufacturer,Korea,tariff,customs,HS code" \
  --sort "new" \
  --unanswered-only true

# 도움이 되는 답변 생성 (홍보 없음)
claude --headless "이 무역 질문들에 도움이 되는 레딧 답변을 작성.
규칙:
- 진심으로 도움이 되고 구체적이어야 함
- 수출입에 대한 실제 지식 공유
- 어떤 제품이나 회사도 언급하지 말 것
- 경험 많은 무역 전문가처럼 작성
- 각 답변 100~300단어"
```

#### E. Product Hunt (런칭 준비)

**타겟 런칭일**: 활성 사용자 50명+ 달성 후
**준비 타임라인** (런칭 4주 전부터):

| 주차 | 액션 |
|------|--------|
| -4주 | 메이커 프로필 생성, 팔로우/업보팅 시작 |
| -3주 | 티저 페이지 제작, 초기 지지자 목록 수집 |
| -2주 | 모든 에셋 준비 (로고, 스크린샷, 영상, 태그라인) |
| -1주 | 지지자 초대, 런칭 예약, 답변 준비 |
| 런칭일 | PST 00:01 게시, 모든 댓글 30분 내 답변 |

**필요 에셋**:
- 태그라인: "AI-powered export management for manufacturers going global"
- 핵심 기능 보여주는 스크린샷 5장
- 90초 데모 영상
- 메이커 스토리 (왜 만들었는가)
- 첫 댓글 준비 (상세 설명)

#### F. 해커뉴스 (Show HN)

**게시 제목**: "Show HN: Whistle AI -- AI export management for Korean manufacturers"
**타이밍**: 화~수요일, EST 9~10 AM
**준비사항**:
- 간결하고 기술적인 설명 (무엇을, 어떻게, 기술 스택)
- AI 정확도, 가격, 경쟁에 대한 까다로운 질문 대비
- 라이브 데모 준비
- 한계점에 대해 솔직하게

#### G. 인디해커스 (빌딩 인 퍼블릭)

**빈도**: 격주 마일스톤 업데이트
**서사 쓰레드**: "마케팅 비용 $0으로 글로벌 AI 무역 플랫폼 만들기: 0에서 시작"
**주제**:
1. 왜 수출 관리를 선택했나 (시장 분석)
2. 기술 결정 (16,000줄+ Vanilla JS의 장단점)
3. 매출 마일스톤 업데이트
4. 성공/실패한 사용자 확보 전략
5. 알리바바 파트너십 스토리

---

## 3. SEO & GEO-SEO (PC4 — n8n 자동화)

### 3.1 전통 SEO

#### IndexNow 제출

```bash
#!/bin/bash
# ~/tasks/indexnow-submit.sh
# 콘텐츠 발행 후 + git push 후 실행

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

# 새로 발행된 콘텐츠 URL 추가
if [ -f ~/content/published-urls-today.txt ]; then
  while IFS= read -r url; do
    URLS+=("$url")
  done < ~/content/published-urls-today.txt
fi

# IndexNow 제출 (Bing, Yandex, Seznam, Naver 커버)
curl -s -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json" \
  -d "{
    \"host\": \"whistle-ai.com\",
    \"key\": \"$INDEXNOW_KEY\",
    \"urlList\": $(printf '%s\n' "${URLS[@]}" | jq -R . | jq -s .)
  }"
```

#### Google Search Console 모니터링

```bash
#!/bin/bash
# ~/tasks/gsc-check.sh
# 매일 07:00 KST 브라우저 자동화로 실행

playwright run ~/scripts/gsc-monitor.js \
  --site "whistle-ai.com" \
  --check "coverage,performance,sitemaps" \
  --export ~/reports/gsc-$(date +%Y-%m-%d).json

# 이슈 발견 시 알림
if jq '.issues | length > 0' ~/reports/gsc-$(date +%Y-%m-%d).json; then
  ~/ai-team-setup/control-center/telegram-bot.sh \
    "GSC 알림: $(jq '.issues | length' ~/reports/gsc-*.json)건 이슈 발견"
fi
```

#### 키워드 순위 추적

**핵심 키워드 (한국어)**:
| 키워드 | 현재 | 목표 | 우선순위 |
|---------|---------|--------|----------|
| 수출 관리 플랫폼 | 미등록 | Top 10 | P0 |
| AI 수출 분석 | 미등록 | Top 5 | P0 |
| HS코드 자동분류 | 미등록 | Top 10 | P0 |
| FTA 혜택 계산기 | 미등록 | Top 10 | P1 |
| 수출바우처 활용 | 미등록 | Top 20 | P1 |
| 수출 서류 자동화 | 미등록 | Top 10 | P1 |
| 수출 초보 가이드 | 미등록 | Top 20 | P2 |
| PI 인보이스 작성 | 미등록 | Top 10 | P2 |

**핵심 키워드 (영문)**:
| 키워드 | 현재 | 목표 | 우선순위 |
|---------|---------|--------|----------|
| AI export platform | 미등록 | Top 20 | P0 |
| HS code classifier | 미등록 | Top 10 | P0 |
| Korean manufacturer sourcing | 미등록 | Top 20 | P1 |
| FTA calculator | 미등록 | Top 20 | P1 |
| export management software | 미등록 | Top 30 | P1 |
| trade document automation | 미등록 | Top 20 | P2 |

#### Schema.org 마크업

whistle-ai.com에서 검증 및 유지:
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

FAQ 스키마도 랜딩 페이지의 자주 묻는 수출 질문에 추가.

### 3.2 GEO-SEO (AI 검색 최적화)

**목표**: ChatGPT, Claude, Perplexity, Google AI Overview에 노출

#### llms.txt 설정

whistle-ai.com 루트에 `/llms.txt` 생성 및 유지:
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

#### robots.txt AI 크롤러 설정

```
User-agent: *
Allow: /

# AI 크롤러 명시적 허용
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

#### AI 인용 전략

AI 모델이 참조할 "인용 가능한" 콘텐츠 생산:

1. **유니크 데이터가 포함된 확정적 가이드**:
   - "한국 제품 HS코드 분류 완벽 가이드"
   - "국가별 FTA 혜택: 2026년 최신 세율"
   - "한국 수출 규정: 제조사가 알아야 할 모든 것"

2. **통계 콘텐츠** (AI 모델은 구체적 수치 인용을 좋아함):
   - "2025년 한국 화장품 수출액 XX억 달러"
   - "HS코드 수동 분류 평균 시간: 45분 vs AI 30초"
   - "한국 중소기업 FTA 활용률: 35%에 불과"

3. **모델이 파싱할 수 있는 구조화 데이터**:
   - 산업별 HS코드 테이블
   - FTA 세율 비교 차트
   - 국가별 수출 요건 목록

#### GEO-SEO 감사 스케줄

```bash
# 주간 실행 via geo-seo-claude 스킬
# ~/tasks/geo-seo-audit.sh

# 1. 전체 GEO 감사
claude --headless --skill geo-seo "whistle-ai.com 전체 GEO 감사 실행"

# 2. 인용 확률 체크
claude --headless --skill geo-seo "whistle-ai.com 인용 확률 확인"

# 3. AI 크롤러 접근 검증
claude --headless --skill geo-seo "whistle-ai.com AI 크롤러 접근 검증"

# 4. 스키마 검증
claude --headless --skill geo-seo "whistle-ai.com 스키마 마크업 검증"

# 리포트 내보내기
mv ~/geo-seo-report.json ~/reports/geo-seo-$(date +%Y-%m-%d).json
```

### 3.3 온페이지 SEO 체크리스트

모든 새 페이지 또는 콘텐츠에 대해:
- [ ] 타이틀 태그: 핵심 키워드 + 브랜드 (60자 이내)
- [ ] 메타 디스크립션: CTA 포함 (160자 이내)
- [ ] H1: 페이지당 1개, 핵심 키워드 포함
- [ ] H2/H3: 보조 키워드 자연스럽게 포함
- [ ] 내부 링크: 관련 페이지 3~5개
- [ ] 이미지 alt 텍스트: 설명적, 자연스러운 키워드 포함
- [ ] URL: 짧고, 키워드 포함, 소문자 + 하이픈
- [ ] Open Graph 태그: 소셜 공유용
- [ ] Canonical URL: 중복 콘텐츠 방지
- [ ] Hreflang: ko/en 버전 상호 연결

---

## 4. 커뮤니티 & 아웃리치 (PC1/PC2)

### 4.1 한국 기관

#### 정부 & 무역 기관

| 기관 | 액션 | 타임라인 |
|-------------|--------|----------|
| 한국무역협회 (KITA) | TradeKorea 등록, 바이어 매칭 신청 | 1주차 |
| KOTRA | buyKOREA 등록, 온라인 세미나 참여 | 1주차 |
| 중소벤처기업부 | 수출바우처 사업 신청 | 2주차 |
| 중소기업중앙회 | AI 수출 도구 파트너십 제안 | 2주차 |
| 한국산업단지공단 (KICOX) | 산업단지 제조사 접근 문의 | 3주차 |
| 수출지원센터 (전국 14개소) | 각 센터에 파트너십 제안서 발송 | 3~4주차 |
| 대한상공회의소 | 수출 세미나 공동 개최 제안 | 4주차 |

#### 산업별 협회

| 협회 | 산업 | 접근법 |
|-------------|----------|----------|
| 대한화장품산업연구원 | K-Beauty | 무료 AI 분석 데모 제공 |
| 한국건강기능식품협회 | K-Food/건강식품 | 수출 규정 가이드 |
| 한국섬유산업연합회 | K-Fashion | FTA 혜택 계산기 데모 |
| 한국기계산업진흥회 | 기계 | HS코드 분류 데모 |
| 한국제약바이오협회 | 제약 | 수출 서류 자동화 데모 |

#### 아웃리치 스크립트 (PC1):
```bash
#!/bin/bash
# ~/tasks/korean-org-outreach.sh
# 매일 10:00 KST 실행, 하루 3개 기관 처리

# 오늘 타겟 목록에서 로드
TARGETS=$(cat ~/outreach/korean-orgs-queue.json | jq '.[0:3]')

for target in $(echo "$TARGETS" | jq -c '.[]'); do
  ORG_NAME=$(echo "$target" | jq -r '.name')
  CONTACT=$(echo "$target" | jq -r '.contact')
  TYPE=$(echo "$target" | jq -r '.type')

  # 맞춤형 아웃리치 이메일 생성
  claude --headless "$ORG_NAME ($TYPE)에게 보내는 한국어 비즈니스 이메일 작성.
  목적: AI 수출 관리 파트너십/협업 제안.
  톤: 격식체 비즈니스 한국어 (존대말).
  포함: Whistle AI 간략 소개, 회원사를 위한 구체적 가치,
  제안 협업 형태 (무료 세미나, 데모, 공동 마케팅).
  길이: 300자 이내. 영어 전문용어 최소화."

  # 발송 전 수동 검토 대기열에 추가
  mv ~/drafts/latest-email.txt ~/outreach/review/$ORG_NAME-$(date +%Y%m%d).txt
done

# 대표님에게 검토 알림
~/ai-team-setup/control-center/telegram-bot.sh \
  "아웃리치 이메일 3건 검토 대기: ~/outreach/review/"
```

### 4.2 온라인 커뮤니티

#### 한국어 커뮤니티

| 플랫폼 | 커뮤니티 | 규모 | 접근법 |
|----------|-----------|---------|----------|
| 카카오 오픈채팅 | 수출입 실무자 방 | 다양 | 질문 답변, 팁 공유 |
| 카카오 오픈채팅 | 화장품 제조/수출 | 다양 | K-Beauty 수출 전문지식 |
| 네이버 카페 | 수출입 무역 실무 | 5만+ | 주간 유용한 글 |
| 네이버 카페 | 중소기업 CEO | 3만+ | 수출용 AI 도구 공유 |
| 페이스북 그룹 | 알리바바 셀러 모임 | 1만+ | 크로스보더 무역 팁 |
| 페이스북 그룹 | 수출입 무역 정보 | 2만+ | 규정 업데이트 |

#### 영문/글로벌 커뮤니티

| 플랫폼 | 커뮤니티 | 접근법 |
|----------|-----------|----------|
| 링크드인 그룹 | International Trade Professionals | 주간 인사이트 공유 |
| 링크드인 그룹 | Supply Chain Management | 크로스보더 물류 팁 |
| 페이스북 그룹 | Import/Export Business | 소싱 질문 답변 |
| 페이스북 그룹 | Amazon FBA Sellers | 한국 소싱 인사이트 |
| Quora | 무역/수출 주제 | 상세 답변 작성 |
| Discord | 이커머스 서버 | 무역 채널 기여 |
| Slack | 인디해커스 커뮤니티 | 빌딩 인 퍼블릭 업데이트 |

### 4.3 제조사 콜드 아웃리치

**데이터 소스 (공개, 무료)**:
- 공정거래위원회 사업자등록 조회
- KITA 수출입 업체 검색
- TradeKorea 제조사 디렉토리
- 알리바바 Korean supplier listings
- 스마트스토어/쿠팡/11번가 자체제작 셀러 검색

**아웃리치 케이던스**:
- Day 1: 초기 이메일 (가치 먼저, 판매 아님)
- Day 4: 후속 + 무료 리소스 (수출 가이드 PDF)
- Day 8: 사례 연구 또는 데모 영상
- Day 15: 최종 후속 + 무료 분석 제안
- Day 15 이후 무응답: 너처 리스트로 이동 (월간 뉴스레터)

**이메일 템플릿 구조**:
```
제목: {company_name}님, AI로 수출 비용 30% 절감하는 방법

{company_name} 대표님께,

[1줄: 그 회사 제품/수출 상황에 대한 구체적 언급]
[2줄: 구체적 문제점 지적 (예: HS코드 오분류로 인한 관세 초과납부)]
[3줄: 휘슬 AI가 어떻게 해결하는지]
[4줄: 무료 분석 1회 제안]

CTA: whistle-ai.com에서 무료 AI 수출 분석 받아보세요.
```

### 4.4 대학 & 교육

| 타겟 | 액션 |
|--------|--------|
| 무역학과 | 학생 프로젝트용 무료 플랫폼 제공 |
| 창업지원센터 | 수출 지향 스타트업 대상 데모 세션 |
| 수출아카데미 (KITA/KOTRA) | 보조 AI 도구로 제안 |

---

## 5. 24시간 일일 스케줄

### 마스터 크론 스케줄 (전체 PC, KST)

```
┌─────────────┬────────────────────────────────────────────────────────┐
│ 시간 (KST)   │ 활동                                                   │
├─────────────┼────────────────────────────────────────────────────────┤
│ 00:00-01:00 │ [PC3] 다음날 블로그 초안 생성 (한국어)                      │
│ 01:00-02:00 │ [PC3] 다음날 소셜미디어 캡션 생성                          │
│ 02:00-03:00 │ [PC3] 인스타그램 캐러셀 템플릿 제작                         │
│ 03:00-04:00 │ [PC3] Medium 기사 초안 생성 (영문)                        │
│ 04:00-05:00 │ [PC4] 경쟁사 웹사이트 변경 스캔                            │
│ 05:00-06:00 │ [PC4] SEO 순위 체크 + IndexNow 제출                     │
│ 06:00-07:00 │ [PC4] Google Search Console 모니터링                    │
│ 07:00-08:00 │ [PC3] 오늘 콘텐츠용 썸네일/이미지 생성                       │
│ 08:00-09:00 │ [PC3] 네이버 블로그 발행 (월/수/금)                         │
│             │ [PC4] 오전 SEO 리포트 → 텔레그램                          │
│ 09:00-10:00 │ [PC1] 한국어 커뮤니티 참여 (네이버 카페)                     │
│             │ [PC2] 영문 커뮤니티 참여 (Reddit/LinkedIn)                │
│ 10:00-11:00 │ [PC1] 한국어 아웃리치 이메일 (3건/일)                       │
│             │ [PC3] 인스타그램 포스트 발행                                │
│ 11:00-12:00 │ [PC1] 네이버 카페 질문 답변                                │
│             │ [PC2] Reddit/Quora 질문 답변                             │
│ 12:00-13:00 │ [PC3] 유튜브 쇼츠 제작 (화/금)                             │
│ 13:00-14:00 │ [PC1] 파트너십 후속 조치                                   │
│             │ [PC2] 링크드인 참여 (영문)                                 │
│ 14:00-15:00 │ [PC2] 트위터/X 포스팅 및 참여                              │
│             │ [PC1] 링크드인 포스팅 (한국어)                              │
│ 15:00-16:00 │ [PC4] 오후 분석 스냅샷                                    │
│             │ [PC3] 콘텐츠 성과 리뷰                                    │
│ 16:00-17:00 │ [PC1] 제조사 데이터베이스 스캔 (공개 소스)                    │
│             │ [PC2] 글로벌 바이어 커뮤니티 참여                            │
│ 17:00-18:00 │ [PC4] 일일 지표 컴파일                                    │
│             │ [PC3] 다음날 콘텐츠 캘린더 확정                             │
│ 18:00-19:00 │ [PC3] 브런치 기사 발행 (목요일)                             │
│             │ [PC3] Medium 기사 발행 (수요일)                            │
│ 19:00-20:00 │ [PC2] 미국 시간대 커뮤니티 참여 (피크 시간)                   │
│ 20:00-21:00 │ [PC2] 인디해커스 / HN 참여                               │
│ 21:00-22:00 │ [PC4] 경쟁사 모니터링 딥스캔                               │
│ 22:00-23:00 │ [PC4] 일일 요약 → 대표님 텔레그램 리포트                     │
│             │ [PC3] 콘텐츠 백로그 관리                                   │
│ 23:00-00:00 │ [PC4] 시장 조사 + 트렌드 스캔                              │
│             │ [PC3] 콘텐츠 템플릿 준비                                   │
└─────────────┴────────────────────────────────────────────────────────┘
```

### 주말 스케줄 (축소)

```
토요일:
  08:00 [PC3] 인스타그램 포스트
  10:00 [PC2] Reddit/Twitter 참여 (미국 사용자 활동 시간)
  14:00 [PC4] 주간 지표 컴파일
  18:00 [PC3] 다음 주 콘텐츠 일괄 제작

일요일:
  08:00 [PC3] 인스타그램 포스트
  10:00 [PC2] 가벼운 커뮤니티 참여
  14:00 [PC3] 다음 주 콘텐츠 캘린더 제작
  20:00 [PC4] 주간 리포트 → 대표님 텔레그램
```

---

## 6. n8n 워크플로우 생성 목록

### 워크플로우 1: 콘텐츠 캘린더 자동화

**트리거**: 크론 (일요일 14:00 KST)
**플로우**:
```
[크론 트리거] → [HTTP: Google Trends에서 트렌딩 수출 키워드 가져오기]
              → [Claude Code: 주간 콘텐츠 주제 생성]
              → [파일 저장: ~/content-calendar/week-{N}.json]
              → [텔레그램: 대표님에게 캘린더 승인 요청]
              → [승인 대기]
              → [분할: 각 날짜별 개별 태스크 파일 생성]
              → [파일 저장: ~/tasks/scheduled/YYYY-MM-DD-{platform}.json]
```

### 워크플로우 2: 소셜미디어 포스트 스케줄러

**트리거**: 크론 (매일 07:30 KST)
**플로우**:
```
[크론 트리거] → [파일 읽기: 오늘 예약된 포스트]
              → [스위치: 플랫폼별]
                ├→ [인스타그램] → [Playwright: 브라우저로 게시] → [로그 기록]
                ├→ [트위터/X]  → [Playwright: 브라우저로 게시] → [로그 기록]
                ├→ [링크드인]   → [Playwright: 브라우저로 게시] → [로그 기록]
                └→ [네이버]     → [Playwright: 브라우저로 게시] → [로그 기록]
              → [결과 병합]
              → [저장: 콘텐츠 캘린더 상태 업데이트]
              → [텔레그램: 발행 포스트 요약]
```

### 워크플로우 3: SEO 순위 트래커

**트리거**: 크론 (매일 05:00 KST)
**플로우**:
```
[크론 트리거] → [읽기: keyword-list.json]
              → [반복: 각 키워드]
                → [Playwright: Google 검색 (시크릿)]
                → [추출: 검색 결과에서 whistle-ai.com 위치]
                → [저장: 키워드, 순위, 날짜, URL]
              → [결과 집계]
              → [저장: ~/reports/seo-ranks/YYYY-MM-DD.json]
              → [비교: 전일 대비]
              → [IF: 유의미한 변동 (5순위 이상)]
                → [텔레그램: 대표님에게 순위 변동 알림]
              → [주간: 트렌드 차트 생성 (ffmpeg/GIMP)]
```

### 워크플로우 4: 경쟁사 웹사이트 변경 모니터

**트리거**: 크론 (매일 04:00 + 21:00 KST)
**경쟁사**:
- tradlinx.com (트레드링스)
- tradekorea.com (TradeKorea)
- buykorea.org (buyKOREA)
- silkroad.alibaba.com (알리바바 무역)
- customs.ai (있을 경우)

**플로우**:
```
[크론 트리거] → [반복: 각 경쟁사 URL]
                → [HTTP/Playwright: 페이지 콘텐츠 가져오기]
                → [해시: 이전 스냅샷과 비교]
                → [IF: 변경됨]
                  → [Diff: 변경 내용 추출]
                  → [Claude Code: 중요도 분석]
                  → [저장: 타임스탬프와 변경 로그]
              → [일간: 변경사항 집계]
              → [IF: 유의미한 변경 감지]
                → [텔레그램: 요약 알림]
              → [주간: 경쟁 인텔리전스 리포트]
```

### 워크플로우 5: 제조사 데이터베이스 빌더

**트리거**: 크론 (매일 16:00 KST)
**소스** (공개 데이터만):
- KITA 무역 디렉토리 (tradekorea.com/member 검색)
- KOTRA buyKOREA 셀러 리스팅
- 네이버 스마트스토어 "자체제작" 셀러
- 쿠팡 "제조사 직영" 셀러

**플로우**:
```
[크론 트리거] → [읽기: 마지막 스캔 위치/페이지]
              → [Playwright: 소스 탐색]
              → [추출: 회사명, 카테고리, 연락처 (공개된 경우)]
              → [중복 제거: 기존 데이터베이스 대비]
              → [분류: 산업별 (뷰티/식품/패션/기타)]
              → [점수: 수출 준비도 신호]
              → [저장: ~/data/manufacturers.jsonl에 추가]
              → [업데이트: 다음 실행을 위한 스캔 위치]
              → [IF: 오늘 50건+ 신규]
                → [텔레그램: 신규 제조사 발견 요약]
```

### 워크플로우 6: 이메일 아웃리치 시퀀스

**트리거**: 크론 (매일 09:30 KST) + 이벤트 (신규 제조사 등록)
**필요**: Resend 설정 (무료 티어: 100통/일)

**플로우**:
```
[크론 트리거] → [읽기: 아웃리치 대기열]
              → [필터: 케이던스에 따라 다음 터치 준비된 건]
              → [반복: 하루 최대 10건]
                → [Claude Code: 이메일 템플릿 개인화]
                → [대기열: 대표님 검토 (첫 연락인 경우)]
                → [또는: 자동 발송 (후속 연락인 경우)]
                → [로그: 발송 시각, 사용 템플릿]
              → [업데이트: 아웃리치 상태]
              → [추적: 열람률, 클릭률 (Resend 웹훅)]
```

**시퀀스 템플릿**:
```
터치 1 (Day 0):  "AI로 수출 비용 절감하는 방법" (가치 소개)
터치 2 (Day 4):  "수출 가이드 PDF 공유" (무료 리소스)
터치 3 (Day 8):  "AI 수출 분석 무료 체험" (무료 체험 제안)
터치 4 (Day 15): "마지막 안내: 무료 분석 기회" (최종 후속)
```

### 워크플로우 7: 분석 대시보드 집계기

**트리거**: 크론 (매일 17:00 KST + 주간 월요일 09:00 KST)
**플로우**:
```
[크론 트리거] → [병렬]
                ├→ [Playwright: Cloudflare Analytics → 방문/페이지뷰 추출]
                ├→ [Supabase: 오늘 가입자, 분석 실행 횟수 쿼리]
                ├→ [읽기: 오늘 콘텐츠 발행 건수]
                ├→ [읽기: 오늘 SEO 순위 위치]
                ├→ [Playwright: 인스타그램 인사이트 (가능한 경우)]
                └→ [읽기: 아웃리치 통계]
              → [병합: 모든 데이터 소스]
              → [저장: ~/reports/daily/YYYY-MM-DD.json]
              → [생성: ASCII 차트 요약]
              → [텔레그램: 대표님에게 일일 지표]

[주간 월요일] → [집계: 지난 7일 일일 리포트]
               → [계산: 주간 변동, 트렌드]
               → [Claude Code: 인사이트 및 추천 생성]
               → [텔레그램: 인사이트 포함 주간 다이제스트]
```

**일일 리포트 형식** (텔레그램):
```
Whistle AI 일일 리포트 (2026-03-22)

웹사이트:
  방문: 142 (+12% 전일 대비)
  순방문자: 89
  인기 페이지: /ko (45), /app (32), /buyer (12)

유저:
  신규 가입: 3
  분석 실행: 7
  활성 유저: 15

콘텐츠:
  발행: 2건 (네이버 블로그, 인스타그램)
  참여: 좋아요 45, 댓글 12

SEO:
  "AI 수출 분석": #23 (+2)
  "HS코드 분류": #31 (신규)

아웃리치:
  이메일 발송: 8건
  응답: 2건
  미팅 예약: 0건
```

### 워크플로우 8: 네이버 블로그 자동 발행기

**트리거**: 크론 (월/수/금 08:00 KST)
**플로우**:
```
[크론 트리거] → [읽기: 캘린더에서 오늘 콘텐츠]
              → [Claude Code: 한국어 블로그 전문 생성]
              → [Playwright: 네이버 블로그 로그인]
              → [Playwright: 새 글 작성]
                → [제목 설정]
                → [포맷팅된 콘텐츠 붙여넣기]
                → [태그/카테고리 추가]
                → [~/content/images/에서 이미지 추가]
              → [Playwright: 발행]
              → [추출: 발행 URL]
              → [HTTP: IndexNow 제출]
              → [텔레그램: URL 포함 발행 알림]
```

### 워크플로우 9: 인스타그램 콘텐츠 파이프라인

**트리거**: 크론 (매일 10:00 KST)
**플로우**:
```
[크론 트리거] → [읽기: 오늘 인스타그램 콘텐츠 계획]
              → [스위치: 콘텐츠 타입]
                ├→ [캐러셀] → [GIMP 배치: 템플릿에서 슬라이드 생성]
                ├→ [단일]   → [Midjourney: 이미지 생성]
                └→ [릴]     → [ffmpeg: 에셋에서 영상 제작]
              → [Claude Code: 캡션 + 해시태그 생성]
              → [Playwright: 인스타그램에 게시]
              → [로그: 포스트 URL, 참여 기준값]
              → [텔레그램: 게시 알림]
```

### 워크플로우 10: 주간 GEO-SEO 감사

**트리거**: 크론 (일요일 06:00 KST)
**플로우**:
```
[크론 트리거] → [Claude Code + geo-seo 스킬: 전체 감사 실행]
              → [비교: 지난주 점수 대비]
              → [식별: 개선 필요 Top 3 영역]
              → [Claude Code: 액션 아이템 생성]
              → [저장: ~/reports/geo-seo/week-{N}.json]
              → [텔레그램: 대표님에게 주간 GEO-SEO 리포트]
```

---

## 7. 핵심 추적 지표

### Tier 1: 매출 지표 (매일 확인)

| 지표 | 소스 | 목표 (1개월) | 목표 (3개월) |
|--------|--------|-------------------|-------------------|
| 신규 가입 | Supabase | 50 | 300 |
| AI 분석 실행 | Supabase | 100 | 1,000 |
| 유료 전환 | Stripe | 2 | 15 |
| MRR | Stripe | $198 | $2,000 |

### Tier 2: 트래픽 지표 (매일 확인)

| 지표 | 소스 | 목표 (1개월) | 목표 (3개월) |
|--------|--------|-------------------|-------------------|
| 웹사이트 방문 | Cloudflare | 3,000 | 20,000 |
| 순방문자 | Cloudflare | 1,500 | 10,000 |
| 이탈률 | Cloudflare | <60% | <45% |
| 평균 체류시간 | Cloudflare | >2분 | >3분 |
| 레퍼럴 방문 | Cloudflare | 500 | 5,000 |

### Tier 3: 콘텐츠 성과 (주간 확인)

| 지표 | 소스 | 목표 (1개월) | 목표 (3개월) |
|--------|--------|-------------------|-------------------|
| 블로그 발행 | 콘텐츠 로그 | 12 | 48 |
| 소셜미디어 포스트 | 콘텐츠 로그 | 30 | 120 |
| 전체 소셜 참여 | 플랫폼 분석 | 500 | 5,000 |
| 네이버 블로그 방문자 | 네이버 분석 | 2,000 | 15,000 |
| Medium 기사 조회 | Medium 통계 | 1,000 | 10,000 |
| 유튜브 쇼츠 조회 | YouTube Studio | 5,000 | 50,000 |

### Tier 4: SEO 성과 (주간 확인)

| 지표 | 소스 | 목표 (1개월) | 목표 (3개월) |
|--------|--------|-------------------|-------------------|
| Top 50 키워드 | 순위 트래커 | 5 | 20 |
| Top 10 키워드 | 순위 트래커 | 0 | 5 |
| 획득 백링크 | GSC | 10 | 50 |
| GEO-SEO 점수 | geo-seo-claude | 40/100 | 70/100 |
| AI 검색 인용 | 수동 체크 | 1 | 10 |

### Tier 5: 아웃리치 성과 (주간 확인)

| 지표 | 소스 | 목표 (1개월) | 목표 (3개월) |
|--------|--------|-------------------|-------------------|
| 아웃리치 이메일 발송 | 이메일 로그 | 100 | 500 |
| 응답률 | 이메일 로그 | 5% | 10% |
| 미팅 예약 | CRM | 5 | 20 |
| 파트너십 체결 | 수동 | 1 | 5 |
| 커뮤니티 게시 | 콘텐츠 로그 | 20 | 80 |

### 추적 인프라

```bash
# ~/tasks/metrics-collector.sh
# 매일 17:00 KST 실행

REPORT_DIR=~/reports/daily
TODAY=$(date +%Y-%m-%d)
REPORT_FILE="$REPORT_DIR/$TODAY.json"

mkdir -p "$REPORT_DIR"

# 모든 소스에서 수집
echo '{' > "$REPORT_FILE"

# Cloudflare (브라우저 자동화)
playwright run ~/scripts/cloudflare-analytics.js >> "$REPORT_FILE"

# Supabase (CLI 또는 Edge Function으로 직접 쿼리)
echo '"signups":' >> "$REPORT_FILE"

# 콘텐츠 로그
POSTS_TODAY=$(find ~/content/published/$TODAY -type f 2>/dev/null | wc -l)
echo "\"content_published\": $POSTS_TODAY," >> "$REPORT_FILE"

echo '}' >> "$REPORT_FILE"
```

---

## 8. 1주차 런칭 블리츠

### 런칭 전 체크리스트 (Day 0, 시작 전)

- [ ] whistle-ai.com 완전 작동 확인 (전 라우트 200 응답)
- [ ] 무료 AI 분석 E2E 작동 확인
- [ ] 모든 소셜미디어 계정 세팅 (미완료 시)
- [ ] 7일치 콘텐츠 사전 준비
- [ ] 콘텐츠 템플릿 생성 (인스타 캐러셀, 블로그, 이메일)
- [ ] whistle-ai.com에 IndexNow 키 설정
- [ ] llms.txt 배포 및 robots.txt 업데이트
- [ ] Schema.org 마크업 검증
- [ ] 기본 n8n 워크플로우 세팅 (최소: 순위 트래커, 분석)
- [ ] 텔레그램 봇 알림 테스트

### Day 1 (월요일): 기반 구축

| 시간 | PC | 액션 |
|------|-----|--------|
| 08:00 | PC3 | 핵심 블로그 발행: "AI 수출분석 플랫폼, 휘슬 AI 소개" |
| 09:00 | PC4 | 전체 URL IndexNow 제출 |
| 09:30 | PC1 | TradeKorea 등록 (tradekorea.com) |
| 10:00 | PC1 | buyKOREA 등록 (buykorea.org) |
| 10:30 | PC2 | 링크드인 회사 페이지 생성/최적화 (영문) |
| 11:00 | PC3 | 인스타그램 런칭 공지 포스트 |
| 12:00 | PC2 | 트위터/X 게시: "We just launched..." |
| 13:00 | PC1 | 링크드인 (한국어): CEO 런칭 발표 |
| 14:00 | PC2 | 링크드인 (영문): 회사 런칭 |
| 15:00 | PC3 | 유튜브 쇼츠 제작: "30초로 보는 AI 수출분석" |
| 16:00 | PC4 | 경쟁사 모니터링 워크플로우 세팅 |
| 18:00 | PC3 | Day 2 콘텐츠 준비 |
| 22:00 | PC4 | 첫 일일 지표 리포트 실행 |

### Day 2 (화요일): 콘텐츠 시딩

| 시간 | PC | 액션 |
|------|-----|--------|
| 08:00 | PC3 | 네이버 블로그 발행: "HS코드 자동분류, AI로 30초만에" |
| 09:00 | PC1 | 네이버 카페 3곳 가입 (수출 관련) |
| 10:00 | PC3 | 인스타 캐러셀: "수출 서류 체크리스트" |
| 11:00 | PC2 | Reddit: r/smallbusiness에서 5개 질문 답변 (홍보 없음) |
| 12:00 | PC3 | 유튜브 쇼츠 업로드 |
| 13:00 | PC1 | 링크드인 한국어: "HS코드 분류의 숨겨진 비용" |
| 14:00 | PC2 | 트위터 쓰레드: "한국 제조사들이 수출에서 잘못하는 5가지" |
| 15:00 | PC4 | 첫 SEO 순위 기준점 측정 |
| 16:00 | PC1 | 공개 디렉토리에서 타겟 제조사 20곳 식별 |
| 18:00 | PC3 | Medium 기사 초안 시작 |

### Day 3 (수요일): 아웃리치 시작

| 시간 | PC | 액션 |
|------|-----|--------|
| 08:00 | PC3 | 네이버 블로그: "FTA 혜택, 당신의 회사는 얼마나 놓치고 있나요?" |
| 09:00 | PC1 | 제조사에 첫 아웃리치 이메일 5건 발송 |
| 10:00 | PC3 | 인스타 포스트: FTA 절감 인포그래픽 |
| 11:00 | PC2 | Medium 기사 발행: "How AI is Changing International Trade" |
| 12:00 | PC1 | 네이버 카페: 수출 질문 3건 답변 |
| 13:00 | PC2 | 링크드인 영문: Medium 기사 공유 |
| 14:00 | PC2 | Reddit: r/ecommerce 토론 참여 |
| 15:00 | PC1 | KITA에 회원가입/파트너십 문의 |
| 16:00 | PC4 | 전체 신규 콘텐츠 URL IndexNow 제출 |
| 18:00 | PC3 | 브런치 기사 초안 |

### Day 4 (목요일): 사고 리더십

| 시간 | PC | 액션 |
|------|-----|--------|
| 08:00 | PC3 | 브런치 발행: "AI가 바꾸는 무역의 미래" |
| 09:00 | PC1 | Day 3 아웃리치 이메일 후속 |
| 10:00 | PC3 | 인스타 캐러셀: "AI 수출분석 결과 예시" |
| 11:00 | PC2 | Quora: 한국 수출 관련 상세 답변 작성 |
| 12:00 | PC3 | 유튜브 쇼츠: "FTA 혜택 한눈에 보기" |
| 13:00 | PC1 | 링크드인 한국어: CEO 사고 리더십 |
| 14:00 | PC2 | 링크드인 영문: 회사 마일스톤 |
| 15:00 | PC1 | 아웃리치 이메일 5건 추가 발송 |
| 16:00 | PC2 | 트위터: 무역 산업 뉴스 코멘트 |
| 18:00 | PC4 | 주중 지표 리뷰 + 전략 조정 |

### Day 5 (금요일): 증폭

| 시간 | PC | 액션 |
|------|-----|--------|
| 08:00 | PC3 | 네이버 블로그: "수출 초보 CEO를 위한 A to Z 가이드" |
| 09:00 | PC1 | EC21 등록 (ec21.com) |
| 10:00 | PC3 | 인스타 릴: 빠른 수출 팁 |
| 11:00 | PC2 | Reddit: 질문 답변 + 인사이트 공유 (1주차 예외: 카르마 축적) |
| 12:00 | PC3 | 유튜브 쇼츠 업로드 |
| 13:00 | PC1 | 네이버 블로그 베스트 콘텐츠 링크드인에 크로스 포스팅 |
| 14:00 | PC2 | 트위터/X: 주간 요약 쓰레드 |
| 15:00 | PC1 | 수출지원센터에 파트너십 제안서 발송 |
| 16:00 | PC4 | 전체 SEO 순위 체크 |
| 18:00 | PC3 | 다음 주 비주얼 에셋 일괄 제작 |

### Day 6 (토요일): 참여 집중

| 시간 | PC | 액션 |
|------|-----|--------|
| 08:00 | PC3 | 인스타그램 포스트 (가벼운 주말 콘텐츠) |
| 10:00 | PC2 | Reddit/Twitter 집중 참여 (미국 주말 = 활동적) |
| 14:00 | PC4 | 1주차 지표 컴파일 |
| 16:00 | PC3 | 다음 주 콘텐츠 캘린더 초안 |
| 18:00 | PC1 | 모든 아웃리치 응답 검토, 후속 이메일 초안 |

### Day 7 (일요일): 리뷰 & 계획

| 시간 | PC | 액션 |
|------|-----|--------|
| 08:00 | PC3 | 인스타그램 포스트 |
| 10:00 | PC4 | 1주차 종합 리포트 생성 |
| 12:00 | PC3 | 2주차 콘텐츠 캘린더 확정 |
| 14:00 | 전체 | 1주차 데이터 기반 전략 조정 |
| 16:00 | PC3 | 2주차 콘텐츠 초안 일괄 준비 |
| 20:00 | PC4 | 1주차 리포트 → 대표님 텔레그램 |

### 1주차 목표

| 지표 | 목표 |
|--------|--------|
| 블로그 발행 | 5건 (네이버 3, 브런치 1, Medium 1) |
| 소셜미디어 포스트 | 14건 (인스타 7, 링크드인 4, 트위터 7) |
| 유튜브 쇼츠 | 3건 |
| Reddit 기여 | 15건+ 댓글 (도움이 되는, 홍보 없음) |
| 아웃리치 이메일 | 15건 |
| 기관 연락 | 5곳 |
| B2B 플랫폼 등록 | 3곳 (TradeKorea, buyKOREA, EC21) |
| 신규 가입 | 10~20명 |

---

## 9. overnight-promote.sh 연동

기존 `overnight-promote.sh` 스크립트를 n8n 오케스트레이션 레이어에 통합. PC4에서 실행되는 강화 버전:

### 강화 스크립트: promote-24hr.sh

```bash
#!/bin/bash
# ~/tasks/promote-24hr.sh
# 모든 PC를 오케스트레이션하는 마스터 홍보 스크립트
# 크론으로 매시간 호출, 시간대별 작업 라우팅

HOUR=$(date +%H)
DAY=$(date +%u)  # 1=월, 7=일
LOG=~/logs/promote-$(date +%Y-%m-%d).log

log() { echo "[$(date +%H:%M:%S)] $1" >> "$LOG"; }

# ─── 야간 (00:00-06:00) ─── 콘텐츠 생성 ───
if [ "$HOUR" -ge 0 ] && [ "$HOUR" -lt 6 ]; then
  log "야간: 콘텐츠 생성 단계"

  # PC3: 오늘 콘텐츠 생성
  ssh pc3 "~/tasks/generate-daily-content.sh" &

  # PC4: IndexNow + 사이트맵 갱신
  ~/tasks/indexnow-submit.sh
  log "IndexNow 제출 완료"

  # PC4: 경쟁사 스캔 (2시, 4시만)
  if [ "$HOUR" -eq 2 ] || [ "$HOUR" -eq 4 ]; then
    ~/tasks/competitor-scan.sh
    log "경쟁사 스캔 완료"
  fi

# ─── 오전 (06:00-09:00) ─── SEO + 준비 ───
elif [ "$HOUR" -ge 6 ] && [ "$HOUR" -lt 9 ]; then
  log "오전: SEO 단계"

  # PC4: SEO 순위 체크
  if [ "$HOUR" -eq 6 ]; then
    ~/tasks/seo-rank-check.sh
    log "SEO 순위 체크 완료"
  fi

  # PC4: Google Search Console
  if [ "$HOUR" -eq 7 ]; then
    ~/tasks/gsc-check.sh
    log "GSC 체크 완료"
  fi

  # PC3: 오늘 발행 대기열 준비
  if [ "$HOUR" -eq 7 ]; then
    ssh pc3 "~/tasks/prepare-publish-queue.sh"
    log "발행 대기열 준비 완료"
  fi

  # PC3: 예약 콘텐츠 발행 (8시)
  if [ "$HOUR" -eq 8 ]; then
    ssh pc3 "~/tasks/publish-scheduled.sh"
    log "예약 콘텐츠 발행 완료"
  fi

# ─── 업무시간 (09:00-18:00) ─── 참여 + 아웃리치 ───
elif [ "$HOUR" -ge 9 ] && [ "$HOUR" -lt 18 ]; then
  log "업무시간: 참여 단계"

  # PC1: 한국어 참여 (9-12)
  if [ "$HOUR" -ge 9 ] && [ "$HOUR" -lt 12 ]; then
    ssh pc1 "~/tasks/korean-engage.sh --hour=$HOUR"
  fi

  # PC2: 영문 참여 (9-12, 14-17)
  if [ "$HOUR" -ge 9 ] && [ "$HOUR" -lt 12 ] || \
     [ "$HOUR" -ge 14 ] && [ "$HOUR" -lt 17 ]; then
    ssh pc2 "~/tasks/english-engage.sh --hour=$HOUR"
  fi

  # PC1: 아웃리치 (10, 13, 15)
  if [ "$HOUR" -eq 10 ] || [ "$HOUR" -eq 13 ] || [ "$HOUR" -eq 15 ]; then
    ssh pc1 "~/tasks/korean-org-outreach.sh"
  fi

  # PC3: 소셜미디어 포스팅 (10, 12, 14)
  if [ "$HOUR" -eq 10 ] || [ "$HOUR" -eq 12 ] || [ "$HOUR" -eq 14 ]; then
    ssh pc3 "~/tasks/social-post.sh --hour=$HOUR"
  fi

  # PC4: 오후 분석 (15:00)
  if [ "$HOUR" -eq 15 ]; then
    ~/tasks/metrics-collector.sh --snapshot
    log "오후 지표 스냅샷"
  fi

  # PC4: 일일 지표 (17:00)
  if [ "$HOUR" -eq 17 ]; then
    ~/tasks/metrics-collector.sh --full
    log "전체 일일 지표 수집 완료"
  fi

# ─── 저녁 (18:00-21:00) ─── 기획 + 미국 참여 ───
elif [ "$HOUR" -ge 18 ] && [ "$HOUR" -lt 21 ]; then
  log "저녁: 기획 단계"

  # PC3: 장문 콘텐츠 발행 (18:00)
  if [ "$HOUR" -eq 18 ]; then
    ssh pc3 "~/tasks/publish-longform.sh"
  fi

  # PC2: 미국 시간대 참여 (19-20, 미국 오전 피크)
  if [ "$HOUR" -ge 19 ] && [ "$HOUR" -lt 21 ]; then
    ssh pc2 "~/tasks/us-engage.sh"
  fi

  # PC3: 다음날 콘텐츠 확정 (20:00)
  if [ "$HOUR" -eq 20 ]; then
    ssh pc3 "~/tasks/finalize-tomorrow.sh"
  fi

# ─── 심야 (21:00-24:00) ─── 리포트 + 리서치 ───
elif [ "$HOUR" -ge 21 ]; then
  log "심야: 리포팅 단계"

  # PC4: 경쟁사 딥스캔 (21:00)
  if [ "$HOUR" -eq 21 ]; then
    ~/tasks/competitor-scan.sh --deep
    log "경쟁사 딥스캔 완료"
  fi

  # PC4: 대표님에게 일일 리포트 (22:00)
  if [ "$HOUR" -eq 22 ]; then
    ~/tasks/daily-report.sh
    log "일일 리포트 발송 완료"
  fi

  # PC4: 시장 조사 (23:00)
  if [ "$HOUR" -eq 23 ]; then
    ~/tasks/market-research.sh
    log "시장 조사 완료"
  fi
fi

# 주간 작업 (시간 무관)
# 월요일 09:00: 주간 다이제스트
if [ "$DAY" -eq 1 ] && [ "$HOUR" -eq 9 ]; then
  ~/tasks/weekly-digest.sh
  log "주간 다이제스트 발송"
fi

# 일요일 14:00: 다음 주 기획
if [ "$DAY" -eq 7 ] && [ "$HOUR" -eq 14 ]; then
  ~/tasks/weekly-planning.sh
  log "주간 기획 완료"
fi

# 일요일 06:00: GEO-SEO 감사
if [ "$DAY" -eq 7 ] && [ "$HOUR" -eq 6 ]; then
  ~/tasks/geo-seo-audit.sh
  log "GEO-SEO 감사 완료"
fi

log "$HOUR시 작업 완료"
```

---

## 10. 크론 스케줄

### PC3 (콘텐츠) - crontab

```cron
# 콘텐츠 팩토리 - PC3
SHELL=/bin/bash
PATH=/usr/local/bin:/usr/bin:/bin
HOME=/home/motive

# 콘텐츠 생성 (야간)
0 0 * * * ~/tasks/generate-blog-draft.sh --lang ko 2>&1 >> ~/logs/cron.log
0 1 * * * ~/tasks/generate-social-captions.sh 2>&1 >> ~/logs/cron.log
0 2 * * * ~/tasks/generate-carousel-images.sh 2>&1 >> ~/logs/cron.log
0 3 * * 3 ~/tasks/generate-medium-draft.sh 2>&1 >> ~/logs/cron.log
0 4 * * 4 ~/tasks/generate-brunch-draft.sh 2>&1 >> ~/logs/cron.log

# 발행
0 8 * * 1,3,5 ~/tasks/naver-blog-publish.sh 2>&1 >> ~/logs/cron.log
0 10 * * * ~/tasks/instagram-post.sh 2>&1 >> ~/logs/cron.log
0 12 * * 2,5 ~/tasks/youtube-shorts-upload.sh 2>&1 >> ~/logs/cron.log
0 18 * * 3 ~/tasks/medium-publish.sh 2>&1 >> ~/logs/cron.log
0 18 * * 4 ~/tasks/brunch-publish.sh 2>&1 >> ~/logs/cron.log

# 이미지 생성
0 7 * * * ~/tasks/generate-thumbnails.sh 2>&1 >> ~/logs/cron.log

# 콘텐츠 기획
0 14 * * 0 ~/tasks/create-weekly-calendar.sh 2>&1 >> ~/logs/cron.log
0 20 * * * ~/tasks/finalize-tomorrow-content.sh 2>&1 >> ~/logs/cron.log
```

### PC4 (운영/n8n) - crontab

```cron
# 운영 - PC4
SHELL=/bin/bash
PATH=/usr/local/bin:/usr/bin:/bin
HOME=/home/motive

# 마스터 오케스트레이터 (매시간 실행)
0 * * * * ~/tasks/promote-24hr.sh 2>&1 >> ~/logs/promote.log

# SEO
0 5 * * * ~/tasks/seo-rank-check.sh 2>&1 >> ~/logs/seo.log
0 6 * * * ~/tasks/indexnow-submit.sh 2>&1 >> ~/logs/seo.log
0 7 * * * ~/tasks/gsc-check.sh 2>&1 >> ~/logs/seo.log
0 6 * * 0 ~/tasks/geo-seo-audit.sh 2>&1 >> ~/logs/seo.log

# 경쟁사 모니터링
0 4 * * * ~/tasks/competitor-scan.sh 2>&1 >> ~/logs/competitor.log
0 21 * * * ~/tasks/competitor-scan.sh --deep 2>&1 >> ~/logs/competitor.log

# 분석 & 리포팅
0 15 * * * ~/tasks/metrics-collector.sh --snapshot 2>&1 >> ~/logs/metrics.log
0 17 * * * ~/tasks/metrics-collector.sh --full 2>&1 >> ~/logs/metrics.log
0 22 * * * ~/tasks/daily-report.sh 2>&1 >> ~/logs/report.log
0 9 * * 1 ~/tasks/weekly-digest.sh 2>&1 >> ~/logs/report.log

# 시장 조사
0 23 * * * ~/tasks/market-research.sh 2>&1 >> ~/logs/research.log

# 로그 로테이션
0 0 * * 0 find ~/logs -name "*.log" -mtime +30 -delete
```

### PC1 (개발 + 한국어 아웃리치) - crontab

```cron
# 한국어 아웃리치 - PC1
SHELL=/bin/bash
PATH=/usr/local/bin:/usr/bin:/bin
HOME=/home/motive

# 커뮤니티 참여
0 9 * * 1-5 ~/tasks/naver-cafe-engage.sh 2>&1 >> ~/logs/engage.log
0 11 * * 1-5 ~/tasks/naver-cafe-answer.sh 2>&1 >> ~/logs/engage.log
0 14 * * 1-5 ~/tasks/linkedin-korean-post.sh 2>&1 >> ~/logs/social.log

# 아웃리치
0 10 * * 1-5 ~/tasks/korean-org-outreach.sh 2>&1 >> ~/logs/outreach.log
0 13 * * 1-5 ~/tasks/outreach-followup.sh 2>&1 >> ~/logs/outreach.log
0 16 * * 1-5 ~/tasks/manufacturer-scan.sh 2>&1 >> ~/logs/outreach.log
```

### PC2 (QA + 영문 아웃리치) - crontab

```cron
# 영문 아웃리치 - PC2
SHELL=/bin/bash
PATH=/usr/local/bin:/usr/bin:/bin
HOME=/home/motive

# 커뮤니티 참여
0 9 * * 1-5 ~/tasks/reddit-engage.sh 2>&1 >> ~/logs/engage.log
0 11 * * 1-5 ~/tasks/quora-answer.sh 2>&1 >> ~/logs/engage.log
0 14 * * 1-5 ~/tasks/twitter-post.sh 2>&1 >> ~/logs/social.log
0 14 * * 1-5 ~/tasks/linkedin-english-post.sh 2>&1 >> ~/logs/social.log

# 미국 시간대 참여
0 19 * * * ~/tasks/us-engage.sh 2>&1 >> ~/logs/engage.log
0 20 * * * ~/tasks/indiehackers-update.sh 2>&1 >> ~/logs/engage.log
```

### 아이맥 (컨트롤센터) - launchd plist

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
  <integer>1800</integer>  <!-- 30분마다 -->
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

## 11. 리스크 대응

### 플랫폼 차단 / 속도 제한

| 리스크 | 대응 |
|------|------------|
| 네이버/인스타 계정 차단 | 플랫폼당 최대 3포스트/일; 게시 시간 ±30분 변동 |
| Reddit 섀도우밴 | 엄격한 10:1 도움:홍보 비율; 첫 달 링크 없음 |
| 링크드인 연결 제한 | 하루 최대 20건 연결; 모든 요청 개인화 |
| 트위터 속도 제한 | 하루 최대 15트윗 (답글 포함); 시간대별 분산 |
| IP 차단 | Tailscale로 다른 exit 노드 사용; 유저 에이전트 로테이션 |
| CAPTCHA 도전 | 자동화 일시정지, 대표님 알림, 수동 개입 |

### 콘텐츠 품질

| 리스크 | 대응 |
|------|------------|
| AI 생성 콘텐츠 감지 | 장문 콘텐츠는 발행 전 사람이 검토 |
| 수출 조언 사실 오류 | KITA/KOTRA 데이터베이스 교차 검증 |
| 정보 노후화 | 발행 콘텐츠 월간 리뷰; 업데이트 또는 아카이브 |
| 브랜드 일관성 미비 | 모든 콘텐츠 brand-guidelines.html 준수; 템플릿 강제 |

### 운영 리스크

| 리스크 | 대응 |
|------|------------|
| PC 오프라인 | promote-24hr.sh가 SSH 타임아웃으로 감지; 대표님 알림; 작업 재분배 |
| 브라우저 세션 만료 | 매일 06:00 세션 갱신; 백업 쿠키 보관 |
| 디스크 공간 부족 | 주간 오래된 로그/이미지 정리; 80% 용량 시 알림 |
| n8n 워크플로우 실패 | 3회 백오프 재시도; 3회 실패 후 알림; 수동 대체 |

### 에스컬레이션 프로토콜

```
Level 1 (자동 처리): 실패 작업 재시도, 세션 갱신
Level 2 (텔레그램 알림): 반복 실패, 계정 경고
Level 3 (중지 + 대표님 검토): 계정 정지 위험, 콘텐츠 품질 이슈
Level 4 (전면 중단): 계정 차단, 법적 우려, 보안 침해
```

---

## 부록 A: 디렉토리 구조

```
~/
├── tasks/                     # 실행 가능 태스크 스크립트
│   ├── promote-24hr.sh       # 마스터 오케스트레이터
│   ├── naver-blog-publish.sh
│   ├── instagram-post.sh
│   ├── reddit-engage.sh
│   ├── korean-org-outreach.sh
│   ├── seo-rank-check.sh
│   ├── competitor-scan.sh
│   ├── metrics-collector.sh
│   ├── daily-report.sh
│   ├── weekly-digest.sh
│   └── scheduled/            # 자동 생성된 일일 태스크 파일
├── content/
│   ├── calendar/             # 주간 콘텐츠 캘린더
│   ├── drafts/               # 검토 대기 콘텐츠
│   ├── published/            # 발행 콘텐츠 아카이브
│   │   └── YYYY-MM-DD/
│   ├── templates/            # 재사용 가능 콘텐츠 템플릿
│   │   ├── naver-blog.html
│   │   ├── instagram-carousel.psd
│   │   ├── youtube-short.json
│   │   └── email-outreach.txt
│   └── images/               # 생성된 이미지
├── scripts/                   # Playwright 자동화 스크립트
│   ├── naver-blog-post.js
│   ├── instagram-post.js
│   ├── youtube-upload.js
│   ├── reddit-scanner.js
│   ├── cloudflare-analytics.js
│   ├── gsc-monitor.js
│   └── midjourney-generate.js
├── data/
│   ├── manufacturers.jsonl   # 스크래핑된 제조사 DB
│   ├── keywords.json         # 타겟 키워드 목록
│   └── competitors.json      # 경쟁사 URL 및 해시
├── outreach/
│   ├── queue/                # 대기 중 아웃리치 타겟
│   ├── review/               # 대표님 검토 대기 이메일
│   ├── sent/                 # 발송 이메일 아카이브
│   └── responses/            # 수신 응답
├── reports/
│   ├── daily/                # 일일 지표 JSON
│   ├── weekly/               # 주간 다이제스트
│   ├── seo-ranks/            # 일일 키워드 순위
│   ├── geo-seo/              # 주간 GEO-SEO 감사
│   └── competitors/          # 경쟁사 변경 로그
└── logs/                      # 태스크 실행 로그
    ├── cron.log
    ├── promote.log
    ├── seo.log
    ├── engage.log
    ├── outreach.log
    └── metrics.log
```

## 부록 B: 빠른 참조 명령어

```bash
# 전체 시스템 상태 확인
motive status

# PC3에 콘텐츠 작업 할당
motive content "FTA 혜택 인스타그램 캐러셀 제작"

# PC1에 즉시 아웃리치 작업 실행
motive run pc1 "~/tasks/korean-org-outreach.sh"

# 오늘 지표 확인
cat ~/reports/daily/$(date +%Y-%m-%d).json | jq .

# 이번 주 콘텐츠 캘린더 보기
cat ~/content/calendar/week-$(date +%V).json | jq .

# SEO 순위 확인
cat ~/reports/seo-ranks/$(date +%Y-%m-%d).json | jq '.[] | select(.position < 50)'

# IndexNow 강제 제출
~/tasks/indexnow-submit.sh

# 대표님에게 수동 텔레그램 메시지
~/ai-team-setup/control-center/telegram-bot.sh "커스텀 메시지"

# 홍보 로그 확인
tail -100 ~/logs/promote.log

# 긴급: 모든 홍보 일시정지
touch ~/tasks/.PAUSE  # 모든 스크립트가 이 파일 존재 시 스킵
rm ~/tasks/.PAUSE     # 재개
```

## 부록 C: 콘텐츠 템플릿

### 네이버 블로그 글 템플릿

```
제목: [핵심 키워드] - [가치 제안] | 휘슬 AI

도입부 (100자):
- 공감 가능한 문제로 후킹
- 독자가 배울 내용 제시

섹션 1 (300자): 문제 정의
- 구체적 사례로 문제 설명
- 한국 제조 맥락 활용

섹션 2 (400자): 해결책
- 단계별 가이드
- 스크린샷이나 도표 포함
- 공식 소스 참조 (관세청, KITA)

섹션 3 (200자): 휘슬 AI 활용법
- 간결하고 비판매적 언급
- 무료 기능 중심 설명

결론 (100자):
- 핵심 요약
- CTA: "무료 AI 수출분석 받아보기 → whistle-ai.com"

태그: 수출, HS코드, FTA, 관세, AI, 수출바우처, [주제별 태그]
```

### 인스타그램 캐러셀 템플릿

```
슬라이드 1: 후킹 질문 (큰 텍스트, 다크 배경)
슬라이드 2: 데이터 포인트 포함 문제 제시
슬라이드 3: 해결 방법 1
슬라이드 4: 해결 방법 2
슬라이드 5: 해결 방법 3
슬라이드 6: CTA → whistle-ai.com

비주얼 스타일: 다크 (#0a0a0a) 배경, 흰색 텍스트, 포인트 블루 (#3B82F6)
폰트: Pretendard (한국어), Inter (영문)
이미지 사이즈: 1080x1080px
```

### 트위터 쓰레드 템플릿

```
1/ [놀라운 통계나 주장으로 후킹]

2/ 이게 [타겟 오디언스]에게 중요한 이유:
[문제 설명]

3/ 대부분 이렇게 해결하려고 합니다:
[흔하지만 비효율적인 접근]

4/ 더 나은 방법이 있습니다:
[인사이트 또는 해결 접근법]

5/ 구체적으로 이렇게 작동합니다:
[단계별 실용 조언]

6/ 결과?
[가능하면 구체적 숫자로 결과]

한국에서 수출하거나 한국 제품을 수입하신다면,
whistle-ai.com을 확인해보세요 — 바로 이 문제를 위해 만든 AI 도구입니다.
```

---

*이 플랜은 최소한의 대표님 개입으로 24/7 자율 운영되도록 설계되었습니다. 모든 홍보 활동은 무료이며, 유료 API 대신 브라우저 자동화를 사용하고, 스팸보다 진정한 가치 창출을 우선합니다. 지표 기반으로 매주 리뷰 및 조정하세요.*
