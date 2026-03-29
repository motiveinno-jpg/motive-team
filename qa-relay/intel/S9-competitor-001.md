# [S9-시장조사] 경쟁사 심층 분석 보고서
> 작성: 2026-03-29 | 기존 분석(2026-03-05) 대비 **새 인사이트만**

---

## 1. Flexport — 2026 Winter Release

### 신규 AI 에이전트 (2026.02 발표)

| AI 에이전트 | 기능 | 상세 |
|---|---|---|
| **Customs Compliance Agent** | 통관 서류 전수 감사 | 미국 통관 오류율 0.2% (업계 평균 10배 개선) |
| **Container Optimization Agent** | ML 기반 혼적 자동화 | 평균 **10% 운임 절감** |
| **AI Search** | 자연어 플랫폼 검색 | "중국발 LA행 이번주 선박?" 질의 가능 |
| **자동 관세 환급** | 과납 자동 탐지 + 환급 | 미국 drawback 자동화 |
| **Flexport Atlas** | 글로벌 무역 데이터 인프라 | 자율 무역(autonomous trade) 기반 |

### SMB 대응
- **Flow Direct**: LCL 전용, 1CBM부터, 최소 $75
- 중국→미국 전용. **한국 수출자 직접 지원 불분명**
- 가입→견적: 셀프 온보딩, 서류 80% 자동 프리필
- 단점: 기능 과다 — 소규모에 과한 면

### 휘슬에 없는 기능
- **컨테이너 혼적 최적화 알고리즘**
- **관세 과납 자동 환급 탐지**
- **자연어 AI Search**

출처: [Flexport Winter 2026](https://www.flexport.com/technology/product-release/winter-2026/), [TechCrunch](https://techcrunch.com/2025/02/24/flexport-releases-onslaught-of-ai-tools-in-a-move-inspired-by-founder-mode/)

---

## 2. Freightos — WebCargo 통합 이후

### 견적 비교 UX
- **입력**: 출발지, 도착지, 무게, 치수 (4개 필드)
- **출력**: 항공/해상/육상 door-to-door 올인 가격 즉시 비교

### 신기능

| 기능 | 상세 |
|---|---|
| **Volatility Index** | 항공화물 운임 변동성 지수 |
| **Freightos Baltic Index** | 해상 운임 실시간 추적 |
| **멀티모달 운임 관리** | 해상/항공/육상 통합 + Landed Cost |
| **Import Duty Calculator** | 관세 계산기 + HS코드 파인더 내장 |

### UX 단점
- 플랫폼 수수료 3%가 **결제 단계에서야 표시** — 가격 투명성 이슈

### 휘슬에 없는 기능
- **4필드 입력 → 즉시 멀티모달 운임 비교**
- **운임 변동성 지수/시장 트렌드**
- **Import Duty Calculator**

출처: [Freightos Marketplace](https://www.freightos.com/marketplace/), [WebCargo](https://www.webcargo.co/)

---

## 3. Zonos — 2026 대폭 진화

### 신규 핵심 기능

| 기능 | 상세 | 휘슬 유무 |
|---|---|---|
| **Zonos Vision** | AI 이미지 → HS코드+원산지+관세가치 자동 추출 | **없음** |
| **Zonos Greenlight** | AI 수출준비도 평가 (5개 컴플라이언스 체크) | **없음** |
| **Export HS Codes** | 수출용 HS코드 분류 (수입용과 구분) | **없음** |
| **Description IQ** | 상품설명 실시간 분석 → 누락정보 안내 | **없음** |
| **Bulk CSV Upload** | 대량 주문 업로드 + LC 계산 | **없음** |
| **3D Cartonization** (Beta) | 3D 박스 패킹 최적화 | **없음** |
| **Combine Orders** (Beta) | 동일 바이어 합배송 + 운임 재계산 | **없음** |

### HS코드 분류 정확도
- 기본 90%+ → **서브헤딩 오분류 30% 감소**
- 응답시간: 대부분 **100ms 이내** (400ms 단축)
- 미국 세관 CROSS 판례 **매일 자동 반영**

### Zonos Hello (무료)
- 20개 언어 자동 번역 + 통화 변환 + 관세 추정
- Magento, BigCommerce, XCART 플러그인

출처: [Zonos Classify](https://zonos.com/classify), [Zonos What's New](https://zonos.com/docs/account/whats-new)

---

## 4. Shippo — 2026 가격 확정

| 플랜 | 가격 | 라벨/월 | 핵심 |
|---|---|---|---|
| Starter | 무료 | 30건 | 자체 캐리어 $0.05/건 |
| Pro | $19~199/월 | 200~10K건 | AI 배송일 예측 |
| Premier | 커스텀 | 10K건+ | 전담 매니저 |

- **85+ 캐리어 연동**, B2B 수출 전용 기능은 없음 (이커머스 소포 중심)
- 국제배송: 세관서류 자동생성 지원

### 휘슬에 없는 기능
- **85+ 캐리어 실시간 운임 비교**
- **AI 배송일 예측**
- **자동 반품 라벨 생성**

출처: [Shippo Pricing](https://goshippo.com/pricing)

---

## 5. Alibaba Trade Assurance — 에스크로 상세

### 수수료
- 바이어: 무료
- Gold Supplier: **1~2% (최대 $100 캡)**
- Gold Supplier 연회비: $2,999~$5,999/년

### 에스크로 4단계
```
1. 주문 + 결제 → 에스크로 보관
2. 공급자 생산/출하
3. 바이어 수령 확인 → 자금 방출
4. 분쟁 시 → 분쟁 프로세스
```

### 분쟁 해결 프로세스

| 단계 | 기간 |
|------|------|
| 분쟁 제기 | 결제 완료 후 |
| 자체 협상 | 30일 |
| 수동 에스컬레이션 | 3일 무응답 |
| 자동 에스컬레이션 | 7일 무응답 |
| 알리바바 중재 | 양측 증거 기반 |
| 환급 | 3~10 영업일 |

### vs 휘슬 에스크로
- 휘슬: 14일 무응답 = 자동확인 → **더 빠른 정산**
- 알리바바: Gold Supplier 연회비 $3K~$6K → **진입장벽 높음**
- 휘슬 수수료 2.5% vs 알리바바 1~2% (캡 $100)

출처: [Alibaba TA Guide](https://seller.alibaba.com/blogs/2026/southeast-asia/b2b-trade/trade-assurance-complete-guide-alibaba-secure-payment)

---

## 6. 한국 경쟁사 업데이트

### 린다 (Rinda) — 가격 대폭 변경

| 구분 | 기존 (3/5) | **최신 (3/29)** |
|---|---|---|
| 가격 | 월 79.8만원 | **GROWTH $200/월, ALL-IN-ONE $1,000/월** |
| 무료체험 | 미확인 | **14일 무료 (500건/월)** |
| UX | - | 3개 화면 → 1개 홈 통합, 메뉴 5→3개 |

**핵심**: 가격 79.8만원 → $200(~27만원) 인하. 가격 갭 줄어짐. 여전히 바이어 발굴 전문.

### 트레이드잇 — 확장 중
- 고객수: **~200개 기업**
- 2026 계획: 동남아 2~3개국 테스트, 모바일 CRM 앱, AI 자동영업 고도화
- TaaS (Trade-as-a-Service) 모델

### 팀리부뜨 — 2.0 론칭
- **2.0 공식 론칭** (과기정통부 XaaS 선도 프로젝트)
- OCR + LLM 결합 무역서류 자동인식/생성
- **고코리아(GoKorea)와 MOU** 체결
- 국내 주요 선사, 제조사, 포워딩사 도입

### 수출바우처 2026 변경
- 예산 **1,502억원** (+226억, 역대 최대)
- **긴급지원 바우처 신설** (연 3회 모집, 최대 1.5억)
- 물류비 한도 6,000만원 (기존 3,000만원에서 확대)
- 해외인증 **선금 지원제도 신설**
- AI 맞춤형 바우처 설계 서비스 (하반기 예정)

---

## 7. 신규 경쟁사 (2025~2026)

### AI 관세 분류 시장 — 과열

| 회사 | 투자 | 핵심 | 가격 |
|---|---|---|---|
| **Trava** (YC W25) | 미공개 | AI 관세 감사, 72시간 내 첫 감사, Classification Copilot 파일럿 | 미공개 |
| **GAIA Dynamics** | $1.5M (Andrew Ng AI Fund) | HTS 30초 분류, Description IQ, 28개국 확장 | Free~$1,399/월 |
| **Quickcode** | $4.5M | 160+ 국가, 100% 정확도 주장, 관세 노출 사전 분석 | 미공개 |
| **iCustoms** (UK) | $2.2M | 통관 30분→90초, 24+ 국가, EU ICS2 연동 | £1,000+/월 |
| **Sphere** (a16z) | **$21M Series A** | AI 세금 → 관세 진출 (TRAM 엔진, 2026 하반기) | 미공개 |

### 위협도 평가
- **Sphere**: ⚠️ 높음 — a16z $21M, 세금→관세 자연 확장
- **GAIA**: 중간 — Andrew Ng, 28개국 빠른 확장
- **Quickcode**: 중간 — 160개국 데이터, 높은 정확도
- **Trava/iCustoms**: 낮음 — 수입 중심, 한국 미진출

---

## 종합: 휘슬에 없는 핵심 기능 우선순위

### 즉시 도입 검토 (API 파트너십)

| 순위 | 기능 | 참조 경쟁사 | 난이도 | 영향도 |
|---|---|---|---|---|
| 1 | **실시간 운임 견적 비교** | Freightos | 높음 | 극대 |
| 2 | **HS코드 자동 분류** (이미지/텍스트) | Zonos, GAIA | 중간 | 극대 |
| 3 | **수출준비도 AI 평가** | Zonos Greenlight | 중간 | 높음 |
| 4 | **관세/Landed Cost 계산기** | Zonos, Freightos | 중간 | 높음 |
| 5 | **대량 CSV 주문/분류** | Zonos | 낮음 | 중간 |

### 중기 (3~6개월)

| 순위 | 기능 | 참조 |
|---|---|---|
| 6 | 운임 변동성/시장 트렌드 | Freightos Baltic Index |
| 7 | 관세 과납 자동 환급 | Flexport, Trava |
| 8 | 무역서류 OCR 자동인식 | 팀리부뜨 |
| 9 | 컨테이너 혼적 최적화 | Flexport |
| 10 | 3D 박스 패킹 | Zonos |

### 경쟁 환경 핵심 변화

1. **AI 관세 분류 시장 과열** — 6개+ 스타트업 경쟁. 직접 개발보다 **API 파트너십** 효율적
2. **린다 가격 인하** ($200/월) — 휘슬의 "풀사이클" 차별점 더욱 중요
3. **수출바우처 역대 최대** (1,502억) — 수행기관 등록 = 고객 확보 채널
4. **Flexport AI 러시** — 대기업 물류 집중, 한국 SME 직접 경쟁 낮음
5. **Sphere 관세 진출** (a16z $21M) — 2026 하반기 강력한 경쟁자
