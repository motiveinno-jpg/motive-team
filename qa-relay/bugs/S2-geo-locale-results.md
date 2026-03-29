# [S2-일본제조사] 지역/언어 자동 감지 테스트 결과 — TASK-001

## 테스트 환경
- Accept-Language: ja-JP,ja;q=0.9,en;q=0.5
- navigator.language: ja-JP (오버라이드)
- Geolocation: 설정 불가 (gstack browse에서 제한)

## 체크리스트 결과

### S2 (일본 제조사 — 오사카)
- [x] Accept-Language: ja-JP → 일본어 자동 표시? → ❌ **실패** — 영어 표시됨
- [x] 첫 접속 시 무엇이 나오는지? → **영어** (Export Made Intelligent)
- [x] 자동 감지 안 되면 언어 선택 UI 쉽게 찾을 수 있는지? → ❌ 랜딩에 일본어 선택 없음 (English/한국어만)
- [x] 일본어 선택 후 새로고침해도 유지되는지? → ✅ localStorage에 저장되어 유지됨

## 자동 언어 감지 메커니즘 분석
- navigator.language 기반? → ✅ 코드에 있음 (whistle-app.html line 1350)
- Accept-Language 헤더 기반? → ❌ 서버사이드 처리 없음 (Static SPA)
- IP geolocation 기반? → ❌ 없음
- **문제**: 로직은 존재하지만, 비인증 사용자가 /app 접근 시 랜딩으로 리다이렉트되어 감지 코드가 실행되지 않음

## 언어 설정 저장
- localStorage whistle_lang / _lang 에 저장 → ✅ 유지됨
- ?lang=ja 쿼리파라미터로 최초 설정 가능 → ✅

## 통화 자동 전환
- 미확인 (로그인 후 테스트 필요)

## URL 구조
- /ko → 한국어 랜딩 (빈 페이지 버그 있음)
- ?lang=ja → 쿼리파라미터로 앱 내 일본어 전환
- /ja 경로 없음 → 일본어 전용 랜딩 페이지 없음

## 핵심 버그
- S2-bug-008 (P0): 일본어 자동 감지 실패
- S2-bug-003 (P1): 언어 선택기 부재 → S6-fix-004 적용 완료 (미배포)
- S2-bug-009 (P3): 로딩 텍스트 미번역
