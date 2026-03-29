# S10-인텔리전스: 글로벌 물류 디지털화 기술 트렌드 리서치 (2025-2026)

> 작성일: 2026-03-29 | 목적: 휘슬 AI 글로벌 물류 기능 로드맵 수립용

---

## 1. 전자 B/L (eBL)

### 1-1. DCSA eBL 표준 최신 진행상황

| 항목 | 상태 |
|------|------|
| **Bill of Lading 3.0** | 2025년 2월 최종 발표. 디지털 서명 시스템 + ICS2(EU 수입통제) 대응 190개 신규 데이터 필드 추가 |
| **상호운용성 달성** | 2025년 5월 HMM이 CargoX와 edoxOnline 간 최초 표준 기반 상호운용 eBL 거래 완료 |
| **3대 구성요소** | PINT API(플랫폼 간 표준 연동), 법적 프레임워크(다자간 합의), CTR(통제 추적 레지스트리) |
| **채택률** | 2025년 초 기준 약 5.7~11% 전자화. 2030년 100% 목표 |
| **2026 전망** | 6개 회원 선사 구현 완료, 전 회원사 기술 준비 완료 예정 |

### 1-2. MLETR 채택 국가 현황

| 구분 | 국가/지역 |
|------|-----------|
| **완전 채택 (10개국)** | 싱가포르, 영국, 프랑스(EU 최초, 2025), 바레인, 파라과이, 파푸아뉴기니, 벨리즈, 키리바시, 아부다비(UAE) 등 |
| **실질 정렬 (2개국)** | 미국, 독일 |
| **GDP 비중** | 채택 12개국 중 5개국(싱가포르, 미국, 독일, 영국, 프랑스)이 세계 GDP 37% 차지 |
| **준비 중** | 일본(2026 회계연도 시행 예정), 중국, 태국, 모로코, 콜롬비아 |
| **한국** | 아직 공식 채택 안 됨. APEC 차원 논의 참여 중 |

### 1-3. 주요 선사별 eBL 지원 상태

| 선사 | 상태 | 비고 |
|------|------|------|
| **Maersk** | 적극 추진 | DCSA 회원, eBL 발행 가능 |
| **MSC** | 적극 추진 | 자체 디지털 솔루션 + DCSA 표준 |
| **CMA CGM** | 적극 추진 | DCSA 회원 |
| **Hapag-Lloyd** | 적극 추진 | DCSA 회원 |
| **HMM** | 선도적 | 2025년 5월 최초 상호운용 eBL 거래 완료 (CargoX-edoxOnline 간) |
| **Evergreen** | 추진 중 | DCSA 회원, 2030 목표 |
| **COSCO** | 미참여 | DCSA 미가입. 10대 선사 중 유일한 공백 |
| **ONE** | 추진 중 | DCSA 회원 |
| **ZIM** | 추진 중 | DCSA 회원 |

### 1-4. eBL 플랫폼 비교

| 플랫폼 | 기술 기반 | 가격 모델 | IG 승인 | 특징 |
|--------|-----------|-----------|---------|------|
| **CargoX** | 블록체인 | 발행자만 과금, 수신자 무료 | O | DCSA 상호운용 참여. 이집트 수입 필수 |
| **Bolero** | EDI/중앙집중 | 구독형 | O | Galileo 플랫폼 (2020~). 법적 Rulebook + Title Registry |
| **WAVE BL** | 블록체인 | 수출자/수입자 무료 | O | 선사 과금 모델 |
| **EssDOCS** | 웹 중앙집중 | 구독형 | O | B/L 외 다양한 무역서류 관리 (웨이빌, 인보이스 등) |
| **edoxOnline** | 웹 기반 | 선사 무료 | O | DCSA 상호운용 참여 |
| **TradeLens** | 블록체인 | - | - | 2022년 종료 (Maersk+IBM) |

### 1-5. 한국 해운 업계 eBL 도입 현황

- **시범사업 진행 중**: 포스코인터내셔널 + 포스코플로우 + 6개 국적선사 대상
- **발급 실적**: 약 1,600건 이상 전자선하증권 발급
- **다음 단계**: 은행권 연계 신용장(L/C) 기반 eBL 발행으로 확대 준비
- **과제**: 벌크 선사 적용률 매우 낮음, 실무 활용 빈도 아직 저조
- **법적 기반**: MLETR 공식 채택 미완료 상태

### 휘슬 AI 적용 방안

| 우선순위 | 기능 | 설명 |
|----------|------|------|
| **3개월** | eBL 상태 조회 연동 | DCSA 표준 기반 eBL 상태 추적 (CargoX/edoxOnline API) |
| **6개월** | eBL 발행 지원 | 딜룸 내 eBL 발행 워크플로우 (CargoX API 연동) |
| **장기** | 은행 연동 | L/C 기반 eBL 처리 자동화 |

---

## 2. 디지털 포워딩 API

### 2-1. Flexport

| 항목 | 내용 |
|------|------|
| **상태** | 가용 (정식 API) |
| **API 스펙** | REST API. 견적, 부킹, 추적, 서류 관리, Commercial Invoice 등 |
| **문서** | developers.flexport.com, apidocs.flexport.com |
| **가격** | 비공개 (영업팀 문의 필요). 대기업 타겟 |
| **한국 지원** | 한국 사무소 있음. 한국 캐리어 직접 지원 미확인 |
| **연동 난이도** | 보통~어려움 (엔터프라이즈급) |
| **비고** | Shopify Logistics/Deliverr 인수 후 풀필먼트 통합 강화 |

### 2-2. Freightos

| 항목 | 내용 |
|------|------|
| **상태** | 가용 (정식 API) |
| **API 스펙** | 운임 견적, 부킹, 추적 |
| **문서** | developers.freightos.com |
| **WebCargo** | 항공 화물 디지털 견적 플랫폼. API 연동 가능 |
| **2025 로드맵** | 해상 온라인 부킹 추가 예정 |
| **가격** | 비공개 (거래량 기반) |
| **한국 지원** | 글로벌 서비스이나 한국 캐리어 직접 연동 미확인 |
| **연동 난이도** | 보통 |

### 2-3. Shippo

| 항목 | 내용 |
|------|------|
| **상태** | 가용 (정식 API) |
| **API 스펙** | 40+ 캐리어 통합. 라벨 생성, 운임 비교, 추적 |
| **가격** | API 무료 (30 라벨/월) → Premier 커스텀 가격 |
| **라벨당** | $0.05/라벨 |
| **Shopify 인수** | 인수 사실 확인 안 됨 (독립 운영 중) |
| **한국 캐리어** | 미지원 (USPS, UPS, FedEx, DHL 중심) |
| **연동 난이도** | 쉬움 |
| **비고** | 주로 미국 이커머스 소포 배송 특화 |

### 2-4. EasyPost

| 항목 | 내용 |
|------|------|
| **상태** | 가용 (정식 API) |
| **API 스펙** | 100+ 캐리어. 라벨, 운임, 추적, 보험, 반품 |
| **가격** | Starter 무료 (500 API 콜) → Growth $200/월 (3,000 콜) → BYOCA $20/월+라벨당 |
| **한국 캐리어** | CJ대한통운, 한진, 우체국 직접 지원 없음. DHL/FedEx/UPS 통해 한국 배송 가능 |
| **연동 난이도** | 쉬움 (문서 우수) |
| **비고** | 글로벌 무역보다 이커머스 소포에 특화 |

### 2-5. GoFreight

| 항목 | 내용 |
|------|------|
| **상태** | 공개 API 없음 |
| **플랫폼** | 클라우드 기반 포워딩 TMS. 125+ 선사/항공사 EDI 연동 |
| **가격** | 유저당 과금. $3,000~$50,000/년 |
| **한국 지원** | 글로벌 포워더 대상이나 한국 로컬 지원 미확인 |
| **연동 난이도** | N/A (API 미제공) |
| **비고** | TMS 솔루션. 외부 API 연동보다 자체 플랫폼 사용 유도 |

### 한국 캐리어 지원 현황 종합

| 캐리어 | EasyPost | Shippo | Flexport | Freightos |
|--------|----------|--------|----------|-----------|
| CJ대한통운 | X | X | 미확인 | 미확인 |
| 한진택배 | X | X | 미확인 | 미확인 |
| 우체국(EMS) | X | X | 미확인 | 미확인 |
| 한국 캐리어 연동 대안 | **AfterShip, Ship&co, Karrio(오픈소스)** 등 서드파티 활용 |

### 휘슬 AI 적용 방안

| 우선순위 | 기능 | 설명 |
|----------|------|------|
| **지금당장** | EasyPost 연동 | 무료 티어로 국제 소포 운임 비교/추적 시작. DHL/FedEx/UPS |
| **3개월** | Freightos 견적 API | 해상/항공 운임 실시간 견적 연동 |
| **6개월** | 한국 캐리어 연동 | AfterShip 또는 자체 크롤링으로 CJ/한진/EMS 추적 |
| **장기** | Flexport 파트너십 | 엔터프라이즈 고객 대상 풀 포워딩 연동 |

---

## 3. 해외 풀필먼트 서비스

### 3-1. ShipBob

| 항목 | 내용 |
|------|------|
| **상태** | 가용 (정식 서비스 + API) |
| **글로벌 창고** | 50+ 거점: 미국(다수), 영국, EU(독일, 프랑스 등), 캐나다, 호주 |
| **한국 창고** | 없음. 한국으로 배송은 가능하나 한국 내 풀필먼트 없음 |
| **API** | developer.shipbob.com. 주문, 재고, 반품, 풀필먼트센터 조회 |
| **가격** | 거래량 기반 커스텀. 픽/팩비 + 보관비 + 배송비 |
| **연동 난이도** | 보통 (REST API, 문서 양호) |
| **한국 기업 이용** | 미국/EU 시장 진출 한국 브랜드에 적합 |

### 3-2. Deliverr (Shopify Fulfillment)

| 항목 | 내용 |
|------|------|
| **현재 상태** | Flexport로 이관됨 (2023) |
| **경위** | Shopify가 2022년 $2.1B에 Deliverr 인수 → 2023년 물류 사업을 Flexport에 매각 |
| **2026 현황** | Shopify = 소프트웨어만 (라벨/운임할인). 물리적 풀필먼트는 Flexport가 담당 |
| **Shop Promise** | Flexport가 2일/익일 배송 보장 서비스 운영 |
| **한국 연관성** | 낮음. 미국 시장 특화 |

### 3-3. CJ Logistics Global

| 항목 | 내용 |
|------|------|
| **상태** | 가용 |
| **글로벌 네트워크** | 32개국 137개 도시, 400+ 한국 창고, 40개 해외 센터 |
| **2025 확장** | 인천 해상 익스프레스 센터 확장 + 사우디 이커머스 허브 신설 (Q3 2025) |
| **API** | 자체 공개 API 미제공. AfterShip/ClickPost 등 서드파티 통해 추적 연동 가능 |
| **GFC** | 글로벌 풀필먼트 센터 — 재고관리~포장~국제배송 원스톱 |
| **한국 기업 적합도** | 최고. 한국 기반 + 글로벌 거점 |

### 3-4. Amazon MCF (Multi-Channel Fulfillment)

| 항목 | 내용 |
|------|------|
| **상태** | 가용 (정식 서비스 + API) |
| **API** | Amazon SP-API (Selling Partner API) |
| **가격 (2025)** | 사이즈/무게별. 2025년 평균 3.5% 인상. 보관비 $0.78~$2.40/cubic ft |
| **2026 특가** | Preferred Pricing: 15% 할인 + $1/unit FBA 크레딧 (상한 $50,000) |
| **커버리지** | 미국, EU, 영국, 일본, 호주 등 아마존 FBA 거점 |
| **연동 난이도** | 보통 (SP-API 복잡하나 문서 풍부) |
| **한국 기업 이용** | 아마존 셀러 필수. 비아마존 채널 주문도 MCF로 처리 가능 |

### 한국 기업 해외 풀필먼트 비교

| 서비스 | 미국 | EU | 일본 | 동남아 | 한국 거점 | API | 한국 기업 적합도 |
|--------|------|-----|------|--------|-----------|-----|-----------------|
| ShipBob | O | O | X | X | X | O | 중 (미국/EU 진출) |
| Amazon MCF | O | O | O | X | X | O | 중~상 (아마존 셀러) |
| CJ Logistics | O | O | O | O | O | 제한적 | 최상 |
| Flexport | O | O | O | O | X | O | 중 (대기업) |

### 휘슬 AI 적용 방안

| 우선순위 | 기능 | 설명 |
|----------|------|------|
| **3개월** | CJ Logistics GFC 정보 제공 | 국가별 풀필먼트 거점/비용 비교 가이드 |
| **6개월** | ShipBob API 연동 | 미국/EU 풀필먼트 자동 견적 |
| **6개월** | Amazon MCF 연동 | 아마존 셀러 대상 MCF 주문 연동 |
| **장기** | 풀필먼트 통합 대시보드 | 복수 3PL 재고/주문 통합 관리 |

---

## 4. 라스트마일 배송 국가별

### 4-1. DHL eCommerce Solutions

| 항목 | 내용 |
|------|------|
| **상태** | 가용 (정식 API) |
| **API** | DHL eCommerce Americas API v4. 라벨 생성, 관세/세금 계산, 추적, 반품 |
| **개발자 포털** | developer.dhl.com (전 사업부 통합) |
| **커버리지** | 220+ 국가. USPS 퍼스트마일 → DHL 인터네셔널 → 현지 파트너 라스트마일 |
| **가격** | 거래량 기반 (영업 문의) |
| **추적 API** | MyDHL API로 통합 추적 가능 |
| **연동 난이도** | 쉬움~보통 (EasyPost 통해 간접 연동도 가능) |

### 4-2. SF Express (순풍)

| 항목 | 내용 |
|------|------|
| **상태** | 가용 |
| **커버리지** | 62개국, 225개 국가/지역 이파셀. 아시아 최대 통합물류사 |
| **아시아 허브** | 싱가포르(동남아 관문), 서울(한국/동북아), 도쿄(일본) |
| **API** | EasyPost, AfterShip, ClickPost 등 서드파티로 연동 |
| **한국 지원** | O (서울 허브 운영) |
| **가격** | 거래량 기반 |
| **연동 난이도** | 보통 (서드파티 API 활용 시 쉬움) |

### 4-3. Yamato (야마토운수)

| 항목 | 내용 |
|------|------|
| **상태** | 가용 (일본 국내 중심) |
| **커버리지** | 일본 전역 익일배송 (TA-Q-BIN). 국제: 미국/캐나다-일본 |
| **API** | 직접 API 제한적. Ship&co API, ShipEngine, AfterShip 통해 연동 |
| **Ship&co** | 일본 캐리어(야마토, 사가와, 일본우정) + 국제 캐리어 통합 API |
| **한국 관련** | 일본향 한국 수출에 활용 가능 |
| **연동 난이도** | 보통 (Ship&co 경유 시 쉬움) |

### 4-4. Aramex

| 항목 | 내용 |
|------|------|
| **상태** | 가용 (정식 API) |
| **커버리지** | 70+ 국가, 600+ 도시. 중동/아프리카/남아시아 특화 |
| **API** | 운임 계산, 라벨 생성, 실시간 추적. aramex.com/developers |
| **가격** | 거래량 기반 |
| **추적 API** | 실시간 상태 업데이트 |
| **연동 난이도** | 보통 (ShipWise 등 플랫폼 연동도 가능) |

### 국가/지역별 라스트마일 매핑

| 지역 | 추천 서비스 | 대안 |
|------|------------|------|
| 미국/유럽 | DHL eCommerce, USPS, Royal Mail | EasyPost 통합 |
| 일본 | 야마토(TA-Q-BIN), 사가와 | Ship&co API |
| 중국 | SF Express | 차이냐오(알리바바) |
| 동남아 | SF Express, DHL | Ninja Van, J&T Express |
| 중동/아프리카 | Aramex | DHL |
| 한국 | CJ대한통운, 한진, 우체국 | 로젠, 롯데글로벌로지스 |

### 휘슬 AI 적용 방안

| 우선순위 | 기능 | 설명 |
|----------|------|------|
| **지금당장** | 국가별 배송 서비스 매핑 제공 | AI 분석 보고서에 타겟 국가별 추천 캐리어 포함 |
| **3개월** | DHL eCommerce API 연동 | 가장 넓은 글로벌 커버리지로 시작 |
| **6개월** | 지역별 캐리어 API 연동 | 일본(Ship&co), 중동(Aramex), 아시아(SF Express) |
| **장기** | 통합 라스트마일 최적화 | 비용/속도 기반 자동 캐리어 선택 |

---

## 5. 실시간 화물 추적 API

### 5-1. project44

| 항목 | 내용 |
|------|------|
| **상태** | 가용 (엔터프라이즈) |
| **기능** | 전 운송 모드 실시간 추적, 예측 ETA, 예외 관리, SKU 단위 추적 |
| **데이터 소스** | 캐리어 API, EDI, 텔레매틱스, AIS 신호 |
| **API** | REST API + 플랫파일 연동 |
| **가격** | $500~$6,250+/월 (거래량/모드별 커스텀). 연간 계약 |
| **연동 난이도** | 어려움 (엔터프라이즈급) |

### 5-2. FourKites

| 항목 | 내용 |
|------|------|
| **상태** | 가용 (엔터프라이즈) |
| **기능** | 멀티모드 추적 (도로, 철도, 해상, 항공), Dynamic ETA, 야드 관리 |
| **일일 추적량** | 250만+ 글로벌 화물 |
| **API** | 추적, 물류 인사이트 API |
| **가격** | $100~$500+/월 시작 (커스텀) |
| **연동 난이도** | 어려움 (엔터프라이즈급) |

### 5-3. MarineTraffic / VesselFinder (선박 추적)

| 항목 | MarineTraffic | VesselFinder |
|------|---------------|--------------|
| **상태** | 가용 (엔터프라이즈 전환) | 가용 (셀프서비스) |
| **API** | AIS 기반 선박 위치/항해 데이터 | AIS 위치 API (지상+위성) |
| **가격** | 엔터프라이즈 전용 (2025.1 크레딧제 폐지) | 월 80~330 EUR+ (크레딧 기반) |
| **크레딧** | N/A | 지상 AIS 1크레딧, 위성 AIS 10크레딧/조회 |
| **연동 난이도** | 보통 | 쉬움 |
| **대안** | Datalastic (80 EUR/월~), Data Docked | - |

### 5-4. FlightAware (항공 화물 추적)

| 항목 | 내용 |
|------|------|
| **상태** | 가용 (AeroAPI) |
| **기능** | 항공편 실시간 추적, 도착/출발 알림, 과거 데이터 |
| **API** | AeroAPI v3. REST 기반 |
| **가격** | $100/월 (상업용). 개인/학술 무료 |
| **한계** | 항공편 추적 특화. 화물 특화 기능은 제한적 |
| **연동 난이도** | 쉬움 |

### 5-5. 무료/저가 대안

| 서비스 | 가격 | 기능 | 적합 용도 |
|--------|------|------|-----------|
| **Vizion** | 무료 15컨테이너/월, 이후 $5/컨테이너 | 컨테이너 추적 전문 | 소량 해상 화물 |
| **Karrio** (오픈소스) | 무료 | 라벨, 추적, 캐리어 관리 | 자체 호스팅 원하는 경우 |
| **KeyDelivery** | 무료 | 범용 택배 추적 API | 소포 추적 |
| **ShipEngine** | $0.01/추적 | 추적 + 라벨 + 주소검증 | 이커머스 |
| **AfterShip** | 무료 50건/월 | 1,200+ 캐리어 추적 | 범용 추적 |

### 휘슬 AI 적용 방안

| 우선순위 | 기능 | 설명 |
|----------|------|------|
| **지금당장** | Vizion 무료 티어 | 컨테이너 추적 15건/월로 MVP 구현 |
| **지금당장** | VesselFinder API | 선박 위치 추적 (80 EUR/월~) |
| **3개월** | AfterShip 통합 추적 | 1,200+ 캐리어 범용 추적 |
| **6개월** | FlightAware 연동 | 항공 화물 추적 추가 |
| **장기** | project44/FourKites | 엔터프라이즈 고객 대상 풀 가시성 |

---

## 6. 탄소중립 물류

### 6-1. EU CBAM 2026 시행 현황

| 항목 | 상태 |
|------|------|
| **시행일** | 2026년 1월 1일 정식 발효 (전환기간 2023-2025 종료) |
| **대상 품목** | 시멘트, 철강, 알루미늄, 비료, 전기, 수소 |
| **인증 현황** | 12,000+ 사업자 신청, 4,100+ 인증 완료 (2026.1.7 기준) |
| **인증서 판매** | 2027년 2월 1일 시작 |
| **첫 납부** | 2027년 9월 30일까지 (2026년 수입분) |
| **시스템** | CBAM Registry + 국가별 세관 시스템 + EU 단일창구 연동 완료 |
| **한국 수출 영향** | 철강/알루미늄 수출 기업 직접 영향. 탄소 배출 데이터 제출 필수 |

### 6-2. 선사별 탄소 계산기

| 선사/서비스 | 기능 | 표준 |
|-------------|------|------|
| **Maersk ECO Delivery** | 최대 85% 탄소 감축 (바이오연료). 온라인 즉시 예약 가능 | GLEC Framework |
| **Maersk Emissions Studio** | EcoTransIT World 기반. ISO 14083:2023 준수. 맞춤 보고서 | GLEC + ISO 14083 |
| **MSC Carbon Calculator** | 항해별 탄소 배출 계산 | GLEC Framework |
| **CMA CGM** | 탄소 오프셋 프로그램 운영 | GLEC Framework |

### 6-3. GLEC Framework

- **발행**: Smart Freight Centre
- **버전**: GLEC Framework v3 (ISO 14083:2023과 정렬)
- **적용**: 도로, 철도, 해상, 항공, 내륙수운 전 모드
- **계산 방식**: 거리 x 화물 중량 x 운송 모드별 에너지 계수 → 배출량
- **인증**: EcoTransIT World 등 소프트웨어가 SFC 인증 취득

### 6-4. 탄소 오프셋 API/서비스

| 서비스 | 기능 | 가격 | 연동 난이도 |
|--------|------|------|------------|
| **ClimateTrade** | 탄소 발자국 계산 + 검증 크레딧 오프셋 | API 기반 (커스텀) | 보통 |
| **Carbonmark** | 검증된 탄소 크레딧 즉시 구매 API | 크레딧 단가별 | 쉬움 |
| **Olive Gaea** | 배송별 탄소중립 옵션 API | 건당 과금 | 쉬움 |
| **SeaRates CO2 API** | 운송 경로 기반 배출량 계산 + 오프셋 | 거래량 기반 | 쉬움 |
| **emissions.dev** | 무료 탄소 배출 계산기 API (화물, 여행 등) | 무료 | 쉬움 |
| **Flexport Carbon Calculator** | 물류 배출량 평가 API | Flexport 고객 대상 | 보통 |

### 휘슬 AI 적용 방안

| 우선순위 | 기능 | 설명 |
|----------|------|------|
| **지금당장** | CBAM 정보 제공 | AI 분석 보고서에 EU향 철강/알루미늄 CBAM 영향 포함 |
| **3개월** | emissions.dev 연동 | 무료 API로 운송별 탄소 배출량 자동 계산 |
| **6개월** | 탄소 오프셋 옵션 | ClimateTrade/Carbonmark API로 오프셋 구매 기능 |
| **장기** | CBAM 신고 자동화 | EU 수출 기업 대상 CBAM 데이터 수집/보고 자동화 |

---

## 종합 우선순위 로드맵

### 지금당장 (0-1개월)

| # | 기능 | API/서비스 | 비용 | 난이도 |
|---|------|-----------|------|--------|
| 1 | 컨테이너 추적 MVP | Vizion (15건 무료) | $0 | 쉬움 |
| 2 | 국가별 배송 서비스 매핑 | 자체 데이터 | $0 | 쉬움 |
| 3 | CBAM 정보 제공 | 자체 콘텐츠 | $0 | 쉬움 |
| 4 | 탄소 배출량 계산 | emissions.dev | $0 | 쉬움 |

### 3개월 내

| # | 기능 | API/서비스 | 비용 | 난이도 |
|---|------|-----------|------|--------|
| 5 | 국제 소포 운임 비교 | EasyPost | $0~200/월 | 쉬움 |
| 6 | eBL 상태 조회 | DCSA/CargoX | 거래량 기반 | 보통 |
| 7 | 범용 화물 추적 | AfterShip | $0~$99/월 | 쉬움 |
| 8 | DHL 글로벌 배송 | DHL eCommerce API | 거래량 기반 | 보통 |
| 9 | 해상/항공 운임 견적 | Freightos | 거래량 기반 | 보통 |

### 6개월 내

| # | 기능 | API/서비스 | 비용 | 난이도 |
|---|------|-----------|------|--------|
| 10 | eBL 발행 워크플로우 | CargoX | 건당 과금 | 보통 |
| 11 | 일본 라스트마일 | Ship&co + Yamato | $50+/월 | 보통 |
| 12 | 중동/아프리카 배송 | Aramex API | 거래량 기반 | 보통 |
| 13 | 해외 풀필먼트 견적 | ShipBob API | 커스텀 | 보통 |
| 14 | 항공 화물 추적 | FlightAware AeroAPI | $100/월 | 쉬움 |
| 15 | 탄소 오프셋 | ClimateTrade/Carbonmark | 건당 | 보통 |

### 장기 (6개월+)

| # | 기능 | API/서비스 | 비용 | 난이도 |
|---|------|-----------|------|--------|
| 16 | 풀 가시성 플랫폼 | project44/FourKites | $500+/월 | 어려움 |
| 17 | 은행 연동 eBL | DCSA 표준 | 커스텀 | 어려움 |
| 18 | CBAM 신고 자동화 | 자체 개발 | 개발비 | 어려움 |
| 19 | 통합 물류 최적화 | Flexport 파트너십 | 엔터프라이즈 | 어려움 |
| 20 | 알리바바 차이냐오 연동 | 차이냐오 API | 파트너십 | 어려움 |

---

## 핵심 인사이트

1. **eBL은 전환점에 있다**: DCSA 표준 확립 + MLETR 채택 확산 + HMM의 상호운용 성공으로 2026-2027이 임계점. 휘슬이 한국 수출 플랫폼으로서 eBL을 조기 지원하면 차별화 요소가 됨.

2. **무료 API로 MVP 가능**: Vizion(추적), emissions.dev(탄소), EasyPost(소포) 등 무료 티어만으로도 기본 물류 기능 구현 가능. 현금 제약 상황에서 최적.

3. **한국 캐리어 연동이 약점**: 글로벌 API들이 CJ대한통운/한진/우체국을 직접 지원하지 않음. AfterShip이나 자체 크롤링으로 해결 필요.

4. **CBAM은 긴급**: 2026년 1월 이미 발효. EU향 수출 기업은 탄소 데이터가 필수. 이것을 AI 분석 보고서에 포함하면 즉시 가치 제공.

5. **알리바바 차이냐오 = 전략적 기회**: 알리바바 미팅에서 차이냐오 물류 API 연동 논의하면 동남아/중동 라스트마일 일거에 해결 가능.

---

## Sources

### eBL / DCSA
- [DCSA eBL 상호운용 마일스톤](https://dcsa.org/newsroom/ebl-interoperability-milestone)
- [DCSA Bill of Lading 3.0 표준](https://dcsa.org/standards/bill-of-lading)
- [DCSA Booking/BL 표준 업데이트](https://smartmaritimenetwork.com/2025/02/21/dcsa-releases-updated-booking-and-ebl-data-exchange-standards/)
- [MSC eBL 디지털 솔루션](https://www.msc.com//solutions/digital-solutions/ebl)

### MLETR
- [MLETR 채택 국가 현황](https://www.astanservices.online/countries-adopting-the-mletr-model-law-for-electronic-bills-of-lading-timelines-and-updates)
- [MLETR G7 및 신흥국 현황 - TFG](https://www.tradefinanceglobal.com/posts/status-update-mletr-adoption-in-the-g7-and-emerging-markets/)
- [ICC Academy MLETR 개요](https://academy.iccwbo.org/digital-trade/article/mletr-an-overview-of-uncitrals-model-law-on-electronic-transferable-records/)
- [APEC MLETR 경제효과 분석](https://www.apec.org/publications/2025/02/a-path-to-paperless-trade--analysing-the-legal-gaps-and-economic-benefit-of-adopting-or-maintaining-a-legal-framework-that-takes-into-account-the-uncitral-model-law-on-electronic-transferable-records-(mletr))

### 디지털 포워딩 API
- [Flexport Developer Portal](https://developers.flexport.com/)
- [Freightos Developer Portal](https://developers.freightos.com/)
- [Freightos 2025 로드맵](https://theloadstar.com/the-2025-roadmap-for-freightos-ocean-apis-ai-growth-and-dynamic-pricing/)
- [Shippo API 가격](https://goshippo.com/pricing/api)
- [EasyPost 캐리어 목록](https://www.easypost.com/carriers/)
- [EasyPost 가격](https://www.easypost.com/pricing/)
- [GoFreight 소프트웨어](https://gofreight.com/)

### 해외 풀필먼트
- [ShipBob Developer API](https://developer.shipbob.com/concepts)
- [ShipBob 한국 서비스](https://www.shipbob.com/shipbob-locations/asia/south-korea/)
- [Flexport-Shopify Logistics 인수](https://www.flexport.com/blog/dave-clarks-note-to-flexport-were-acquiring-shopify-logistics/)
- [CJ Logistics 글로벌](https://www.cjlogistics.com/en/business)
- [Amazon MCF 가격](https://supplychain.amazon.com/pricing)

### 라스트마일 배송
- [DHL Developer Portal](https://developer.dhl.com/)
- [SF Express 국제배송](https://www.sf-international.com/us/en/product_service/International/economy_express/)
- [Ship&co API (일본 캐리어)](https://developer.shipandco.com/en/)
- [Aramex API](https://www.aramex.com/ae/en/developers-solution-center/aramex-apis)

### 화물 추적
- [project44 Movement Platform](https://bestopschainai.com/logistics-transportation/project44-movement-platform-overview-features)
- [project44/FourKites/Vizion 비용 비교](https://blogs.tradlinx.com/how-much-does-project44-fourkites-or-vizion-really-cost-what-lsps-need-to-know-before-paying-for-premium-visibility-tools/)
- [Vizion 컨테이너 추적 API](https://www.vizionapi.com/)
- [VesselFinder API](https://www.vesselfinder.com/vessel-positions-api)
- [FlightAware AeroAPI](https://www.flightaware.com/commercial/aeroapi)
- [Karrio 오픈소스](https://github.com/karrioapi/karrio)

### 탄소중립 물류
- [EU CBAM 정식 시행](https://taxation-customs.ec.europa.eu/news/cbam-successfully-entered-force-1-january-2026-2026-01-14_en)
- [Maersk ECO Delivery](https://www.maersk.com/transportation-services/eco-delivery/ocean)
- [Maersk Emissions Studio](https://www.maersk.com/digital-services/emissions-studio)
- [ClimateTrade 탄소 오프셋 API](https://climatetrade.com/api/)
- [emissions.dev 무료 탄소 API](https://emissions.dev/)
- [SeaRates CO2 API](https://www.searates.com/integrations/api-carbon-emissions-calculator)
