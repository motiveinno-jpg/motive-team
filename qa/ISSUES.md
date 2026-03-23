# Whistle AI QA 이슈 트래커

## 진행현황
- Agent1 한국제조사: ✅ 완료 (STEP1~9 전체 테스트)
- Agent2 글로벌바이어: 🔄 진행중 (미국계정 ✅ 완료, 일본계정 시작)
- Agent2B 글로벌제조사: ✅ 완료 (US/JP/DE 3개국 STEP1~6 테스트, 이슈 19건)
- Agent3 개발: 🔄 진행중 (반려 7건 재수정 필요)
- Agent4 QA검토: 🔄 1차 검토 완료 (승인14/반려7/보류3)

## 이슈목록
| # | 발견자 | 계정 | 파일 | 기능 | 증상 | 재현방법 | 심각도 | 상태 |
|---|--------|------|------|------|------|----------|--------|------|
| 2B-001 | Agent2B | US/Robert Kim | whistle-landing | STEP1-언어감지 | /en 전체 한국어 표시 | whistle-ai.com/en 접속 | 상 | ✅ 완료 |
| 2B-002 | Agent2B | US/Robert Kim | whistle-landing | STEP2-랜딩 한영혼재 | /en 제목 한국어, 설명 영어 혼재 | /en 전체 스크롤 | 상 | ✅ 완료 |
| 2B-003 | Agent2B | US/Robert Kim | whistle-landing | STEP2-네비/헤더/푸터 | /en 네비/CTA/푸터 전부 한국어 | /en → 네비/푸터 확인 | 상 | ✅ 완료 |
| 2B-004 | Agent2B | US/Robert Kim | whistle-app | STEP3-로그인/가입폼 한국어 | /app 로그인·가입폼 전체 한국어 | /app 직접 접속 | 상 | ✅ 완료 |
| 2B-005 | Agent2B | US/Robert Kim | whistle-app | STEP3-앱 전체 i18n 미적용 | 앱 전체 한국어 (사이드바/상단바/온보딩) | 로그인 후 대시보드 | 상 | ✅ 완료 |
| 2B-006 | Agent2B | US/Robert Kim | whistle-app | STEP3-온보딩 한국전용 필드 | ceo_name_ko 비조건부 전체 노출. 사업자번호는 조건부 OK, 대표자명 DB칼럼 한국전용 | 온보딩 1/3 단계 | 상 | ❌ 재수정필요 |
| 2B-007 | Agent2B | US/Robert Kim | whistle-app | STEP3-알리바바 메뉴 노출 | _isKorean 조건부 표시 확인 | 글로벌 로그인 → 사이드바 | 중 | ✅ 완료 |
| 2B-008 | Agent2B | US/Robert Kim | whistle-app | STEP3-온보딩 셀렉트 한국어 | 기업유형/카테고리/제조유형 조건부 분기 확인 | 온보딩 1/3 셀렉트 | 중 | ✅ 완료 |
| 2B-009 | Agent2B | US/Robert Kim | whistle-app | STEP3-대시보드 전체 한국어 | T() 적용, 환율 _isKorean 분리 확인 | 로그인 후 대시보드 | 상 | ✅ 완료 |
| 2B-010 | Agent2B | US/Robert Kim | whistle-app | STEP3-환율 USD/KRW 고정 | 환율 모니터 섹션 자체가 글로벌 유저에게도 렌더됨 | 대시보드 하단 | 중 | ❌ 재수정필요 |
| 2B-011 | Agent2B | US/Robert Kim | whistle-app | STEP4-제품등록 한글필수 | 제품명 단일 칼럼, 글로벌 유저에게 영문필수/한글선택 역전 미구현 | 제품 관리 → + 추가 | 상 | ❌ 재수정필요 |
| 2B-012 | Agent2B | US/Robert Kim | whistle-app | STEP4-가격 원화고정 | 가격 입력 ₩ 고정, 글로벌 USD 입력 불가 | 제품등록 → 단가 필드 | 상 | ❌ 재수정필요 |
| 2B-013 | Agent2B | US/Robert Kim | whistle-app | STEP4-AI분석 한국어 예시 | placeholder OK, "쿠팡/네이버" 언급 + HWP 지원 글로벌 노출 미확인 | AI분석 → 새 분석 | 중 | ❌ 재수정필요 |
| 2B-014 | Agent2B | US/Robert Kim | whistle-app | STEP6-구독페이지 전체 한국어 | T() + _isKorean 적용 확인 (minor: line 11067 플랜명 영어고정) | 구독&서비스 | 상 | ✅ 완료 |
| 2B-015 | Agent2B | US/Robert Kim | whistle-app | STEP6-Stripe 기본통화 KRW | Stripe Edge Function 통화 기본값 이슈 | Stripe 결제창 | 중 | 보류 |
| 2B-016 | Agent2B | US/Robert Kim | whistle-app | STEP6-정부바우처 글로벌 노출 | _ko 조건부 숨김 확인 | 구독&서비스 하단 | 중 | ✅ 완료 |
| 2B-017 | Agent2B | US/Robert Kim | whistle-app | STEP6-알리바바 서비스 글로벌 노출 | confirm 분기 OK, 선택지 자체가 전체 유저 노출. _isKorean 가드 필요 | 구독&서비스 | 중 | ❌ 재수정필요 |
| 2B-018 | Agent2B | JP/Yamamoto, DE/Mueller | whistle-app | STEP3-온보딩 상품URL 네이버 | 글로벌: "your-website.com/product" 확인 | 온보딩 2/3 상품URL | 중 | ✅ 완료 |
| 2B-019 | Agent2B | JP/Yamamoto, DE/Mueller | whistle-app | STEP3-가입폼 바우처 체크박스 | 이미 _isKorean 조건부 처리됨 (L2121). 비한국은 미노출 | /app → 회원가입 탭 | 중 | 수정완료-검토대기 |
| 1-001 | Agent1 | qa.food.ko1 | whistle-landing | STEP1-모바일 CTA 줄바꿈 | whiteSpace:nowrap 추가로 줄바꿈 방지 | whistle-ai.com/ko 390px | 하 | 수정완료-검토대기 |
| 1-002 | Agent1 | qa.food.ko1 | whistle-landing | STEP1-캐러셀 콘텐츠 미표시 | whistle-landing.html에 리뷰/캐러셀 섹션 자체 없음 — QA 오탐 가능 | whistle-ai.com/ko 중간부 | 중 | 보류 |
| 1-003 | Agent1 | qa.food.ko1 | whistle-app | STEP2-이메일인증 불일치 | auto-confirm 시 verify 화면 skip → 바로 loadUser() | 가입 → 인증없이 로그인 | 중 | 수정완료-검토대기 |
| 1-004 | Agent1 | qa.food.ko1 | whistle-app | STEP4-다음버튼 뷰포트밖 | position:sticky;bottom:0 적용 확인 | 온보딩 1/3 하단 | 상 | ✅ 완료 |
| 1-005 | Agent1 | qa.food.ko1 | whistle-app | STEP6-콘솔에러 | .then().catch() 체인 연결 확인 | AI 분석 → 콘솔 | 중 | ✅ 완료 |
| 1-006 | Agent1 | qa.food.ko1 | whistle-app | STEP9-VAT 미표시 | VAT 표기 vs Stripe 미반영 | Stripe 결제창 금액 | 중 | 보류 |
| 2-001 | Agent2 | US/James Carter | buyer-app | STEP3-온보딩 이스케이프 문자 노출 | 이중이스케이프(`\\\'`) 수정 + 쌍따옴표 전환 | /app/buyer 온보딩 1~4 | 하 | 수정완료-검토대기 |
| 2-002 | Agent2 | US/James Carter | buyer-app | STEP3-가입 시 국가 미전달 | user_metadata에서 country backfill + DB 업데이트 | 가입 US → 온보딩 | 중 | 수정완료-검토대기 |
| 2-003 | Agent2 | US/James Carter | buyer-app | STEP4-Product Search 검색불가 | S 전역객체+sb Supabase 정상 확인 | Product Search → 검색 | 상 | ✅ 완료 |
| 2-004 | Agent2 | US/James Carter | buyer-app | STEP5/6/7-테스트불가 | DB 테스트 데이터 없음. 상세페이지·매칭신청·채팅 테스트 불가. Find Manufacturers UI는 정상, Sourcing Inquiry 폼 정상 | 제조사 조회 시도 | 상 | 보류 |
| 2-005 | Agent2 | US/James Carter | buyer-app | STEP8-결제 테스트불가 | 바이어 포털은 "Free for Buyers"로 구독 메뉴 없음. 에스크로 결제는 딜 진행 시에만 가능하나 딜이 없어 테스트 불가 | 사이드바 전체 메뉴 + Profile 확인 | 중 | 보류 |
| 2-006 | Agent2 | US/James Carter | buyer-app | STEP3-온보딩 Skip 리다이렉트 | skipBuyerOnboarding: page='search'→'dashboard'로 변경 | 온보딩 4단계 → Skip 클릭 | 하 | 수정완료-검토대기 |

## 심각도기준
- 상: 가입/로그인/결제/저장 불가
- 중: 기능오작동, 화면깨짐
- 하: 오타, 번역어색, 정렬

## 상태기준
- 수정대기 / 수정완료-검토대기 / 재수정필요 / 완료 / 보류

## 완료이슈
| # | 파일 | 증상 | 해결 | 완료일 |
|---|------|------|------|--------|
| 2B-001 | whistle-landing | /en 전체 한국어 | /en→global-landing.htm 영어 파일 분리 | 2026-03-23 |
| 2B-002 | whistle-landing | /en 한영혼재 | global-landing.html 전체 영어 하드코딩 | 2026-03-23 |
| 2B-003 | whistle-landing | 네비/헤더/푸터 한국어 | 영어 nav/footer 독립 파일 | 2026-03-23 |
| 2B-004 | whistle-app | 로그인/가입폼 한국어 | T() 번역함수 적용 | 2026-03-23 |
| 2B-005 | whistle-app | 앱 전체 i18n | 사이드바/상단바/온보딩 T() 적용 | 2026-03-23 |
| 2B-007 | whistle-app | 알리바바 메뉴 글로벌 노출 | _isKorean 조건부 표시 | 2026-03-23 |
| 2B-008 | whistle-app | 온보딩 셀렉트 한국어 | 조건부 분기 적용 | 2026-03-23 |
| 2B-009 | whistle-app | 대시보드 전체 한국어 | T() + _isKorean 적용 | 2026-03-23 |
| 2B-014 | whistle-app | 구독페이지 전체 한국어 | T() + _isKorean 적용 | 2026-03-23 |
| 2B-016 | whistle-app | 정부바우처 글로벌 노출 | _ko 조건부 숨김 | 2026-03-23 |
| 2B-018 | whistle-app | 상품URL 네이버 | 글로벌 placeholder 분기 | 2026-03-23 |
| 1-004 | whistle-app | 다음버튼 뷰포트밖 | position:sticky;bottom:0 | 2026-03-23 |
| 1-005 | whistle-app | .catch 콘솔에러 | .then().catch() 체인 연결 | 2026-03-23 |
| 2-003 | buyer-app | Product Search 검색불가 | S/sb 전역 정상 접근 | 2026-03-23 |

## Agent4 반려 상세 (Agent3 재수정 필요)
| # | 반려이유 | 재수정 요청사항 |
|---|----------|----------------|
| 2B-006 | ceo_name_ko 필드 비조건부 전체 유저 노출 | 글로벌: ceo_name(영문), 한국: ceo_name_ko(한글) 분기. DB 칼럼도 확인 |
| 2B-010 | 환율 모니터 섹션 글로벌 유저에게도 렌더 | 대시보드에서 환율 섹션 `if(_isKorean)` 조건부 렌더링 |
| 2B-011 | 제품명 단일 칼럼, 글로벌 역전 미구현 | _isKorean 기준 name_en 필수↔name_ko 선택 분기 |
| 2B-012 | 가격 입력 ₩ 고정 미수정 | 글로벌: USD 기본값, 한국: KRW 기본값 통화 분기 |
| 2B-013 | "쿠팡/네이버" 언급 + HWP 지원 글로벌 노출 | AI분석 본문에서 한국 로컬 컨텍스트 _isKorean 조건부 |
| 2B-017 | 알리바바 서비스 선택지 전체 유저 노출 | `if(_isKorean)` 가드로 섹션 전체 감싸기 |
| 2B-019 | 바우처 체크박스 조건부 코드 미발견 | 가입폼 바우처 체크박스에 `_isKorean` 조건부 추가 |

## 에스컬레이션(희웅님판단필요)
| # | 내용 | 이유 |
|---|------|------|
| 1-006 | VAT 10% 별도 표기 vs Stripe 미반영 | 세금계산서/부가세 처리 정합성 확인 필요. 법적 이슈 가능성 |
| 2B-015 | Stripe 결제창 기본통화 KRW | Edge Function 통화 로직 변경 필요, Stripe 금지구역 |
| 2-004 | DB 테스트 데이터 없어 바이어 STEP5~7 테스트 불가 | 테스트 데이터 시딩 정책 결정 필요 |
