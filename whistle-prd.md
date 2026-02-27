# Whistle AI — 유료 런칭 PRD
**작성자**: 서연 (서비스 기획)
**작성일**: 2026-02-25
**버전**: v1.0

---

## 0. 현황 진단 (Gap Analysis)

### 현재 개발 완료 항목
| 기능 | 상태 | 비고 |
|---|---|---|
| 회원가입 / 로그인 | ✅ 완료 | Supabase Auth |
| AI 수출분석 (URL/파일 입력) | ✅ 완료 | 릴레이 서버 API + 폴백 |
| 분석 결과 리포트 | ✅ 완료 | 점수/시장분석/로드맵 |
| 제품 카드 관리 | ✅ 완료 | 자동 등록 + AI 영문 카탈로그 |
| 수출 프로젝트 (6단계 파이프라인) | ✅ 완료 | 체크리스트/인증 추적 |
| 서비스 신청 (6종) | ✅ 완료 | 신청만 됨, 결제 없음 |
| PI/CI/PL 서류 자동생성 | ✅ 완료 | PDF 출력 가능 |
| 영문 이메일 허브 (6종 템플릿) | ✅ 완료 | 복사/메일앱 연동 |

### 핵심 미완성 항목 (런칭 블로커)
| 항목 | 중요도 | 비고 |
|---|---|---|
| **결제 시스템** | 🔴 Critical | 유료화 불가 |
| **무료→유료 전환 플로우** | 🔴 Critical | 수익 모델 미작동 |
| **알리바바 수작업 동기화 UI** | 🟠 High | API 전까지 운영 필요 |
| **바우처 결제 연동** | 🟠 High | 수출/제조혁신바우처 |
| **바이어 포털** (분리 화면) | 🟠 High | B2B 매칭 플로우 없음 |
| **물류비 계산기** | 🟡 Medium | 수출담당자 핵심 기능 |
| **배송 추적** | 🟡 Medium | 프로젝트 선적 단계 연동 |
| **모티브 관리자 어드민** | 🟠 High | 수작업 처리 위한 내부 툴 |

---

## 1. 문제 정의

### 핵심 사용자 문제
**"수출이 어렵다"는 인식 자체가 한국 중소 제조사의 글로벌 진출을 막고 있다.**

- 국내 중소 제조사/브랜드 대부분이 수출을 '해외 거래처 없으면 불가능'으로 인식
- 실제로는 준비 과정(인증/서류/바이어 발굴)이 불투명해 포기
- 기존 수출 컨설팅은 고비용(500만원~) + 결과 불확실

### Whistle이 해결할 문제
1. **인식 장벽**: "내 제품도 수출할 수 있나?"의 검증을 무료/즉시 제공
2. **정보 비대칭**: HS코드, 인증, 바이어 채널 등 전문지식 AI로 민주화
3. **단절된 프로세스**: 분석→인증→바이어→계약→물류→배송이 한 곳에서

---

## 2. 해결 방향 (서비스 아키텍처)

```
[미끼] 무료 AI 분석 (1회)
    ↓ 회원가입 + 기업정보 DB 수집
[전환] 분석 결과 리포트 → "이 제품 수출 가능합니다!"
    ↓ CTA: 프로젝트 시작 / 유료 서비스 신청
[수익] 프리미엄 분석 / 알리바바 입점 / 인증대행 / 바우처 결제
    ↓ 수출 프로세스 원스톱 진행
[플랫폼] 바이어 DB 구축 → 매칭 수수료 / 네이버 상품 역수출
```

### 수익 구조 (3-Track)
| Track | 대상 | 수익 방식 |
|---|---|---|
| **Track A. SaaS** | 수출 희망 제조사 | 월정액 구독 (Basic 9.9만, Pro 29.9만) |
| **Track B. 알리바바 대행** | B2B 수출 목표 | 총판 수수료 + 계정 세팅비 |
| **Track C. 바우처** | 수출/제조혁신바우처 보유 기업 | 바우처 직접 결제 |

---

## 3. 구체 스펙 (기능 요구사항)

### 3-1. 무료 분석 → 회원가입 퍼널 강화

**현재 문제**: 분석 시작 전에 이미 로그인 필요 → 진입 장벽 높음
**개선 방향**: 비로그인 무료 분석 1회 → 결과 확인 시 회원가입 유도

```
[랜딩] "내 제품 무료 분석하기" CTA
    ↓ 비로그인 상태로 URL/이미지 입력 가능
[분석 중] 로딩 화면 (30초) → 이메일 입력 유도 ("결과를 메일로 받으세요")
    ↓ 이메일 입력 → 회원가입 자동 완성
[결과] 리포트 일부 공개 (점수, 타겟 시장)
    → 전문 판단 / 실행 로드맵은 "시작하기" 버튼 뒤에 블러 처리
```

**입력 방법 (2가지)**
1. **URL 크롤링**: 쿠팡, 11번가, 네이버스마트스토어, 지마켓 상품 URL 붙여넣기
2. **파일 업로드**: 상세페이지 이미지, 제품소개서 PDF, 공장소개서 (현재 구현됨)

**추가 필요**: URL 입력 시 Playwright 크롤러가 상품명/가격/이미지/스펙을 자동 추출해 AI에 전달 (릴레이 서버에 `/api/crawl` 엔드포인트 추가)

---

### 3-2. 유료 플랜 / 결제 게이트웨이

**플랜 정의**
| 플랜 | 가격 | 포함 기능 |
|---|---|---|
| **FREE** | 0원 | AI 분석 1회, 리포트 기본 조회 |
| **BASIC** | 99,000원/월 | 분석 5회/월, 제품 10개, PI/CI/PL 생성 |
| **PRO** | 299,000원/월 | 분석 무제한, 바이어 매칭 1회, 서류 무제한, 이메일 허브 |
| **ALIBABA** | 별도 견적 | 알리바바 계정 + 입점 대행 + PRO 포함 |

**결제 구현 방식 (빠른 런칭 기준)**
- Phase 1 (즉시): 카카오 오픈채팅 / 텔레그램으로 견적 → 계좌이체 → 수동 플랜 업그레이드
- Phase 2 (2주 내): 토스페이먼츠 또는 KG이니시스 위젯 연동 (Supabase Edge Function)
- 바우처: "바우처 보유" 체크 → 관리자에게 알림 → 수동 처리 (우선)

---

### 3-3. 알리바바 동기화 (수작업 버전)

**대표님 요청**: API 붙기 전까지 수작업으로 휘슬서비스에 동기화

**구현 스펙**
- 제품 카드에 **"알리바바 동기화" 탭** 추가
- 입력 필드: 알리바바 제품 URL, 입점 상태 (draft/listed/active), 알리바바 가격, 노출 여부
- 모티브 어드민에서 수동으로 `alibaba_status` 필드 업데이트
- 사용자 화면에는 "알리바바 노출 중 ✅" / "동기화 요청 중 ⏳" 배지로 표시

**계정 유형 구분**
- `alibaba_plan: 'motive_managed'` → 모티브 총판 계정으로 운영
- `alibaba_plan: 'partner_own'` → 업체 자체 계정, 연간 결제 별도

---

### 3-4. 바이어 포털 (셀러와 분리)

**현재**: 바이어 테이블만 있고 바이어용 화면 없음
**필요**: 바이어가 한국 제품을 탐색하고 의뢰하는 별도 화면

**스펙**
- URL: `whistle.html#buyer` 또는 별도 `whistle-buyer.html`
- 바이어 회원가입 시 `role: 'buyer'` + 관심 카테고리/국가 입력
- 메인 화면: 카테고리별 한국 제품 카드 (공개 전환된 products 테이블)
- 의뢰서 제출 → 모티브 운영팀 매칭 후 셀러에게 연결
- 향후: 해외 바이어 → 한국 제조공장 직의뢰 (제조사 DB 구축 후)

---

### 3-5. 물류비 계산기 (선적 단계)

**대표님 언급**: "수출담당자들을 만든 배경이 이 부분"

**입력값**: 출발지(한국), 도착지(국가), 무게(kg), 부피(CBM), 운송 방식(항공/해운)
**출력값**: 예상 운임, 통관 비용, 예상 리드타임
**구현**: 외부 API (FreightOS, ShipBob) 또는 자체 단가표 기반 계산기 (Phase 1: 자체 단가표)
**위치**: 프로젝트 상세 > 선적 단계 패널에 "물류비 계산" 버튼 추가

---

### 3-6. 모티브 내부 어드민

**현재**: 어드민 없음 → 서비스 신청이 Supabase에만 쌓임
**필요**: 운영팀이 신청 처리, 플랜 변경, 알리바바 동기화를 할 수 있는 내부 툴

**어드민 최소 기능 (admin.html 활용)**
- 전체 회원 목록 + 플랜 현황
- 서비스 신청 목록 + 상태 변경 (pending → processing → completed)
- 알리바바 동기화 현황 + 수동 업데이트
- 수출 프로젝트 현황 (전체 고객)
- 바우처 신청 처리

---

## 4. 우선순위 (RICE 스코어링)

| 기능 | Reach | Impact | Confidence | Effort | RICE | 순서 |
|---|---|---|---|---|---|---|
| 결제 수동처리 (카카오/계좌이체) | 10 | 10 | 9 | 1 | 90 | **1순위** |
| 모티브 어드민 기본 기능 | 8 | 10 | 9 | 2 | 36 | **2순위** |
| 무료 분석 비로그인 퍼널 | 10 | 9 | 8 | 3 | 24 | **3순위** |
| 알리바바 동기화 수작업 UI | 6 | 9 | 9 | 2 | 27 | **3순위 (동)** |
| 유료 플랜 잠금/해제 로직 | 8 | 9 | 8 | 2 | 29 | **4순위** |
| 바이어 포털 기본 화면 | 5 | 8 | 7 | 4 | 7 | **5순위** |
| 물류비 계산기 | 6 | 7 | 7 | 3 | 14 | **6순위** |
| 바우처 신청 폼 | 7 | 8 | 9 | 1 | 56 | **2순위 (동)** |
| 토스 결제 자동화 | 10 | 10 | 7 | 5 | 14 | **7순위** |

---

## 5. 2주 런칭 로드맵

### Week 1 (2/25~3/3): MVP 런칭 가능 수준
| 날짜 | 작업 | 담당 | 결과물 |
|---|---|---|---|
| 2/25 | 현황 분석 + PRD 확정 | 서연 | 이 문서 |
| 2/26 | 모티브 어드민 서비스 신청 관리 | 개발 | admin.html 업데이트 |
| 2/26 | 바우처 신청 폼 추가 (services 페이지) | 개발 | 바우처 신청 플로우 |
| 2/27 | 유료 플랜 배지 + 잠금 UI | 개발 | 플랜별 기능 제한 표시 |
| 2/27 | 알리바바 동기화 탭 (제품 카드) | 개발 | 수작업 동기화 필드 |
| 2/28 | 랜딩 페이지 CTA 강화 + 회원가입 퍼널 | 개발 | 전환율 개선 |
| 3/1~3 | QA 테스트 + 버그 수정 | 전체 | 테스트 완료 |

### Week 2 (3/4~3/10): 유료 런칭
| 날짜 | 작업 |
|---|---|
| 3/4 | 첫 고객 온보딩 (수작업 결제 + 플랜 적용) |
| 3/5 | 바이어 포털 기본 화면 오픈 |
| 3/7 | 물류비 계산기 (자체 단가표 기반) |
| 3/10 | 토스페이먼츠 결제 자동화 (목표) |

---

## 6. Supabase DB 추가/변경 사항

### 추가 필요 컬럼
```sql
-- users 테이블
ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free'; -- free, basic, pro, alibaba
ALTER TABLE users ADD COLUMN plan_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN voucher_type TEXT; -- export, manufacturing
ALTER TABLE users ADD COLUMN alibaba_plan TEXT; -- motive_managed, partner_own

-- products 테이블
ALTER TABLE products ADD COLUMN alibaba_url TEXT;
ALTER TABLE products ADD COLUMN alibaba_status TEXT DEFAULT 'none'; -- none, requested, listed, active
ALTER TABLE products ADD COLUMN alibaba_product_id TEXT;
ALTER TABLE products ADD COLUMN is_public BOOLEAN DEFAULT false; -- 바이어 포털 노출 여부

-- service_requests 테이블
ALTER TABLE service_requests ADD COLUMN voucher_used BOOLEAN DEFAULT false;
ALTER TABLE service_requests ADD COLUMN payment_method TEXT; -- card, bank_transfer, voucher
ALTER TABLE service_requests ADD COLUMN payment_confirmed BOOLEAN DEFAULT false;
```

### 신규 테이블
```sql
-- 바이어 의뢰 테이블
CREATE TABLE buyer_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID REFERENCES users(id),
  category TEXT,
  target_countries TEXT[],
  description TEXT,
  budget_range TEXT,
  status TEXT DEFAULT 'pending', -- pending, matched, contracted
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 물류 추적 테이블
CREATE TABLE shipment_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  carrier TEXT,
  tracking_number TEXT,
  status TEXT,
  estimated_arrival DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 7. 미결 리스크

| 리스크 | 가능성 | 영향 | 대응 |
|---|---|---|---|
| URL 크롤링 차단 (쿠팡, 네이버) | 높음 | 핵심 기능 | 파일 업로드를 기본 경로로 설정, 크롤링은 보조 |
| 릴레이 서버 다운 시 분석 실패 | 중간 | 사용자 경험 | 폴백 genReport() 이미 구현됨 (유지) |
| 알리바바 API 계약 지연 | 높음 | 수작업 기간 연장 | 수작업 UI 완성도 높여 서비스 지속 가능하게 |
| 바우처 심사 거절 | 낮음 | 결제 플랜 차질 | 카드/계좌이체 병행 제공 |
| 바이어 DB 부족 | 중간 | 매칭 서비스 품질 | 알리바바 바이어 DB 활용 + 네이버 수출지원센터 연계 |

---

*다음 기획 업무: 바이어 포털 상세 IA / 물류비 계산기 로직 정의 / 수출바우처 신청 프로세스 SOP*
