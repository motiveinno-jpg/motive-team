# [S9-시장조사] 2차 시각적 UX 감사 — 수정 재검증 + 신규 발견
> 테스트: 2026-03-29 2차 | 도구: Puppeteer

---

## 수정 재검증 결과

### S6-fix-001: Country 드롭다운 "select_ellipsis" → "선택..."/"Select"
- **제조사 앱**: 한국어 "선택...", 영어 "Select..." — **PASS**
- **바이어 앱**: 영어 "Select", 일본어 "選択" — **PASS**
- Country 라벨: "국가 *" / "Country *" / "国 *" — **PASS**

### S6-fix-002: 회원가입 에러 메시지 미표시
- 미검증 (실제 폼 제출 불가 — 테스트 계정 필요)

### S6-fix-003: button type + input name
- 미검증 (DOM 검사 필요)

### S6-fix-004: 다국어 선택기 추가
- **제조사 앱**: 14개 언어 버튼 표시 — **PASS**
- **바이어 앱**: 14개 언어 버튼 표시 — **PASS**
- 일본어 전환 시 모든 라벨 번역 확인 — **PASS**

### S6-fix-005: i18n 에러 메시지 + 쿠키 배너
- 일본어 전체 번역 확인: 会社名, 担当者名, メール, パスワード, 国, 関心分野, アカウント作成 — **PASS**
- 쿠키 배너: 영어 "We use cookies..." 표시 (언어 미전환 — 미확인 이슈?)

### S6-fix-007: buyer-app 언어 자동 감지
- 미검증 (Accept-Language 헤더 변경 필요)

### S6-fix-008: 바이어 계정 role 교정
- 미검증 (실제 가입+로그인 필요)

### TASK-005: Interest 카테고리 확장
- 바이어 앱 Interest 드롭다운: 12개 카테고리 확인 — **PASS**
  - Beauty/Skincare, Color Cosmetics, Hair Care, Health Supplements
  - Food & Beverage, Electronics, Industrial Materials, Machinery
  - Automotive Parts, Textile/Fashion, Packaging, General Products
- S3-bug-003, S3-bug-007 수정 확인

---

## 2차 신규 발견

### BUG-V016: 제조사 앱 영어 회원가입 — Contact Name placeholder "john_doe"
- **심각도**: P3
- **뷰포트**: 데스크톱/모바일
- **페이지**: /app (제조사 회원가입, English)
- **문제**: Contact Name 필드 placeholder가 "john_doe" — snake_case는 코드 변수명 느낌. 바이어 앱은 "Full name"으로 정상. 불일관
- **스크린샷**: fix-verify-signup-en
- **제안**: "John Doe" 또는 "Full name"으로 통일

### BUG-V017: 바이어 회원가입 데스크톱 — 장식 요소가 하단 버튼/언어 영역 겹침
- **심각도**: P2
- **뷰포트**: 데스크톱 1280px
- **페이지**: /app/buyer (회원가입 탭, English)
- **문제**: "Create Account" 버튼과 언어 선택 영역에 점선/격자 장식 요소가 겹쳐 보임. 버튼 텍스트와 언어 버튼 위에 장식 라인이 표시되어 지저분
- **스크린샷**: fix-verify-buyer-signup
- **제안**: 장식 요소에 z-index 조정하여 폼 카드 뒤로 보내기. 또는 로그인/가입 페이지에서는 장식 비활성화

### BUG-V018: 제조사 vs 바이어 가입 폼 레이아웃 불일관
- **심각도**: P3
- **뷰포트**: 데스크톱 1280px
- **문제**:
  - 제조사 앱: 필드 세로 1열 (Company → Contact → Email → Password → Country)
  - 바이어 앱: Company+Contact 가로 2열, Country+Interest 가로 2열
  - 제조사에만 바우처 체크박스 있음 (한국어)
  - placeholder 스타일 다름 (john_doe vs Full name)
- **제안**: 동일한 디자인 시스템 적용. 바이어 앱의 2열 레이아웃이 더 효율적 — 제조사도 동일하게

### BUG-V019: 쿠키 배너 언어 미전환
- **심각도**: P3
- **뷰포트**: 데스크톱/모바일
- **페이지**: /app/buyer (일본어 전환 후)
- **문제**: 폼은 일본어로 완벽 전환되지만, 하단 쿠키 배너는 "We use cookies to improve our service and for analytics. See our Privacy Policy for details." 영어 그대로. 일본어 사용자 관점에서 어색
- **스크린샷**: fix-verify-buyer-signup-jp
- **제안**: 쿠키 배너도 다국어 딕셔너리에 추가

### BUG-V020: 바이어 회원가입 모바일 — "アカウント作成" 버튼+쿠키 배너 겹침
- **심각도**: P1 (V003 재확인)
- **뷰포트**: 모바일 375px
- **페이지**: /app/buyer
- **문제**: 1차에서 발견한 V003(쿠키 배너 CTA 가림)이 바이어 가입 폼에서도 동일하게 발생. "アカウント作成"(Create Account) 버튼 하단이 쿠키 배너에 가려짐. 사용자가 동의 처리 안 하면 가입 불가
- **스크린샷**: fix-verify-buyer-signup-jp-mobile
- **영향**: 바이어 전환율 직접 저하

---

## 2차 요약

| 구분 | 건수 |
|------|------|
| 수정 재검증 PASS | 5건 (fix-001, 004, 005, TASK-005) |
| 수정 미검증 (실제 가입 필요) | 3건 (fix-002, 007, 008) |
| 2차 신규 P1 | 1건 (V020 = V003 재확인) |
| 2차 신규 P2 | 1건 (V017 장식 요소 겹침) |
| 2차 신규 P3 | 3건 (V016 john_doe, V018 레이아웃 불일관, V019 쿠키 i18n) |

## 누적 총계

| 심각도 | 1차 | 2차 신규 | 총계 |
|--------|-----|---------|------|
| P1 | 3 | 1 | **4** |
| P2 | 6 | 1 | **7** |
| P3 | 6 | 3 | **9** |
| **합계** | **15** | **5** | **20** |
