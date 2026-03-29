# [S2-일본제조사] Phase 1-2 중간 QA 보고서
## 테스트 날짜: 2026-03-29

## 페르소나
- 田中 悠希 (Tanaka Yuki) — ヘルスライフ株式会社 (건강식품 제조사, 오사카)
- 계정: qa.mfr.jp2@whistle-test.com (role=client, country=JP, language=ja)

---

## 버그 요약 (총 12건 + 시각적 2건)

### P0 (서비스불가) — 2건
| ID | 제목 | 상태 |
|----|------|------|
| S2-bug-008 | Accept-Language:ja-JP 설정 시 자동 일본어 감지 실패 | OPEN |
| S2-bug-011 | 제조사 로그인 후 chrome-error/about:blank — headless 전용 가능성 | OPEN (S7 확인 필요) |

### P1 (핵심기능장애) — 4건
| ID | 제목 | 상태 |
|----|------|------|
| S2-bug-003 | 랜딩+로그인에 일본어 언어 선택 없음 | ✅ FIXED (S6-fix-004) |
| S2-bug-004 | /app 로그인 Sign Up 클릭 시 /app/buyer로 이동 | OPEN |
| S2-bug-010 | 로그인 후 /app/buyer로 리다이렉트 | ✅ FIXED (S6) |
| S2-bug-012 | 대시보드 ~30% 영어 혼재 (Getting Started, CTA 등) | OPEN |

### P2 (불편) — 3건
| ID | 제목 | 상태 |
|----|------|------|
| S2-bug-001 | Country 드롭다운 "select_ellipsis" 코드 노출 | ✅ FIXED (S6-fix-001) |
| S2-bug-005 | 쿠키 배너 일본어 미번역 | ✅ FIXED (S6-fix-005) |
| S2-bug-006 | 바이어 포털 "Source premium products with AI" 미번역 | OPEN |
| S2-bug-007 | "Contact Name" 라벨 미번역 | ✅ FIXED (S6-fix-005) |

### P3 (미미) — 2건
| ID | 제목 | 상태 |
|----|------|------|
| S2-bug-002 | Country 라벨 소문자 "country" | ✅ FIXED (S6-fix-001) |
| S2-bug-009 | "Loading Whistle AI..." 로딩 텍스트 미번역 | OPEN |

---

## Geo-Locale 테스트 결과 (TASK-001)
- Accept-Language:ja-JP → 자동 감지 **실패** (영어 표시)
- navigator.language:ja-JP → 로직 존재하지만 랜딩에서 실행 안됨
- ?lang=ja 쿼리파라미터 → ✅ 작동
- localStorage 저장 → ✅ 유지됨
- 통화 자동 전환 → $ USD ↔ ¥ JPY 토글 버튼 확인 (상세 미테스트)

## 시각적 UX (TASK-003)
- S2-visual-001: 데스크톱 로딩 화면 무한 대기
- S2-visual-002: "Contact Name" 다국어 미번역 (모바일)
- 대시보드 로딩 성공 시: 레이아웃 정상, 사이드바 일본어 완벽

## Phase 1 (첫 만남) 결과
- 일본어 UI: ?lang=ja 또는 localStorage 설정 시 작동 ✅
- 자동 감지: ❌ 실패
- 13개 언어 선택기: ✅ S6-fix-004로 추가됨
- 회원가입 폼 일본어: ~90% (Contact Name 미번역)
- 로그인 폼 일본어: ✅ 완벽

## Phase 2 (수출 분석) — 미완료
- 대시보드 진입 성공했으나 세션 유지 문제로 AI 분석 테스트 미진행
- 다음 세션에서 세션 안정화 후 계속

## Phase 3 결과 (다국어 심층 — 메뉴별 일본어)
- 사이드바 메뉴: ✅ 일본어 완벽
- **전체 앱 페이지에서 번역 키(코드 변수명)가 대규모 노출** (S2-bug-014, P0)
  - AI 분석: export_intelligence, search_products, no_analyses, start_first
  - 프로젝트: _projects, no_projects_title, create_first_project, select_project
  - 제품: products_global, select_product
  - 서류: doc_generator, doc_gen_preview, customs_invoice 등
  - 코스트: export_cost_tool, cost_build, orig_price 등
- 근본 원인: T() 함수가 _T/_ML 딕셔너리에서 키를 못 찾으면 키 이름 자체 반환
  - 해당 키들이 _ML에 ja 번역이 없는 것으로 추정
- Messages 클릭 → /app/buyer#search 리다이렉트 (S2-bug-015, P1)

## 총 버그: 15건 + 시각적 2건
- P0: 3건 (자동감지 실패, 로그인 리다이렉트, 번역 키 대규모 노출)
- P1: 5건 (언어선택기 부재→FIXED, Sign Up 리다이렉트, 대시보드 영어 혼재, AI분석 번역키, Messages 리다이렉트)
- P2: 4건 (select_ellipsis→FIXED, 쿠키배너→FIXED, 바이어 미번역, Contact Name→FIXED)
- P3: 2건 (country 소문자→FIXED, 로딩 텍스트 미번역)

## Phase 2 (수출 분석) 부분 결과
- 새 분석 폼 일본어: ~80% (카테고리 영어, 일부 국가명 영어)
- 카테고리 드롭다운: 전부 영어 (S2-bug-016, P2)
- 국가명: 혼재 (일부 일본어, 일부 영어)
- 건강식품(Health & Supplements) URL 입력 → 분석 실행 시도 → API 400 에러로 실패
- AI 분석 실행 결과 미확인 (세션 주입 방식 한계 또는 API 문제)

## 총 버그: 16건 + 시각적 2건
- P0: 3건
- P1: 5건 (1건 FIXED)
- P2: 5건 (3건 FIXED)
- P3: 2건 (1건 FIXED)

## 미완료 Phase
- Phase 2: 수출 분석 결과 확인 — 실제 브라우저에서 재테스트 필요
- Phase 4-8: 서류, 코스트, 채팅, 에스크로, 모바일 — 번역 키 수정 후 재테스트
- TASK-003: 각 페이지 모바일(375px) 스크린샷 미완료

## 다음 세션 인수인계
- 세션 주입: fetch → localStorage 방식으로 제조사 대시보드 접근 가능
- 단, 정상 로그인 아닌 토큰 주입이므로 API 호출(분석 등)에 400 에러 발생 가능
- 실제 브라우저 로그인 또는 Supabase service_role 토큰 사용 필요
- S6 개발팀에 T() 함수 번역 키 노출(P0) 최우선 수정 요청
