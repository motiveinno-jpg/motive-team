# Whistle AI Changelog

## 2026-04-05: 글로벌 블로커 5개 해소 (OFAC + 이메일12언어 + 다중통화 + E.164 + 알리바바숨김)

### Blocker 2: 트랜잭션 이메일 12언어 완성 (send-transactional-email v26+)
- `LabelPack` 타입 정의 (37+ 필드): amount/type/status/tracking/... + CTA 버튼 + 힌트 + 제목/헤딩 함수
- `LP: Record<string, LabelPack>` 12개 언어 사전: en/ko/ja/zh/es/de/fr/vi/id/th/ar/pt
- `getLP(lang)` 폴백 헬퍼 (미지원 언어 → en)
- `getTemplate()` 11개 switch 케이스 전체 리팩토링: `isKo ? ... : ...` 삼항 제거 → `l.*` 레이블 기반
- 아랍어 RTL 지원: `dirOpen`/`dirClose`로 본문을 `<div dir="rtl">` 래핑
- 대상: payment_confirmation, analysis_complete, buyer_matched, new_message, subscription_change, escrow_update, shipment_update, quote_received, order_update, document_ready, sample_update
- 배포 완료: `npx supabase functions deploy send-transactional-email --no-verify-jwt`

### 나머지 4개 블로커 (이전 세션 완료)
- Blocker 1 (OFAC 제재국 차단): whistle-app.html `doSignup` 경로에 `checkSanctionAndWarn()` 호출 연결
- Blocker 3 (Stripe 다중통화): create-checkout-session v57 — 13개 통화 + 31개국 매핑 + zero-decimal 처리
- Blocker 4 (E.164 전화 검증): buyer-app.html / whistle-app.html 전화번호 입력부 libphonenumber-js 기반 검증
- 프로젝트 섹션 알리바바 단계 숨김 (제조사/바이어 전 페르소나)

## 2026-04-05: 메뉴 순서 수정 + 글로벌 준비도 감사

### 사이드바 메뉴 순서 변경 (whistle-app.html:24045-24056)
- 변경 전: 대시보드→[분석]→AI분석,상품→[도구]→문서,원가,커뮤,주문→[프로젝트]→수출프로젝트→[비즈]
- 변경 후: 대시보드→[분석]→AI분석,상품→[프로젝트]→수출프로젝트→[도구]→문서,원가,커뮤,주문→[비즈]
- 모바일 바텀 네비는 이미 올바른 순서 (대시보드-분석-프로젝트-메시지-더보기)

### 글로벌 준비도 종합 점수: 6.5/10 (부분 준비)
- 언어UI 8 / 통화 5 / 결제 4 / 규제 6 / 법률 7 / 이메일 7 / 시간대 8 / SEO 8 / Auth 7 / 지원 5

### ★★★ 5대 글로벌 진출 블로커
1. **비USD 결제수단 0건**: Stripe USD 고정, 현지통화·Alipay·UPI 등 없음 (whistle-app.html:972,1093,1132,1208)
2. **제재국 Signup 차단 0건**: `checkSanctionAndWarn()` 정의만 있고 doSignup 호출 0 → OFAC 위반 리스크 (whistle-app.html:994-1005)
3. **트랜잭션 이메일 다국어 미완**: Welcome만 12언어, 나머지(payment/buyer_matched/new_message 등) 한/영만 (send-transactional-email/index.ts:192-300)
4. **고객지원 다국어 미흡**: FAQ 한/영만, 14개 언어 사용자 이탈 위험 (whistle-landing.html:8364-8416)
5. **국제 전화/주소 검증 0건**: libphonenumber 미사용, address 필드 자체 없음 (buyer-app.html:2153,2429)

### 권장 단계
- Phase 1 (4주): 제재 블로킹 + 이메일 12언어 완성 + 주소/전화 검증
- Phase 2 (8주): 다중통화 + Alipay/UPI 현지결제 연동
- Phase 3 (12주): 14개 언어 Terms/FAQ/Support 완성

## 2026-04-05: 트래픽 분석 + 봇 차단 + 방문자 로거 강화

### 트래픽 실데이터 분석 (Cloudflare vs Supabase)
- Cloudflare Overview: 24h `89 unique visitors / 305 requests`
- Supabase `page_views` (JS 필수): 24h `0 views / 0 sessions`
- **결론: 89명 = 사실상 100% 봇/크롤러** (AI 학습봇 + SEO 스크래퍼 + 업타임 체커)
- 실사용자 DB 액션도 24h 0건 (가입 0, 분석 0)

### page_views 로거 강화
- 컬럼 추가: `referrer`, `user_agent`, `country`, `language`
- 인덱스 추가: `idx_page_views_created_at`, `idx_page_views_session`
- whistle-app.html:20798 / buyer-app.html:9154 로거에 referrer/UA/language 수집 추가

### robots.txt — 스크래퍼 차단 정책
- 차단: Ahrefs, Semrush, MJ12, DotBot, BLEX, DataForSeo, Petal, Seekport, Serpstat, Zoominfo, MegaIndex, Linkpad, Survey, spbot, Diffbot, Imagesift, Omgili
- 유지 허용: GPTBot, ClaudeBot, PerplexityBot, Googlebot, Bingbot, Applebot 등 AI 인용·검색 봇 (GEO-SEO 전략)

## 2026-04-05: 회원가입 자동확인 + 다국어 환영메일 (12개 언어)

### Edge Function: send-transactional-email v22→v25
- `preferred_language` → `language` 컬럼명 버그 수정 (users 테이블 실제 컬럼)
- `WELCOME_I18N` 12개 언어 사전 추가: en/ko/ja/zh/es/de/fr/vi/id/th/ar(RTL)/pt
- `countryToLang()` 31개국+ 매핑 함수 추가
- 언어 우선순위 체인: `body.lang > body.country→lang > user.language > user.country→lang > 'en'`
- user.language DB 값이 body.country를 덮어쓰던 버그 수정
- 응답에 `lang` 필드 추가 (디버깅용)

### DB: auto_confirm_signup_emails 마이그레이션
- `auth.users` BEFORE INSERT 트리거로 `email_confirmed_at` 자동 세팅
- SMTP 이메일 인증 의존성 제거, 가입 즉시 로그인 가능

### 검증 완료
- KR→ko / JP→ja / AE→ar (RTL) 3시나리오 E2E 테스트 통과
- creative@mo-tive.com 수신 확인

### 인프라 확인 (오진단 정정)
- SPF/DKIM/DMARC 이미 설정 완료 상태 — 추가 작업 불필요
- `v=spf1 include:amazonses.com include:_spf.resend.com ~all` 존재

## 2026-03-27: 24시간 자동 모집/홍보 시스템 구축

### 새로 생성한 파일
- `supabase/migrations/20260327_drip_sequences.sql` — 드립 시퀀스 테이블 (drip_sequences, drip_steps, drip_enrollments, marketing_automations) + 3개 시퀀스 × 4단계 시드 데이터
- `supabase/migrations/20260327_marketing_drip_cron.sql` — pg_cron 등록 (하루 2회 드립 + 주간 리드 수집)
- `supabase/functions/marketing-drip/index.ts` — 드립 엔진 Edge Function (12개 이메일 템플릿, 배치 발송, 타임존 그룹핑)
- `supabase/functions/collect-public-leads/index.ts` — 공개 DB 자동 수집 (data.go.kr, openFDA, UN Comtrade) + 자동 드립 등록
- `scripts/import-outreach-contacts.ts` — global-outreach-db.md 파싱 → marketing_contacts 임포트 스크립트
- `.github/workflows/indexnow.yml` — SEO 자동 제출 GitHub Action (sitemap/blog 변경 시 + 주간)

### 아직 안 된 것
- Supabase 마이그레이션 미적용 (supabase db push 필요)
- Edge Function 미배포 (supabase functions deploy 필요)
- data.go.kr API 키 미등록 (DATA_GO_KR_API_KEY 환경변수)
- IndexNow 키 GitHub Secret 미등록 (INDEXNOW_KEY)
- admin.html 드립 대시보드 UI 미구현
- 앱 내 추천 유도 UI 미구현
