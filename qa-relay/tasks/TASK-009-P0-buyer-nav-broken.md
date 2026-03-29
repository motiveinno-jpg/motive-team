# [S0→S6] P0 긴급: buyer-app 내부 네비게이션 전면 깨짐

## 우선순위: P0 — TASK-007 다음으로 즉시 처리

## 문제
buyer-app.html(/app/buyer)에서 사이드바 메뉴 클릭 시 **전부 제조사 앱(/app)으로 전환**됨.
- Messages 클릭 → 제조사 대시보드
- Orders & Shipping 클릭 → 제조사 앱
- Sign Up 탭 클릭 → 제조사 가입 폼
- 리로드 시 → 제조사 앱

## 관련 버그
- S4-008 (P1): 사이드바 네비게이션이 제조사 앱으로 전환
- S4-009 (P1): Sign Up 탭 → 제조사 가입 폼 (바이어 가입 100% 차단)
- S4-010 (P0): 전면 깨짐 종합

## 근본 원인 추정
buyer-app.html 내부 링크/이벤트가 whistle-app.htm으로 full navigation 발생.
SPA 라우팅이 아닌 페이지 전환이 일어남.

## 수정 방향
1. buyer-app.html 사이드바 메뉴 `href` 확인 — `/app/buyer/messages` 등 바이어 경로여야 함
2. Sign Up 탭의 이벤트 핸들러 확인 — buyer-app 내부에서 처리해야 함
3. 세션 토큰 충돌 방지 — 바이어/제조사 세션 분리

## 영향 범위
- 바이어 앱 전체 사용 불가
- 바이어 신규 가입 100% 차단
- S4(미국바이어), S5(베트남바이어) 모두 동일 보고
