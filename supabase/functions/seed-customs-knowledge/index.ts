import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://whistle-ai.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface KnowledgeEntry {
  title: string;
  content: string;
  category: "customs_law" | "fta" | "hs_code" | "certification" | "regulation";
  country: string | null;
  metadata: Record<string, unknown>;
}

const KNOWLEDGE_ENTRIES: KnowledgeEntry[] = [
  // --- Certification ---
  {
    title: "미국 FDA 화장품 등록 절차",
    content: `미국에 화장품을 수출하려면 FDA(식품의약국) 등록이 필요합니다.

1. 시설 등록 (Facility Registration): FDA FURLS 시스템에서 제조시설 등록. 2년마다 갱신 필요.
2. 제품 등록 (Product Listing): VCRP(Voluntary Cosmetic Registration Program)에 제품 등록. 의무는 아니나 강력 권장.
3. MoCRA (Modernization of Cosmetics Regulation Act, 2022): 2023년 12월부터 시설 등록 및 제품 등록 의무화. 부작용 보고 의무.
4. 라벨링 요건: 영문 표기 필수. 성분 INCI명 기재. net contents, 제조사/배급사 정보 필수.
5. 금지/제한 성분: 수은, 클로로포름, 비닐클로라이드 등 금지. 색소는 FDA 인증 필요.
6. 소요기간: 시설등록 1-2주, 제품등록 2-4주, 전체 프로세스 약 1-2개월.
7. 비용: FDA 등록 자체는 무료. 컨설팅 이용 시 $2,000-$5,000 수준.

주의: 화장품이라도 치료 효능을 표방하면 의약품(Drug)으로 분류되어 NDA/ANDA 필요.`,
    category: "certification",
    country: "US",
    metadata: { industry: "cosmetics", difficulty: "medium", updated: "2026-01" },
  },
  {
    title: "EU CE 마킹 절차 및 요건",
    content: `CE 마킹은 EU 시장 진출에 필수인 적합성 표시입니다.

1. 적용 대상: 전자제품, 의료기기, 기계류, 완구, 건축자재, PPE 등 25개 지침 대상 제품.
2. 절차:
   a) 적용 지침(Directive) 확인 — 제품별로 LVD, EMC, RED, MD 등 해당 지침 확인
   b) 필수 요건(Essential Requirements) 파악
   c) 유럽 조화 표준(hEN) 확인 및 적합성 시험
   d) 기술문서(Technical File) 작성
   e) 적합성 선언서(DoC) 작성
   f) CE 마킹 부착
3. 주요 지침:
   - LVD (2014/35/EU): 저전압 전기기기 (50-1000V AC, 75-1500V DC)
   - EMC (2014/30/EU): 전자파 적합성
   - RED (2014/53/EU): 무선기기 (WiFi, Bluetooth 등)
   - RoHS (2011/65/EU): 유해물질 제한 (납, 수은, 카드뮴 등)
   - REACH: 화학물질 등록/평가/인가/제한
4. 인증기관(NB): 일부 고위험 제품은 인증기관(Notified Body) 심사 필수.
5. 소요기간: 3-6개월 (시험+문서 작성). 비용: 제품 복잡도에 따라 $5,000-$30,000.`,
    category: "certification",
    country: "EU",
    metadata: { industry: "electronics", difficulty: "high", updated: "2026-01" },
  },
  {
    title: "중국 CCC 인증 (China Compulsory Certification)",
    content: `CCC 인증은 중국 시장에서 판매되는 제품에 대한 강제 인증입니다.

1. 적용 대상: 전자제품, 자동차, 완구, 소방설비 등 17개 카테고리, 103개 품목.
2. 관리기관: CNCA (국가인증인가감독관리위원회).
3. 절차:
   a) 인증 신청 (CQC 또는 지정 인증기관)
   b) 형식시험 (중국 내 지정 시험소에서 수행)
   c) 공장심사 (초기심사 + 연간 사후심사)
   d) CCC 인증서 발급
   e) CCC 마크 부착
4. 소요기간: 3-6개월. 공장심사 일정에 따라 변동.
5. 비용: 신청비, 시험비, 공장심사비 합산 $10,000-$30,000. 연간 사후심사비 별도.
6. 주의사항:
   - 중국 내 대리인(현지 에이전트) 필수
   - 매년 사후 공장심사 통과해야 인증 유지
   - 제품 변경 시 변경 신청 필요
   - CCC 면제 신청 가능 (소량 수입, 전시용 등)`,
    category: "certification",
    country: "CN",
    metadata: { industry: "electronics", difficulty: "high", updated: "2026-01" },
  },
  {
    title: "일본 PSE/PSC 인증",
    content: `일본 전기용품안전법(PSE) 및 소비생활용제품안전법(PSC) 인증 안내.

## PSE 인증 (전기용품)
1. 특정전기용품 (다이아몬드 PSE): 116품목. 등록검사기관 적합성 검사 필수.
   - 전선, 퓨즈, 배선기구, 전열기구, 전동공구, 리튬이온배터리 등
2. 특정전기용품 이외 (원형 PSE): 341품목. 자기확인(자가시험) 가능.
   - 가전제품, LED조명, 충전기, AC어댑터 등
3. 절차: 기술기준 적합성 확인 → 검사기관 시험(특정) 또는 자가시험(비특정) → PSE 마크 부착
4. 전압: 100V/50-60Hz (일본 규격에 맞는 플러그 필요)

## PSC 인증 (소비생활용품)
1. 특별특정제품: 4품목 (압력솥, 유아용침대, 등유난로, 라이터). 제3자 검사 필수.
2. 특정제품: 6품목 (헬멧, 등산용 로프, 가정용 압력가마 등). 자기확인 가능.

소요기간: PSE 2-4개월, PSC 1-3개월.
비용: PSE $3,000-$15,000, PSC $2,000-$8,000.`,
    category: "certification",
    country: "JP",
    metadata: { industry: "electronics", difficulty: "medium", updated: "2026-01" },
  },

  // --- HS Codes ---
  {
    title: "K-Beauty (한국 화장품) 주요 HS코드",
    content: `한국 화장품 수출 시 사용되는 주요 HS코드:

## 메이크업 제품 (3304)
- 3304.10: 입술 화장용 제품 (립스틱, 립글로스, 립밤, 립틴트)
- 3304.20: 눈 화장용 제품 (아이섀도, 마스카라, 아이라이너)
- 3304.30: 매니큐어/페디큐어용 제품 (네일폴리시, 네일케어)
- 3304.91: 파우더류 (파운데이션, 팩트, 루스파우더, 쿠션)
- 3304.99: 기타 미용 제품 (스킨케어 전체 — 세럼, 에센스, 크림, 로션, 마스크팩, 선크림, 토너, 클렌징크림)

## 헤어케어 제품 (3305)
- 3305.10: 샴푸
- 3305.90: 기타 두발용 제품 (컨디셔너, 헤어에센스, 헤어오일, 헤어팩)

## 기타 화장품류
- 3307.10: 면도용 제품
- 3307.20: 데오도란트
- 3307.30: 입욕제, 바스솔트
- 3307.90: 기타 (방향제, 탈취제)
- 3401.11: 화장용 비누 (고체)
- 3401.30: 클렌징폼, 페이셜워시 (유기계면활성제)

## 분류 주의사항
- 기능성화장품(미백, 주름개선)도 3304.99 분류 (의약품 아님)
- 의약외품(자외선차단제 SPF50+ 등)은 국가별로 화장품/의약품 분류 상이
- 마스크팩: 시트마스크 = 3304.99, 워시오프팩 = 3304.99
- 선크림: 3304.99 (미국에서는 OTC Drug으로 분류될 수 있음)`,
    category: "hs_code",
    country: null,
    metadata: { industry: "cosmetics", updated: "2026-01" },
  },
  {
    title: "K-Food (한국 식품) 주요 HS코드",
    content: `한국 식품 수출 시 사용되는 주요 HS코드:

## 면류 (1902)
- 1902.11: 비조리 파스타 (건면 — 비빔냉면, 쫄면 등)
- 1902.19: 기타 비조리 면류 (쌀국수 건면)
- 1902.20: 조제(속을 넣은) 파스타 — 만두류
- 1902.30: 기타 파스타 (라면, 즉석면 — 조리 또는 반조리)

## 조미료/소스 (2103)
- 2103.10: 간장
- 2103.20: 토마토케첩 및 토마토소스
- 2103.30: 겨자분, 겨자소스
- 2103.90: 기타 소스 (고추장, 된장, 쌈장, 불고기소스 등)

## 과자/스낵 (1905)
- 1905.31: 비스킷, 쿠키
- 1905.32: 와플, 웨이퍼
- 1905.90: 기타 빵류 (떡, 한과, 쌀과자)

## 음료 (2202)
- 2202.10: 가당 음료 (탄산음료, 주스음료)
- 2202.99: 기타 비알코올 음료 (식혜, 두유, 알로에음료)

## 김치/발효식품
- 2005.99: 기타 조제 채소 (김치 — 2005.9990)
- 1604.20: 기타 조제 어류 (젓갈류 일부)

## 건강기능식품
- 2106.90: 기타 조제 식료품 (홍삼 추출물, 비타민 보충제, 프로바이오틱스)

주의: 건강기능식품은 수입국에서 식품/의약품 분류가 상이할 수 있어 사전 확인 필수.`,
    category: "hs_code",
    country: null,
    metadata: { industry: "food", updated: "2026-01" },
  },
  {
    title: "K-Electronics (한국 전자제품) 주요 HS코드",
    content: `한국 전자제품 수출 시 사용되는 주요 HS코드:

## 반도체 (8541-8542)
- 8541.10: 다이오드
- 8541.21: 트랜지스터 (소산전력 1W 미만)
- 8541.40: 광전지(태양전지 포함)
- 8542.31: 프로세서, 컨트롤러 (CPU/AP)
- 8542.32: 메모리 (DRAM, NAND Flash)
- 8542.39: 기타 집적회로

## 디스플레이 (8528, 9013)
- 8528.52: 모니터 (자동데이터처리기기 직접연결)
- 8528.72: 기타 컬러TV/모니터
- 9013.80: 기타 광학기기 (LCD/OLED 패널)

## 가전제품 (8418-8450)
- 8418.10: 냉장고
- 8422.11: 가정용 식기세척기
- 8450.11: 가정용 세탁기 (전자동, 10kg 이하)
- 8516.31: 헤어드라이어
- 8516.50: 전자레인지

## 모바일/통신 (8517)
- 8517.13: 스마트폰
- 8517.62: 통신용 기기 (라우터, 모뎀, 기지국)

## 배터리 (8507)
- 8507.60: 리튬이온 축전지
- 8507.80: 기타 축전지

## 자동차 부품 (8708)
- 8708.10: 범퍼
- 8708.30: 브레이크 장치
- 8708.99: 기타 자동차 부품`,
    category: "hs_code",
    country: null,
    metadata: { industry: "electronics", updated: "2026-01" },
  },

  // --- FTA ---
  {
    title: "한-미 FTA (KORUS) 핵심 내용",
    content: `한-미 FTA(KORUS FTA)는 2012년 3월 발효된 한국과 미국 간 자유무역협정입니다.

## 관세 철폐
- 공산품: 발효 즉시 또는 5년 내 대부분 무관세 (현재 거의 100% 철폐 완료)
- 농산물: 일부 품목 15-20년 단계적 철폐. 쌀은 제외.
- 자동차: 한국산 승용차 미국 관세 즉시 철폐 (기존 2.5%)

## 원산지 기준
- 원산지 결정기준: 세번변경기준(CTC) 또는 부가가치기준(RVC) 또는 특정공정기준
- RVC 계산: 공제법(Build-down) 또는 적상법(Build-up)
  - Build-down: RVC = (조정가치 - 비원산지재료가치) / 조정가치 × 100
  - Build-up: RVC = 원산지재료가치 / 조정가치 × 100
- 일반 RVC 기준: 35% (품목별 상이)
- 누적규정: 양국 원산지재료 합산 가능
- 미소기준(De Minimis): 비원산지 재료 가치 10% 이하 시 원산지 인정

## 원산지 증명
- 자율발급(자기증명) 방식: 수출자, 생산자, 수입자가 직접 발급
- 원산지증명서 유효기간: 발급일로부터 4년
- 보관의무: 증명서 발급일로부터 5년간 관련 서류 보관

## 주요 혜택 품목 (한국 수출 기준)
- 자동차: 0% (기존 2.5%)
- 전자제품: 대부분 0%
- 화장품: 0% (기존 0-5.4%)
- 섬유/의류: 대부분 0% (기존 최대 32%)`,
    category: "fta",
    country: "US",
    metadata: { effective_date: "2012-03-15", parties: ["KR", "US"], updated: "2026-01" },
  },
  {
    title: "한-EU FTA 핵심 내용",
    content: `한-EU FTA는 2011년 7월 잠정 발효, 2015년 12월 전면 발효된 자유무역협정입니다.

## 관세 철폐
- 공산품: 발효 후 5년 내 99.6% 품목 무관세 (현재 거의 완전 철폐)
- 농산물: 민감품목 제외 대부분 철폐. 쌀, 고추, 마늘 등 양허 제외.
- 자동차: 양측 관세 5년 내 철폐 (EU 기존 10% → 0%)

## 원산지 기준
- 세번변경기준(CTC) + 부가가치기준(RVC) 병행
- 화장품(3304): 비원산지재료의 세번변경(4단위) 또는 공장도 가격의 50% 이하
- 전자제품(8528): 세번변경(4단위) + 비원산지재료 가치 50% 이하
- 자동차(8703): 비원산지재료 가치 45% 이하 + 주요 부품 원산지 충족

## 원산지 증명
- 인증수출자(Approved Exporter) 제도: 세관장 인증 후 자율발급
  - 금액 무제한 자율발급 가능
- 비인증수출자: 6,000유로 이하 건 자율발급 가능
- 원산지신고서(Origin Declaration): 상업서류(인보이스 등)에 원산지 신고문안 기재

## 주요 혜택 품목
- 화장품: 0% (기존 최대 6.5%)
- 자동차: 0% (기존 10%)
- 전자제품: 0% (기존 최대 14%)
- 섬유: 0% (기존 최대 12%)

## 비관세장벽 주의
- REACH (화학물질): EU 수출 전 REACH 사전등록/등록 필요
- CE 마킹: 해당 제품군은 CE 인증 필수
- EU 화장품규정 (EC 1223/2009): CPNP 등록, 안전성 평가(CPSR), 책임자(RP) 지정 필수`,
    category: "fta",
    country: "EU",
    metadata: { effective_date: "2011-07-01", parties: ["KR", "EU"], updated: "2026-01" },
  },
  {
    title: "한-ASEAN FTA (AKFTA) 핵심 내용",
    content: `한-ASEAN FTA는 상품무역 2007년 6월, 서비스 2009년, 투자 2009년 발효된 자유무역협정입니다.

## 적용 국가
ASEAN 10개국: 베트남, 태국, 인도네시아, 말레이시아, 필리핀, 싱가포르, 미얀마, 캄보디아, 라오스, 브루나이

## 관세 철폐
- 일반품목(NT): 대부분 0% 달성 완료 (ASEAN6: 2010, CLMV: 2018)
- 민감품목(SL): 관세 20% 이하로 인하
- 초민감품목(HSL): 관세 50% 이하로 인하 또는 TRQ 적용
- CLMV국가(캄보디아, 라오스, 미얀마, 베트남)는 이행일정 우대

## 원산지 기준
- 일반규칙: RVC 40% 이상 (역내부가가치 40% 충족)
- 품목별 규칙(PSR): 일부 품목은 세번변경기준(CTH) 또는 특정공정기준 적용
- 누적규정: ASEAN + 한국 역내 원산지재료 합산 가능
- 직접운송원칙: 제3국 경유 시 비가공 조건 충족 필요

## 원산지 증명
- 기관발급(제3자 증명) 방식: 한국은 대한상공회의소(세관장 위탁)에서 발급
- AK Form (ASEAN-Korea FTA 원산지증명서) 사용
- 유효기간: 발급일로부터 1년
- Back-to-Back C/O: 경유국에서 재발급 가능

## 특이사항
- 베트남: 한-ASEAN FTA, 한-베트남 FTA, RCEP 3중 적용 가능 → 최유리 세율 선택
- 인도네시아: 한-ASEAN FTA, 한-인니 CEPA 적용 가능`,
    category: "fta",
    country: null,
    metadata: { effective_date: "2007-06-01", parties: ["KR", "ASEAN"], updated: "2026-01" },
  },
  {
    title: "RCEP 핵심 내용",
    content: `RCEP(역내포괄적경제동반자협정)은 2022년 2월 발효된 세계 최대 메가 FTA입니다.

## 회원국 (15개국)
한국, 중국, 일본, 호주, 뉴질랜드 + ASEAN 10개국

## 의의
- 한-일 간 최초 FTA 효과 (RCEP 통해 일본과 특혜관세 적용 가능)
- 15개국 간 누적 원산지 인정

## 관세 철폐
- 한국 기준 대일본 수출: 약 83% 품목 관세 철폐
- 일본 기준 대한국 수출: 약 86% 품목 관세 철폐
- 중국: 약 90% 품목 20년 내 관세 철폐

## 원산지 기준
- RVC 40% (역내부가가치비율) 또는 CTH (세번변경 4단위) 중 선택
- 15개국 역내 재료 누적 가능 (역내 조달 유리)
- 누적규정: 점진적 누적 허용 (ASEAN FTA보다 유리)

## 원산지 증명
- 자율발급 + 인증수출자 제도 병행
- 한국: 인증수출자 → 자율발급, 일반수출자 → 세관/상의 발급
- RCEP 원산지증명서(Form RCEP) 사용
- 유효기간: 발급일로부터 1년

## 활용 팁
- 기존 FTA(한-ASEAN, 한-중 등)와 비교하여 최유리 세율 선택
- 일본 수출 시 RCEP이 유일한 특혜관세 경로
- 역내 원자재 조달 → RCEP 누적규정 활용으로 원산지 충족 용이`,
    category: "fta",
    country: null,
    metadata: { effective_date: "2022-02-01", parties: ["KR", "CN", "JP", "AU", "NZ", "ASEAN"], updated: "2026-01" },
  },

  // --- Regulations ---
  {
    title: "수출 필수 서류 일반 가이드",
    content: `한국에서 해외로 수출할 때 필요한 기본 서류 목록:

## 필수 서류 (모든 수출)
1. 상업송장 (Commercial Invoice): 거래 당사자, 품명, 수량, 단가, 총금액, 인코텀즈 조건
2. 포장명세서 (Packing List): 포장 단위별 품명, 수량, 중량, 치수
3. 선하증권 (B/L) 또는 항공화물운송장 (AWB): 운송 계약 증거 서류
4. 수출신고필증: 관세청 전자통관(UNI-PASS)으로 수출신고 후 발급
5. 원산지증명서 (C/O): FTA 특혜관세 적용 시 필수

## 품목별 추가 서류
- 식품: 위생증명서, 성분분석표, 제조일자/유통기한 증명
- 화장품: MSDS, 성분표(INCI), 자유판매증명서(CFS), 제조업 등록증
- 전자제품: 시험성적서, 인증서(CE/FCC/KC 등), 사용설명서
- 의약품: GMP 증명서, 수출허가서, 의약품 등록증
- 화학물질: MSDS, SDS, 화학물질 등록/신고 확인서

## FTA 원산지 증명 종류
- 자기증명(Self-Certification): 한-미 FTA, 한-EU FTA(인증수출자)
- 기관증명: 한-ASEAN FTA, 한-중 FTA (대한상의/세관 발급)
- RCEP: 인증수출자 자율발급 또는 기관발급 선택

## 인코텀즈 2020 주요 조건
- FOB (Free On Board): 수출항 본선 인도. 운임/보험 매수인 부담.
- CIF (Cost, Insurance & Freight): 수입항까지 운임+보험 매도인 부담.
- EXW (Ex Works): 공장 인도. 모든 비용 매수인 부담.
- DDP (Delivered Duty Paid): 수입국 목적지 인도. 관세 포함 매도인 부담.`,
    category: "regulation",
    country: null,
    metadata: { updated: "2026-01" },
  },
  {
    title: "미국 수출 시 비관세 규제 종합",
    content: `미국 수출 시 주의해야 할 주요 비관세 규제:

## FDA 규제 품목
- 식품: FDA 시설등록(FFR) + 사전통보(Prior Notice) 필수. FSMA 준수.
- 화장품: MoCRA에 따른 시설/제품 등록 의무화 (2023.12~)
- 의료기기: 510(k) 또는 PMA 인증 필요. 클래스별 상이.
- 의약품: NDA/ANDA 승인 필요. cGMP 준수.

## FCC 인증 (전자제품)
- 비의도적 방사체(Unintentional Radiator): FCC Part 15 Class A/B
- 의도적 방사체(WiFi, BT 등): FCC ID 인증 필수

## UL 인증
- 전기/전자 제품 안전인증. 법적 의무는 아니나 유통업체(Amazon, Walmart)가 요구.
- UL Listed, UL Recognized, UL Classified 등급.

## CPSC (소비자제품안전위원회)
- 아동용품: CPSIA 준수 (납 함량, 프탈레이트 제한, 제3자 시험)
- 일반 소비자제품: CPSC 리콜 모니터링

## EPA 규제
- 살충제, 화학물질: EPA 등록 필요
- TSCA: 화학물질 목록 확인, 신규 화학물질 사전신고

## 라벨링 요건
- 영문 필수, 원산지 표시(Made in Korea), UPC 바코드
- 식품: Nutrition Facts 패널, 알레르겐 표시, 성분표시
- 섬유: 섬유 조성, 세탁방법, 원산지, 제조자/수입자

## 통관 절차
- 관세사(Customs Broker) 이용 권장
- ISF(Importer Security Filing): 해상운송 시 선적 24시간 전 제출
- CBP(관세국경보호국) 심사 → 필요 시 검사/검역`,
    category: "regulation",
    country: "US",
    metadata: { updated: "2026-01" },
  },
  {
    title: "EU 수출 시 비관세 규제 종합",
    content: `EU 수출 시 주의해야 할 주요 비관세 규제:

## CE 마킹 의무
- 전자/전기제품, 기계류, 완구, 의료기기, 건축자재 등 25개 지침 대상
- 적합성 선언(DoC) + 기술문서(TCF) 작성 필수

## REACH 규정
- EU로 수출하는 화학물질/혼합물/완제품 중 화학물질 연간 1톤 이상: 등록 의무
- SVHC(고위험성우려물질) 후보목록: 0.1% 초과 시 고지 의무
- Only Representative(OR): EU 내 대리인 지정하여 등록 가능

## EU 화장품 규정 (EC 1223/2009)
- CPNP(Cosmetic Products Notification Portal) 등록 필수
- 책임자(RP, Responsible Person): EU 내 법인/개인 지정 필수
- CPSR(Cosmetic Product Safety Report): 안전성 평가 보고서 작성
- PIF(Product Information File): 제품정보파일 보관
- 금지/제한 성분 목록 확인 (Annex II ~ VI)
- 동물실험 금지

## EU 식품 규제
- 일반식품법(Regulation 178/2002) 준수
- Novel Food 규정: 1997년 이전 EU에서 유의미한 소비 이력 없는 식품은 사전 승인
- 식품첨가물 목록(E-number) 확인
- 알레르겐 표시 의무 (14가지)
- 영양표시(Regulation 1169/2011) 필수

## RoHS 지침
- 전기/전자제품: 납, 수은, 카드뮴, 6가크롬, PBB, PBDE 등 10개 물질 제한
- 2023년부터 4개 프탈레이트 추가 (DEHP, BBP, DBP, DIBP)

## 포장 및 폐기물 지침
- 포장재 재활용 마크, Green Dot 등
- 각 회원국별 EPR(생산자책임재활용) 의무 확인`,
    category: "regulation",
    country: "EU",
    metadata: { updated: "2026-01" },
  },

  // --- Customs Law ---
  {
    title: "관세율표 통칙 (HS코드 분류 원칙)",
    content: `HS코드 분류의 기본 원칙인 관세율표 해석에 관한 통칙:

## 통칙 1: 법적 효력
- 호의 표제와 류 또는 절의 주 규정에 따라 분류
- 표제는 참조 편의를 위한 것으로 법적 분류 기준은 각 호의 용어와 관련 주 규정

## 통칙 2
### 2(a): 미완성/미조립 물품
- 불완전하거나 미완성된 물품도 제시 상태에서 완성품의 본질적 특성을 갖추면 완성품으로 분류
- 완성품을 분해/미조립 상태로 제시해도 완성품으로 분류

### 2(b): 혼합물/복합물
- 2개 이상 재료/물질의 혼합물, 복합물은 통칙 3에 따라 분류

## 통칙 3: 2개 이상 호에 분류 가능할 때
### 3(a): 가장 구체적 표현 우선
- 일반적 표현보다 구체적 표현이 있는 호에 분류

### 3(b): 주된 특성 기준
- 혼합물/복합물/세트: 본질적 특성을 부여하는 구성요소의 호에 분류

### 3(c): 동등한 경우
- 3(a), 3(b)로 결정 불가 시 동등하게 분류 가능한 호 중 마지막 호에 분류

## 통칙 4: 유사 물품
- 위 통칙으로 분류 불가 시 가장 유사한 물품의 호에 분류

## 통칙 5: 포장용기
### 5(a): 특수 포장용기 (카메라케이스 등) → 내용물과 함께 분류
### 5(b): 포장 재료/용기 → 내용물과 함께 분류 (반복사용 성격 제외)

## 통칙 6: 소호 분류
- 같은 수준의 소호 간에만 비교 가능. 류의 주와 소호의 주 모두 적용.`,
    category: "customs_law",
    country: null,
    metadata: { updated: "2026-01" },
  },
  {
    title: "원산지 결정기준 종류 및 적용방법",
    content: `FTA 활용 시 가장 중요한 원산지 결정기준의 종류와 적용방법:

## 1. 완전생산기준 (WO: Wholly Obtained)
- 한 국가에서 완전히 생산/획득된 물품
- 적용: 농산물, 수산물, 광물 등 천연자원
- 예: 한국에서 재배한 인삼, 한국 해역에서 포획한 수산물

## 2. 세번변경기준 (CTC: Change in Tariff Classification)
### CC (Chapter Change): 류 변경 — HS 2단위 변경
### CTH (Change of Tariff Heading): 호 변경 — HS 4단위 변경
### CTSH (Change of Tariff Subheading): 소호 변경 — HS 6단위 변경
- 비원산지재료의 HS코드가 제품의 HS코드와 일정 단위 이상 변경되면 원산지 인정
- 예: 원단(5208)→셔츠(6205) = CTH 충족

## 3. 부가가치기준 (RVC: Regional Value Content)
### 공제법(Build-down)
RVC = (조정가치 - 비원산지재료가치) / 조정가치 × 100%

### 적상법(Build-up)
RVC = 원산지재료가치 / 조정가치 × 100%

### 순원가법(Net Cost)
RVC = (순원가 - 비원산지재료가치) / 순원가 × 100%

- 일반 기준: 35~45% (FTA별 상이)
- 한-미 FTA: 35%, 한-EU FTA: 50%(비원산지 기준), 한-ASEAN: 40%

## 4. 특정공정기준 (SP: Specific Process)
- 특정 제조/가공 공정을 거쳐야 원산지 인정
- 예: 섬유 — 날염+봉제 공정 필수, 화학제품 — 화학반응 필수

## 5. 보충적 기준
### 미소기준(De Minimis)
- 비원산지재료가 일정 비율(가액 7~10%) 이하면 원산지 인정
### 누적기준(Accumulation)
- FTA 체약국 재료를 자국 원산지재료로 인정
### 직접운송원칙(Direct Consignment)
- 제3국 경유 시 비가공 조건 충족 필요`,
    category: "customs_law",
    country: null,
    metadata: { updated: "2026-01" },
  },
  {
    title: "수출통관 절차 (한국 기준)",
    content: `한국에서의 수출통관 절차:

## 수출통관 흐름
1. 수출신고 준비 → 2. 수출신고 → 3. 심사/검사 → 4. 수출신고수리 → 5. 물품 선(기)적 → 6. 수출이행

## 1단계: 수출신고 준비
- 무역업 고유번호 확인 (한국무역협회 등록)
- 거래 관련 서류 준비: 상업송장, 포장명세서, 수출계약서
- HS코드 확정 (세관 품목분류 사전심사 활용 가능)
- 수출요건 확인: 전략물자 해당 여부, 수출승인/추천 필요 여부

## 2단계: 수출신고
- UNI-PASS 전자통관시스템으로 EDI 신고
- 관세사 위탁 또는 직접 신고 가능
- 신고 시기: 물품을 보세구역에 반입한 후 (반입 전 신고도 가능)

## 3단계: 심사/검사
- 서류심사: P/L (자동수리), C/S (서류심사), C/X (물품검사)
- 물품검사: 전체 수출신고 중 약 2~5%만 검사 대상

## 4단계: 수출신고수리
- 신고수리 즉시 수출신고필증 발급
- 수출신고필증 = 원산지증명서 발급, 부가세 영세율 적용의 근거

## 5단계: 선(기)적
- 수출신고수리일로부터 30일 이내 선적/기적 완료해야 함
- 미이행 시 수출신고 취소

## 비용
- 관세사 수수료: 건당 3~10만원
- 검사비용: 해당 시 실비
- 원산지증명서 발급: 건당 4,000~7,000원 (대한상의)

## 전략물자 수출통제
- 전략물자관리원(KOSTI)에서 해당 여부 자가판정 또는 판정 신청
- 해당 시: 산업부 수출허가 필수 (위반 시 형사처벌)`,
    category: "customs_law",
    country: "KR",
    metadata: { updated: "2026-01" },
  },
  {
    title: "AEO (수출입안전관리 우수업체) 인증",
    content: `AEO(Authorized Economic Operator) 인증은 세관 당국이 인정한 무역 보안/법규준수 우수업체입니다.

## AEO 등급
- AAA등급: 최고 수준. 세관 검사 거의 면제, 최대 혜택.
- AA등급: 우수 수준. 검사비율 대폭 축소.
- A등급: 기본 수준. 일부 혜택 제공.

## AEO 혜택
1. 통관 신속화: 서류심사/물품검사 축소
2. 검사비율 축소: 일반업체 대비 70~90% 축소
3. 담보 경감: 관세 등 담보 제공 면제/경감
4. 상호인정(MRA): 상대국 AEO와 동등 혜택
   - 한국 MRA 체결국: 미국, EU, 일본, 중국, 캐나다, 싱가포르, 뉴질랜드, 호주 등 22개국
5. 관세조사 유예/축소

## 인증 요건 (4대 분야)
1. 법규준수: 최근 2년간 관세법 위반 없음
2. 내부통제시스템: 수출입 관련 내부 통제 체계 구축
3. 재무건전성: 부채비율, 유동비율 등 기준 충족
4. 안전관리: 화물 보안, 출입통제, 인사관리 등

## 신청 절차
1. 자가진단 (관세청 자가진단표)
2. 신청서 제출 (관세청)
3. 서류심사 + 현장심사 (약 6개월)
4. 공인 결정

## 비용/기간
- 인증 비용: 없음 (관세청 무료)
- 컨설팅 이용 시: 500만~2000만원
- 소요기간: 6개월~1년
- 유효기간: 5년 (갱신 가능)`,
    category: "customs_law",
    country: "KR",
    metadata: { updated: "2026-01" },
  },

  // --- Additional HS Codes ---
  {
    title: "섬유/의류 주요 HS코드",
    content: `한국 섬유 및 의류 수출 시 주요 HS코드:

## 직물 (50~55류)
- 5208: 면직물 (면 85% 이상, 200g/m² 이하)
- 5209: 면직물 (면 85% 이상, 200g/m² 초과)
- 5407: 합성 필라멘트사 직물 (폴리에스터, 나일론)
- 5515: 합성 스테이플 섬유 직물
- 5516: 인조 스테이플 섬유 직물

## 편물 (60류)
- 6001: 파일 편물
- 6004: 편물 (폭 30cm 초과, 탄성사 5% 이상)
- 6006: 기타 편물

## 의류 — 편물제 (61류)
- 6109: T셔츠, 싱글릿
- 6110: 스웨터, 풀오버, 가디건
- 6104: 여성 정장, 재킷, 드레스 (편물)
- 6103: 남성 정장, 재킷 (편물)

## 의류 — 직물제 (62류)
- 6203: 남성 정장, 재킷, 바지 (직물)
- 6204: 여성 정장, 재킷, 스커트, 바지 (직물)
- 6205: 남성 셔츠 (직물)
- 6206: 여성 블라우스, 셔츠 (직물)

## 기타
- 6301-6304: 담요, 침대커버, 커튼
- 6401-6405: 신발류
- 4202: 가방류 (핸드백, 여행가방, 지갑)

## 원산지 기준 주의
- 섬유/의류는 FTA별 원산지 기준이 까다로움
- 한-미 FTA: 원사(Yarn Forward) 기준 — 원사부터 역내 생산 필요
- 한-EU FTA: 직물(Fabric Forward) 기준 — 직물부터 역내 생산 필요
- 한-ASEAN: CTH 또는 RVC 40%`,
    category: "hs_code",
    country: null,
    metadata: { industry: "textile", updated: "2026-01" },
  },
  {
    title: "베트남 수출 시 인증 및 규제",
    content: `베트남 수출 시 주요 인증 및 규제 사항:

## 적용 가능 FTA
1. 한-ASEAN FTA (AKFTA): 2007년 발효
2. 한-베트남 FTA (VKFTA): 2015년 발효 — 대부분 더 유리한 세율
3. RCEP: 2022년 발효

→ 세 가지 중 최유리 세율 선택 가능

## 식품 수출
- 베트남 보건부(MOH) 위생안전 등록 필요
- 제품등록번호 취득 (약 2-3개월)
- 라벨링: 베트남어 라벨 부착 필수 (원산지, 성분, 유통기한, 수입자)
- 건강기능식품: 별도 광고사전심의

## 화장품 수출
- 화장품 공고(Notification) 제출: 베트남 의약품관리국(DAV)
- CFS(자유판매증명서): 한국 식약처 발급
- GMP 증명서 권장 (필수는 아님)
- 베트남어 라벨: 성분, 사용법, 주의사항, 제조일/유통기한, 수입자

## 전자제품
- 강제인증 대상: IT/통신 기기 → MIC 인증 (정보통신부)
- 전기안전: 일부 제품 QUACERT 인증 필요
- 에너지효율 라벨링: 에어컨, 냉장고 등 의무

## 통관 특이사항
- 사전세액심사(Pre-ruling) 제도 활용 가능
- HS코드 분류 분쟁 빈번 → 베트남 세관 분류 기준 사전 확인 권장
- 통관시간: 일반 2-3일, 검사 대상 5-7일
- 부가세(VAT): 일반 10%, 식품/의약품 5%

## 비용 참고
- MIC 인증: $2,000-$5,000
- 식품 등록: $1,000-$3,000
- 화장품 공고: $500-$2,000/품목`,
    category: "certification",
    country: "VN",
    metadata: { updated: "2026-01" },
  },
  {
    title: "한-중 FTA 핵심 내용",
    content: `한-중 FTA는 2015년 12월 발효된 한국과 중국 간 자유무역협정입니다.

## 관세 철폐
- 품목 수 기준: 한국 79.2%, 중국 71% 20년 내 철폐
- 공산품: 한국 92.2%, 중국 91.1% 관세 철폐
- 농수산품: 민감품목 다수 양허 제외. 쌀, 고추, 마늘, 양파 등 제외.

## 관세 철폐 유형
- 즉시철폐: 발효와 동시 0%
- 5년/10년/15년/20년 균등 철폐
- 부분감축: 일정 비율만 인하 (5%, 10%, 20%, 35%, 50%)

## 원산지 기준
- 세번변경기준(CTH/CTSH) 또는 부가가치기준(RVC 40%) 또는 조합
- 품목별 원산지기준(PSR) 적용
- 누적: 양국 간 재료 누적 인정
- 미소기준: FOB 가격의 10% 이하

## 원산지 증명
- 기관발급 방식: 대한상공회의소 또는 세관 발급
- 한-중 FTA 원산지증명서 사용
- 유효기간: 발급일로부터 1년
- 인증수출자 자율발급: 2019년부터 시범 도입, 점진 확대

## 주의사항
- 중국 수입 시 증치세(VAT) 13% 별도 부과
- 소비세(소비품목에 따라 상이) 추가 가능
- CCC 인증 대상 제품은 인증 없이 통관 불가
- 식품: GACC(해관총서) 등록 필수 (2022년부터 전면 시행)`,
    category: "fta",
    country: "CN",
    metadata: { effective_date: "2015-12-20", parties: ["KR", "CN"], updated: "2026-01" },
  },
  {
    title: "관세 환급 제도 (수출용 원재료)",
    content: `수출용 원재료에 대한 관세 환급 제도:

## 개요
수출물품 제조에 사용된 수입 원재료에 대해 납부한 관세를 돌려받는 제도.

## 환급 유형
### 1. 개별환급 (개별세액)
- 실제 사용한 원재료별로 납부세액 계산하여 환급
- 정확하나 계산 복잡
- 대기업 또는 고가 원재료 사용 시 유리

### 2. 간이환급 (간이정액)
- 수출물품의 HS코드별 정해진 환급률(간이정액환급률표)로 계산
- 중소기업 적합 (연간 수출 중소기업 기준)
- 계산: 수출 FOB 가격 × 간이정액환급률

## 환급 요건
1. 수출실적: 수출신고수리 완료
2. 원재료 수입 사실: 수입신고필증
3. 소요량 증명: 원재료 투입량 입증 (소요량 계산서)
4. 신청기한: 수출신고수리일로부터 2년 이내

## 신청 절차
1. 환급신청서 작성 (관세청 UNI-PASS)
2. 첨부서류: 수출신고필증, 수입신고필증, 소요량계산서, 기초원재료납세증명서
3. 세관 심사 (약 10일)
4. 환급금 지급

## 기초원재료납세증명서 (기납증)
- 국내 거래를 통해 수입 원재료를 구매한 경우
- 직접 수입하지 않았어도 실질적으로 관세를 부담한 경우 환급 가능
- 공급자로부터 기납증 발급받아 첨부

## 주요 혜택
- 수출원가 절감: 관세 부담분 회수
- 가격 경쟁력 강화
- 중소기업 간이환급으로 절차 간소화`,
    category: "customs_law",
    country: "KR",
    metadata: { updated: "2026-01" },
  },
];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const sbUrl = Deno.env.get("SUPABASE_URL")!;
    const sbServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sbAdmin = createClient(sbUrl, sbServiceRole);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await sbAdmin.auth.getUser(token);
    if (!user || userErr) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const { action = "seed" } = body as { action?: string };

    if (action === "clear") {
      // Admin-only: verify user has admin role
      const { data: userProfile } = await sbAdmin.from("users").select("role").eq("id", user.id).single();
      if (!userProfile || userProfile.role !== "admin") {
        return new Response(
          JSON.stringify({ ok: false, error: "Admin access required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const { error: delErr } = await sbAdmin.from("customs_knowledge").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (delErr) {
        return new Response(
          JSON.stringify({ ok: false, error: `삭제 실패: ${delErr.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ ok: true, message: "모든 지식 데이터가 삭제되었습니다." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const existingCount = await sbAdmin
      .from("customs_knowledge")
      .select("id", { count: "exact", head: true });

    if (existingCount.count && existingCount.count > 0) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: `이미 ${existingCount.count}개의 데이터가 존재합니다. 초기화하려면 action: "clear"를 먼저 호출하세요.`,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const BATCH_SIZE = 10;
    let insertedCount = 0;

    for (let i = 0; i < KNOWLEDGE_ENTRIES.length; i += BATCH_SIZE) {
      const batch = KNOWLEDGE_ENTRIES.slice(i, i + BATCH_SIZE);
      const { error: insertErr } = await sbAdmin
        .from("customs_knowledge")
        .insert(batch);

      if (insertErr) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: `배치 ${Math.floor(i / BATCH_SIZE) + 1} 삽입 실패: ${insertErr.message}`,
            inserted_so_far: insertedCount,
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      insertedCount += batch.length;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: `${insertedCount}개의 관세 지식 데이터가 성공적으로 삽입되었습니다.`,
        count: insertedCount,
        categories: {
          certification: KNOWLEDGE_ENTRIES.filter((e) => e.category === "certification").length,
          fta: KNOWLEDGE_ENTRIES.filter((e) => e.category === "fta").length,
          hs_code: KNOWLEDGE_ENTRIES.filter((e) => e.category === "hs_code").length,
          customs_law: KNOWLEDGE_ENTRIES.filter((e) => e.category === "customs_law").length,
          regulation: KNOWLEDGE_ENTRIES.filter((e) => e.category === "regulation").length,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("seed-customs-knowledge error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: "An error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
