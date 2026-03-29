# S7-검증QA 진행 상황

## 최종 업데이트: 2026-03-29 23:35 KST

---

## 1. S6 수정사항 검증 결과

| Fix | 대상 버그 | 판정 | 검증 방법 |
|-----|----------|------|----------|
| S6-fix-001 | S2-bug-001 (select_ellipsis) + S2-bug-002 (country 소문자) | ✅ PASS | 브라우저 DOM + 스크린샷 |
| S6-fix-002 | S1-bug-001 (에러 메시지 미표시) | ⚠️ 코드 PASS | curl 코드 확인 (실 에러 시나리오 미테스트) |
| S6-fix-003 | S1-bug-002 (button type) + S1-bug-003 (input name) | ✅ PASS | 브라우저 DOM: 네비 버튼 type="button", input name 6개 모두 확인 |
| S6-fix-004 | S2-bug-003 (다국어 선택기) | ✅ PASS | 브라우저 스크린샷: 13개 언어 선택기 확인 |
| S6-fix-005 | 에러 다국어+쿠키 배너+contact_name+어드민 | ✅ PASS | 코드+브라우저: 일본어 UI 전체 전환 확인 |
| S6-fix-007 | buyer-app 언어 자동감지 | ✅ PASS | 코드: navigator.language 기반 13개 언어 감지 |
| S6-fix-008 | QA 계정 role 교정+트리거 | ✅ PASS | DB 수정 (코드 검증만) |

### 리그레션 체크
- /app 로그인/가입 폼: ✅ 정상
- /ko 랜딩 회원가입 모달: ✅ 정상
- 메인 랜딩 (/): ✅ 정상, JS 에러 없음
- 바이어 랜딩 (/buyer): ✅ 정상
- 바이어 대시보드 (/app/buyer): ✅ 로드 (buyer_verifications 406 에러 별도)

---

## 2. S7 자체 발견 버그

| ID | 심각도 | 내용 | 상태 |
|----|--------|------|------|
| S7-bug-001 | P2 | buyer_verifications API 406 에러 반복 호출 | OPEN |
| S7-bug-002 | - | .htm 미동기화 배포 실패 | FIXED by S6 |
| S7-bug-003 | P2 | 메인 랜딩(/) 자동 언어감지 한국어만 적용 | OPEN |
| S7-bug-004 | P3 | Contact Name placeholder "john_doe" 변수명 노출 | OPEN |
| S7-bug-005 | P1 | 바이어 Sign Up 제출 → Sign In 탭으로 리다이렉트 | OPEN |
| S7-bug-006 | P2 | 잘못된 URL 접속 시 404 페이지 없음 (무한 로딩) | OPEN |

---

## 3. 로캘 자동 감지 테스트

| 언어 | / (메인 랜딩) | /app (제조사 앱) |
|------|-------------|----------------|
| ko-KR | /ko 리다이렉트 ✅ | navigator.language 기반 자동 감지 ✅ |
| ja-JP | 영어 고정 ❌ | navigator.language 기반 감지 (코드 확인) |
| de-DE | 영어 고정 ❌ | navigator.language 기반 감지 (코드 확인) |
| en-US | 영어 ✅ | 영어 ✅ |

---

## 4. Visual UX 체크

| 페이지 | 데스크톱 1280px | 모바일 375px | 이슈 |
|--------|---------------|-------------|------|
| 메인 랜딩 (/) | ✅ | ✅ | 없음 |
| 한국어 랜딩 (/ko) | ✅ | ✅ | 없음 |
| 바이어 랜딩 (/buyer) | ✅ | ✅ | 없음 |
| 로그인/가입 (/app) | ✅ | ⚠️ | 쿠키배너+언어선택기 겹침 (P3) |
| 회원가입 모달 (/ko) | ✅ | 미검증 | - |

---

## 5. 스크린샷 목록
- /tmp/s7-app-login.png — 제조사 앱 로그인 (최초)
- /tmp/s7-final-signup-verify.png — 제조사 앱 Sign Up (수정 확인)
- /tmp/s7-visual-main-desktop.png — 메인 랜딩 데스크톱
- /tmp/s7-visual-main-mobile.png — 메인 랜딩 모바일
- /tmp/s7-visual-ko-desktop.png — 한국어 랜딩 데스크톱
- /tmp/s7-visual-ko-mobile.png — 한국어 랜딩 모바일
- /tmp/s7-visual-buyer-landing-desktop.png — 바이어 랜딩 데스크톱
- /tmp/s7-visual-buyer-landing-mobile.png — 바이어 랜딩 모바일
- /tmp/s7-ko-modal-check.png — 한국어 회원가입 모달

## 6. S3/S8 버그 크로스체크 (S6 수정으로 해결된 것)
- S3-bug-001 (언어 전환 없음) → S6-fix-004 해결 ✅
- S3-bug-011 (Contact Name 미번역) → S6-fix-005 해결 ✅
- S3-bug-013 (에러 메시지 미번역) → S6-fix-005 부분 해결
- S3-bug-016 (쿠키 배너 독일어 미적용) → S6-fix-005 해결 ✅

## 7. 어드민 페이지 체크
- /admin 로그인 페이지: ✅ 정상 (영어 기본)
- 데스크톱: ✅ | 모바일: ✅
- 다국어: 정상 동작 (localStorage 기반)

## 8. 2차 QA 결과 (Round 2-3)

### Interest 카테고리 확장 (TASK-005)
- 바이어 Sign Up Interest 드롭다운: 12개 카테고리 확인 ✅
  - Beauty/Skincare, Color Cosmetics, Hair Care, Health Supplements, Food & Beverage
  - Electronics, Industrial Materials, Machinery, Automotive Parts
  - Textile/Fashion, Packaging, General Products
- S3-bug-003, S3-bug-007 해결 확인

### 법적 페이지 (6개)
- /terms, /terms/en, /privacy, /privacy/en, /refund, /refund/en — 전부 200 OK ✅

### 네비게이션 링크 검증
- 메인 랜딩 CTA: Start Exporting → /app, Find Products → /buyer ✅
- 한국어 랜딩 footer: 회사정보, 서비스, 플랫폼, 법적고지 모두 정상 ✅
- 크로스 포탈 링크 규칙 준수 ✅

### 반응형 레이아웃
- 메인 랜딩 데스크톱/태블릿/모바일: ✅ (태블릿에서 중간 섹션 여백 큼 — P3)

### 신규 버그 (2차)
- S7-bug-005 (P1): 바이어 Sign Up 제출 → Sign In 탭으로 리다이렉트
- S7-bug-006 (P2): 잘못된 URL 접속 시 404 없음 (무한 로딩)

## 9. 다음 작업
- [ ] 바이어 대시보드 내부 기능 테스트 (검색, 상품 목록 등)
- [ ] 제조사 대시보드 기능 테스트 (로그인 필요 — 테스트 계정 필요)
- [ ] fixes/ 폴더 추가 수정사항 모니터링
- [ ] 쿠키 배너 다국어 실동작 재검증
