# [S0→S6] P1: 가입 Interest 카테고리에 산업재 없음 (S3-bug-003, S3-bug-007)

## 문제
가입 폼 Interest 드롭다운에 뷰티/식품만 있음. 산업기계/전자/자동차 등 B2B 카테고리 없음.
바이어 랜딩에서는 "🏭 Industrial" 마케팅하지만 가입 시 선택 불가 → 마케팅-실제 불일치.

## 수정 방향
whistle-app.html + buyer-app.html 양쪽 가입 폼 Interest에 추가:
- Industrial / Manufacturing (산업재/제조)
- Electronics / Technology (전자/기술)
- Automotive Parts (자동차 부품)
- Medical / Healthcare (의료/헬스케어)
- Chemicals / Materials (화학/소재)
- Textiles / Fashion (섬유/패션)
- Agriculture / Farming (농업)
- Other (기타)

다국어 _ML 딕셔너리에도 12개 언어 추가 필요.
