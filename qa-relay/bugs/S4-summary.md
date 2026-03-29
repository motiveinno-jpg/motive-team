# [S4-미국바이어] QA 테스트 종합 리포트
**페르소나**: Sarah Chen, GlowUp Beauty LLC (LA, 미국)
**테스트 일시**: 2026-03-29
**테스트 환경**: Headless Chromium (gstack browse), Accept-Language: en-US

---

## Phase 1: 바이어 첫 경험

### 1-1. 바이어 랜딩 (/buyer) ✅ PASS
- 페이지 존재, 영어 콘텐츠, 다크테마 정상
- "FOR BUYERS 100% Free" 명확 표시
- CTA: "Start Free — No Credit Card →", "Find Products — Free"
- 네트워크/콘솔 에러 없음

### 1-2. 바이어 앱 (/app/buyer) ✅ PASS (조건부)
- "BUYER PORTAL" 명확 표시
- Sign In / Sign Up 탭 동작
- **조건**: localStorage가 깨끗한 상태에서만 정상. 이전 세션 잔존 시 다른 앱으로 리다이렉트

### 1-3~1-4. 회원가입 ❌ FAIL
- 폼 UI는 정상 (Company, Name, Email, PW, Country, Interest)
- Create Account 클릭 시 Supabase signUp API 호출되나, **rate limit**에 걸림
- 가입 성공 후 리다이렉트 경로: 바이어 대시보드가 아닌 제조사 앱으로 이동
- **S6에서 수정됨** (DB role 교정 + 트리거 수정)

### 1-5. 첫 로그인 → 대시보드 ⚠️ PARTIAL
- 기존 테스트 계정으로 로그인 시 대시보드 정상 진입
- "Welcome, Sarah Johnson" 표시, 통계/파이프라인/최근활동 모두 표시
- **문제**: 이전 제조사 세션 토큰이 남아있으면 바이어 로그인이 제조사 앱으로 리다이렉트

### 1-6. 영어 UI ❌ FAIL
- **GeoIP 기반 언어 감지**가 브라우저 언어보다 우선
- Cloudflare가 독일(DE)을 반환하면 독일어/일본어로 표시
- localStorage에 `whistle_lang` 수동 설정 필요

---

## 발견된 버그 (7건)

### P1 — 치명적 (4건)
| # | 제목 | 상태 |
|---|------|------|
| S4-001 | GeoIP가 navigator.language 무시 → 잘못된 언어 표시 | OPEN |
| S4-002 | 회원가입 후 제조사앱으로 리다이렉트 | FIXED by S6 |
| S4-005 | 바이어 대시보드 리로드 시 제조사앱으로 리다이렉트 | FIXED by S6 |
| S4-007 | 이전 세션 auth 토큰이 바이어 로그인 방해 | OPEN |

### P2 — 중요 (2건)
| # | 제목 | 상태 |
|---|------|------|
| S4-003 | "I agree to theTerms" 공백 누락 | OPEN |
| S4-006 | buyer_verifications 테이블 406 에러 | OPEN |

### P3 — 경미 (1건)
| # | 제목 | 상태 |
|---|------|------|
| S4-004 | 바이어 랜딩에서 whistle-app.html(2.8MB) 불필요 로드 | OPEN |

---

## TASK-001: i18n 자동 감지 테스트 (S4 — 미국 LA)

### Accept-Language: en-US → 영어 자동 표시?
- **메인 랜딩(/)**: ✅ `whistle_lang: "en"` 정상 감지 (Accept-Language 헤더 설정 시)
- **바이어 앱(/app/buyer)**: ❌ localStorage의 `whistle_lang` 값이 GeoIP로 설정된 "de"가 우선
- **바이어 앱 기본 언어**: ❌ 브라우저 기본 헤더 없으면 GeoIP 국가로 결정

### 자동 감지 메커니즘
1. `i18n-detect.js`가 `/app/*` 경로에서는 early return (실행 안 함)
2. 하지만 다른 페이지(`/`, `/buyer`) 방문 시 GeoIP로 `whistle_lang` 설정
3. buyer-app.html은 이 `whistle_lang` localStorage 값을 읽어서 UI 언어 결정
4. **결론**: GeoIP 기반 + localStorage 캐시 = 불안정

### 언어 설정 저장
- localStorage `whistle_lang` 키로 저장
- 한번 설정되면 재접속 시 유지
- 수동 전환 UI: 제조사 앱에는 12개 언어 버튼 있음, 바이어 앱에는 확인 필요

### 통화 전환
- 대시보드에서 $33,500.00 (USD) 표시 확인
- 국가별 통화 자동 전환 여부는 미확인 (추가 테스트 필요)

---

## 추가 버그 (Phase 2~6 테스트 중 발견)

### P1 — 추가 1건
| # | 제목 | 상태 |
|---|------|------|
| **S4-008** | 사이드바 네비게이션이 제조사 앱으로 전환 + 다른 계정 표시 | OPEN |

### 시각적 UX (TASK-003)
| 항목 | 뷰포트 | 심각도 | 설명 |
|------|--------|--------|------|
| 제품명에 한국어 접두사 | 모바일/데스크톱 | P2 | "(뷰티)" 같은 한국어 카테고리 접두사가 영어 UI에서 혼란 유발 |
| 쿠키 배너 겹침 | 모바일 375px | P2 | 하단 쿠키 배너가 Quick Actions, 제품 카드 영역 가림 |

---

## Phase 2~8: 테스트 결과

### Phase 2: 제품 탐색 ✅ PASS
- 제품 카탈로그 정상 표시 (3개 제품 + 검색 결과 41개)
- 검색 "vegan skincare" → 결과 정상 반환
- 필터: All Origins / Whistle Verified / All Marketplace 동작
- 제품 상세: 이미지, 가격($43.09), "Request Quotation", "Request Sample", "Save" 버튼
- "Related Products" 섹션 존재
- **이슈**: 일부 제품명에 한국어 접두사 "(뷰티)" 표시

### Phase 3: 제조사 소통 ❌ BLOCKED
- "Messages" 사이드바 클릭 시 일본어 대시보드로 복귀 (S4-008)
- 채팅 기능 테스트 불가 — 네비게이션 라우팅 깨짐

### Phase 4: 거래/에스크로 ❌ BLOCKED
- "Orders & Shipping" 클릭 시 **제조사 앱(Yamamoto)**으로 전환 (S4-008)
- 대시보드에서 주문액 $33,500, 주문 1건은 확인
- 에스크로 결제 플로우 테스트 불가

### Phase 5: 서류 확인 — 미테스트
- "Documents" 메뉴 존재 확인만 완료
- S4-008 네비게이션 버그로 접근 불가

### Phase 6: 바이어 전용 기능 ⚠️ PARTIAL
- "Saved Products" 0건, "Sourcing Pipeline" 1건, "Inquiries" 1건 (dashboard에서 확인)
- "Request Quotation", "Request Sample" 버튼 제품 상세에서 확인
- Profile & Settings 테스트 미완료

---

## 핵심 권고사항 (우선순위순)

### 🔴 즉시 수정 필요
1. **사이드바 네비게이션 라우팅 수정 (S4-008)**: buyer-app 내부 클릭이 /app(제조사)으로 이동하는 문제. SPA 라우팅이 아닌 full navigation 발생
2. **세션 충돌 방지 (S4-007)**: buyer-app 로그인 시 기존 제조사 세션 강제 signOut 후 새 세션 생성
3. **i18n 로그인 후 교정 확장 (S4-001)**: 한국어만 교정하는 로직을 country→lang 전체 매핑으로 확장

### 🟡 조기 수정 권장
4. **공백 수정 (S4-003)**: "theTerms" → "the Terms"
5. **buyer_verifications 406 수정 (S4-006)**: 테이블 생성 또는 쿼리 조건부 실행
6. **제품명 한국어 접두사 제거**: "(뷰티)" 등 카테고리 접두사를 영어 UI에서 제거/번역
7. **쿠키 배너 모바일 최적화**: 하단 고정 대신 상단 또는 콘텐츠 위 배치

### 🟢 개선 권장
8. **랜딩 페이지 리소스 최적화 (S4-004)**: whistle-app.html 지연 로딩

## 전체 버그 목록 (8건)

| # | 심각도 | 제목 | 상태 |
|---|--------|------|------|
| S4-001 | P1 | GeoIP 언어 감지 + 로그인 후 교정 미흡 | OPEN |
| S4-002 | P1 | 회원가입 후 제조사앱 리다이렉트 | FIXED by S6 |
| S4-003 | P2 | "I agree to theTerms" 공백 누락 | OPEN |
| S4-004 | P3 | 바이어 랜딩에서 2.8MB 불필요 로드 | OPEN |
| S4-005 | P1 | 리로드 시 제조사앱 리다이렉트 | FIXED by S6 |
| S4-006 | P2 | buyer_verifications 406 에러 | OPEN |
| S4-007 | P1 | 이전 세션 토큰이 바이어 로그인 방해 | OPEN |
| S4-008 | P1 | 사이드바 네비게이션이 제조사앱으로 전환 | OPEN |
