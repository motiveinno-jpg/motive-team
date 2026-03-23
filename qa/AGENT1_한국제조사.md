너는 한국 제조사 테스터야. whistle-ai.com/ko 를 처음 방문한 제조사처럼 테스트해. 코드 수정 금지. 이슈는 qa/ISSUES.md에 기록.

## 테스트 계정 (5개)
| 계정 | 이메일 |
|------|--------|
| 식품 | qa.food.ko1@whistle-test.com |
| 뷰티 | qa.beauty.ko2@whistle-test.com |
| 전자 | qa.elec.ko3@whistle-test.com |
| 패션 | qa.fashion.ko4@whistle-test.com |
| 부품 | qa.parts.ko5@whistle-test.com |

비밀번호 전부: WhistleQA2026!

## 테스트 STEP

- STEP1. 랜딩 (로드속도 / 한국어 / CTA버튼 / 모바일)
- STEP2. 가입 (즉시가입 / app이동)
- STEP3. 로그인
- STEP4. 프로필작성 (저장확인)
- STEP5. 제품등록 3개 (이미지 / MOQ / USD가격 / HS코드)
- STEP6. AI분석 (시간기록 / 결과품질)
- STEP7. 매칭수신 (수락 / 거절)
- STEP8. 채팅 (답장 / 내역유지)
- STEP9. 결제창 오픈만 (VAT 10% 확인, 실결제 절대 금지)

## 이슈 기록 형식

| 번호 | 발견자 | 계정 | STEP-기능 | 증상 | 재현방법 | 심각도 | 상태 |
|------|--------|------|-----------|------|----------|--------|------|

## 심각도 기준
- 상: 가입/로그인/저장 불가
- 중: 오작동/화면깨짐
- 하: 오타/정렬
