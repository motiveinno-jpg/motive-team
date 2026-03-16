# Whistle AI — Deep QA Report
**Date**: 2026-03-16
**Tester**: Claude (Automated + Scenario-based)
**URLs Tested**: whistle-ai.com (/, /en/, /global, /buyer, /app, /admin)
**Duration**: ~25 minutes
**Screenshots**: 50+

---

## Executive Summary — Health Score: 62/100

실제 유저 관점에서 **치명적 문제 3건, 주요 문제 8건, 개선 권장 12건** 발견.
핵심 기능(스테이지 체크리스트, 인라인 버튼)은 대부분 작동하나,
**인프라 에러(DNS/CSP), 라우팅 불일치, 누락된 액션 버튼**이 사용자 신뢰를 심각하게 훼손함.

---

## 🔴 CRITICAL (즉시 수정 필요)

### ISSUE-001: Cloudflare Tunnel URL 만료 → 환율 API 전면 실패
- **심각도**: Critical
- **카테고리**: Functional
- **위치**: 전체 앱 (whistle.html, 모든 환율 관련 기능)
- **현상**: `relay-url.txt`에 저장된 `incident-laughing-areas-day.trycloudflare.com`이 만료됨
- **영향**:
  - `ERR_NAME_NOT_RESOLVED` 에러 반복 발생
  - CSP가 `https://*.trycloudflare.com`을 차단 (connect-src에 와일드카드 있으나 DNS 자체가 실패)
  - USD↔KRW 환율 변환 전면 불가
  - 관련 400/406 에러 연쇄 발생
- **재현**: 콘솔에서 매 페이지 로드마다 5-6개 에러 발생
- **수정 방안**:
  1. Cloudflare Tunnel 재시작 또는 고정 URL로 교체
  2. 폴백으로 `api.frankfurter.app` 직접 호출 (이미 코드에 있으나 실패 중)
  3. 환율 캐싱 도입 (localStorage에 1시간 캐시)

### ISSUE-002: /en/ 경로 구버전 페이지 서빙
- **심각도**: Critical
- **카테고리**: Functional / Routing
- **위치**: https://whistle-ai.com/en/
- **현상**: `_redirects`에 `/en/` 라우트 미등록 → `en/index.html`(703줄, 구버전) 서빙
- **영향**:
  - 글로벌 랜딩 페이지가 아닌 whistle.html(제조사 앱 마케팅 페이지) 보여짐
  - i18n 번역 없음 (global-landing.html 1338줄 vs en/index.html 703줄)
  - 글로벌 유저 첫인상 완전 손상
- **수정 방안**:
  1. `_redirects`에 `/en /global-landing.html 200` 추가
  2. 또는 `en/index.html`을 `global-landing.html`로 복사
  3. i18n 변경사항 Cloudflare 배포

### ISSUE-003: 정산(Settlement) 스테이지 액션 버튼 누락
- **심각도**: Critical
- **카테고리**: Functional
- **위치**: /app → 프로젝트 상세 → 정산 스테이지
- **현상**: 정산 스테이지에 "출하 확인", "정산 요청" 버튼이 없음
- **영향**: 거래 완료 후 정산 프로세스를 진행할 수 없음 — 핵심 비즈니스 플로우 차단
- **비교**:
  - 샘플 스테이지: ✅ "💳 샘플비 결제 요청" 버튼 있음
  - 본계약 결제: ✅ "💰 선금 요청" + "💰 전체 요청" 버튼 있음
  - 정산: ❌ 버튼 없음
- **수정 방안**: 정산 스테이지에 "✅ 출하 확인" + "💰 정산 요청" 인라인 버튼 추가

---

## 🟠 HIGH (1주 내 수정)

### ISSUE-004: Multiple GoTrueClient 인스턴스 경고
- **심각도**: High
- **카테고리**: Console / Performance
- **현상**: "Multiple GoTrueClient instances detected in the same browser context"
- **원인**: 로그인 시 Supabase 클라이언트가 중복 생성됨
- **영향**: 인증 토큰 충돌, 예측 불가 동작, 401 에러 발생 가능
- **수정**: createClient를 싱글톤으로 관리

### ISSUE-005: /app 페이지 초기 로딩 시 마케팅 콘텐츠 플래시
- **심각도**: High
- **카테고리**: UX
- **현상**: /app 접속 시 whistle.html 마케팅 콘텐츠가 먼저 보이고, 인증 확인 후 대시보드로 전환
- **영향**: 로그인 유저가 매번 마케팅 페이지를 잠깐 봐야 함 — 불신감 유발
- **수정**: 인증 체크 완료 전까지 로딩 스피너 표시

### ISSUE-006: 통관(Customs) 스테이지 액션 버튼 누락
- **심각도**: High
- **카테고리**: Functional
- **현상**: 통관 스테이지 체크리스트에 액션 버튼 없음
- **수정**: "📋 통관 서류 제출" 또는 "✅ 통관 완료 확인" 버튼 추가

### ISSUE-007: 생산/검수 스테이지 액션 버튼 누락
- **심각도**: High
- **카테고리**: Functional
- **현상**: 생산/검수 스테이지(6항목)에 액션 버튼 없음
- **수정**: "🏭 검수 완료" 또는 "📦 출하 준비 완료" 버튼 추가

### ISSUE-008: 서류 준비 스테이지 액션 버튼 누락
- **심각도**: High
- **카테고리**: Functional
- **현상**: 서류 준비 스테이지(5항목)에 액션 버튼 없음
- **수정**: "📄 서류 일괄 생성" 버튼 추가 (문서 자동생성 기능 연결)

### ISSUE-009: Supabase CORS 에러 간헐적 발생
- **심각도**: High
- **카테고리**: Console / Network
- **현상**: `Access-Control-Allow-Origin` 헤더 누락으로 프로젝트 조회 실패
- **영향**: 데이터 로딩 실패 → 빈 화면 또는 에러 상태
- **수정**: Supabase 프로젝트 설정에서 CORS 허용 도메인 확인

### ISSUE-010: 바이어 발굴 스테이지 액션 버튼 누락
- **심각도**: High
- **카테고리**: Functional
- **현상**: 바이어 발굴 스테이지에 액션 버튼 없음
- **수정**: "🔍 바이어 매칭 시작" 버튼 추가 (바이어 탭으로 연결)

### ISSUE-011: 활성률(30일) 0% 표시
- **심각도**: High
- **카테고리**: Data / UX
- **위치**: /admin → CEO Command Center
- **현상**: 30일 신규가입 +200인데 활성률 0% (딜 전환 5%)
- **영향**: 200명 가입했는데 활성률 0이면 데이터 신뢰 하락
- **원인**: 테스트 계정이라 실제 활동 없음. 하지만 실서비스에서도 동일 문제 가능
- **수정**: 활성률 계산 로직 점검 (로그인 = 활성으로 카운트)

---

## 🟡 MEDIUM (개선 권장)

### ISSUE-012: i18n 변경사항 미배포
- 로컬에서 admin-portal.html, global-landing.html에 i18n 추가 완료
- whistle-main.html, buyer-landing.html은 i18n 작업 진행중/미완
- **Cloudflare에 배포 필요**: `npx wrangler pages deploy . --project-name=whistle-ai --commit-dirty=true`

### ISSUE-013: 프로젝트 리스트 스테이지 탭 줄바꿈
- 모바일 뷰에서 12개 스테이지 탭이 2줄로 줄바꿈됨
- 가독성 저하. 가로 스크롤로 변경 권장

### ISSUE-014: "Start Free" 버튼이 /buyer-landing으로 이동
- /app 마케팅 페이지의 "Start Free" 버튼 → /buyer-landing으로 리디렉트
- 제조사 앱에서 바이어 랜딩으로 보내는 것은 의도와 불일치

### ISSUE-015: 유료 구독 버튼 0건 (전체 FREE 100)
- 어드민 대시보드: FREE 100, STARTER 0, PRO 0, ALIBABA 0
- 가격 페이지는 있지만 실제 구독 전환 없음 → 온보딩 후 자연스러운 업셀 유도 필요

### ISSUE-016: 프로젝트 상세 상단 텍스트 잘림
- "테..." → 프로젝트명이 잘려서 표시됨
- "독..." → 독일 본다츠 프로젝트도 잘림
- ellipsis는 있지만 전체 이름 확인 불가

### ISSUE-017: Babel in-browser transformer 경고
- 프로덕션에서 Babel 런타임 트랜스파일 사용 중
- 성능 영향 + "precompile your scripts" 경고
- 빌드 타임 트랜스파일로 전환 권장 (장기)

### ISSUE-018: restcountries.com API 호출 실패
- 국가 정보 API 호출이 때때로 실패 (0 transfer size)
- 폴백 데이터 또는 캐싱 필요

### ISSUE-019: 기획 스테이지에 액션 버튼 없음
- 첫 번째 스테이지인데 가이드 액션 없음
- "📋 수출 체크리스트 다운로드" 또는 "🤖 AI 분석 시작" 버튼 추가 권장

### ISSUE-020: 100% 완료 스테이지 다음 단계 프리뷰 ✅ 작동
- 인증 7/7 완료 시 "📋 다음: 바이어 발굴" 프리뷰 정상 표시
- "✅ 바이어 발굴 단계로 →" 네비게이션 버튼도 있음
- **양호** — 다른 100% 스테이지(협상 6/6, 선적 6/6)도 동일 패턴 확인

### ISSUE-021: 체크리스트 아코디언 스크롤 영역 제한
- 스테이지 아코디언 높이가 ~213px로 고정
- 5개 이상 항목 + 인라인 버튼이 있으면 스크롤 필요
- 인라인 버튼이 fold 아래에 숨겨져서 발견하기 어려움

### ISSUE-022: 프로젝트 PJ-005 "Green Tea Serum" 영어 이름
- 한국 제조사 계정에 영문 프로젝트명 → 일관성 부족
- 글로벌 유저가 만든 프로젝트 vs 한국 유저 프로젝트 구분 어려움

### ISSUE-023: 메시지 탭 플로팅 버튼이 하단 네비 가림
- 메시지 아이콘(💬)이 하단 네비바의 "더보기" 탭 위에 겹침

---

## ✅ 정상 작동 확인 항목

| 항목 | 상태 |
|------|------|
| 샘플 스테이지 "💳 샘플비 결제 요청" 버튼 | ✅ 작동 |
| 본계약 결제 "💰 선금 요청" + "💰 전체 요청" 버튼 | ✅ 작동 |
| 100% 완료 스테이지 다음 단계 프리뷰 | ✅ 작동 |
| 진행률 표시 (2%, 55%, etc.) | ✅ 작동 |
| 체크리스트 항목 토글 (체크/언체크) | ✅ 작동 |
| 인증 → 바이어발굴 네비게이션 버튼 | ✅ 작동 |
| 협상 → 본계약결제 네비게이션 버튼 | ✅ 작동 |
| 선적 → 통관 네비게이션 버튼 | ✅ 작동 |
| 어드민 대시보드 로드 (제조사100/바이어121/38개국) | ✅ 작동 |
| /buyer 바이어 랜딩 페이지 로드 | ✅ 작동 |
| /admin 어드민 포탈 로드 | ✅ 작동 |
| 모바일 뷰포트 레이아웃 | ✅ 대체로 양호 |
| 프로젝트 리스트 (18개 프로젝트, 다양한 스테이지) | ✅ 작동 |

---

## 스테이지별 인라인 버튼 현황

| # | 스테이지 | 체크리스트 | 액션 버튼 | 네비게이션 |
|---|---------|-----------|----------|-----------|
| 0 | 기획 | 5항목 | ❌ 없음 | - |
| 1 | 인증 | 7항목 | - | ✅ "바이어 발굴 →" |
| 2 | 바이어 발굴 | 6항목 | ❌ 없음 | - |
| 3 | 샘플 | 5항목 | ✅ "샘플비 결제 요청" | - |
| 4 | 협상/계약 | 6항목 | - | ✅ "본계약 결제 →" |
| 5 | 본계약 결제 | 5항목 | ✅ "선금 요청" + "전체 요청" | - |
| 6 | 생산/검수 | 6항목 | ❌ 없음 | - |
| 7 | 서류 준비 | 5항목 | ❌ 없음 | - |
| 8 | 선적 | 6항목 | - | ✅ "통관 단계로 →" |
| 9 | 통관 | 4항목 | ❌ 없음 | - |
| 10 | 정산 | 3항목 | ❌ 없음 | - |
| 11 | 사후관리 | 4항목 | ❌ 없음 | - |

**결론**: 12개 스테이지 중 액션 버튼이 있는 것은 3개(샘플, 본계약결제), 네비게이션 버튼이 있는 것은 3개(인증, 협상, 선적). 나머지 6개 스테이지는 체크리스트만 있고 행동 유도(CTA) 없음.

---

## Top 3 즉시 수정 항목

1. **Cloudflare Tunnel URL 갱신** — 환율 API 전면 실패 해결
2. **`_redirects`에 `/en/ /global-landing.html 200` 추가** + i18n 배포
3. **정산 스테이지에 "출하 확인" + "정산 요청" 버튼 추가**

---

## Console Health Summary

| 에러 유형 | 빈도 | 심각도 |
|----------|------|-------|
| ERR_NAME_NOT_RESOLVED (trycloudflare) | 매 페이지 로드 | 🔴 |
| CSP connect-src 위반 (exchange-rate) | 매 페이지 로드 | 🔴 |
| 400 Bad Request (복수) | 매 페이지 로드 | 🟠 |
| 406 Not Acceptable | 매 페이지 로드 | 🟠 |
| CORS 차단 (Supabase) | 간헐적 | 🟠 |
| 401 Unauthorized | 간헐적 | 🟡 |
| Multiple GoTrueClient 경고 | 로그인 시 | 🟡 |
| Babel transformer 경고 | 매 페이지 로드 | 🟡 |

---

## Health Score Breakdown

| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| Console | 10 | 15% | 1.5 |
| Links | 85 | 10% | 8.5 |
| Visual | 80 | 10% | 8.0 |
| Functional | 55 | 20% | 11.0 |
| UX | 65 | 15% | 9.75 |
| Performance | 70 | 10% | 7.0 |
| Content | 80 | 5% | 4.0 |
| Accessibility | 75 | 15% | 11.25 |
| **TOTAL** | | | **62/100** |
