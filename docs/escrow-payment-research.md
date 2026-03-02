# B2B 무역 플랫폼 안전결제(에스크로) 시스템 구축 연구

> 작성일: 2026-03-02
> 대상: 휘슬(Whistle) AI - 수출 통합 관리 솔루션
> 목적: Stripe / Toss Payments 기반 B2B 에스크로 결제 시스템 실현 가능성 조사

---

## 목차

1. [에스크로 기본 구조](#1-에스크로-기본-구조)
2. [Stripe 기반 B2B 결제](#2-stripe-기반-b2b-결제)
3. [Toss Payments 기반](#3-toss-payments-기반)
4. [거래 단계별 결제 플로우](#4-거래-단계별-결제-플로우)
5. [수익 모델](#5-수익-모델)
6. [법적/규제 리스크](#6-법적규제-리스크)
7. [권장 아키텍처](#7-권장-아키텍처-종합-제안)
8. [참고 자료](#8-참고-자료)

---

## 1. 에스크로 기본 구조

### 1.1 자금 흐름 개요

```
바이어(해외)                  휘슬 플랫폼                    제조사(한국)
    |                           |                              |
    |-- 1. 결제 요청 ---------->|                              |
    |                           |-- 2. PG/Stripe에 결제 ------>|
    |                           |   (자금 보관)                 |
    |                           |                              |
    |                           |-- 3. 제조사에 주문 통보 ----->|
    |                           |                              |
    |                           |<- 4. 생산/출하 확인 ---------|
    |<- 5. 배송 추적 ----------|                              |
    |                           |                              |
    |-- 6. 수령/구매 확인 ----->|                              |
    |                           |-- 7. 정산(대금 지급) ------->|
    |                           |   (수수료 차감 후)            |
```

**핵심 원칙**: 휘슬이 직접 자금을 보관하지 않는다. PG사 또는 Stripe가 자금을 보관하고, 휘슬은 "정산 지시"만 한다.

### 1.2 에스크로의 법적 정의

에스크로(Escrow)란 구매자가 결제한 금액을 신뢰할 수 있는 제3자가 일정 기간 보관했다가, 약정 조건이 충족되면 판매자에게 전달하는 거래 보호 메커니즘이다.

한국 전자상거래법에서는 통신판매업자에게 에스크로 서비스 의무를 부과하고 있으며, 10만원 이상 거래 시 소비자가 에스크로를 선택할 수 있도록 해야 한다.

### 1.3 PG/에스크로 라이선스 필요 여부

| 구분 | 내용 |
|------|------|
| **직접 에스크로 운영** | 전자금융업 등록 필수 (자본금 10억 이상, 전산인력 5인 이상, 부채비율 200% 이내) |
| **PG사 지급대행 이용** | 전자금융업 등록 불필요 (PG사가 라이선스 보유) |
| **Stripe Connect 이용** | 한국 전자금융업 등록 불필요 (Stripe가 해외 라이선스 보유, 단 한국 내 원화 결제 수취 시 별도 검토) |

**결론: 휘슬은 직접 에스크로 라이선스를 취득하지 않고, PG사(Toss) 또는 해외 결제 플랫폼(Stripe)의 기능을 활용하는 "지급대행" 방식이 현실적이다.**

### 1.4 에스크로 vs 지급대행 비교

| 항목 | 에스크로 | 지급대행 |
|------|----------|----------|
| **목적** | 소비자 보호 (상품 수령 확인 후 지급) | 플랫폼 정산 효율화 (대금 분배) |
| **법적 근거** | 전자상거래법 | 전자금융거래법 |
| **자금 보관 주체** | PG사/은행 | PG사 |
| **적용 대상** | B2C 통신판매 의무, B2B는 자율 | 오픈마켓/중개 플랫폼 |
| **휘슬 적용** | B2B이므로 법적 의무는 없으나 신뢰 확보 수단 | 필수 - 여러 셀러 정산 시 |

### 1.5 에스크로 없이 합법적으로 자금을 중간 보관하는 방법

1. **PG사 지급대행 서비스**: Toss Payments, KG이니시스 등의 지급대행 서비스를 이용하면, PG사 명의의 별도 계좌(수탁계좌)에 거래대금을 보관. 플랫폼 운영자금과 완전 분리되어 법적 리스크 최소화.

2. **Stripe Connect 수동 정산(Manual Payouts)**: Stripe가 자금을 Connected Account의 Stripe 잔액에 보관하고, 플랫폼이 API로 정산 시점을 제어. 최대 90일(미국은 2년)까지 보관 가능.

3. **은행 에스크로 이체 서비스**: 우리은행, KB국민은행 등이 제공하는 에스크로 이체 서비스를 직접 이용. 은행이 자금을 보관하므로 라이선스 불필요.

4. **해외 에스크로 전문 서비스**: Escrow.com 등 글로벌 에스크로 전문 업체의 마일스톤 결제 기능을 API로 연동.

---

## 2. Stripe 기반 B2B 결제

### 2.1 Stripe Connect 활용 구조

Stripe Connect는 마켓플레이스/플랫폼이 다자간 결제를 처리할 수 있도록 설계된 제품이다.

```
[바이어(해외)] --결제--> [휘슬 Platform Account] --정산--> [제조사 Connected Account]
                              |
                         Stripe 수수료 차감
                         + 플랫폼 수수료 차감
```

#### Connect Account 유형 비교

| 유형 | 월 비용 | 특징 | 휘슬 적합도 |
|------|---------|------|------------|
| **Standard** | 무료 | Stripe 대시보드 접근 가능, 판매자 온보딩 간편 | 중 |
| **Express** | $2/활성 계정 | 플랫폼 브랜딩 가능, 간소화된 온보딩 | 상 |
| **Custom** | $2/활성 계정 | 완전 커스터마이징, 판매자 UI 직접 구현 | 상 (장기) |

**권장: Express Account** - 초기에는 Express로 시작하여, 서비스 성숙 후 Custom으로 전환.

#### Charge Type 비교

| 방식 | 설명 | B2B 무역 적합도 |
|------|------|-----------------|
| **Direct Charges** | 결제가 Connected Account에 직접 생성 | 낮음 (플랫폼 제어 부족) |
| **Destination Charges** | 결제가 Platform에 생성, 자동으로 Connected Account에 전송 | 중간 |
| **Separate Charges & Transfers** | 결제와 전송을 분리하여 제어 | **최적** (마일스톤 결제에 적합) |

**권장: Separate Charges and Transfers** - B2B 무역에서는 결제 후 생산, 검수, 출하 등 여러 단계를 거치므로 자금 전송 시점을 플랫폼이 완전 제어해야 한다.

### 2.2 Stripe 에스크로 유사 기능 구현

Stripe는 공식적으로 "에스크로 계좌"를 제공하지 않지만, 다음 기능 조합으로 동일한 효과를 구현할 수 있다.

#### 방법 1: Manual Capture (인증 후 수동 캡처)

```javascript
// 1단계: 결제 인증만 수행 (자금 홀드)
const paymentIntent = await stripe.paymentIntents.create({
  amount: 10000, // $100.00
  currency: 'usd',
  capture_method: 'manual', // 수동 캡처 설정
  payment_method_types: ['card'],
});

// 2단계: 조건 충족 시 캡처 (실제 결제)
const captured = await stripe.paymentIntents.capture(
  paymentIntent.id,
  { amount_to_capture: 10000 }
);
```

**제한사항**: 카드 인증 유효 기간이 7일이므로, B2B 무역(수주~배송 수 주~수 개월)에는 **부적합**.

#### 방법 2: Delayed Payouts (지연 정산) - 권장

```javascript
// Connected Account 생성 시 수동 정산 설정
const account = await stripe.accounts.create({
  type: 'express',
  settings: {
    payouts: {
      schedule: {
        interval: 'manual', // 수동 정산
      },
    },
  },
});

// 바이어 결제 처리 (즉시 결제, 정산은 보류)
const paymentIntent = await stripe.paymentIntents.create({
  amount: 50000, // $500.00
  currency: 'usd',
  transfer_data: {
    destination: 'acct_제조사계정ID',
  },
});

// 조건 충족 시 정산 실행
const payout = await stripe.payouts.create(
  { amount: 47500, currency: 'usd' }, // 수수료 차감 후
  { stripeAccount: 'acct_제조사계정ID' }
);
```

**보관 기간**: 최대 90일 (미국 기반 계정은 최대 2년)
**적합성**: B2B 무역의 일반적인 거래 사이클(주문~배송 30~60일)에 충분

#### 방법 3: Separate Charges + Manual Transfers (분리 결제 + 수동 전송)

```javascript
// 1단계: 플랫폼 계정으로 결제 수취
const charge = await stripe.paymentIntents.create({
  amount: 100000, // $1,000.00
  currency: 'usd',
});

// 2단계: 마일스톤 달성 시 부분 전송
// 계약금 단계: 제조사에 30% 전송
await stripe.transfers.create({
  amount: 28500, // $285 (30% - 플랫폼 수수료 5%)
  currency: 'usd',
  destination: 'acct_제조사계정ID',
  transfer_group: 'ORDER_12345',
});

// 출하 확인 단계: 잔금 70% 전송
await stripe.transfers.create({
  amount: 66500, // $665 (70% - 플랫폼 수수료 5%)
  currency: 'usd',
  destination: 'acct_제조사계정ID',
  transfer_group: 'ORDER_12345',
});
```

**이 방식이 B2B 마일스톤 결제에 가장 적합하다.**

### 2.3 멀티통화 지원

Stripe는 135개 이상의 통화를 지원한다.

| 통화 | 지원 여부 | 비고 |
|------|----------|------|
| USD (미국 달러) | O | 기본 결제 통화로 권장 |
| EUR (유로) | O | 유럽 바이어 대응 |
| JPY (일본 엔) | O | 일본 바이어 대응 |
| GBP (영국 파운드) | O | |
| CNY (중국 위안) | X | 중국 규제로 직접 지원 불가 (Alipay/WeChat Pay는 가능) |
| KRW (한국 원) | O | 2024년 10월부터 한국 로컬 결제 지원 시작 |

**멀티통화 정산**: 플랫폼이 여러 통화로 결제를 수취하고, 각 Connected Account에 해당 통화 또는 환전 후 정산 가능. 단, 같은 리전 내 계정만 지원.

### 2.4 수수료 구조

#### Stripe 기본 수수료 (미국 기준)

| 항목 | 수수료율 |
|------|----------|
| 국내 카드 결제 | 2.9% + $0.30 |
| 해외 카드 결제 | 3.9% + $0.30 (국내 2.9% + 해외 카드 1%) |
| 통화 변환 수수료 | +1% |
| 해외 카드 + 통화 변환 합산 | 4.4% + $0.30 |
| ACH (은행 이체) | 0.8% (최대 $5) |
| Wire Transfer | $8/건 |

#### Stripe Connect 추가 수수료

| 항목 | 수수료 |
|------|--------|
| Express/Custom 계정 유지 | $2/활성 계정/월 |
| 정산(Payout) 수수료 | 0.25% + $0.25/건 |
| Cross-border 정산 | +0.25%~1% (리전에 따라 다름) |
| Instant Payout | 1% (최소 $0.50) |

#### 플랫폼 수수료 설정 예시 (휘슬)

```
바이어 결제: $10,000
  - Stripe 수수료: -$320 (3.9% + $0.30, 해외 카드 기준)
  - 휘슬 플랫폼 수수료: -$200 (2%)
  - Connect 정산 수수료: -$25.25 (0.25% + $0.25)
  ────────────────────
  제조사 수취: $9,454.75
```

### 2.5 한국 셀러(제조사) Stripe 정산 현황

#### 핵심 제약 (2026년 3월 기준)

| 항목 | 상태 |
|------|------|
| 한국 법인이 Stripe 계정 개설 | **불가** (한국 지사 미설립, 금융규제 미통과) |
| 해외 법인이 한국 고객 원화 결제 수취 | **가능** (2024년 10월부터) |
| Stripe Connect Cross-border Payouts (한국) | **미지원** (US/UK/EEA/CA/CH 리전만 지원) |
| Stripe Global Payouts (한국) | **확인 필요** (2025-2026년 지원 국가 확대 중) |

#### 한국 셀러 정산 우회 방안

1. **해외 법인 경유**: 한국 셀러가 미국/홍콩 등에 법인을 설립하고 해당 법인으로 Stripe 계정 개설 후 정산. 그 후 한국 본사로 송금.
   - 장점: Stripe 생태계 완전 활용
   - 단점: 법인 설립/유지 비용, 이중 과세 리스크

2. **Stripe Global Payouts 활용**: Stripe의 Global Payouts 프로그램은 50개국 이상에 직접 송금을 지원. 한국이 포함되었는지 확인 필요 (2026년 1월 15개국 추가 발표).
   - 장점: 법인 없이 직접 한국 계좌 수취 가능 (지원 시)
   - 단점: 별도 프로그램이므로 Connect와 통합 복잡도 있음

3. **하이브리드 모델 (권장)**: 해외 바이어 결제는 Stripe로 수취하고, 한국 셀러 정산은 별도 송금 서비스(Wise, Payoneer 등) 또는 국내 PG(Toss)를 통해 처리.
   - 장점: 각 구간에 최적화된 서비스 활용
   - 단점: 시스템 복잡도 증가

### 2.6 Stripe 한국 지원 현황 요약 (2025-2026)

| 시점 | 변경 사항 |
|------|-----------|
| 2024.10 | 한국 로컬 결제 수단 지원 시작 (카드, 네이버페이, 카카오페이 등) - 개발자 베타 |
| 2025.05 | Payment Method Configurations API에 한국 결제수단 추가 |
| 2025.12 | Global Payouts 13개국 추가 |
| 2026.01 | Global Payouts 15개국 추가 |
| 미정 | 한국 법인의 Stripe 계정 개설 허용 (한국 지사 설립 전제) |

---

## 3. Toss Payments 기반

### 3.1 Toss Payments 에스크로 결제 API

#### 지원 결제수단

| 결제수단 | 에스크로 지원 | 수수료 |
|----------|-------------|--------|
| 신용/체크카드 | O | 기본 3.4% + 에스크로 0.2% = **3.6%** |
| 계좌이체 | O | 기본 2.0% + 에스크로 0.2% = **2.2%** |
| 가상계좌 | O | 기본 400원 + 에스크로 200원 = **600원/건** |
| 간편결제 (토스페이 등) | X (에스크로 미지원) | 3.4% |
| 해외결제 (PayPal) | X (에스크로 미지원) | 4.0% + $0.30 + 환전 2.5% |

#### 에스크로 결제 플로우

```
1. 결제 요청 (useEscrow: true 파라미터 설정)
     └─ 결제수단 선택 시 에스크로 체크박스 자동 표시
2. 결제 승인 → 토스페이먼츠가 대금 보관
3. 상점이 배송 정보 등록 (API 호출)
4. 구매자에게 구매확정 이메일 발송
5-a. 구매자 구매 확정 → 상점에 대금 정산
5-b. 구매자 구매 거절 → 환불 프로세스 진행
```

#### API 구현 예시

```javascript
// 1. 에스크로 결제 요청
const payment = await tossPayments.requestPayment('카드', {
  amount: 50000,
  orderId: 'ORDER_12345',
  orderName: '수출 상품 계약금',
  useEscrow: true, // 에스크로 사용
  escrowProducts: [
    {
      id: 'PRODUCT_001',
      name: '한국 화장품 세트',
      code: '123456',
      unitPrice: 50000,
      quantity: 1,
    },
  ],
});

// 2. 배송 정보 등록
await fetch('https://api.tosspayments.com/v1/payments/{paymentKey}/escrow/logistics', {
  method: 'POST',
  headers: {
    Authorization: 'Basic ' + btoa(secretKey + ':'),
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    company: '대한통운',
    invoiceNumber: '1234567890',
    sendAt: '2026-03-10',
  }),
});

// 3. 구매 확정/거절은 토스페이먼츠 이메일을 통해 소비자가 직접 처리
```

### 3.2 B2B 결제 지원 여부

| 항목 | 상태 | 설명 |
|------|------|------|
| B2B 결제 지원 | **제한적** | 기본적으로 B2C 온라인 쇼핑몰 대상 설계 |
| 세금계산서 연동 | O | B2B 거래 시 세금계산서 발행 가능 |
| 대금 분할 결제 | X | 계약금/잔금 분리 결제 네이티브 미지원 |
| 마일스톤 결제 | X | 단건 에스크로만 지원, 다단계 마일스톤 미지원 |
| 고액 결제 | 제한적 | 카드 한도 제한 (통상 300만원~500만원), 가상계좌는 제한 없음 |

### 3.3 해외 바이어 Toss 결제 가능 여부

| 시나리오 | 가능 여부 | 설명 |
|----------|----------|------|
| 해외 발급 카드로 결제 | **불가** | 토스페이먼츠는 한국 발급 카드만 지원 |
| PayPal 연동 결제 | **가능** | 해외 바이어가 PayPal로 결제, USD 기준 |
| 해외 계좌이체 | **불가** | 한국 은행 계좌만 지원 |
| 토스페이/카카오페이 | **불가** | 한국 사용자만 이용 가능 |

**결론: 해외 바이어의 경우 Toss Payments는 PayPal 연동을 제외하면 사실상 이용 불가. 해외 바이어 결제는 Stripe가 필수.**

### 3.4 Toss Payments 전체 수수료 구조

| 항목 | 수수료 |
|------|--------|
| 가입비 | 220,000원 (최초 1회) |
| 연관리비 | 110,000원 (연 1회) |
| 신용/체크카드 | 3.4% |
| 계좌이체 | 2.0% (최저 건당 200원) |
| 가상계좌 | 건당 400원 |
| 간편결제 | 3.4% |
| 에스크로 (카드) | +0.2% |
| 에스크로 (계좌이체) | +0.2% |
| 에스크로 (가상계좌) | +건당 200원 |
| 해외결제 (PayPal) | 4.0% + $0.30 + 환전 2.5% |
| 브랜드페이 | 4.3% |
| 모든 수수료 VAT | +10% 별도 |

---

## 4. 거래 단계별 결제 플로우

### 4.1 B2B 무역 9단계 결제 플로우

```
1. 견적 합의 → 2. PI 발행 → 3. 계약금(30%) 결제 → 4. 생산
→ 5. 검수 → 6. 잔금(70%) 결제 → 7. 출하 → 8. 도착 확인 → 9. 정산
```

### 4.2 각 단계별 자금 이동 상세

#### Stage 1: 견적 합의 (Quotation Agreement)
- **자금 이동**: 없음
- **시스템 동작**: 견적서(Quotation) 생성, 바이어-셀러 간 가격/조건 협의
- **결제 관련**: 합의된 금액, 결제 조건(T/T, L/C 등), 분할 비율 확정

#### Stage 2: PI(Proforma Invoice) 발행
- **자금 이동**: 없음
- **시스템 동작**: PI 자동 생성, 결제 링크(Payment Link) 생성
- **결제 관련**: 결제 금액, 통화, 분할 스케줄 확정

```javascript
// Stripe Payment Link 생성
const paymentLink = await stripe.paymentLinks.create({
  line_items: [{
    price_data: {
      currency: 'usd',
      product_data: { name: 'Order #12345 - Deposit (30%)' },
      unit_amount: 300000, // $3,000
    },
    quantity: 1,
  }],
  metadata: {
    order_id: 'ORDER_12345',
    payment_type: 'deposit', // deposit | balance
    milestone: '1_of_2',
  },
});
```

#### Stage 3: 계약금(30%) 결제
- **자금 이동**: 바이어 → Stripe Platform Account (실제 결제)
- **제조사 정산**: 아직 전송하지 않음 (생산 시작 확인 후)
- **Stripe 처리**:

```javascript
// Separate Charge 생성 (플랫폼 계정으로 결제)
const depositPayment = await stripe.paymentIntents.create({
  amount: 300000, // $3,000 (30%)
  currency: 'usd',
  metadata: {
    order_id: 'ORDER_12345',
    payment_type: 'deposit',
  },
  transfer_group: 'ORDER_12345',
});
```

#### Stage 4: 생산 (Production)
- **자금 이동**: 플랫폼 → 제조사 (계약금의 일부, 생산 착수금)
- **조건**: 제조사가 생산 착수를 시스템에 보고한 후
- **Stripe 처리**:

```javascript
// 생산 착수 확인 후 제조사에 계약금 70% 전송 (전체의 21%)
await stripe.transfers.create({
  amount: 210000, // $2,100
  currency: 'usd',
  destination: 'acct_제조사ID',
  transfer_group: 'ORDER_12345',
  metadata: { milestone: 'production_start' },
});
```

#### Stage 5: 검수 (Inspection)
- **자금 이동**: 없음 (검수 통과 시 다음 단계로)
- **시스템 동작**: 검수 사진/영상 업로드, QC 리포트 생성
- **분쟁 가능 시점**: 검수 불합격 시 환불 또는 재생산 결정

#### Stage 6: 잔금(70%) 결제
- **자금 이동**: 바이어 → Stripe Platform Account
- **조건**: 검수 통과 확인 후 잔금 결제 링크 활성화

```javascript
// 잔금 결제
const balancePayment = await stripe.paymentIntents.create({
  amount: 700000, // $7,000 (70%)
  currency: 'usd',
  metadata: {
    order_id: 'ORDER_12345',
    payment_type: 'balance',
  },
  transfer_group: 'ORDER_12345',
});
```

#### Stage 7: 출하 (Shipment)
- **자금 이동**: 플랫폼 → 제조사 (계약금 잔여 + 잔금의 일부)
- **조건**: B/L(선하증권) 업로드 확인 후

```javascript
// 출하 확인 후 제조사에 추가 전송
await stripe.transfers.create({
  amount: 600000, // $6,000
  currency: 'usd',
  destination: 'acct_제조사ID',
  transfer_group: 'ORDER_12345',
  metadata: { milestone: 'shipment_confirmed' },
});
```

#### Stage 8: 도착 확인 (Delivery Confirmation)
- **자금 이동**: 플랫폼 → 제조사 (잔여 전액)
- **조건**: 바이어가 수령 확인 버튼 클릭 또는 자동 확인(배송 후 14일)

```javascript
// 최종 정산 (잔여금 전송)
const remainingAmount = totalAmount - alreadyTransferred - platformFee;
await stripe.transfers.create({
  amount: remainingAmount,
  currency: 'usd',
  destination: 'acct_제조사ID',
  transfer_group: 'ORDER_12345',
  metadata: { milestone: 'delivery_confirmed' },
});
```

#### Stage 9: 정산 (Settlement)
- **자금 이동**: Stripe Connected Account → 제조사 은행 계좌
- **Stripe 처리**: Connected Account의 잔액을 외부 은행 계좌로 정산(Payout)

### 4.3 마일스톤별 자금 분배 요약

| 마일스톤 | 바이어 결제 | 제조사 수취 | 플랫폼 보관 |
|----------|-----------|-----------|-----------|
| PI 발행 | - | - | - |
| 계약금 결제 (30%) | $3,000 | - | $3,000 |
| 생산 착수 | - | $2,100 (21%) | $900 |
| 검수 통과 | - | - | $900 |
| 잔금 결제 (70%) | $7,000 | - | $7,900 |
| 출하 확인 | - | $6,000 (60%) | $1,900 |
| 도착 확인 | - | $1,400 (14%) | $500 |
| 최종 정산 | - | - | $500 (수수료) |
| **합계** | **$10,000** | **$9,500** | **$500 (5%)** |

### 4.4 분쟁 발생 시 환불 프로세스

#### 분쟁 시나리오별 처리

| 시나리오 | 시점 | 환불 규모 | 처리 방식 |
|----------|------|----------|----------|
| 생산 전 주문 취소 | Stage 3-4 | 계약금 전액 (조건부) | Stripe Refund API |
| 검수 불합격 | Stage 5 | 전액 또는 재생산 | 중재 후 결정 |
| 배송 중 파손 | Stage 7-8 | 파손 비율만큼 | 보험 청구 + 부분 환불 |
| 수량/품질 불일치 | Stage 8 | 차이분 | 중재 후 부분 환불 |
| 미도착 | Stage 8 | 잔금 전액 | 배송 추적 확인 후 |

#### Stripe 환불 구현

```javascript
// 전액 환불
const refund = await stripe.refunds.create({
  payment_intent: 'pi_결제ID',
  reason: 'requested_by_customer',
});

// 부분 환불
const partialRefund = await stripe.refunds.create({
  payment_intent: 'pi_결제ID',
  amount: 200000, // $2,000 부분 환불
  reason: 'requested_by_customer',
  metadata: { dispute_id: 'DISPUTE_001' },
});

// 이미 제조사에 전송된 금액 회수 (Transfer Reversal)
const reversal = await stripe.transfers.createReversal(
  'tr_전송ID',
  { amount: 200000 }
);
```

#### 분쟁 해결 프로세스

```
1. 바이어가 분쟁 제기 (플랫폼 내 버튼)
2. 자동으로 정산 일시 중지 (해당 주문)
3. 양측에 증거 제출 요청 (사진, 서류, 채팅 기록)
4. 플랫폼 중재자 검토 (7일 이내)
5-a. 바이어 유리 판정 → 환불 처리
5-b. 셀러 유리 판정 → 정산 재개
5-c. 부분 합의 → 합의 금액에 따라 처리
6. 결과 통보 및 자금 이동
```

---

## 5. 수익 모델

### 5.1 거래 수수료

#### 업계 벤치마크

| 플랫폼 | 수수료율 | 대상 | 비고 |
|--------|---------|------|------|
| **Alibaba Trade Assurance** | 2-3% | 셀러 부담 | 건당 상한 $100-$350 |
| **Amazon B2B** | 6-15% | 셀러 부담 | 카테고리별 차등 |
| **Global Sources** | 0% (거래) | - | 멤버십 + 광고 수익 |
| **Made-in-China** | 0% (거래) | - | 멤버십 수익 |
| **Escrow.com** | 0.89-3.25% | 바이어 또는 셀러 | 금액 구간별 차등 |
| **TradeKey** | 0% (거래) | - | 프리미엄 멤버십 |

#### 휘슬 권장 수수료 모델

| 거래 금액 구간 | 수수료율 | 근거 |
|---------------|---------|------|
| $1,000 이하 | 5% | 소액 거래 관리 비용 반영 |
| $1,001 ~ $10,000 | 3% | 중소 거래 표준 |
| $10,001 ~ $50,000 | 2% | 알리바바 수준 |
| $50,001 이상 | 1.5% | 대형 거래 유치 |
| 반복 거래 (3회 이상) | 추가 0.5% 할인 | 고객 락인 |

**수수료 부담 주체**: 셀러(제조사) 또는 바이어-셀러 분담 (거래 시 선택)

### 5.2 에스크로 보관 이자 수익

| 항목 | 내용 |
|------|------|
| **원리** | 바이어 결제 후 셀러 정산까지 보관 기간 동안의 이자 |
| **평균 보관 기간** | 30-60일 (무역 거래 기준) |
| **이자율 예시** | 연 4-5% (USD 기준 머니마켓) |
| **월간 이자** | $100,000 보관 시 약 $330-$416/월 |
| **주의사항** | Stripe 보관 자금에는 이자 없음. 자체 수탁 계좌 필요 시만 가능. 규제 검토 필수 |

**현실적 판단**: 초기에는 거래량이 적어 이자 수익은 무의미. 거래량 증가 후 검토.

### 5.3 프리미엄 서비스 수익

| 서비스 | 가격 모델 | 예상 수익 |
|--------|----------|----------|
| **거래 보험** | 거래금액의 1-2% | 바이어 안심 서비스 |
| **프리미엄 에스크로** (빠른 정산) | 거래금액의 0.5% | 셀러 즉시 정산 서비스 |
| **분쟁 중재 서비스** | 건당 $50-$200 | 전문 중재 |
| **신용 평가 리포트** | 건당 $30-$100 | 바이어/셀러 신용도 |
| **무역 서류 자동화** | 월 $29-$99 | PI/CI/PL/CO 자동 생성 |
| **수출 컨설팅** | 시간당 / 프로젝트당 | AI 수출 분석 연계 |

### 5.4 수익 시뮬레이션

```
[월간 거래 시나리오]
- 활성 거래: 50건
- 평균 거래금액: $5,000
- 총 거래 규모: $250,000/월

[수익 계산]
- 거래 수수료 (평균 3%): $7,500
- Stripe 비용 (-4.4% 해외카드 평균): -$11,000
  → Stripe 비용은 바이어에게 전가하거나 수수료에 포함
  → 실제 수수료 모델: 바이어에게 결제 수수료 별도 청구
- 프리미엄 서비스: $1,000
- 순수익: 약 $8,500/월

[연간 성장 시나리오]
- Year 1: $102,000 (월 $8,500)
- Year 2: $306,000 (거래량 3배 성장)
- Year 3: $918,000 (거래량 3배 + 프리미엄 확대)
```

---

## 6. 법적/규제 리스크

### 6.1 전자금융업 등록 필요성

| 상황 | 등록 필요 여부 | 근거 |
|------|--------------|------|
| 직접 자금 보관/정산 | **필요** | 전자금융거래법 제28조 |
| PG사 지급대행 이용 | **불필요** | PG사가 라이선스 보유 |
| Stripe Connect 이용 (해외 결제) | **불필요** (한국 법률상) | 해외 결제 서비스, 단 서비스 성장 시 재검토 |
| 자체 코인/포인트 발행 | **필요** | 선불전자지급수단 발행업 |

#### 등록 요건 (참고)

| 요건 | 기준 |
|------|------|
| 최소 자본금 | 10억원 이상 |
| 부채비율 | 200% 이내 |
| 전산 전문인력 | 5인 이상 (2년 이상 경력) |
| 물적 시설 | 백업장치, 정보보호시스템 |
| 등록 기한 | 개정법 시행 후 1년 이내 (2025.03) |

**결론: 현 시점에서 휘슬은 전자금융업 등록 없이 PG사/Stripe를 통한 지급대행 방식으로 운영하는 것이 현실적이다.**

### 6.2 외환 관련 규제

| 규제 항목 | 내용 | 대응 방안 |
|----------|------|----------|
| **외국환거래법** | 거주자-비거주자 간 결제 중개 시 한국은행 신고 필요 | Stripe가 해외 결제 처리하므로 직접 외환거래 아님 |
| **무역대금 결제** | 수출입 대금은 외국환은행을 통해 결제 원칙 | 플랫폼이 결제를 "중개"하는 것이 아닌 "연결"하는 구조로 설계 |
| **상계 신고** | 수출입 채권채무 상계 시 한국은행 신고 | 직접 상계하지 않고 건별 결제 유지 |
| **구매대행 규제** | 거주자 대신 수입자금 지급 시 규제 | 휘슬은 구매대행이 아닌 플랫폼 중개이므로 해당 없음 |
| **연간 환전 한도** | 개인 5만 달러 | B2B 법인 거래이므로 해당 없음 |

**핵심 리스크**: 휘슬이 바이어의 결제를 받아 셀러에게 전달하는 구조가 "자금 이동 중개"로 해석될 경우 추가 인허가가 필요할 수 있음. **법률 자문 필수**.

### 6.3 개인정보 보호 (카드정보 등)

| 항목 | 요건 | 대응 방안 |
|------|------|----------|
| **PCI DSS 준수** | 카드 정보 저장/처리/전송 시 필수 | Stripe/Toss의 호스팅 결제 페이지 사용으로 PCI 범위 최소화 |
| **카드 정보 비저장** | 카드 번호, CVV 등 직접 저장 금지 | Stripe Elements/Checkout 사용 (토큰화) |
| **개인정보보호법** | 한국 PIPA 준수 | 결제 관련 개인정보 처리방침 명시 |
| **GDPR** | EU 바이어 개인정보 보호 | Stripe의 GDPR 준수 기능 활용 |
| **로그 관리** | 결제 로그 5년 보관 의무 | 시스템 자동 보관 구현 |

#### PCI DSS 범위 최소화 전략

```
[위험] 자체 결제 폼으로 카드 정보 직접 수집
  → PCI DSS Level 1 인증 필요 (비용 수천만원)

[안전] Stripe Elements 또는 Checkout 사용 (권장)
  → PCI DSS SAQ-A (최소 수준) 자가진단만 필요
  → 카드 정보가 휘슬 서버를 거치지 않음 (Stripe 직접 처리)
  → Stripe가 PCI DSS Level 1 인증 보유
```

### 6.4 기타 규제 고려사항

| 항목 | 내용 |
|------|------|
| **자금세탁방지(AML)** | KYC(고객확인) 절차 필요. Stripe Connect 온보딩에 포함됨. |
| **관세법** | 수출입 신고 의무는 셀러/바이어에게 있음. 플랫폼은 참고 정보 제공만. |
| **소비자보호법** | B2B 거래이므로 소비자보호법 직접 적용 안 됨. 단, 약관 공정성은 유지. |
| **전자상거래법** | 통신판매중개업 신고 필요 (이미 휘슬이 해당). |
| **분쟁해결 관할권** | 국제 B2B 분쟁은 중재조항(Arbitration Clause) 명시 권장. |

---

## 7. 권장 아키텍처 (종합 제안)

### 7.1 Phase 1: MVP (0-6개월)

**목표**: 최소 비용으로 에스크로 유사 결제 시작

```
[해외 바이어] --Stripe Checkout--> [Stripe Platform Account]
                                      |
                                      |-- Manual Transfer (마일스톤별)
                                      v
                                [Stripe Connected Account (해외법인)]
                                      |
                                      |-- Wise/Payoneer 또는 직접 송금
                                      v
                                [한국 제조사 은행 계좌]
```

**핵심 구성요소**:
- Stripe Connect (Separate Charges & Transfers)
- Express Connected Accounts
- Manual Payout Schedule (최대 90일)
- Stripe Checkout (PCI 범위 최소화)

**비용**:
- 개발비: Stripe API 연동 (2-4주)
- 운영비: Stripe 수수료만 (초기 고정비 없음)

### 7.2 Phase 2: 고도화 (6-12개월)

**목표**: 자동화 및 국내 결제 추가

```
[해외 바이어] --Stripe--> [Platform]
[국내 바이어] --Toss---->  [Platform] --정산 엔진--> [제조사]
```

**추가 구성요소**:
- Toss Payments 에스크로 (국내 바이어용)
- 자동화된 마일스톤 트래킹 + 정산
- 분쟁 중재 시스템
- Webhook 기반 실시간 알림

### 7.3 Phase 3: 확장 (12-24개월)

**목표**: 글로벌 확장 및 프리미엄 서비스

**추가 구성요소**:
- Stripe Global Payouts (한국 직접 정산, 지원 시)
- 거래 보험 서비스
- 신용 평가 시스템
- 멀티통화 자동 환전
- L/C(신용장) 연동 검토

### 7.4 기술 스택 권장

| 계층 | 기술 | 이유 |
|------|------|------|
| 결제 (해외) | Stripe Connect | 글로벌 표준, 에스크로 유사 기능 |
| 결제 (국내) | Toss Payments | 국내 최적화, 에스크로 네이티브 지원 |
| 결제 통합 | PortOne (포트원) | 여러 PG사 통합 관리 (선택적) |
| 정산 엔진 | 자체 개발 | 마일스톤 기반 정산 로직 |
| 분쟁 관리 | 자체 개발 | 중재 워크플로 |
| 알림 | Stripe Webhooks + 자체 | 실시간 상태 변경 알림 |
| 모니터링 | Stripe Dashboard + 자체 | 결제/정산 상태 모니터링 |

### 7.5 Stripe vs Toss 비교 요약

| 항목 | Stripe | Toss Payments |
|------|--------|---------------|
| **해외 바이어 결제** | O (최적) | X (PayPal만 가능) |
| **국내 바이어 결제** | 제한적 (베타) | O (최적) |
| **에스크로** | 유사 기능 (Delayed Payout) | 네이티브 지원 |
| **마일스톤 결제** | O (Separate Charges) | X |
| **한국 셀러 정산** | 제한적 (해외 법인 필요) | O (직접 정산) |
| **멀티통화** | O (135개+) | 제한적 (USD/PayPal만) |
| **수수료** | 2.9-4.4% + $0.30 | 2.0-3.4% |
| **B2B 대금 분할** | O (API로 자유 설계) | X |
| **개발 편의성** | 매우 높음 (문서/SDK 우수) | 높음 |
| **규제 리스크** | 낮음 (해외 서비스) | 낮음 (국내 라이선스 보유) |

**최종 권장: Stripe(해외 결제) + Toss(국내 결제) 하이브리드 구조**

---

## 8. 참고 자료

### Stripe 관련
- [Stripe Connect 공식](https://stripe.com/connect)
- [Stripe Connect Marketplace](https://stripe.com/connect/marketplaces)
- [Stripe Connect Pricing](https://stripe.com/connect/pricing)
- [Stripe Manual Payouts](https://docs.stripe.com/connect/manual-payouts)
- [Stripe Separate Charges and Transfers](https://docs.stripe.com/connect/separate-charges-and-transfers)
- [Stripe Payment Intents Manual Capture](https://docs.stripe.com/payments/place-a-hold-on-a-payment-method)
- [Stripe Cross-border Payouts](https://docs.stripe.com/connect/cross-border-payouts)
- [Stripe Multi-currency Settlement](https://docs.stripe.com/connect/multicurrency-settlement)
- [Stripe Korea Payment Methods](https://docs.stripe.com/payments/countries/korea)
- [Stripe PCI Compliance Guide](https://stripe.com/guides/pci-compliance)
- [Stripe Fees Explained 2025](https://www.swipesum.com/insights/guide-to-stripe-fees-rates-for-2025)
- [Stripe Fees 2026 Guide](https://paymentcloudinc.com/blog/stripe-fees/)
- [Stripe 한국 결제 가능 여부](https://inblog.ai/ko/blog/stripe-in-korea)
- [Stripe KRW Local Payments DCC](https://blog.popekim.com/en/2025/11/02/stripe-krw-local-payment-dcc.html)

### Toss Payments 관련
- [Toss Payments 수수료](https://www.tosspayments.com/about/fee)
- [Toss Payments 에스크로 가이드](https://docs.tosspayments.com/resources/glossary/escrow)
- [Toss Payments 해외결제 연동](https://docs.tosspayments.com/guides/v2/learn/foreign-payment)
- [Toss Payments 코어 API](https://docs.tosspayments.com/reference)
- [Toss Payments 전금법 개정 대비](https://www.tosspayments.com/blog/articles/amendment)

### 법률/규제 관련
- [전자금융거래법 (법령)](https://law.go.kr/행정규칙/전자금융감독규정)
- [에스크로 vs 지급대행 비교 (PortOne)](https://blog.portone.io/ps_escrow-vs/)
- [PG사 지급대행 vs 파트너 정산 서비스 (PortOne)](https://blog.portone.io/ps_vs-transfer-delegation/)
- [플랫폼/결제 산업 Guidebook (PwC)](https://www.pwc.com/kr/ko/insights/industry-focus/samilpwc_platform-payment-guidebook.pdf)
- [외국환거래규정 (법령)](https://www.law.go.kr/행정규칙/외국환거래규정)

### 업계 벤치마크
- [Alibaba Trade Assurance](https://tradeassurance.alibaba.com/)
- [Alibaba Trade Assurance 수수료](https://service.alibaba.com/page/knowledge?pageId=128&category=1000088742&knowledge=21382365&language=en)
- [Escrow.com Milestone Payments](https://www.escrow.com/milestones)
- [B2B Marketplace Payment Guide (Resolve)](https://resolvepay.com/blog/post/b2b-marketplace-payment-processing-an-in-depth-guide-for-business-owners/)
- [Smart Escrow for Marketplaces 2026](https://rebelfi.io/blog/how-smart-escrow-unlocks-new-business-models-for-marketplaces-and-b2b)

---

> **주요 액션 아이템**
> 1. Stripe Connect 개발 계정 생성 및 Separate Charges & Transfers 프로토타입 개발
> 2. 한국 셀러 정산 경로 확정 (해외법인 vs Global Payouts vs 별도 송금)
> 3. 외환거래법/전자금융거래법 관련 법률 자문 (자금 중개 해석 리스크)
> 4. Toss Payments 에스크로 계약 및 B2B 결제 가능 범위 확인
> 5. 수수료 모델 시뮬레이션 및 경쟁사 대비 포지셔닝 확정
