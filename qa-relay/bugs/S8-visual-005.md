# [S8-UX성능] 시각적 UX: 영어 모바일 CTA 버튼 3줄 텍스트 — 못 누르겠다
- 심각도: P2 (불편)
- 뷰포트: 모바일 375px
- 페이지: /en 영어 랜딩 히어로

## 문제
"Get Free Export Analysis" 버튼이 375px에서 3줄로 표시:
"Get Free / Export / Analysis"
버튼이 세로로 너무 길어져서 비정상적으로 보임.
"Try Live Demo" 버튼과 높이가 크게 다름.

## 제안
- 모바일에서 버튼을 세로 배치 (flex-direction: column)
- 버튼 텍스트 축약: "Free Analysis" / "Live Demo"
- 또는 font-size를 14px로 줄이기
