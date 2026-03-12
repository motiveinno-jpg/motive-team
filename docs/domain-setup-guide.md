# whistle-ai.com 도메인 연결 가이드

## 결정: Cloudflare Pages (무료)
- 이유: 글로벌 CDN, 무제한 대역폭, 기존 GitHub Pages와 충돌 없음
- 대안 대비: Vercel(빌드 필요), Netlify(빌드 필요), 별도 GitHub repo(관리 번거로움)

## 설정 순서

### 1단계: Cloudflare Pages 프로젝트 생성
1. Cloudflare 대시보드 로그인 (creative@mo-tive.com)
2. Workers & Pages → Create → Pages → Connect to Git
3. GitHub 연결 → motiveinno-jpg/motive-team 선택
4. Build settings:
   - Build command: (비워둠 — 정적 사이트)
   - Build output directory: `/` (루트 전체)
5. Deploy

### 2단계: 커스텀 도메인 연결
1. Pages 프로젝트 → Custom domains → Add
2. `whistle-ai.com` 입력 → Cloudflare가 자동으로 DNS 레코드 추가
3. `www.whistle-ai.com` → whistle-ai.com 리다이렉트 설정

### 3단계: 라우팅 규칙 (Cloudflare Workers)
whistle-ai.com의 URL 구조:

```
/ → whistle-main.html (메인 게이트웨이)
/ko → whistle-landing.html (한국 제조사 랜딩)
/buyer → buyer-landing.html (글로벌 바이어 랜딩)
/app → whistle.html (제조사 어드민)
/app/buyer → buyer.html (바이어 어드민)
/admin → admin.html (모티브 내부)
/terms → terms.html
/privacy → privacy.html
/refund → refund.html
```

### 4단계: _redirects 파일 생성 (Cloudflare Pages 방식)
Cloudflare Pages는 `_redirects` 파일 지원:

```
/ko /whistle-landing.html 200
/buyer /buyer-landing.html 200
/app /whistle.html 200
/app/buyer /buyer.html 200
/admin /admin.html 200
```

### 5단계: SEO 업데이트
- 각 페이지의 canonical URL을 whistle-ai.com으로 변경
- OG meta tags 업데이트
- sitemap.xml 생성

## 현재 상태
- [x] 도메인 구매 완료 (Cloudflare, $10.46)
- [ ] Cloudflare Pages 프로젝트 생성
- [ ] 커스텀 도메인 연결
- [ ] _redirects 파일 생성
- [ ] SEO canonical URL 업데이트

## 기존 URL 유지
- motiveinno-jpg.github.io/motive-team/ → 기존대로 유지 (내부 팀 사이트)
- whistle-ai.com → Cloudflare Pages (고객용)
- 두 URL 모두 동일 코드, 동시 운영
