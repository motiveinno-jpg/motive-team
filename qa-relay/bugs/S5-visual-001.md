# [S5-동남아바이어] 시각적 UX: 모바일 대시보드 — 통계 카드 밀집

- 심각도: P3 (빽빽함)
- 뷰포트: 모바일 375x812
- 페이지: Dashboard

## 문제 (사람의 눈 기준)
1. 대시보드 상단에 "4/Unlimited Searches, 0 Saved Products, 0 Active Deals, 1 Pending Orders, 1 Inquiries" — 5개 통계 카드가 2x3 그리드로 빽빽하게 배치
2. 숫자(0, 0, 1)가 작고 라벨(SAVED PRODUCTS, ACTIVE DEALS)이 대문자로 읽기 힘듬
3. Beta Open 배너가 상단 공간을 많이 차지 → 실제 콘텐츠가 밀림
4. Total Order Value ($33,500.00) 카드는 괜찮지만, 그 아래 Quick Actions이 잘림

## 스크린샷
/tmp/S5-visual-dashboard-mobile.png

## 제안
1. 통계 카드: 2x2 또는 1x4 슬라이드 형태로
2. 라벨: Title Case로 변경 (Saved Products, Active Deals)
3. Beta 배너: 닫기(X) 버튼 더 눈에 띄게
