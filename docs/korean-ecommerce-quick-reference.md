# 한국 이커머스 크롤링 정책 - 빠른 참조표
## Korean E-Commerce Crawling Quick Reference (2026-03-09)

---

## 한눈에 보는 비교표

### 1. 전체 비교표

```
┌─────────────┬──────────┬─────────┬──────────┬──────────┬───────────┬─────────────────┐
│ 플랫폼      │ robots   │ OG 태그 │ LD+JSON  │ 공식API  │ 데이터센터│ 난이도/추천     │
├─────────────┼──────────┼─────────┼──────────┼──────────┼───────────┼─────────────────┤
│ Shopify     │ ✅ 있음  │ ✅ 있음 │ ✅ 있음  │ ✅ 우수  │ ✅ 허용   │ ⭐ 쉬움/필수    │
│ Cafe24      │ ✅ 있음  │ ✅ 있음 │ ✅ 있음  │ ✅ 있음  │ ⚠️ 제한  │ ⭐⭐ 쉬움/권장  │
│ 11번가      │ ✅ 있음  │ ✅ 있음 │ ✅ 있음  │ ✅ 있음  │ ⚠️ 제한  │ ⭐⭐⭐ 중간    │
│ 지마켓      │ ⚠️ CF   │ ✅ 있음 │ ⚠️ 있음  │ ✅ API   │ ⚠️ 제한  │ ⭐⭐⭐ 어려움  │
│ 롯데온      │ ❌ 차단  │ ⚠️ 제한 │ ⚠️ 제한  │ ⚠️ 제한  │ ❌ 차단  │ ⭐⭐ 어려움    │
│ 인터파크    │ ✅ 있음  │ ❌ 없음 │ ❌ 없음  │ ❌ 없음  │ ❌ 차단  │ ⭐ 매우어려움  │
│ 네이버쇼핑  │ ❌ 차단  │ ⚠️ JS필│ ⚠️ API  │ ⚠️ 제한  │ ❌ 차단  │ ⭐ 불가능/차단 │
│ 쿠팡       │ ❌ 차단  │ ❌ 없음 │ ❌ 없음  │ ❌ 없음  │ ❌ 차단  │ ❌ 불가능/Akamai│
│ SSG        │ ❌ 차단  │ ❌ 없음 │ ❌ 없음  │ ❌ 없음  │ ❌ 차단  │ ❌ 불가능/Akamai│
│ 옥션       │ ❌ CF   │ ❌ JS필│ ❌ 없음  │ ⚠️ 폐기  │ ❌ 차단  │ ❌ 불가능/폐지 │
│ 위메프      │ ❌ 없음  │ ❌ JS필│ ❌ 없음  │ ⚠️ 판매자│ ❌ 차단  │ ❌ 불가능/JS   │
│ 티몬       │ ❌ 없음  │ ❌ JS필│ ❌ 없음  │ ❌ 없음  │ ❌ 차단  │ ❌ 불가능/소셜 │
└─────────────┴──────────┴─────────┴──────────┴──────────┴───────────┴─────────────────┘

범례:
✅ = 있음/가능/지원
⚠️ = 제한적/조건부/부분 지원
❌ = 없음/불가능/미지원
CF = Cloudflare
JS필 = JavaScript 렌더링 필요
API = 조회 가능하나 조건 있음
```

---

## 난이도별 분류

### 🟢 쉬움 (Easy) - Server-Side Crawling 가능
```
1. Shopify (한국 스토어)
   - API: Storefront GraphQL 공개
   - robots.txt: 커스터마이징 가능
   - OG/LD+JSON: 완벽 지원
   - Web Bot Auth: 정당 크롤러 인증 지원

2. Cafe24
   - API: REST 공개 (OAuth)
   - robots.txt: 샵별 다름 (일반적 허용)
   - OG/LD+JSON: 지원
   - Rate Limiting: 시간당 제한
```

### 🟡 중간 (Medium) - 공식 API 권장
```
3. 11번가
   - API: OpenAPI 무료 (API 키)
   - robots.txt: Crawl-delay 1초 준수 필수
   - OG 태그: 서버 렌더링 지원
   - LD+JSON: 부분 지원

4. 지마켓
   - API: ET API (판매자)
   - robots.txt: Cloudflare 챌린지 필요
   - OG 태그: 지원
   - LD+JSON: 부분 지원
```

### 🔴 어려움 (Hard) - 크롤링 거의 불가능
```
5. 롯데온
   - API: 판매자 전용
   - robots.txt: Cloudflare 차단
   - 데이터센터 IP: 차단

6. 인터파크
   - API: 없음 (API 엔드포인트 차단)
   - robots.txt: 있으나 Crawl-delay 10초 (비효율)
   - OG/LD+JSON: 없음 (JS 렌더링)
```

### 🚫 차단 (Blocked) - 서버사이드 불가능
```
7. 쿠팡
   - Akamai Bot Manager: 브라우저 핑거프린팅
   - robots.txt: 접근 차단
   - 데이터센터 IP: 완전 차단
   - 공식 API: 없음

8. 네이버 쇼핑
   - robots.txt: 모든 크롤러 차단 + AI 크롤러 명시 차단
   - 인하우스 CAPTCHA: 자동 해결 불가능
   - 데이터센터 IP: 차단
   - 공식 API: 판매자 전용

9. SSG.com / 옥션 / 위메프 / 티몬
   - Akamai/Cloudflare WAF: 요청 필터링
   - 데이터센터 IP: 차단
   - 공식 API: 없음 또는 폐기
```

---

## 플랫폼별 데이터 접근 방법

### Shopify (권장 1순위)
```
┌─────────────────────────────────────────────┐
│ 1. Storefront API (GraphQL)                 │
│    - 공개 API                               │
│    - 제품, 수집, 검색 정보                  │
│    - Rate: 4 req/s                         │
│                                             │
│ 2. Web Bot Auth                             │
│    - 크롤러 정당성 증명                     │
│    - HTTP 메시지 서명                      │
│                                             │
│ 3. robots.txt                               │
│    - /admin, /cart, /checkout 제외          │
│    - 나머지 크롤링 가능                     │
│                                             │
│ 사용 예:                                    │
│ GET https://[store].myshopify.com/api/2024-01/products.json
│ Authorization: Custom ...                   │
└─────────────────────────────────────────────┘
```

### Cafe24 (권장 2순위)
```
┌─────────────────────────────────────────────┐
│ 1. REST API                                 │
│    - OAuth 인증                             │
│    - 상품, 주문, 고객, 게시판               │
│    - Rate: 시간당 제한                      │
│                                             │
│ 2. robots.txt 준수                          │
│    - 샵별 설정 다름                         │
│    - 일반적으로 허용적                      │
│                                             │
│ 사용 예:                                    │
│ POST https://api.cafe24.com/v2/api/token    │
│ {                                           │
│   "client_id": "...",                       │
│   "client_secret": "...",                   │
│   "grant_type": "client_credentials"        │
│ }                                           │
└─────────────────────────────────────────────┘
```

### 11번가 (권장 3순위)
```
┌─────────────────────────────────────────────┐
│ 1. OpenAPI                                  │
│    - 무료 (API 키)                          │
│    - 상품 조회, 검색                        │
│    - Crawl-delay: 1초                       │
│                                             │
│ 2. robots.txt                               │
│    - Allow: /MW/Product, /products/, ...    │
│    - Disallow: /register/, /community/, ... │
│                                             │
│ 사용 예:                                    │
│ GET https://openapi.11st.co.kr/openapi/products/[id]
│ Authorization: Bearer [API_KEY]             │
│ User-Agent: MyBot/1.0 ([email])            │
│ Delay: 1초                                  │
└─────────────────────────────────────────────┘
```

### Gmarket (부분 가능)
```
┌─────────────────────────────────────────────┐
│ 1. ET API (판매자용)                        │
│    - JWT 인증                               │
│    - 상품 등록/수정/조회                    │
│    - 문의: etapihelp@gmail.com             │
│                                             │
│ 2. OG 태그 추출 (제한적)                   │
│    - Cloudflare 챌린지 우회 필요            │
│    - JavaScript 실행 필수 (Puppeteer)      │
│                                             │
│ 방법:                                      │
│ a) Headless Browser                        │
│    const browser = await puppeteer.launch()│
│    const page = await browser.newPage()    │
│    await page.goto(url, {                  │
│      waitUntil: 'networkidle2'             │
│    })                                      │
│                                             │
│ b) 프록시 필요 (주거/모바일 IP)            │
└─────────────────────────────────────────────┘
```

### 네이버 쇼핑
```
┌─────────────────────────────────────────────┐
│ 1. Smartstore 판매자 API                    │
│    - 스토어 소유자만 가능                   │
│    - 상품 정보 조회                         │
│                                             │
│ 2. Naver Search API                         │
│    - 검색 결과만 수집 가능                  │
│    - 상품 상세 불가                        │
│                                             │
│ 불가능:                                    │
│ ❌ OG 태그 추출 (JS 렌더링)                 │
│ ❌ LD+JSON 파싱 (요청 전 렌더링)            │
│ ❌ 데이터센터 IP 사용                       │
│ ❌ CAPTCHA 자동 해결                       │
└─────────────────────────────────────────────┘
```

### 쿠팡
```
┌─────────────────────────────────────────────┐
│ ❌ 모두 불가능                              │
│                                             │
│ 이유:                                      │
│ • Akamai Bot Manager                       │
│   - 브라우저 핑거프린팅                     │
│   - JS 실행 패턴 분석                       │
│   - 마우스/스크롤 분석                      │
│                                             │
│ • 데이터센터 IP 사전 차단                   │
│   - AWS/GCP/Azure 블랙리스트                │
│   - Edge Function 사용 불가                │
│                                             │
│ • robots.txt 접근 차단                      │
│   - "Access Denied" 에러                    │
│                                             │
│ 유일한 방법:                                │
│ - 쿠팡 공식 파트너십 (B2B)                 │
│ - 판매자 대시보드 (내부)                   │
└─────────────────────────────────────────────┘
```

---

## 기술 스택별 추천

### Node.js (Edge Function / Deno)
```javascript
// ✅ 권장: Shopify Storefront API
const query = `
  query {
    products(first: 10) {
      edges {
        node {
          id
          title
          priceRange { minVariantPrice { amount } }
        }
      }
    }
  }
`;

const response = await fetch('https://store.myshopify.com/api/graphql.json', {
  method: 'POST',
  headers: {
    'X-Shopify-Storefront-Access-Token': TOKEN,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query }),
});

// ✅ 가능: Cafe24 API
const token = await getOAuthToken();
const products = await fetch('https://api.cafe24.com/v2/api/products', {
  headers: { 'Authorization': `Bearer ${token}` },
});

// ✅ 가능: 11st OpenAPI
const product = await fetch('https://openapi.11st.co.kr/openapi/products/123', {
  headers: { 'Authorization': `Bearer ${API_KEY}` },
});

// ❌ 불가능: Coupang / Naver / SSG
// - 데이터센터 IP 차단
// - robots.txt 접근 거부
// - Akamai/Cloudflare 필터링
```

### Headless Browser (Puppeteer/Playwright)
```javascript
// ⚠️ 부분 가능: Gmarket (제한적)
const browser = await puppeteer.launch({
  args: [
    '--no-sandbox',
    '--proxy-server=http://[residential-proxy]:port',
  ],
  headless: true,
});

const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
await page.goto(url, { waitUntil: 'networkidle2' });

const ogImage = await page.$eval('meta[property="og:image"]', el => el.content);
const price = await page.$eval('[data-price]', el => el.textContent);

// ❌ 불가능: Coupang (탐지 → 차단)
// - Akamai 탐지율: ~99%
// - WebDriver 감지
// - 마우스 패턴 분석
```

### Browser Extension (Chrome)
```javascript
// ✅ 가능: 모든 플랫폼 (사람으로 보임)
chrome.tabs.executeScript(tab.id, {
  code: `
    const data = {
      title: document.title,
      price: document.querySelector('[data-price]')?.textContent,
      image: document.querySelector('img[itemprop="image"]')?.src,
    };
    fetch('https://webhook.site/[uuid]', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  `
});

// 장점: Akamai, Cloudflare 우회
// 단점: 수동, 확장성 없음
```

---

## API 엔드포인트 치트시트

### Shopify
```
# 제품 조회 (GraphQL)
POST https://[store].myshopify.com/api/2024-01/graphql.json
Authorization: Bearer [ACCESS_TOKEN]

{
  query {
    products(first: 10) {
      edges { node { id title } }
    }
  }
}

# 제품 조회 (REST)
GET https://[store].myshopify.com/api/2024-01/products.json
X-Shopify-Access-Token: [ACCESS_TOKEN]
```

### Cafe24
```
# OAuth Token
POST https://api.cafe24.com/v2/api/token
{
  "client_id": "[ID]",
  "client_secret": "[SECRET]",
  "grant_type": "client_credentials"
}

# 제품 조회
GET https://api.cafe24.com/v2/api/products?shop_no=1
Authorization: Bearer [TOKEN]
```

### 11st
```
# 제품 조회
GET https://openapi.11st.co.kr/openapi/products/[productId]
Authorization: Bearer [API_KEY]
User-Agent: MyBot/1.0

# Rate limit: 1초 대기 필수
```

### Gmarket
```
# JWT 서명
Authorization: Bearer [JWT_TOKEN]
# 토큰 생성: HMAC(SECRET_KEY, REQUEST_BODY)

# 상품 조회 (예상)
GET https://etapi.gmarket.com/api/products/[productId]
Authorization: Bearer [JWT]
```

### Lotte ON
```
# API 문서
https://api.lotteon.com/apiGuide/

# 판매자 API만 공개
# 일반 상품 조회 API 없음
```

---

## 요청 헤더 템플릿

### 최소 필수 (Minimum)
```http
GET /products/123 HTTP/1.1
Host: example.com
User-Agent: Mozilla/5.0 (compatible; MyBot/1.0)
Accept: application/json
```

### 권장 (Recommended)
```http
GET /products/123 HTTP/1.1
Host: example.com
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
Accept: application/json, text/html
Accept-Language: ko-KR,ko;q=0.9,en;q=0.8
Accept-Encoding: gzip, deflate
Referer: https://example.com/search
Connection: keep-alive
Cache-Control: no-cache
```

### robots.txt 준수
```
User-Agent: MyBot/1.0
Delay: 1초
```

---

## 피해야 할 행동 (Anti-Patterns)

### ❌ 불법 행동
```javascript
// 1. 데이터센터 IP로 쿠팡/네이버 크롤링
// → Akamai 탐지 → IP 차단

// 2. Headless 지표 노출
await page.launch({
  headless: true  // ← Akamai가 감지함
});

// 3. robots.txt 무시
// → 법적 위험 + 서비스 차단

// 4. 과도한 요청
// → Rate limiting 위반 → IP 차단

// 5. 개인정보 수집
// → 개인정보보호법 위반
```

### ✅ 올바른 행동
```javascript
// 1. 공식 API 사용
const data = await fetchFromOfficialAPI();

// 2. robots.txt 준수
const robots = await fetch(url + '/robots.txt');
// 규칙 파싱 후 준수

// 3. Crawl-delay 준수
await delay(1000); // 1초 대기

// 4. User-Agent 명시
headers['User-Agent'] = 'MyBot/1.0 (+https://example.com/bot)';

// 5. 약관 확인
// 각 플랫폼 약관 읽고 준수

// 6. Rate limiting
const queue = new PQueue({ interval: 1000, concurrency: 1 });
```

---

## 비용 비교

| 서비스 | 비용 | 성능 | 신뢰도 |
|--------|------|------|--------|
| **Shopify API** | 무료 또는 App 수수료 | ⭐⭐⭐⭐⭐ | 완벽 |
| **Cafe24 API** | 무료 (속도 제한) | ⭐⭐⭐⭐ | 높음 |
| **11st OpenAPI** | 무료 | ⭐⭐⭐⭐ | 높음 |
| **Gmarket API** | 무료 (판매자) | ⭐⭐⭐ | 중간 |
| **Firecrawl (Cloud)** | $0.01-0.10/page | ⭐⭐ | 낮음 (차단됨) |
| **주거용 Proxy** | $100-500/month | ⭐⭐⭐ | 중간 |
| **Headless Browser** | 자체 비용 | ⭐⭐⭐ | 중간 |
| **회전 IP 서비스** | $50-200/month | ⭐⭐⭐ | 낮음 |

---

## 최종 조언 (Final Advice)

### "한국 이커머스 데이터를 수집하려면?"

**1순위:** Shopify 사용 (한국 스토어 권장)
- 가장 개방적, API 우수, Web Bot Auth 지원
- 한국 쇼핑몰이 Shopify로 전환 중

**2순위:** Cafe24 API 사용
- 한국 중소 쇼핑몰 표준
- API 공개, 문서 완비
- robots.txt 준수하면 크롤링도 가능

**3순위:** 11st OpenAPI 사용
- 무료, 신뢰성 높음
- Crawl-delay 1초만 준수

**절대 피하기:**
- ❌ Coupang 크롤링: 100% 탐지
- ❌ Naver 크롤링: CAPTCHA 불가능
- ❌ SSG, 옥션, 위메프: 데이터센터 IP 차단

**대체 방법:**
- 카테고리 피드 구매 (각 플랫폼)
- 데이터 제공업체 (Retail Gators, Apify 등)
- 마케팅 API (Google Ads, Facebook Pixel)

---

**최종 결론:** Server-side 크롤링은 한국 이커머스에서 합법적이고 지속 가능한 옵션이 거의 없습니다. **공식 API 사용**이 유일한 해결책입니다.

마지막 업데이트: 2026-03-09
