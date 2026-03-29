# [S3-독일제조사] 시각적 UX: 모바일 쿠키 배너가 가입 동의 텍스트를 가림
- 심각도: P2(불편)
- 뷰포트: 모바일 375px
- 페이지: /app/buyer (가입 폼)
- 문제: 쿠키 동의 배너가 하단에 고정되어 "Ich stimme zu: Nutzungsbedingungen und Datenschutzrichtlinie" 체크박스를 가림. 사용자가 동의 체크를 하려면 먼저 쿠키 배너에 응답해야 함. 그런데 쿠키 배너가 영어라 독일 사용자에게 혼란.
- 스크린샷: /tmp/s3-visual-signup-mobile.png
- 제안: 쿠키 배너를 가입 폼 위에 겹치지 않게 z-index 조정, 또는 가입 페이지에서는 쿠키 배너 위치 조정
