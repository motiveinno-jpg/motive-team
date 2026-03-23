# Whistle AI QA 이슈 트래커

## [Agent2 2차 테스트 완료] — 2026-03-23 모바일(390x844) 5개국 전체 재테스트

## 진행현황
- Agent1 한국제조사: ✅ 완료 (STEP1~9 전체 테스트)
- Agent2 글로벌바이어: ✅ 1차+2차 완료 (1차 데스크톱 13건 + 2차 모바일 8건)
- Agent2B 글로벌제조사: ✅ 완료 (US/JP/DE 3개국 STEP1~6 테스트, 이슈 19건)
- Agent3 개발: ✅ 전체 수정 완료
- Agent4 QA검토: ✅ 2차 검토 완료 (26건 중 26건 승인, 보류 5건)

## 이슈목록
| # | 발견자 | 계정 | 파일 | 기능 | 증상 | 재현방법 | 심각도 | 상태 |
|---|--------|------|------|------|------|----------|--------|------|
| 2B-001 | Agent2B | US/Robert Kim | whistle-landing | STEP1-언어감지 | /en 전체 한국어 표시 | whistle-ai.com/en 접속 | 상 | ✅ 완료 |
| 2B-002 | Agent2B | US/Robert Kim | whistle-landing | STEP2-랜딩 한영혼재 | /en 제목 한국어, 설명 영어 혼재 | /en 전체 스크롤 | 상 | ✅ 완료 |
| 2B-003 | Agent2B | US/Robert Kim | whistle-landing | STEP2-네비/헤더/푸터 | /en 네비/CTA/푸터 전부 한국어 | /en → 네비/푸터 확인 | 상 | ✅ 완료 |
| 2B-004 | Agent2B | US/Robert Kim | whistle-app | STEP3-로그인/가입폼 한국어 | /app 로그인·가입폼 전체 한국어 | /app 직접 접속 | 상 | ✅ 완료 |
| 2B-005 | Agent2B | US/Robert Kim | whistle-app | STEP3-앱 전체 i18n 미적용 | 앱 전체 한국어 (사이드바/상단바/온보딩) | 로그인 후 대시보드 | 상 | ✅ 완료 |
| 2B-006 | Agent2B | US/Robert Kim | whistle-app | STEP3-온보딩 한국전용 필드 | _isKorean?ceo_name_ko:ceo_name 분기 + DB저장 분기 | 온보딩 1/3 단계 | 상 | ✅ 완료 |
| 2B-007 | Agent2B | US/Robert Kim | whistle-app | STEP3-알리바바 메뉴 노출 | _isKorean 조건부 표시 확인 | 글로벌 로그인 → 사이드바 | 중 | ✅ 완료 |
| 2B-008 | Agent2B | US/Robert Kim | whistle-app | STEP3-온보딩 셀렉트 한국어 | 기업유형/카테고리/제조유형 조건부 분기 확인 | 온보딩 1/3 셀렉트 | 중 | ✅ 완료 |
| 2B-009 | Agent2B | US/Robert Kim | whistle-app | STEP3-대시보드 전체 한국어 | T() 적용, 환율 _isKorean 분리 확인 | 로그인 후 대시보드 | 상 | ✅ 완료 |
| 2B-010 | Agent2B | US/Robert Kim | whistle-app | STEP3-환율 USD/KRW 고정 | if(_isKorean) 조건부 렌더링, 글로벌 미노출 | 대시보드 하단 | 중 | ✅ 완료 |
| 2B-011 | Agent2B | US/Robert Kim | whistle-app | STEP4-제품등록 한글필수 | _isKorean?name_ko필수:name_en필수 분기 | 제품 관리 → + 추가 | 상 | ✅ 완료 |
| 2B-012 | Agent2B | US/Robert Kim | whistle-app | STEP4-가격 원화고정 | 한국=₩KRW→USD환산, 글로벌=$USD직접입력 | 제품등록 → 단가 필드 | 상 | ✅ 완료 |
| 2B-013 | Agent2B | US/Robert Kim | whistle-app | STEP4-AI분석 한국어 예시 | 쿠팡/네이버→Amazon/Alibaba, HWP→미표시 분기 | AI분석 → 새 분석 | 중 | ✅ 완료 |
| 2B-014 | Agent2B | US/Robert Kim | whistle-app | STEP6-구독페이지 전체 한국어 | T() + _isKorean 적용 | 구독&서비스 | 상 | ✅ 완료 |
| 2B-015 | Agent2B | US/Robert Kim | whistle-app | STEP6-Stripe 기본통화 KRW | Stripe Edge Function 통화 기본값 이슈 | Stripe 결제창 | 중 | 보류 |
| 2B-016 | Agent2B | US/Robert Kim | whistle-app | STEP6-정부바우처 글로벌 노출 | _ko 조건부 숨김 | 구독&서비스 하단 | 중 | ✅ 완료 |
| 2B-017 | Agent2B | US/Robert Kim | whistle-app | STEP6-알리바바 서비스 글로벌 노출 | _isKorean 가드로 전체 섹션 감싸기 완료 | 구독&서비스 | 중 | ✅ 완료 |
| 2B-018 | Agent2B | JP/Yamamoto, DE/Mueller | whistle-app | STEP3-온보딩 상품URL 네이버 | 글로벌: "your-website.com/product" 분기 | 온보딩 2/3 상품URL | 중 | ✅ 완료 |
| 2B-019 | Agent2B | JP/Yamamoto, DE/Mueller | whistle-app | STEP3-가입폼 바우처 체크박스 | L2121 _isKorean 조건부 확인, 비한국 미노출 | /app → 회원가입 탭 | 중 | ✅ 완료 |
| 1-001 | Agent1 | qa.food.ko1 | whistle-landing | STEP1-모바일 CTA 줄바꿈 | whiteSpace:nowrap 적용 | whistle-ai.com/ko 390px | 하 | ✅ 완료 |
| 1-002 | Agent1 | qa.food.ko1 | whistle-landing | STEP1-캐러셀 콘텐츠 미표시 | 리뷰/캐러셀 섹션 자체 없음 — QA 오탐 | whistle-ai.com/ko 중간부 | 중 | 보류 |
| 1-003 | Agent1 | qa.food.ko1 | whistle-app | STEP2-이메일인증 불일치 | auto-confirm 시 verify skip → loadUser() | 가입 → 인증없이 로그인 | 중 | ✅ 완료 |
| 1-004 | Agent1 | qa.food.ko1 | whistle-app | STEP4-다음버튼 뷰포트밖 | position:sticky;bottom:0 | 온보딩 1/3 하단 | 상 | ✅ 완료 |
| 1-005 | Agent1 | qa.food.ko1 | whistle-app | STEP6-콘솔에러 | .then().catch() 체인 연결 | AI 분석 → 콘솔 | 중 | ✅ 완료 |
| 1-006 | Agent1 | qa.food.ko1 | whistle-app | STEP9-VAT 미표시 | VAT 표기 vs Stripe 미반영 | Stripe 결제창 금액 | 중 | 보류 |
| 2-001 | Agent2 | US/James Carter | buyer-app | STEP3-온보딩 이스케이프 문자 | 이중이스케이프 수정 + 쌍따옴표 전환 | /app/buyer 온보딩 1~4 | 하 | ✅ 완료 |
| 2-002 | Agent2 | US/James Carter | buyer-app | STEP3-가입 시 국가 미전달 | user_metadata country backfill + DB 업데이트 | 가입 US → 온보딩 | 중 | ✅ 완료 |
| 2-003 | Agent2 | US/James Carter | buyer-app | STEP4-Product Search 검색불가 | S/sb 전역 정상 접근 | Product Search → 검색 | 상 | ✅ 완료 |
| 2-004 | Agent2 | US/James Carter | buyer-app | STEP5/6/7-테스트불가 | DB 테스트 데이터 없음 | 제조사 조회 시도 | 상 | 보류 |
| 2-005 | Agent2 | US/James Carter | buyer-app | STEP8-결제 테스트불가 | 바이어 Free, 에스크로는 딜 필요 | 사이드바 전체 메뉴 | 중 | 보류 |
| 2-006 | Agent2 | US/James Carter | buyer-app | STEP3-온보딩 Skip 리다이렉트 | page='search'→'dashboard' 변경 | 온보딩 Skip 클릭 | 하 | ✅ 완료 |
| 2-007 | Agent2 | JP/Tanaka Hiroshi | buyer-landing | STEP1-일본어 랜딩 정상 | 네비/히어로/CTA/푸터 전체 일본어 표시, RTL 없음 | whistle-ai.com/buyer lang=ja | - | 정상 |
| 2-008 | Agent2 | JP/Tanaka Hiroshi | buyer-landing | STEP2-기능카드 영어 | 기능 섹션 카드 제목/설명 영어 (FTA Optimization 등) | /buyer lang=ja 스크롤 중간부 | 중 | ✅ 완료 |
| 2-009 | Agent2 | DE/Klaus Weber | buyer-landing | STEP1-독일어 랜딩 정상 | 네비/히어로/CTA 독일어 표시 정상 | whistle-ai.com/buyer lang=de | - | 정상 |
| 2-010 | Agent2 | DE/Klaus Weber | buyer-landing | STEP2-쿠키배너 영어 | 독일어 페이지인데 쿠키배너 "We use cookies..." 영어 | /buyer lang=de 하단 배너 | 하 | ✅ 완료 |
| 2-011 | Agent2 | DE/Klaus Weber | buyer-landing | STEP2-CTA 부제목 영어 | "AI-Powered Global Sourcing Platform" 미번역 | /buyer lang=de 히어로 하단 | 하 | ✅ 완료 |
| 2-012 | Agent2 | VN/Nguyen Thi Lan | buyer-landing | STEP1-베트남어 랜딩 정상 | 네비/히어로/CTA 베트남어 표시 정상 | whistle-ai.com/buyer lang=vi | - | 정상 |
| 2-013 | Agent2 | AE/Ahmed Al-Rashid | buyer-landing | STEP1-아랍어 RTL 정상 | 네비/히어로 아랍어 RTL 레이아웃 정상 | whistle-ai.com/buyer lang=ar | - | 정상 |
| 2-014 | Agent2 | AE/Ahmed Al-Rashid | buyer-landing | STEP1-카테고리 태그 영어 | 히어로 하단 카테고리 태그 Health/Textiles 등 영어 | /buyer lang=ar 히어로 아래 | 하 | ✅ 완료 |
| 2-015 | Agent2 | AE/Ahmed Al-Rashid | buyer-landing | STEP2-기능카드/설명 영어 | 기능 섹션 제목/설명 전부 영어 (FTA Optimization 등) | /buyer lang=ar 스크롤 중간부 | 중 | ✅ 완료 |
| 2-016 | Agent2 | AE/Ahmed Al-Rashid | buyer-landing | STEP2-푸터 링크 영어 혼재 | Seller Portal/Export Tools/Sign Up/Buyer Portal 영어 | /buyer lang=ar 푸터 | 하 | ✅ 완료 |
| 2-017 | Agent2 | AE/Ahmed Al-Rashid | buyer-app | STEP3-국가목록 UAE 누락 | 가입폼 Country 드롭다운에 UAE 없음 (Saudi Arabia만 존재) | /app/buyer → Sign Up → Country | 중 | ✅ 완료 |
| 2-018 | Agent2 | 전체 글로벌 | buyer-app | STEP3-앱 전체 영어 고정 | buyer-app 전체 영어 전용, 다국어 i18n 미적용 (랜딩은 다국어 지원) | /app/buyer 로그인 후 전체 | 중 | 보류 |
| 2-019 | Agent2 | 전체 글로벌 | buyer-app | STEP4-검색결과 한국어 | 제품명/카테고리/브랜드가 한국어로 표시 (글로벌 바이어에게) | Product Search → Snail Cream 검색 | 중 | ✅ 완료 |
| **2차 모바일 QA (390x844, isMobile)** | | | | | | | | |
| 2M-001 | Agent2 | 전체 5개국 | buyer-app | STEP3-모바일 언어감지 오류 | buyer-app이 localStorage lang 무시, navigator.language(ko-KR) 사용 → 글로벌 유저에게 한국어 표시 | 모바일(390px) /app/buyer 접속 | **상** | 수정완료-검토대기 |
| 2M-002 | Agent2 | 전체 5개국 | buyer-app | STEP3-모바일 로그인폼 한국어 | 로그인/회원가입/이메일/비밀번호 전부 한국어 (로그인→회원가입, 이메일→이메일, 비밀번호→비밀번호) | 모바일 /app/buyer | **상** | 수정완료-검토대기 |
| 2M-003 | Agent2 | US/James Carter | buyer-app | STEP3-모바일 대시보드 한국어 | "환영합니다, James Carter" / "한국 제품 소싱 가이드" / 전체 한국어 | 모바일 로그인 후 대시보드 | **상** | 수정완료-검토대기 |
| 2M-004 | Agent2 | JP/Tanaka Hiroshi | buyer-app | STEP3-모바일 온보딩 한국어 | 온보딩 전체 한국어: 기본정보/회사명/담당자명/국가/전화번호, 전화 placeholder 010-1234-5678 (한국식) | 모바일 JP 로그인 후 온보딩 | **상** | 수정완료-검토대기 |
| 2M-005 | Agent2 | DE/VN/AE | buyer-landing | STEP1-모바일 카테고리 태그 영어 | 히어로 아래 카테고리 태그 K-Beauty/Electronics/Food&Beverage 영어 고정 (JP만 일본어 정상) | 모바일 /buyer lang=de,vi,ar | 중 | 수정완료-검토대기 |
| 2M-006 | Agent2 | DE/VN/AE | buyer-landing | STEP2-모바일 하단배지 영어 | "Powered Matching"/"Secure Payments"/"+Asia"/"Free" 미번역 | 모바일 /buyer 히어로 아래 | 하 | 수정완료-검토대기 |
| 2M-007 | Agent2 | DE | buyer-landing | STEP1-모바일 검색 placeholder 영어 | 독일어 페이지인데 검색창 "e.g. I need organic skincare products, 500" 영어 | 모바일 /buyer lang=de 검색창 | 하 | 수정완료-검토대기 |
| 2M-008 | Agent2 | 전체 5개국 | buyer-app | STEP4-모바일 검색 UI 한국어 | 필터/탭/결과 카운트 전부 한국어: "전체 결과"/"전체 카테고리"/"최소 가격"/"40 개 제품 검색됨" | 모바일 Product Search | **상** | 수정완료-검토대기 |

## 심각도기준
- 상: 가입/로그인/결제/저장 불가
- 중: 기능오작동, 화면깨짐
- 하: 오타, 번역어색, 정렬

## 상태기준
- 수정대기 / 수정완료-검토대기 / 재수정필요 / 완료 / 보류

## 완료이슈 (26건)
| # | 파일 | 증상 | 해결 | 완료일 |
|---|------|------|------|--------|
| 2B-001 | whistle-landing | /en 전체 한국어 | /en→global-landing.htm 영어 파일 분리 | 2026-03-23 |
| 2B-002 | whistle-landing | /en 한영혼재 | global-landing.html 전체 영어 하드코딩 | 2026-03-23 |
| 2B-003 | whistle-landing | 네비/헤더/푸터 한국어 | 영어 nav/footer 독립 파일 | 2026-03-23 |
| 2B-004 | whistle-app | 로그인/가입폼 한국어 | T() 번역함수 적용 | 2026-03-23 |
| 2B-005 | whistle-app | 앱 전체 i18n | 사이드바/상단바/온보딩 T() 적용 | 2026-03-23 |
| 2B-006 | whistle-app | 온보딩 한국전용 필드 | _isKorean?ceo_name_ko:ceo_name + DB분기 | 2026-03-23 |
| 2B-007 | whistle-app | 알리바바 메뉴 글로벌 노출 | _isKorean 조건부 표시 | 2026-03-23 |
| 2B-008 | whistle-app | 온보딩 셀렉트 한국어 | 조건부 분기 적용 | 2026-03-23 |
| 2B-009 | whistle-app | 대시보드 전체 한국어 | T() + _isKorean 적용 | 2026-03-23 |
| 2B-010 | whistle-app | 환율 USD/KRW 고정 | if(_isKorean) 조건부 렌더링 | 2026-03-23 |
| 2B-011 | whistle-app | 제품등록 한글필수 | name_en필수/name_ko선택 분기 | 2026-03-23 |
| 2B-012 | whistle-app | 가격 원화고정 | 한국=₩KRW, 글로벌=$USD 분기 | 2026-03-23 |
| 2B-013 | whistle-app | AI분석 한국어 예시 | 쿠팡→Amazon, 네이버→Alibaba, HWP 미표시 | 2026-03-23 |
| 2B-014 | whistle-app | 구독페이지 전체 한국어 | T() + _isKorean 적용 | 2026-03-23 |
| 2B-016 | whistle-app | 정부바우처 글로벌 노출 | _ko 조건부 숨김 | 2026-03-23 |
| 2B-017 | whistle-app | 알리바바 서비스 글로벌 노출 | _isKorean 가드 전체 감싸기 | 2026-03-23 |
| 2B-018 | whistle-app | 상품URL 네이버 | 글로벌 placeholder 분기 | 2026-03-23 |
| 2B-019 | whistle-app | 바우처 체크박스 글로벌 노출 | L2121 _isKorean 조건부 | 2026-03-23 |
| 1-001 | whistle-landing | 모바일 CTA 줄바꿈 | whiteSpace:nowrap | 2026-03-23 |
| 1-003 | whistle-app | 이메일인증 불일치 | auto-confirm → loadUser() 직행 | 2026-03-23 |
| 1-004 | whistle-app | 다음버튼 뷰포트밖 | position:sticky;bottom:0 | 2026-03-23 |
| 1-005 | whistle-app | .catch 콘솔에러 | .then().catch() 체인 연결 | 2026-03-23 |
| 2-001 | buyer-app | 이스케이프 문자 노출 | 이중이스케이프 수정 + 쌍따옴표 | 2026-03-23 |
| 2-002 | buyer-app | 가입 시 국가 미전달 | user_metadata country backfill | 2026-03-23 |
| 2-003 | buyer-app | Product Search 검색불가 | S/sb 전역 정상 접근 | 2026-03-23 |
| 2-006 | buyer-app | 온보딩 Skip 리다이렉트 | page→dashboard 변경 | 2026-03-23 |
| 2-008 | buyer-landing | JP 기능카드 영어 | 13개 언어 214키 번역 완성 (ja 포함) | 2026-03-23 |
| 2-010 | buyer-landing | DE 쿠키배너 영어 | cookie_text 등 13개 언어 번역 완성 | 2026-03-23 |
| 2-011 | buyer-landing | CTA 부제목 하드코딩 | footer_tagline _() 번역함수 적용 | 2026-03-23 |
| 2-014 | buyer-landing | AR 카테고리 태그 영어 | hero_cat_* 13개 언어 번역 완성 | 2026-03-23 |
| 2-015 | buyer-landing | AR 기능카드 영어 | ai_fta_title 등 13개 언어 번역 완성 | 2026-03-23 |
| 2-016 | buyer-landing | AR 푸터 링크 영어 | footer_* 13개 언어 번역 완성 | 2026-03-23 |
| 2-017 | buyer-app | UAE 국가목록 누락 | 이미 AE(UAE) 존재 확인 — QA 오탐 | 2026-03-23 |
| 2-019 | buyer-app | 검색결과 한국어 | name_en\|\|name_ko 우선순위 이미 적용 (데이터 이슈) | 2026-03-23 |

## 보류이슈 (5건)
| # | 내용 | 보류 이유 |
|---|------|-----------|
| 2B-015 | Stripe 결제창 기본통화 KRW | Edge Function 통화 로직 = Stripe 금지구역 |
| 1-002 | 캐러셀 콘텐츠 미표시 | whistle-landing.html에 해당 섹션 자체 없음, QA 오탐 가능 |
| 1-006 | VAT 10% 별도 표기 vs Stripe 미반영 | 세금/법적 이슈, 대표님 판단 필요 |
| 2-004 | 바이어 STEP5~7 테스트불가 | DB 테스트 데이터 시딩 정책 결정 필요 |
| 2-005 | 바이어 결제 테스트불가 | 바이어 Free 모델, 에스크로는 딜 필요 |
| 2-018 | buyer-app 전체 영어 고정 | 설계상 영어 기본 (_t 함수 en/ko 2언어 + _ML 기본 라벨). 전면 다국어화는 별도 작업 |

## 에스컬레이션(희웅님판단필요)
| # | 내용 | 이유 |
|---|------|------|
| 1-006 | VAT 10% 별도 표기 vs Stripe 미반영 | 세금계산서/부가세 처리 정합성 확인 필요. 법적 이슈 가능성 |
| 2B-015 | Stripe 결제창 기본통화 KRW | Edge Function 통화 로직 변경 필요, Stripe 금지구역 |
| 2-004 | DB 테스트 데이터 없어 바이어 STEP5~7 테스트 불가 | 테스트 데이터 시딩 정책 결정 필요 |
