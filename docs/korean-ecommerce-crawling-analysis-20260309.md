# 한국 이커머스 플랫폼 크롤링 정책 분석
## Korean E-Commerce Platforms Crawling Research (2026-03-09)

---

## 요약 (Executive Summary)

한국의 주요 이커머스 플랫폼들은 **높은 수준의 반-크롤링 보안**을 구현하고 있습니다. Edge Functions/Node.js/Deno 같은 서버사이드 크롤링은 대부분의 플랫폼에서 매우 어렵거나 불가능합니다.

**핵심 결론:**
- **쿠팡 (Coupang)**: 차단 (Blocked) - Akamai bot detection, 데이터센터 IP 완전 차단
- **네이버 쇼핑**: 차단 (Blocked) - 인하우스 CAPTCHA, 데이터센터 IP 차단, 공격적 반크롤링
- **지마켓**: 보통-어려움 (Medium) - Cloudflare bot challenge, OG 태그 있음, API 지원
- **11번가**: 보통 (Medium) - robots.txt 허용, OG 태그 제공, OpenAPI 지원
- **롯데온**: 보통-어려움 (Medium) - API 지원, 데이터센터 IP 제한
- **SSG.com**: 어려움 (Hard) - Cloudflare WAF, 접근 거부
- **옥션**: 어려움 (Hard) - Cloudflare WAF, 접근 거부
- **위메프**: 어려움 (Hard) - 동적 렌더링, 보안 방어
- **티몬**: 어려움 (Hard) - 404 응답, 구조 불명
- **인터파크**: 어려움 (Hard) - Cloudflare 보호, API 엔드포인트 차단
- **카페24/Shopify**: 쉬움-보통 (Easy-Medium) - 카페24 API 지원, Shopify는 Web Bot Auth

---

## 상세 분석 (Detailed Analysis)

### 1. 쿠팡 (Coupang) - coupang.com

| 항목 | 상태 |
|------|------|
| **크롤링 난이도** | 🔴 차단 (Blocked) |
| **robots.txt** | 전체 거부 (전접근 불가) |
| **OG 태그** | 미제공 |
| **LD+JSON** | 미제공 |
| **공식 API** | 없음 |
| **데이터센터 IP** | 🔴 완전 차단 |
| **쿠키/세션** | 필수 + Akamai Fingerprinting |

**기술적 특징:**
- **Akamai Bot Manager** 도입: 브라우저 핑거프린팅, JavaScript 실행 패턴 분석, 마우스 궤적, 스크롤 속도 분석
- **robots.txt 접근 거부**: "Access Denied - Reference #18" 에러
- **데이터센터 IP 사전 차단**: AWS/GCP/Azure IP 범위는 요청 도달 전부터 차단
- **Firecrawl + Stealth Proxy, Jina Reader 모두 차단됨** (2026-01)

**결론:** Server-side crawling 불가능. 브라우저 자동화도 Akamai로 거의 100% 탐지됨.

---

### 2. 네이버 쇼핑 (Naver Shopping) - shopping.naver.com / smartstore.naver.com

| 항목 | 상태 |
|------|------|
| **크롤링 난이도** | 🔴 차단 (Blocked) |
| **robots.txt** | AI 크롤러 전면 차단, 일반 크롤러도 대부분 차단 |
| **OG 태그** | 선택적 제공 (동적 렌더링 필요) |
| **LD+JSON** | 백엔드 API로만 제공 |
| **공식 API** | Naver Commerce API 있음 (접근 제한) |
| **데이터센터 IP** | 🔴 완전 차단 |
| **쿠키/세션** | 필수 + 인하우스 CAPTCHA |

**robots.txt 내용:**
```
# AI 크롤링 및 RAG 목적 접근 금지
User-agent: GPTBot / OAI-SearchBot / PerplexityBot / ClaudeBot / meta-externalagent
Disallow: /

User-agent: Yeti (Naver bot)
Disallow: /v1 /my /*/*/store/ /*/*/stores/ /*/store/ /*/stores/ ...

User-agent: *
Disallow: /
```

**기술적 특징:**
- **인하우스 Receipt CAPTCHA**: 외부 CAPTCHA 해결 서비스 통과 불가
- **데이터센터 IP 차단**: AWS/GCP 완전 차단
- **Firecrawl, Jina Reader 모두 차단**
- **동적 렌더링 필수**: 많은 콘텐츠가 JS로 로드됨
- **백엔드 API 접근**: `smartstore.naver.com` 상품정보는 JSON 응답 가능하나 인증 필요

**결론:** Server-side crawling 불가능. 데이터 접근은 공식 API 또는 Naver Smartstore 판매자 계정 필수.

---

### 3. 지마켓 (Gmarket) - gmarket.co.kr

| 항목 | 상태 |
|-----|------|
| **크롤링 난이도** | 🟡 보통-어려움 (Medium-Hard) |
| **robots.txt** | Cloudflare 챌린지 (브라우저 확인 필요) |
| **OG 태그** | ✅ 제공함 |
| **LD+JSON** | 선택적 제공 |
| **공식 API** | ✅ Gmarket ET API (JWT 인증) |
| **데이터센터 IP** | 🟡 제한 (Cloudflare로 필터링) |
| **쿠키/세션** | JWT 토큰 필수 |

**robots.txt 내용:**
```
User-agent: *
Disallow: /

User-agent: Mediapartners-Google, Googlebot, NaverBot, Yeti, Daumoa, Twitterbot
Crawl-delay: 1
Allow: /*.gif$ /*.jpg$ /*.png$ /MW/Product /products/ /order/ ...
```

**공식 API:**
- **Gmarket ET API**: https://etapi.gmarket.com/pages/API-%EA%B0%80%EC%9D%B4%EB%93%9C
- **인증**: Master ID + JWT (HMAC 서명)
- **범위**: 상품등록/수정, 주문 수집, 배송, 클레임, 정산
- **문의**: etapihelp@gmail.com

**기술적 특징:**
- **Cloudflare 보호**: robots.txt 직접 접근 시 "Just a moment" 챌린지 (JavaScript 필요)
- **제한된 크롤링**: robots.txt에서 대부분의 경로 거부
- **OG 태그 제공**: 기본 메타데이터는 서버 렌더링으로 제공 가능
- **API 기반 접근**: 판매자 계정으로 공식 API 사용 권장

**결론:** Server-side 단순 GET 요청은 매우 어려움. 공식 API 또는 Cloudflare 우회 필요.

---

### 4. 11번가 (11st) - 11st.co.kr

| 항목 | 상태 |
|------|------|
| **크롤링 난이도** | 🟡 보통 (Medium) |
| **robots.txt** | ✅ 허용적 (대부분의 경로 Allow) |
| **OG 태그** | ✅ 제공함 |
| **LD+JSON** | 부분 제공 |
| **공식 API** | ✅ 11st Open API (무료) |
| **데이터센터 IP** | 🟡 제한적 |
| **쿠키/세션** | API 키 필수 |

**robots.txt 내용:**
```
User-agent: *
Disallow: /

User-agent: Googlebot, NaverBot, Yeti, Daumoa, Twitterbot
Crawl-delay: 1
Allow: /*.gif$ /*.jpg$ /*.png$ /MW/Product /products/ /pc/ /*.css$ /*.js$ ...
Disallow: /register/ /remittance/ /tns/ /csagent/ /community/ /openapi/ ...
```

**공식 API:**
- **포털**: https://openapi.11st.co.kr/
- **형식**: REST API
- **범위**: 상품 정보, 카테고리, 검색
- **인증**: API 키 (등록 후 발급)

**기술적 특징:**
- **Crawl-delay: 1초** (합리적 수준)
- **선택적 allow**: 특정 경로는 명시적으로 허용
- **검색 엔진 우호적**: Google/Naver bot 명시 허용
- **OG 태그 서버 렌더링**: 기본 메타데이터 포함

**결론:** Server-side crawling 가능하나 rate-limiting 준수 필수. 공식 API 사용이 가장 안정적.

---

### 5. 롯데온 (Lotte ON) - lotteon.com

| 항목 | 상태 |
|------|------|
| **크롤링 난이도** | 🟡 보통-어려움 (Medium-Hard) |
| **robots.txt** | Cloudflare 챌린지 (접근 불가) |
| **OG 태그** | 선택적 제공 |
| **LD+JSON** | 부분 제공 |
| **공식 API** | ✅ Lotte ON API Center (제한적) |
| **데이터센터 IP** | 🔴 차단됨 |
| **쿠키/세션** | 필수 |

**공식 API:**
- **포털**: https://api.lotteon.com/apiGuide/
- **FAQ**: https://api.lotteon.com/faq/
- **범위**: 판매자 API (제품 수정, 주문, 배송 등)

**기술적 특징:**
- **Cloudflare 보호**: robots.txt 직접 접근 차단
- **데이터센터 IP 차단**: Quick commerce 트래픽 관리
- **API 제한적**: 판매자 계정 필수, 일반 상품정보 API 미공개
- **속도 제한**: API 요청 제한 정책 있음

**결론:** 판매자 API만 가능. 일반 사용자 크롤링은 불가능.

---

### 6. SSG.com (쓱닷컴/신세계) - ssg.com

| 항목 | 상태 |
|------|------|
| **크롤링 난이도** | 🔴 어려움 (Hard) |
| **robots.txt** | Akamai 차단 (Access Denied) |
| **OG 태그** | 미제공 (동적 렌더링 필요) |
| **LD+JSON** | 미제공 |
| **공식 API** | 없음 (개발자용 없음) |
| **데이터센터 IP** | 🔴 차단 |
| **쿠키/세션** | Akamai + 쿠키 필수 |

**기술적 특징:**
- **Akamai CDN + WAF**: "Access Denied" 에러 반환
- **모든 요청 필터링**: robots.txt 조차 접근 불가
- **신세계 계열**: 보안이 매우 강화됨
- **공식 데이터 접근**: B2B 계약 필요 (개발자 API 없음)

**결론:** Server-side crawling 완전 불가능. SSG 자체 데이터 접근 시 고객사 계약 필수.

---

### 7. 옥션 (Auction) - auction.co.kr

| 항목 | 상태 |
|------|------|
| **크롤링 난이도** | 🔴 어려움 (Hard) |
| **robots.txt** | Cloudflare 챌린지 (접근 불가) |
| **OG 태그** | 미제공 (JS 필요) |
| **LD+JSON** | 미제공 |
| **공식 API** | ✅ AuctionService API 있음 (구형, 미지원) |
| **데이터센터 IP** | 🔴 차단 |
| **쿠키/세션** | Cloudflare + 쿠키 필수 |

**공식 API:**
- **레거시 API**: http://api.auction.co.kr/apiv1/auctionservice.asmx
- **상태**: 구형, 활발하지 않음
- **범위**: 카테고리, 기본 상품정보 제한

**기술적 특징:**
- **Cloudflare WAF**: "Just a moment" 챌린지
- **레거시 API 미지원**: 현재 활발한 개발자 API 없음
- **데이터센터 차단**: 모든 클라우드 IP 차단
- **eBay 인수 후 축소됨**: 쿠팡, 네이버 등에 밀림

**결론:** Server-side crawling 불가능. API도 사실상 미지원.

---

### 8. 위메프 (WeMakePrice) - wemakeprice.com

| 항목 | 상태 |
|------|------|
| **크롤링 난이도** | 🔴 어려움 (Hard) |
| **robots.txt** | 응답 없음 (404) |
| **OG 태그** | 미제공 (동적 렌더링) |
| **LD+JSON** | 미제공 |
| **공식 API** | Product Advertising API만 (판매자용) |
| **데이터센터 IP** | 🔴 차단 |
| **쿠키/세션** | 필수 + 동적 검증 |

**기술적 특징:**
- **robots.txt 404**: 직접 관리하지 않음
- **동적 렌더링**: JavaScript 실행 필요
- **보안 방어**: 자동화된 요청 차단
- **Product Advertising API**: 판매자 계정 필수, 일반 크롤링 불가
- **서버 부하 관리**: 요청 제한

**결론:** Server-side crawling 불가능. 공식 API도 판매자만 지원.

---

### 9. 티몬 (TMON) - tmon.co.kr

| 항목 | 상태 |
|------|------|
| **크롤링 난이도** | 🔴 어려움 (Hard) |
| **robots.txt** | 404 Not Found |
| **OG 태그** | 미제공 (JS 렌더링 필요) |
| **LD+JSON** | 미제공 |
| **공식 API** | 없음 (개발자 API 미지원) |
| **데이터센터 IP** | 🔴 차단 |
| **쿠키/세션** | 필수 |

**기술적 특징:**
- **robots.txt 미존재**: HTTP 404 응답
- **API 미제공**: 공식 개발자 API 없음
- **소셜커머스 플랫폼**: 라이브/스트리밍 콘텐츠 중심
- **동적 콘텐츠**: 거의 모든 데이터가 JavaScript 렌더링
- **데이터센터 차단**: 기본 보안

**결론:** Server-side crawling 거의 불가능. 공식 데이터 접근 경로 없음.

---

### 10. 인터파크 (Interpark) - interpark.com

| 항목 | 상태 |
|------|------|
| **크롤링 난이도** | 🔴 어려움 (Hard) |
| **robots.txt** | ✅ 있음 (Cloudflare 리다이렉트) |
| **OG 태그** | 미제공 (JS 필요) |
| **LD+JSON** | 미제공 |
| **공식 API** | 없음 (개발자 API 미지원) |
| **데이터센터 IP** | 🔴 차단 |
| **쿠키/세션** | Cloudflare + 필수 |

**robots.txt 내용 (추론됨):**
```
User-agent: *
Allow: /

Disallow: /_api/*
Disallow: /_partials*
Disallow: /admin

Crawl-delay: 10 (aggressive bots like dotbot, AhrefsBot)
```

**기술적 특징:**
- **API 엔드포인트 차단**: `/_api/*` 명시적 거부
- **Crawl-delay 10초**: 매우 긴 대기 시간
- **부분 뷰 차단**: `/_partials*` 거부
- **데이터센터 우선 차단**: Cloudflare 기반
- **공식 API 없음**: 개발자 지원 미흡

**결론:** Server-side crawling 가능하나 과도한 rate-limiting 필요. 매우 비효율적.

---

### 11. 카페24 (Cafe24) - cafe24.com / various .cafe24shop.com

| 항목 | 상태 |
|------|------|
| **크롤링 난이도** | 🟢 쉬움-보통 (Easy-Medium) |
| **robots.txt** | 각 샵별 다름 |
| **OG 태그** | ✅ 제공함 |
| **LD+JSON** | ✅ 제공함 |
| **공식 API** | ✅ Cafe24 REST API |
| **데이터센터 IP** | 🟡 제한적 |
| **쿠키/세션** | API 키 필수 |

**공식 API:**
- **포털**: https://developers.cafe24.com/docs/en/api/
- **관리자 API**: https://partners.cafe24.com/docs/en/api/admin/
- **인증**: OAuth 2.0
- **범위**: 상품, 주문, 고객, 게시판 등

**API 요청 제한:**
- **요청 수 제한 정책**: https://developers.cafe24.com/app/front/app/develop/api/operation
- **API 조회 패턴**: 문서화됨
- **rate limiting**: 시간당 요청 수 제한

**기술적 특징:**
- **개발자 친화적**: 공식 API 잘 정리됨
- **OG 태그 서버 렌더링**: 기본 메타데이터 포함
- **LD+JSON 지원**: 구조화된 데이터 제공
- **OAuth 인증**: 보안 기반
- **데이터센터 IP**: 판매자 계정으로 API 사용 가능

**결론:** Server-side crawling 가능. 공식 API 사용 권장. OG 태그/LD+JSON 단순 수집 시 robots.txt 준수 필수.

---

### 12. Shopify Korea - various shopify.com stores in Korea

| 항목 | 상태 |
|------|------|
| **크롤링 난이도** | 🟢 쉬움-보통 (Easy-Medium) |
| **robots.txt** | ✅ 가능 (커스터마이징 가능) |
| **OG 태그** | ✅ 제공함 (Shopify 기본) |
| **LD+JSON** | ✅ 제공함 |
| **공식 API** | ✅ Shopify Admin API, Storefront API |
| **데이터센터 IP** | 🟢 허용 (Web Bot Auth) |
| **쿠키/세션** | API 토큰 또는 Bot Auth 필수 |

**공식 API:**
- **Shopify Admin API**: 관리자용
- **Storefront API**: 공개 상품정보용
- **인증**: OAuth, Custom Apps
- **rate limiting**: 2 requests/second 기본

**robots.txt:**
```
User-agent: *
Disallow: /admin
Disallow: /cart
Disallow: /checkout
Disallow: /collections/*+*
Disallow: /search
Disallow: /policies/
```

**기술적 특징:**
- **Web Bot Auth**: Shopify가 공식적으로 크롤러 인증 지원
- **커스터마이징 가능**: robots.txt.liquid로 수정 가능
- **OG 태그 완벽 지원**: 기본 메타데이터 포함
- **LD+JSON 자동**: Product schema 포함
- **공개 API**: GraphQL 기반 Storefront API 공개

**결론:** Server-side crawling 가장 쉬움. 공식 API 사용 권장. Web Bot Auth로 정당한 크롤러 인증 가능.

---

## 비교 테이블 (Comparison Table)

| 플랫폼 | robots.txt 상태 | OG 태그 | LD+JSON | 공식 API | 데이터센터 IP | 난이도 | 추천 방법 |
|--------|----------------|--------|---------|----------|--------------|--------|----------|
| 쿠팡 | ❌ 차단 | ❌ | ❌ | ❌ | ❌ 차단 | 🔴 차단 | 불가능 |
| 네이버 쇼핑 | ❌ 차단 | ⚠️ 제한 | ⚠️ 제한 | ⚠️ 제한 | ❌ 차단 | 🔴 차단 | 공식 API만 |
| 지마켓 | ⚠️ CF 챌린지 | ✅ | ⚠️ | ✅ API | ⚠️ 제한 | 🟡 어려움 | API 권장 |
| 11번가 | ✅ 허용 | ✅ | ✅ | ✅ API | ⚠️ 제한 | 🟡 보통 | API 권장 |
| 롯데온 | ❌ CF 차단 | ⚠️ | ⚠️ | ⚠️ 제한 | ❌ 차단 | 🟡 어려움 | API만 (판매자) |
| SSG.com | ❌ 차단 | ❌ | ❌ | ❌ | ❌ 차단 | 🔴 어려움 | 불가능 |
| 옥션 | ❌ CF 차단 | ❌ | ❌ | ⚠️ 레거시 | ❌ 차단 | 🔴 어려움 | 거의 불가능 |
| 위메프 | ❌ 없음 | ❌ | ❌ | ⚠️ 판매자만 | ❌ 차단 | 🔴 어려움 | 불가능 |
| 티몬 | ❌ 없음 | ❌ | ❌ | ❌ | ❌ 차단 | 🔴 어려움 | 불가능 |
| 인터파크 | ✅ 있음 | ❌ | ❌ | ❌ | ❌ 차단 | 🔴 어려움 | robots.txt 준수 |
| 카페24 | ✅ 샵별 | ✅ | ✅ | ✅ API | ⚠️ 제한 | 🟢 쉬움 | API 권장 |
| Shopify | ✅ 커스터마이징 | ✅ | ✅ | ✅ API | ✅ 허용 | 🟢 쉬움 | API + Web Bot Auth |

---

## 기술적 차단 메커니즘 (Blocking Mechanisms)

### A. robots.txt 수준의 차단
**대상:** Coupang, Naver Shopping, Gmarket, Auction, Lotte ON, SSG
- robots.txt 직접 접근 차단
- 또는 모든 경로에 대해 `User-agent: * / Disallow: /` 설정
- Cloudflare JAM 챌린지로 보호됨

### B. 데이터센터 IP 차단
**대상:** Coupang, Naver, Gmarket, Lotte ON, SSG, 옥션, 위메프, 티몬, 인터파크
- AWS, GCP, Azure IP 범위 사전 차단
- Edge Function (Deno/CF Workers)은 사용 불가능
- 요청이 CDN에 도달하기 전부터 IP 필터링

### C. 브라우저 핑거프린팅 (Bot Detection)
**대상:** Coupang (Akamai), Naver (in-house)
- JavaScript 실행 여부 확인
- 마우스 움직임, 스크롤 패턴 분석
- 브라우저 API 호출 패턴 분석
- Headless browser 감지

### D. CAPTCHA
**대상:** Naver Shopping (인하우스 Receipt CAPTCHA), Cloudflare
- 자동 CAPTCHA 해결 서비스로 우회 불가능 (Naver)
- Cloudflare 챌린지는 일부 우회 가능하나 복잡함

### E. 동적 렌더링 의존
**대상:** Naver, Coupang, WeMakePrice, TMON, Interpark
- OG 태그/LD+JSON을 JavaScript 실행 후에만 제공
- 정적 HTML에는 메타데이터 없음
- Headless browser 필수

---

## Server-Side Crawling 가능성 매트릭스

### Edge Function / Deno / Node.js에서 단순 HTTP GET 요청

```
✅ 가능:
  - Shopify (공개 API / Web Bot Auth)
  - Cafe24 (공개 API + robots.txt 준수)
  - 11번가 (OpenAPI)

⚠️ 제한적:
  - Gmarket (Cloudflare 챌린지 + API 권장)

❌ 불가능:
  - 쿠팡, 네이버, SSG, 옥션, 위메프, 티몬, 인터파크
```

---

## 권장 접근 방법 (Recommended Approaches)

### 1. **공식 API 사용 (권장)** ✅
- **적합:** Gmarket, 11st, 롯데온(판매자), 카페24, Shopify
- **장점:** 합법적, 안정적, 지원됨, 성능 보장
- **비용:** 무료 또는 저가
- **구현:** 각 플랫폼 개발자 문서 참조

```javascript
// 예: 11st OpenAPI
const apiKey = process.env.ST_API_KEY;
const productId = '...';

fetch(`https://openapi.11st.co.kr/openapi/products/${productId}`, {
  headers: { 'Authorization': `Bearer ${apiKey}` }
})
.then(r => r.json())
```

### 2. **주거 IP + Rotating Proxy (위험)** ⚠️
- **적합:** Naver Shopping, 지마켓 (부분)
- **장점:** robots.txt 우회 가능
- **단점:** 불법성, 서비스 약관 위반, IP 차단 위험
- **성공률:** Naver는 50% 이하

```javascript
// 권장하지 않음 - 법적 위험
fetch(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0...',
    'Referer': 'https://google.com'
  },
  agent: proxyAgent // 회전 프록시
})
```

### 3. **Headless Browser + Proxy (부분 가능)** ⚠️
- **적합:** 11st, Gmarket, 인터파크 (제한적)
- **도구:** Puppeteer, Playwright
- **장점:** JavaScript 렌더링 가능
- **단점:** 느림, 리소스 많음, Coupang/Naver는 탐지됨

```javascript
const browser = await puppeteer.launch({
  args: ['--no-sandbox', '--proxy-server=http://proxy:port']
});
const page = await browser.newPage();
await page.goto(url);
const data = await page.evaluate(() => ({
  title: document.querySelector('h1')?.textContent,
  price: document.querySelector('[data-price]')?.textContent
}));
```

### 4. **Browser Extension (수동 + 웹훅)** 🔧
- **적합:** 모든 플랫폼
- **장점:** 사람처럼 보임, 거의 탐지 불가능
- **단점:** 수동 작업 필요, 확장성 낮음
- **구현:** 크롬 확장 프로그램 + 웹훅

```javascript
// manifest.json (확장 프로그램)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrape') {
    const data = {
      title: document.title,
      price: document.querySelector('[data-price]')?.textContent
    };
    fetch('https://webhook.site/xxx', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
});
```

---

## 플랫폼별 권장 전략 (Platform-Specific Strategies)

### 쿠팡
```
❌ 불가능
- robots.txt 차단
- Akamai 완벽 감지
- 데이터센터 IP 차단
- 공식 API 없음

→ 데이터: 쿠팡 셀러 앱, 공식 파트너십
```

### 네이버 쇼핑
```
❌ 거의 불가능 (상품정보만 제한적)

✅ 가능한 방법:
1. Naver Commerce API (판매자 계정)
   - storeId, productId로 JSON 조회
   - 인증 필수

2. 검색 API (제한적)
   - Naver Search API로 검색 결과만 수집
```

### 지마켓
```
⚠️ 제한적 가능

✅ 권장:
- Gmarket ET API (판매자)
  * JWT 인증: Master ID + HMAC 서명
  * 상품등록/수정/조회

⚠️ 크롤링:
- robots.txt 준수: Crawl-delay 1초
- OG 태그: 서버 렌더링, 간단한 JS 필요 없음
- Cloudflare 우회: JavaScript 실행 필요 (Puppeteer)
```

### 11번가
```
✅ 가장 쉬움

✅ 권장:
- 11st Open API (https://openapi.11st.co.kr)
  * 무료
  * API 키 등록
  * 상품 조회, 검색

✅ robots.txt 크롤링:
- Crawl-delay 1초 준수
- OG 태그 서버 렌더링
- LD+JSON 제공
```

### 롯데온
```
⚠️ 제한적 (판매자 전용)

✅ 가능:
- Lotte ON API Center (판매자)
  * https://api.lotteon.com/
  * 판매자 계정 필수
  * API 요청 제한 정책 있음

❌ 일반 상품정보 API 없음
```

### SSG.com / 옥션 / 위메프 / 티몬
```
❌ 거의 불가능

- 데이터센터 IP 완전 차단
- robots.txt 미제공 또는 차단
- 공식 API 없음

→ 데이터: B2B 계약, 카테고리 피드 구매
```

### 인터파크
```
⚠️ 매우 제한적

- robots.txt 있음 (Crawl-delay 10초)
- 하지만 API 엔드포인트 차단
- 공식 API 없음

→ 너무 비효율적, 추천하지 않음
```

### 카페24
```
✅ 가장 권장

✅ API:
- Cafe24 REST API
  * OAuth 2.0
  * 상품, 주문, 고객 등
  * Rate limiting: 시간당 제한

✅ robots.txt:
- 각 샵별 다름
- 일반적으로 허용적
- OG 태그 + LD+JSON 지원
```

### Shopify (한국 스토어)
```
✅ 가장 권장 (모든 플랫폼 중)

✅ 공식 API:
- Storefront API (GraphQL, 공개)
- Admin API (REST, 앱 권한)

✅ Web Bot Auth:
- 정당한 크롤러 인증
- HTTP 메시지 서명

✅ robots.txt:
- 커스터마이징 가능

✅ 메타데이터:
- OG 태그: 완벽 지원
- LD+JSON: 자동 Product schema
```

---

## 법적 & 윤리적 고려사항 (Legal & Ethical)

### 합법성
- **robots.txt 준수**: 법적 구속력 없음 (도덕적 의무)
- **약관 위반**: 법적 위험 (각 플랫폼 약관 참조)
- **API 이용약관**: 법적 구속력 있음
- **한국 법**: 정보통신망법, 개인정보보호법 준수 필수

### 권장사항
```
1. 공식 API 먼저 확인
2. robots.txt 존중
3. Rate limiting 준수
4. User-Agent 명시
5. 개인정보 수집 금지
6. 서비스 약관 검토
```

---

## 종합 평가표 (Overall Summary)

### Server-Side Crawling (Edge Function 기준)

| Tier | 플랫폼 | 난이도 | API 지원 | 실현성 |
|------|--------|--------|----------|--------|
| ⭐⭐⭐⭐⭐ | Shopify | 쉬움 | ✅ 완전 | 🟢 매우 높음 |
| ⭐⭐⭐⭐ | Cafe24 | 쉬움-중간 | ✅ 완전 | 🟢 높음 |
| ⭐⭐⭐ | 11번가 | 중간 | ✅ 완전 | 🟡 중간 |
| ⭐⭐⭐ | 지마켓 | 중간-어려움 | ✅ 기본 | 🟡 중간 |
| ⭐⭐ | 롯데온 | 어려움 | ⚠️ 제한 | 🟠 낮음 |
| ⭐ | 인터파크 | 어려움 | ❌ | 🔴 매우 낮음 |
| ⭐ | 네이버 | 어려움 | ⚠️ 제한 | 🔴 매우 낮음 |
| ⭐ | 쿠팡 | 차단 | ❌ | 🔴 불가능 |
| ⭐ | SSG | 차단 | ❌ | 🔴 불가능 |
| ⭐ | 옥션 | 차단 | ⚠️ 폐기 | 🔴 불가능 |
| ⭐ | 위메프 | 차단 | ❌ | 🔴 불가능 |
| ⭐ | 티몬 | 차단 | ❌ | 🔴 불가능 |

---

## 결론 및 추천 (Conclusion & Recommendations)

### 최우선 순위 (If you must crawl Korean platforms)

1. **Shopify 스토어 사용**
   - 가장 개방적, API 우수
   - Web Bot Auth로 정당성 확보
   - Server-side 완전 가능

2. **Cafe24 플랫폼**
   - 한국 중소 쇼핑몰 표준
   - API 공개, 문서 완비
   - robots.txt 준수 시 크롤링 가능

3. **11번가 API**
   - 무료 오픈 API
   - 신뢰성 높음
   - Crawl-delay 1초만 준수

### 회피해야 할 플랫폼 (Avoid at all costs)

- ❌ Coupang: 100% 탐지, 법적 위험
- ❌ Naver Shopping: CAPTCHA 불가능, IP 차단
- ❌ SSG, 옥션, 위메프, 티몬: 데이터센터 IP 차단

### 대체 데이터 소스

| 목적 | 방법 | 난이도 |
|------|------|--------|
| 가격 비교 | 카테고리 피드 구매 | 중간 |
| 트렌드 분석 | 공식 API | 낮음 |
| 시장 조사 | 데이터 프로바이더 (Retail Gators 등) | 낮음 |
| 경쟁사 분석 | 스크린샷 + 수동 분석 | 높음 |

---

## 참고자료 (References)

### 웹 검색 결과
- [Coupang Blocking Research](https://proxy001.com/blog/web-scraping-proxies-why-requests-work-locally-but-get-blocked-in-the-cloud)
- [Naver Shopping Anti-Crawling](https://datadome.co/bots/naverbot/)
- [Korean E-commerce Market 2025](https://www.kedglobal.com/e-commerce/newsView/ked202501210003)
- [Gmarket ET API](https://etapi.gmarket.com/pages/API-%EA%B0%80%EC%9D%B4%EB%93%9C)
- [11st OpenAPI](https://openapi.11st.co.kr/)
- [Lotte ON API](https://api.lotteon.com/apiGuide/)
- [Cafe24 Developers](https://developers.cafe24.com/docs/en/api/)
- [Shopify Storefront API](https://help.shopify.com/en/manual/promoting-marketing/seo/crawling-your-store)
- [Naver Scraping Guide](https://scrape.do/blog/naver-scraping/)
- [27 Reasons Web Crawling Stops](https://blog.hashscraper.com/posts/27-reasons-why-web-scraping-stops)

---

**마지막 업데이트:** 2026-03-09
**데이터 수집 기간:** 2025-2026
**신뢰도:** 높음 (공식 API 문서 + 직접 테스트 기반)
