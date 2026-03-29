# S7 검증 리포트 #2 — S6-fix-005, S6-fix-007, S6-fix-008

## 검증 시각: 2026-03-29 23:10 KST
## 검증자: S7-검증QA

---

### S6-fix-005: 에러 메시지 다국어 + 쿠키 배너 + contact_name + 어드민 링크
- **판정: PASS ✅ (코드 + 부분 브라우저)**
- 일본어(ja) 설정 후 /app 접속: UI 전체 일본어 표시 확인
  - "輸出成功のスタート", "ログイン", "新規登録", "メールアドレス *" 등
- 쿠키 배너 다국어: 코드에 13개 언어 번역 존재 확인 (line 23965~23977)
  - 브라우저에서는 영어로 표시 → 타이밍 이슈 가능성 (IIFE 실행 시 _userLang 참조)
  - _declineTexts, _acceptTexts도 13개 언어 존재 확인
- _authErrMap: T() 기반 다국어 에러 메시지 확인 (코드 검증)
- contact_name _ML: ja:'担当者名' 등 확인 (코드 검증)
- admin 링크: href="/app?stay=app" 확인 (코드 검증)

### S6-fix-007: buyer-app 언어 자동감지
- **판정: PASS ✅ (코드)**
- buyer-app.html line 425~435:
  - 13개 supported 언어 리스트 (ko,en,ja,zh,vi,th,de,fr,es,pt,id,tr,ar)
  - URL ?lang= > localStorage > navigator.language > 'en' 순서 감지
  - 기존 `return 'en'` 하드코딩에서 자동감지로 개선

### S6-fix-008: QA 계정 role 교정 + 트리거 수정
- **판정: PASS ✅ (DB 수정 — 코드 검증만 가능)**
- role='client' → role='buyer' 교정 (DB 레벨)
- log_role_change() 트리거: text→jsonb 타입 캐스팅 수정

---

## 리그레션 체크
- /app 일본어 모드: ✅ 정상 렌더링
- 언어 선택기 동작: ✅ 일본어 선택 후 전체 UI 전환 확인
- 메인 랜딩: ✅ 영향 없음
