# [S2-일본제조사] 시각적 UX: 모바일 회원가입 — "Contact Name" 다국어 미번역 (독일어/일본어 화면에서 영어)
- 심각도: P2(불편)
- 뷰포트: 모바일 375px
- 페이지: /app 회원가입 (Registrieren 탭)
- 문제: 다른 필드는 전부 현지어(독일어 "Firmenname", "E-Mail", "Passwort", "Land")인데 "Contact Name"만 영어. 일관성 깨짐. 일본어에서도 동일 (S2-bug-007).
- 스크린샷: /tmp/s2-visual-landing-mobile.png
- 제안: _ML 딕셔너리에 'contact_name' 키의 각 언어 번역 추가 (ja: '担当者名', de: 'Ansprechpartner' 등)
- 상태: S2-bug-007로 이미 보고, S6-fix-005로 수정됨 — 배포 확인 필요
