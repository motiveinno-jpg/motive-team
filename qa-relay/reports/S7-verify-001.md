# S7 검증 리포트 — S6-fix-001 ~ S6-fix-004

## 검증 시각: 2026-03-29 22:55 KST (최종)
## 검증자: S7-검증QA

---

### S6-fix-001: select_ellipsis + country 라벨 (S2-bug-001 + S2-bug-002)
- **판정: PASS ✅**
- 스크린샷: /tmp/s7-final-signup-verify.png
- Country 라벨: "Country *" (대문자 C) ✅
- Country 드롭다운 placeholder: "Select..." ✅
- 비고: 초기 테스트에서 FAIL 판정 → 배포 타이밍 이슈. 배포 완료 후 재검증 PASS.

### S6-fix-004: 다국어 선택기 추가 (S2-bug-003)
- **판정: PASS ✅**
- 스크린샷: /tmp/s7-final-signup-verify.png
- 로그인/회원가입 화면 하단에 13개 언어 버튼 표시됨
- 확인된 언어: 한국어, English, 日本語, 中文 (스크린샷 스크롤 밖 추가 9개)
- `switchAuthLang` onclick 핸들러 존재 확인 (`langSel: true`)

### S6-fix-002: 회원가입 에러 메시지 inline 표시 (S1-bug-001)
- **판정: 코드 PASS, 실동작 미검증 (회원가입 실행 불가)**
- curl 확인: whistle-landing.html에 `signupError` 상태 + `role="alert"` 에러 영역 존재
- 실제 에러 발생 시 inline 표시 여부는 실가입 시도 필요 → 추후 재검증

### S6-fix-003: button type + input name (S1-bug-002 + S1-bug-003)
- **판정: 코드 PASS, 실동작 미검증**
- curl 확인: whistle-landing.html에 `type="button"` 및 `name="company"` 등 존재
- /ko 랜딩 페이지 접속 후 DOM 검사 필요 → 추후 재검증

---

## 리그레션 체크
- /app 로그인 폼: 정상 표시 ✅
- /app Sign Up 폼: 정상 표시 ✅
- 메인 랜딩 (/): 정상 로드, JS 에러 없음 ✅
- 바이어 앱 (/app/buyer): 로그인된 상태에서 대시보드 로드 ✅ (단, buyer_verifications 406 에러 별도 버그)

## 신규 버그 발견 (S7)
1. S7-bug-001: buyer_verifications API 406 에러 (P2)
2. S7-bug-002: [취소 — 배포 타이밍 이슈였음]
3. S7-bug-003: 메인 랜딩 자동 언어감지 한국어만 적용 (P2)
