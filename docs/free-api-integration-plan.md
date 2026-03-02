# 휘슬 AI — 무료 API 연동 계획 (2026-03-02)

> 45+ 무료 API 발굴 → 우선순위별 연동으로 AI 수출분석 리포트 세계 최고 수준 달성

---

## Phase 1: AI 수출 분석 리포트 핵심 데이터 (즉시 연동)

### 1-1. 관세청 HS부호 데이터 (실제 HS코드 DB)
- URL: https://www.data.go.kr/data/15049722/fileData.do
- 무료: 파일 다운로드 무제한
- 데이터: 전체 HS부호 + 한글/영문 품목명 + 수입/수출 성질코드
- 활용: HS코드 자동분류 엔진의 기초 데이터

### 1-2. 관세청 품목별/국가별 수출입실적 API
- URL: https://www.data.go.kr/data/15100475/openapi.do
- 무료: 10,000호출/일
- 데이터: 한국 수출입실적 (HS 2/4/6/10단위), 국가별, 월별
- 활용: "이 제품이 한국에서 어디로 얼마나 수출되고 있는가" 실데이터

### 1-3. UN Comtrade API
- URL: https://comtradedeveloper.un.org/
- 무료: 500호출/일 (무료 API Key 등록)
- 데이터: 200+ 국가 수출입 통계, HS코드별 무역량/금액
- 활용: 글로벌 수요/공급 동향, 타겟 국가별 수입 규모

### 1-4. World Bank WITS API
- URL: https://wits.worldbank.org/witsapiintro.aspx
- 무료: 완전 무료, 인증 불필요
- 데이터: 관세율 + 비관세장벽 + 무역 경쟁력 지표
- 활용: FTA/관세 시뮬레이터 핵심 데이터

### 1-5. WTO API
- URL: https://apiportal.wto.org/
- 무료: 무료 등록 후 API Key
- 데이터: 양허/실행/특혜관세, 170+ 경제 공식 데이터
- 활용: FTA 시뮬레이터에 WTO 공식 데이터 활용

### 1-6. World Bank Indicators API
- URL: https://data.worldbank.org/
- 무료: 완전 무료, 인증 불필요
- 데이터: 29,000+ 지표, GDP/인구/인플레이션/교역량
- 활용: 타겟 국가 경제 규모/성장률/구매력 분석

### 1-7. REST Countries API
- URL: https://restcountries.com/
- 무료: 완전 무료, 무제한
- 데이터: 국가 기본정보 (수도, 인구, 통화, 언어, 시간대)
- 활용: 국가 프로필 자동 생성

---

## Phase 2: 수출 서류 + 비용 시뮬레이터 강화

### 2-1. 한국수출입은행 환율 API
- URL: https://www.data.go.kr/data/3068846/openapi.do
- 무료: 1,000호출/일
- 데이터: 실시간 환율 (매매기준율, 송금 매도/매수율)
- 활용: PI/CI 자동 환율 적용, 비용/마진 시뮬레이터

### 2-2. Frankfurter API (환율 백업)
- URL: https://frankfurter.dev/
- 무료: 완전 무료, 인증 불필요, 무제한
- 데이터: ECB 기준 환율

### 2-3. Freightos Shipping Calculator API
- URL: https://ship.freightos.com/api/shippingCalculator
- 무료: API Key 불필요 (가격 범위)
- 데이터: 해상/항공 운임 가격 범위 추정치
- 활용: "이 물량을 미국으로 보내면 운임이 얼마?"

### 2-4. 관세청 화물통관진행정보 API
- URL: https://www.data.go.kr/data/15126268/openapi.do
- 무료: UNI-PASS 회원 필요
- 데이터: 화물 통관 진행 상태 실시간
- 활용: 출하 후 통관 상태 자동 추적

---

## Phase 3: 바이어 발굴 + 시장 인텔리전스

### 3-1. ImportYeti (미국 수입 데이터)
- URL: https://www.importyeti.com/ | API: https://data.importyeti.com/
- 무료: 웹 검색 무료, API BETA
- 데이터: 70M+ 미국 세관 해상 선적 기록
- 활용: "이 HS코드의 미국 수입자 TOP 100"

### 3-2. OpenCorporates API
- URL: https://api.opencorporates.com/
- 무료: 오픈데이터 프로젝트에서 완전 무료
- 데이터: 200M+ 글로벌 기업 정보
- 활용: 바이어 기업 실체 검증

### 3-3. KOTRA 국가정보 API
- URL: https://www.data.go.kr/data/15034830/openapi.do
- 무료: data.go.kr 표준
- 데이터: 국가별 해외시장 분석, 비즈니스 환경
- 활용: AI 리포트 "타겟 국가 비즈니스 환경" 섹션

### 3-4. KOTRA 무역사기사례 API
- URL: https://www.data.go.kr/data/15034754/openapi.do
- 무료
- 데이터: 해외 무역사기 유형별 사례
- 활용: 바이어 거래 리스크 경고 시스템

### 3-5. Google Trends API
- URL: https://developers.google.com/search/blog/2025/07/trends-api
- 무료: 2025년 7월 공식 출시
- 데이터: 글로벌 검색 트렌드
- 활용: 제품 카테고리 글로벌 수요 트렌드

### 3-6. 네이버 데이터랩 API
- URL: https://developers.naver.com
- 무료: 25,000호출/일
- 데이터: 네이버 검색어 트렌드 + 쇼핑인사이트
- 활용: 한국 내수 트렌드와 수출 수요 상관관계

---

## Phase 4: 규제 + 인증 + 정부지원

### 4-1. openFDA API
- URL: https://open.fda.gov/apis/
- 무료: 완전 무료 (API Key 등록 시 240요청/분)
- 데이터: 의약품/의료기기/식품 규제 정보
- 활용: "이 제품이 FDA 등록이 필요한지" 자동 판단

### 4-2. 해외인증정보시스템 (CertInfo)
- URL: https://www.certinfo.kr/
- 무료: 웹 조회/파일 다운로드
- 데이터: 국가별 해외 인증 (CE, UL, FDA, CCC 등 570+ 인증)
- 활용: "EU 수출시 어떤 인증이 필요한가" 자동 안내

### 4-3. 기업마당(BizInfo) 정부지원사업 API
- URL: https://www.bizinfo.go.kr/
- 무료
- 데이터: 정부 부처/지자체 지원사업 공고
- 활용: "당신 기업이 신청 가능한 수출 지원사업 3건" 추천

### 4-4. 중소벤처24 Open API
- URL: https://www.smes.go.kr/main/dbCnrs
- 무료: 인증키 신청 필요
- 데이터: 벤처인증, 이노비즈 등 기업 인증 정보
- 활용: "벤처기업 인증 보유" 배지 자동 부여

### 4-5. OPENDART (금융감독원)
- URL: https://opendart.fss.or.kr/
- 무료: 완전 무료
- 데이터: 한국 상장사 재무제표, 기업개황
- 활용: 제조사 기업 정보 자동 조회/검증

### 4-6. 한국은행 ECOS API
- URL: https://ecos.bok.or.kr/api/
- 무료
- 데이터: 경상수지, 무역수지, 환율 등 한국 경제 전반
- 활용: 수출 매크로 환경 분석

---

## Phase 5: 물류/추적

### 5-1. Ship24 Tracking API
- URL: https://www.ship24.com/tracking-api
- 무료: 10건 무료
- 데이터: 1,500+ 택배사 실시간 배송 추적
- 활용: 딜룸 출하 후 배송 추적

### 5-2. 관세청 수출이행내역 API
- URL: https://www.data.go.kr/data/15126269/openapi.do
- 무료: UNI-PASS 회원 필요
- 데이터: 수출 신고 이행 내역
- 활용: 수출 서류 자동 매칭/검증

---

## 연동 우선순위 (Claude 즉시 작업 가능)

| 순번 | API | 난이도 | 소요시간 | 임팩트 |
|------|-----|--------|---------|--------|
| 1 | REST Countries | 매우 낮음 | 30분 | 국가 UI |
| 2 | 관세청 HS부호 파일 | 낮음 | 2시간 | HS코드 혁신 |
| 3 | 한국수출입은행 환율 | 낮음 | 1시간 | 서류 정확성 |
| 4 | 관세청 수출입실적 | 낮음 | 2시간 | 리포트 실데이터 |
| 5 | World Bank Indicators | 낮음 | 1시간 | 국가 경제분석 |
| 6 | UN Comtrade | 중간 | 3시간 | 글로벌 무역 |
| 7 | World Bank WITS | 중간 | 3시간 | FTA 시뮬레이터 |
| 8 | openFDA | 낮음 | 1시간 | 미국 규제 |
| 9 | BizInfo API | 낮음 | 1시간 | 지원사업 매칭 |
| 10 | ImportYeti | 중간 | 2시간 | 바이어 발굴 |
