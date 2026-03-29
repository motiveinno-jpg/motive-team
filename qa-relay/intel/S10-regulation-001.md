# 글로벌 수출입 규제 최신 동향 리서치 (2025-2026)

> 작성일: 2026-03-29 | 휘슬 AI 수출 분석 반영용

---

## 1. 미국 FDA 최신 변경사항

### 1-1. 식품: FSMA 204 식품추적 규칙

| 항목 | 내용 |
|------|------|
| **시행일** | 원래 2026-01-20 -> **2028-07-20으로 30개월 연기** |
| **근거** | 미 의회 지시에 따라 FDA가 2028-07-20 이전 집행 불가 |
| **영향 품목** | Food Traceability List(FTL) 대상: 치즈, 달걀, 과일/채소, 해산물, 즉석 델리 샐러드 등 |
| **핵심 요건** | 로트(lot) 수준 추적 기록 의무, 추적성 계획서(Traceability Plan) 작성 |
| **한국 영향** | 한국산 수산물/김치/신선 농산물 대미 수출 기업은 2028년까지 준비 기간 확보 |
| **FDA 지원** | 분기별 청취 세션 개최, 가공업체/유통센터/양식장 추적성 계획서 예시 공개 |

**휘슬 반영 사항:**
- 분석 리포트에 FSMA 204 준비 체크리스트 포함 (2028-07-20 기한 안내)
- FTL 대상 품목 여부 자동 판별 로직 추가
- 구현 난이도: **쉬움** (AI 프롬프트에 규제 정보 업데이트)

---

### 1-2. 화장품: MoCRA (Modernization of Cosmetics Regulation Act)

| 항목 | 내용 |
|------|------|
| **시설등록 마감** | 2024-07-01 완료 (갱신: 등록일 기준 2년마다, 첫 갱신 **2026-07-01**) |
| **제품등록 마감** | 신규 제품은 유통 후 120일 이내, 이후 매년 업데이트 |
| **현황** | 시설 9,528건, 제품 589,762건 등록 완료 (2025-01-01 기준) |
| **GMP 규정** | 미발표 — 2026년 하반기 이후 최종 규칙 예상 (ISO 22716 선제 대응 권장) |
| **주요 예정** | 포름알데히드 금지 규정, 탈크 석면 검사 표준 (2026-03 최종), 향료 알레르겐 표시 (2026-05 제안) |

**한국 화장품 수출 기업 필수 조치:**
1. Form FDA 5066 (시설등록) + Form FDA 5067 (제품등록) 완료 확인
2. US Agent 지정 필수 (FDA 커뮤니케이션 및 검사 대응)
3. ISO 22716 기반 GMP 체계 사전 구축
4. 한국 선크림 수출 시 FDA 자외선차단 성분 규정 강화 주시

**휘슬 반영 사항:**
- MoCRA 등록 상태 체크 기능 (시설등록/제품등록/US Agent)
- 갱신 일정 자동 알림
- 구현 난이도: **보통** (DB에 등록 상태 필드 추가, 알림 시스템 연동)

---

### 1-3. 건강기능식품 (Dietary Supplements): NDI 요건

| 항목 | 내용 |
|------|------|
| **핵심 요건** | 1994-10-15 이전 미유통 성분은 NDI 통지 필수 (유통 75일 전 제출) |
| **2026 계획** | FDA, NDI 최종 가이던스 발표 예정 |
| **주요 동향** | GRAS 개혁, NDI 규제 현대화, 카페인 라벨링 가이드라인 |
| **참고** | NMN(니코틴아마이드 모노뉴클레오타이드) NDI 지위 복원 (2025-12) |

**휘슬 반영 사항:**
- 건강기능식품 수출 분석 시 NDI 통지 필요 여부 자동 체크
- 구현 난이도: **보통** (성분 DB 구축 필요)

---

### 1-4. OTC 의약품

| 항목 | 내용 |
|------|------|
| **OMUFA II** | 2025-11-12 서명, FY2026-2030 사용자 수수료 프로그램 재승인 |
| **수수료 변경** | FY2026 수수료율 공고 (2025-12-29), 전자결제만 가능 |
| **소량 변경 가이던스** | 고형 경구 제형 소량 변경 절차 간소화 (2025-06-05) |
| **Rx-to-OTC 전환** | 2026-11까지 이해관계자 참여 계획, 2027-05까지 가이던스 발표 |
| **선크림** | 베모트리지놀(bemotrizinol) 신규 자외선차단 활성 성분 제안 (수십년 만의 첫 신규) |

**휘슬 반영 사항:**
- OTC 수출 분석 시 OMUFA 수수료 정보 포함
- 구현 난이도: **쉬움** (프롬프트 업데이트)

---

### 1-5. 한국 제조사 대미 수출 핵심 체크리스트

| 분야 | 필수 조치 | 기한 |
|------|-----------|------|
| 화장품 | MoCRA 시설등록 갱신 | 2026-07-01 |
| 화장품 | US Agent 지정 유지 | 상시 |
| 화장품 | 향료 알레르겐 라벨링 준비 | 2026-05 이후 |
| 식품 | FSMA 204 추적성 시스템 구축 | 2028-07-20 |
| 건강기능식품 | NDI 통지 (신규 성분) | 유통 75일 전 |
| OTC | OMUFA 수수료 전자결제 전환 | 즉시 |

---

## 2. EU 규제 변경

### 2-1. Digital Product Passport (DPP)

| 항목 | 내용 |
|------|------|
| **법적 근거** | ESPR (Ecodesign for Sustainable Products Regulation), 2024-07 발효 |
| **중앙 레지스트리** | **2026-07** EU 중앙 디지털 레지스트리 구축 |
| **배터리** | **2027-02-18**부터 EV/산업용 배터리(2kWh 초과) QR 코드 의무 |
| **섬유/의류** | 2026 하반기~2027 초 위임입법 예상, 발표 후 12-18개월 준수 기간 |
| **철강** | 2027-2028 적용 예상 |
| **필수 데이터** | 소재 구성, 수리 가능성, 재활용성, 폐기물 관리 정보 |

**휘슬 반영 사항:**
- EU 수출 분석에 DPP 적용 대상 카테고리 자동 판별
- DPP 준비 체크리스트 (QR 코드, 데이터 항목) 리포트 포함
- 구현 난이도: **보통** (카테고리별 DPP 요건 DB 구축)

---

### 2-2. EU 화장품 규정 업데이트 (Regulation 1223/2009)

| 항목 | 시행일 | 내용 |
|------|--------|------|
| CMR 물질 금지 (Annex II) | **2025-09-01** | 과붕산, 은 나노입자, 탄소 나노튜브 금지 |
| CMR 물질 Omnibus VIII | **2026-05-01** | 은 나노입자, 특정 용제, 염모 중간체 퇴출 마감 |
| 향료 알레르겐 80종 표시 | **2026-07-31** | Leave-on 0.001%, Rinse-off 0.01% 초과 시 표시 |
| INCI 용어집 업데이트 | **2026-07-30** | 30,418 성분명, 348개 신규 추가 |

**휘슬 반영 사항:**
- EU 화장품 수출 분석 시 금지/제한 성분 자동 스크리닝
- 알레르겐 표시 요건 안내
- 구현 난이도: **보통** (성분 DB + 스크리닝 로직)

---

### 2-3. REACH 업데이트

| 항목 | 내용 |
|------|------|
| **SVHC 목록** | **253개 항목** (2026-02 기준, 36차 업데이트) |
| **최근 추가** | n-헥산 (신경독성 기준 최초 ELOC 포함), BPAF 및 염류 (생식독성) |
| **신규 제한** | DMAC, NEP 사용 제한 (2025-06-02, 생식독성 1B) |
| **의무** | SVHC 0.1% 초과 제품: 정보 전달 + SCIP 통지, 1톤/년 초과 시 SVHC 신고 |

**휘슬 반영 사항:**
- SVHC 포함 여부 경고 시스템
- SCIP 통지 필요성 안내
- 구현 난이도: **보통** (SVHC DB 253개 항목 + 자동 매칭)

---

### 2-4. CBAM (탄소국경조정메커니즘)

| 항목 | 내용 |
|------|------|
| **시행일** | **2026-01-01 정식 발효** (전환기 2023-2025 종료) |
| **대상 품목** | 시멘트, 철강, 알루미늄, 비료, 전력, 수소 |
| **등록 현황** | 12,000+ 사업자 신청, 4,100+ 인증 획득 (2026-01-07 기준) |
| **인증서 가격** | 분기별 EUA 경매 평균가 기준 |
| **결제 시작** | **2027년**부터 CBAM 인증서 구매 의무 |
| **미확정** | 제3국 탄소 가격 크레딧 위임입법 (2026 초 예상) |

**휘슬 반영 사항:**
- 철강/알루미늄/시멘트 등 CBAM 대상 품목 수출 시 탄소 비용 추정 기능
- CBAM 인증 절차 안내
- 구현 난이도: **어려움** (탄소 배출량 계산 API 연동, EUA 가격 데이터 필요)

---

### 2-5. EU 산림벌채 규정 (EUDR)

| 항목 | 내용 |
|------|------|
| **시행일** | **2026-12-30** (대규모 사업자), **2027-06-30** (소규모) |
| **연기 근거** | Regulation (EU) 2025/2650, IT 시스템 준비 부족 |
| **대상 품목** | 대두, 쇠고기, 팜유, 목재, 코코아, 커피, 고무 및 관련 파생 제품 |
| **의무** | 실사(Due Diligence) 의무, 지리 좌표 기반 추적 |
| **2026-04-30** | 유럽 위원회, 영향 평가 및 행정 부담 보고서 제출 |

**휘슬 반영 사항:**
- EUDR 대상 원료 포함 제품 식별
- 구현 난이도: **쉬움** (해당 품목 코드 기반 경고)

---

### 2-6. EU 포장재 폐기물 규정 (PPWR)

| 항목 | 내용 |
|------|------|
| **발효** | 2025-02-11 발효, **2026-08-12**부터 적용 |
| **빈 공간 규제** | 포장 빈 공간 40% 초과 금지 (전자상거래 포함) |
| **디지털 라벨** | **2027년**부터 QR 코드 의무 (소재 구성, 재활용성 정보) |
| **재활용 함량** | 2027-2030 단계적 시행 |
| **특징** | Regulation(직접 적용) — 회원국별 입법 불필요 |

**휘슬 반영 사항:**
- EU 수출 포장재 규격 체크리스트
- 구현 난이도: **쉬움** (프롬프트에 포장 요건 추가)

---

## 3. 일본 규제 변경

### 3-1. 약기법(PMD Act) 개정

| 항목 | 내용 |
|------|------|
| **개정일** | 2025-05-14 의회 통과, 2027-05까지 단계적 시행 |
| **품질/안전 관리** | MHLW 품질 이슈 시 핵심 인력 교체 명령 가능, 안전/품질 관리자 임명 의무 |
| **공급망 관리** | Supply System Manager 지정 의무, 공급 중단 시 MHLW 보고 |
| **조건부 승인 확대** | **2026-05** 발효, 의료기기 조건부 승인 대상 확대 |
| **eCTD v4.0** | **2026-04** PMDA 전자 제출 의무화 (세계 최초) |
| **FDA 동등 인정** | **2026-05-01** 미국 FDA를 동등 규제 기관으로 인정 (우선 심사) |

**휘슬 반영 사항:**
- 의료기기/의약품 대일 수출 분석 시 PMD Act 변경사항 반영
- 구현 난이도: **쉬움** (프롬프트 업데이트)

---

### 3-2. 식품위생법/식품라벨링법 변경

| 항목 | 시행일 | 내용 |
|------|--------|------|
| 영양강화용 식품첨가물 표시 의무 | 2025-03-28 | 기존 면제 삭제, 라벨 표시 필수 |
| 영양 라벨 기준 변경 | 2025-03-28 | 칼슘 RDA +20mg, 나트륨 RDA -0.2g |
| 비타민/미네랄 원재료 표시 | 2025-03-28 | 기존 면제 삭제, 원재료 표시 의무 |
| 냉동 조리식품 규정 | **2026-04-01** | 신규 라벨링 요건 적용 |
| 식품접촉 소재 포지티브리스트 | **2026-06-01** | 합성수지 FCM 허용 물질 목록제 전환 |
| FFC 라벨링 강화 | **2026-09-01** | 과다복용 경고, 의약품 상호작용, 비치료 목적 문구 의무 |

**휘슬 반영 사항:**
- 일본 수출 식품 라벨링 요건 체크리스트 자동 생성
- FFC(기능성 표시 식품) 규제 정보 포함
- 구현 난이도: **보통** (일본 식품라벨 DB 구축)

---

### 3-3. JAS 인증 업데이트

| 항목 | 내용 |
|------|------|
| 유기 JAS 기준 | 2025-01-01 발효 (식물/동물 유래), 2024-07-31 발효 (가공/사료) |
| EU-일본 동등성 | **2025-05-18** 동물 유래 유기 제품, 유기 주류까지 확대 |
| 유기 종자 의무 | **2026년**까지 모든 경우 유기 종자/묘목 사용 노력 의무 |

**한국->일본 수출 주의점:**
- 식품접촉 소재 포지티브리스트 전환 (2026-06-01): 포장재 소재 적합성 확인 필수
- 냉동 조리식품 신규 라벨링 (2026-04-01): K-Food 냉동식품 수출 시 라벨 변경 필요
- FFC 제품 120일 사전 신고, 강화된 라벨링 요건 (2026-09-01)

**휘슬 반영 사항:**
- 일본 수출 품목별 인증/라벨 요건 매칭
- 구현 난이도: **보통** (품목-요건 매핑 DB)

---

## 4. ASEAN 규제

### 4-1. ASEAN Cosmetic Directive (ACD) 최신

| 항목 | 시행일 | 내용 |
|------|--------|------|
| DEET | 즉시 | Annex II 추가 (금지) |
| Zinc Pyrithione(ZPT) | **2026-05-14** | 헤어 린스오프 1.0%, 리브온 0.1%, 보존제 용도 별도 기준 |
| Acid Yellow 3 | **2026-05-14** | 비산화 염모제 0.5% 제한 |
| Salicylic Acid | 2025-11-21 | 네일폴리시 0.5% |
| CMR 1A/1B 물질 | 진행중 | ASEAN 기준 적용 |

**휘슬 반영 사항:**
- ASEAN 화장품 수출 시 성분 적합성 자동 체크
- 10개국 개별 이행 상태 차이 안내
- 구현 난이도: **보통** (ACD Annex DB + 성분 매칭)

---

### 4-2. 인도네시아 SNI/BPOM 변경

| 항목 | 시행일 | 내용 |
|------|--------|------|
| SNI 식품포장 종이/판지 | **2026-07** | SNI 8218:2024 준수 의무 |
| 할랄 인증 의무화 | **2026-10-17** | 식품, 음료, 화장품 필수 (MRA 미체결 시에도) |
| 수입금지 품목 확대 | 2026-01 | Permendag No. 47/2025 신규 프레임워크 |
| 해외 SNI 인증 | 진행중 | 상표등록(DGIP) + 공식 대리인 지정 필수 |
| BPOM Reg. 25/2025 | 2025 | 화장품 성분 기술 요건 업데이트 |

**휘슬 반영 사항:**
- 인도네시아 수출 시 할랄 인증 필수 안내 (2026-10-17)
- SNI 인증 요건 체크리스트
- 구현 난이도: **보통** (인증 요건 DB + 체크리스트)

---

### 4-3. 베트남 수입규제 변경

| 항목 | 시행일 | 내용 |
|------|--------|------|
| 화학물질법 (No. 69/2025) | **2026-01-01** | Chapter 28/29 수입 화학물질 Single Window 신고 의무 |
| 조건부 화학물질 | 2026-01-17 | 786종 조건부 생산/거래, 241종 특별 통제 |
| 세관신고 의무화 | 2026 | 모든 수입 화물 세관신고 필수 |
| VAT법 개정 | 2025-07-01 | On-spot 수출입 0% VAT 적용 확대 |

**휘슬 반영 사항:**
- 베트남 화학물질 수출 시 자동 분류 (조건부/특별통제)
- 구현 난이도: **보통** (화학물질 목록 DB)

---

### 4-4. 태국 FDA 변경

| 항목 | 시행일 | 내용 |
|------|--------|------|
| 건강제품 통합 통관 | **2025-06-01** | Thai NSW 전자 시스템 의무화 (의료기기, 화장품, 식보, 원료) |
| 식품등록 프로세스 개편 | **2026-03-09** | 서류 심사와 실험실 검사 분리, 기능성식품 사전 실험 불필요 |
| 개인용 수입 규제 강화 | 2025 | FDA 관할 제품 수입 라이선스 필수화 |

**휘슬 반영 사항:**
- 태국 수출 시 Thai NSW 전자 시스템 안내
- 구현 난이도: **쉬움** (프롬프트 업데이트)

---

## 5. 한국 규제

### 5-1. 관세청: 전자통관 시스템 변경

| 항목 | 시행일 | 내용 |
|------|--------|------|
| UNI-PASS 전면 교체 | 2025-03-15 | 1,060억원 투입, 10년 노후 장비 전면 교체 완료 |
| 개인통관고유부호 갱신 | **2026-06-18** | 매년 갱신 의무 (기존 무기한 -> 연간) |
| 보세운송 신고 개선 | **2026-04-07** | 신고 서식 및 운송수단 프로세스 개선 |

**휘슬 반영 사항:**
- 통관 절차 정보 최신화 (UNI-PASS 신규 시스템 기준)
- 구현 난이도: **쉬움** (프롬프트 업데이트)

---

### 5-2. 식약처: 수출 관련 규정 변경

| 항목 | 시행일 | 내용 |
|------|--------|------|
| CES Food DB 개방 | 2025-01-02 | 글로벌 식품안전규제 정보시스템 (10개국 10개 품목) |
| 확대 계획 | **2026년** | 30개국 50개 품목으로 확대 (유럽, 중남미, 중동 포함) |
| 맞춤 이메일 알림 | 2025-06 | 규제 변경 시 기업별 맞춤 통지 |
| 대상 품목 | 진행중 | 라면, 김, 소스, 홍삼, 곡물가공품 등 주요 수출 품목 |

**휘슬 반영 사항:**
- CES Food DB API 연동 검토 (식약처 규제 정보 실시간 반영)
- 구현 난이도: **보통** (API 연동 시) / **쉬움** (수동 업데이트 시)

---

### 5-3. 산업통상자원부: 수출통제 변경

| 항목 | 내용 |
|------|------|
| **개정 시기** | 제37차 전략물자 수출입고시 개정 (2025-11-26 행정예고) |
| **AEO-CP 연계** | AEO 인증 기업 CP 심사 간소화 (중복 심사 면제) |
| **허가 유효기간** | 개별수출허가 유효기간 연장 가능 |
| **최종사용자 확인** | 수리/검사 목적 본사 수출, 소비재 개인용도 등 요건 완화 |
| **사후보고 기간** | 허가면제 거래 사후보고 7일 -> **3개월**로 연장 |

**휘슬 반영 사항:**
- 전략물자 해당 여부 사전 체크 기능
- AEO/CP 인증 상태에 따른 절차 간소화 안내
- 구현 난이도: **보통** (전략물자 품목 코드 DB + 판별 로직)

---

### 5-4. 외환거래법 변경

| 항목 | 시행일 | 내용 |
|------|--------|------|
| 외국환거래규정 개정 | 2025-02-10 | 재외이전비/재외한국인 재산인출 절차 통합 |
| 물품대금 보고 의무 폐지 | 2025-02-10 | 한국은행 보고 의무 삭제 |
| 보고 예외 | 2025-02-10 | 건당 $100,000 초과 + 선적 후 1년 초과 지급 시에만 보고 |
| 산업설비 예외 | 2025-02-10 | 선박/철도 등 산업설비 보고 면제 |

**휘슬 반영 사항:**
- 수출 대금 결제 조건 분석 시 외환 보고 요건 반영
- 구현 난이도: **쉬움** (프롬프트 업데이트)

---

## 종합: 휘슬 AI 구현 우선순위 매트릭스

### 즉시 반영 가능 (쉬움 - AI 프롬프트 수정)

| # | 항목 | 영향도 |
|---|------|--------|
| 1 | FSMA 204 기한 연장 (2028-07-20) 안내 | 높음 |
| 2 | CBAM 정식 발효 (2026-01-01) 안내 | 높음 |
| 3 | EUDR 연기 (2026-12-30) 안내 | 중간 |
| 4 | PPWR 포장 빈공간 40% 규칙 (2026-08-12) | 중간 |
| 5 | 일본 PMD Act 변경사항 | 낮음 |
| 6 | 태국 FDA 변경사항 | 낮음 |
| 7 | 한국 관세청/외환거래법 변경 | 중간 |
| 8 | FDA OTC 변경사항 | 낮음 |

### 다음 스프린트 (보통 - API 연동/DB 추가)

| # | 항목 | 영향도 |
|---|------|--------|
| 1 | MoCRA 등록 상태 관리 + 갱신 알림 | 높음 |
| 2 | EU 화장품 금지/제한 성분 스크리닝 | 높음 |
| 3 | REACH SVHC 253개 항목 자동 매칭 | 높음 |
| 4 | ASEAN ACD 성분 적합성 체크 | 중간 |
| 5 | 인도네시아 할랄 인증 + SNI 체크리스트 | 중간 |
| 6 | 일본 식품 라벨링 요건 DB | 중간 |
| 7 | DPP 대상 카테고리 판별 | 중간 |
| 8 | 베트남 화학물질 분류 DB | 낮음 |
| 9 | 식약처 CES Food DB API 연동 | 중간 |
| 10 | 전략물자 품목 코드 판별 | 중간 |
| 11 | NDI 통지 필요 여부 성분 DB | 낮음 |

### 장기 과제 (어려움 - 인프라 변경)

| # | 항목 | 영향도 |
|---|------|--------|
| 1 | CBAM 탄소 배출량 계산 + EUA 가격 연동 | 높음 |
| 2 | EUDR 지리좌표 기반 원산지 추적 시스템 | 중간 |
| 3 | 실시간 규제 변경 모니터링 + 자동 알림 | 높음 |

---

## 주요 출처

### 미국 FDA
- [FSMA 204 식품추적 규칙](https://www.fda.gov/food/food-safety-modernization-act-fsma/fsma-final-rule-requirements-additional-traceability-records-certain-foods)
- [FSMA 204 준수일 연장 (Federal Register)](https://www.federalregister.gov/documents/2025/08/07/2025-14967/requirements-for-additional-traceability-records-for-certain-foods-compliance-date-extension)
- [FDA FSMA 204 이해관계자 참여 및 가이던스](https://www.food-safety.com/articles/11158-fda-announces-fsma-204-stakeholder-engagement-initiative-releases-guidance)
- [MoCRA 시설등록/제품등록 가이던스](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/guidance-industry-registration-and-listing-cosmetic-product-facilities-and-products)
- [MoCRA 2026 갱신 안내](https://www.wiley.law/alert-Time-Flies-Cosmetic-Manufacturing-Facilities-are-Due-for-FDA-Registration-Renewal)
- [FDA HFP 우선순위 2026 (NDI/GRAS)](https://www.nutraingredients.com/Article/2026/01/26/fda-releases-hfp-priorities-all-eyes-on-modernizing-dietary-supplement-oversight-gras-ndis/)
- [OMUFA II FY2026 수수료](https://www.federalregister.gov/documents/2025/12/29/2025-23852/over-the-counter-monograph-drug-user-fee-amendments-otc-monograph-order-request-fee-rates-for-fiscal)
- [FDA 2026 전망](https://www.hklaw.com/en/insights/publications/2026/01/food-and-drug-administration-what-to-watch-in-2026)

### EU
- [EU DPP 2025-2026 현황](https://www.iticp.org/l/eu-digital-product-passports-what-s-new-in-2025-2026/)
- [DPP 타임라인 2026-2030](https://passportcraft.com/insights/dpp-timeline-2026-2030-every-deadline)
- [CBAM 2026-01-01 발효 공고](https://taxation-customs.ec.europa.eu/news/cbam-successfully-entered-force-1-january-2026-2026-01-14_en)
- [CBAM 2026 핵심 업데이트](https://www.integritynext.com/resources/blog/article/mastering-cbam-compliance-in-2026-latest-updates-and-how-companies-should-prepare)
- [REACH SVHC 253 항목](https://www.cirs-group.com/en/chemicals/eu-reach-officially-adds-2-new-substances-of-very-high-concern-svhc-list-updated-to-253-entries)
- [EUDR 2026-12 연기](https://trade.ec.europa.eu/access-to-markets/en/news/delay-until-december-2026-and-other-developments-implementation-eudr-regulation)
- [PPWR 2026-08-12 적용](https://www.gleisslutz.com/en/know-how/new-eu-packaging-regulation-key-requirements-august-2026)
- [EU 화장품 규정 CMR 업데이트](https://cosmeservice.com/news/eu-regulatory-developments-transforming-cosmetic-compliance-in-2025-and-beyond/)
- [EU 알레르겐 80종 표시](https://euverify.com/resource/upcoming-cosmetic-ingredient-bans-in-the-eu/)

### 일본
- [PMD Act 2025 개정](https://www.nishimura.com/en/knowledge/newsletters/lifesciences_healthcare_251022)
- [일본 식품라벨 변경 2026](https://label-bank.com/blog/)
- [일본 식품접촉소재 포지티브리스트](https://www.sgs.com/en/news/2025/08/safeguards-11425-japan-revises-specifications-and-standards-for-food-contact-materials)

### ASEAN
- [ACD 39차 ACC 회의 업데이트](https://www.fda.gov.ph/fda-circular-no-2025-002-updates-and-amendments-to-the-asean-cosmetic-directive-acd-as-adopted-during-the-39th-asean-cosmetic-committee-acc-meeting-and-its-related-meetings/)
- [ASEAN 화장품 2025 연말 리뷰](https://www.entercogroup.com/post/2025-asean-cosmetics-regulation-year-end-review)
- [인도네시아 BPOM Reg. 25/2025](https://en.reach24h.com/news/industry-news/cosmetic/indonesia-bpom-regulation-no-25-2025-cosmetic-ingredient-technical-requirements)
- [인도네시아 2026 수입금지](https://cptcorporate.com/indonesia-introduces-new-import-prohibitions-in-2026-and-what-it-means-for-new-companies/)
- [베트남 화학물질법 2026](https://en.reach24h.com/news/insights/chemical/vietnam-new-chemical-law-no-69-2025-qh15)
- [태국 FDA 건강제품 통합 통관](https://mahanakornpartners.com/thailands-fda-and-thai-customs-introduce-integrated-health-product-control-regulation/)
- [태국 식품등록 2026 신규정](https://www.siamdevelopment.com/thai-fda-food-registration-new-regulation-2026/)

### 한국
- [관세청 UNI-PASS 교체](https://www.customs.go.kr/kcs/na/ntt/selectNttInfo.do?mi=2891&bbsId=1362&nttSn=10136174)
- [개인통관고유부호 2026 갱신](https://www.customs.go.kr/kcs/na/ntt/selectNttInfo.do?mi=2891&bbsId=1362&nttSn=10142854)
- [전략물자 수출입고시 개정](https://www.lexology.com/library/detail.aspx?g=7943336a-a7e7-4bcf-a7d6-3937051dd4f4)
- [외국환거래규정 개정 2025](https://www.lexology.com/library/detail.aspx?g=0db8f664-7d28-4f5c-b969-f3f341460f95)
