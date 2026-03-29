# [S8-UX성능] 시각적 UX: 요금제 카드 Professional 확대 시 텍스트 겹침
- 심각도: P2 (불편)
- 뷰포트: 데스크톱 1280px
- 페이지: /ko 한국어 랜딩 — 요금제 섹션 (스크롤 ~10000px)

## 문제
Professional 플랜 카드가 "추천" 강조를 위해 확대(scale)되어 있는데,
1280px에서 좌우 카드(Starter, Enterprise)와 겹침 발생.
특히 Professional 카드의 "시작하기" 버튼이 옆 카드 텍스트 위에 올라감.
글씨가 겹쳐서 읽기 어려움.

## 제안
- scale 대신 border/shadow로 강조 (겹침 없이)
- 또는 1280px 이하에서 scale 축소: transform: scale(1.02) 정도로
- 또는 카드 간 gap을 넓혀서 확대해도 겹치지 않게
