# 휘슬 자유 대화형 거래 실행 OS — 제품 명세서

> 작성: 2026-03-07 | 목적: 내일 09:00 즉시 개발 착수용
> 현재 상태: Autopilot 24/24, Trust Score 27/28, Price Memory 28/28 모두 GATE PASSED

---

## 0. 제품 정의 (네이밍 결정 전 본질 정리)

### 1문장 정의
> 수출 거래의 모든 단계를 AI와 대화하면서 실행하는 거래 운영 시스템

### 3문장 정의
> 제조사와 바이어가 자유롭게 질문하면, AI가 현재 거래 상태·신뢰 점수·가격 이력을 근거로 다음 단계를 제안한다.
> 사용자가 승인하면 주문 생성·서류 발송·결제 요청이 즉시 실행된다.
> 관리자는 전체 거래의 병목·이상치·저신뢰 거래를 한눈에 보고 개입한다.

### 무엇인가 / 무엇이 아닌가

| 무엇인가 (IS) | 무엇이 아닌가 (IS NOT) |
|---------------|----------------------|
| 거래 데이터 기반 대화형 실행 도구 | 범용 챗봇 / ChatGPT 래퍼 |
| 조회→판단→제안→실행 파이프라인 | 단순 FAQ 응답기 |
| 기존 9단계 딜 파이프라인의 대화형 인터페이스 | 새로운 거래 프로세스 |
| 3개 엔진(Autopilot/Trust/Price)의 통합 조회 창구 | 독립적 AI 분석 도구 |
| 실행 버튼이 붙은 구조화된 응답 | 자유 형식 텍스트 응답 |
| 역할별 권한이 다른 실행 시스템 | 모든 사용자 동일 권한 |

### 포지셔닝 문장
- "수출 거래를 대화로 실행한다"
- "메뉴를 찾지 않아도 된다 — 물어보면 된다"
- "AI가 데이터를 읽고, 사람이 결정한다"

---

## 1. 자유 대화형 MVP — 5개 대표 명령 상세 명세

---

### 명령 1: "이 딜 다음 단계 뭐야?"

#### 사용자 입력 예시
1. "이 딜 다음 단계 뭐야?"
2. "ABC Trading 거래 어디까지 왔어?"
3. "지금 뭐 해야 해?"
4. "sample 다음에 뭐 하지?"
5. "이 바이어랑 진행 상황 알려줘"
6. "견적 보낸 다음에 뭐 기다려야 해?"
7. "What's next for this deal?"

#### 내부 Intent
`deal.next_step`

#### 필요 데이터 소스
| 소스 | 테이블/상태 | 필드 |
|------|------------|------|
| 현재 딜 | `S._currentDeal` 또는 `S.matchings` | stage, status, updated_at |
| 딜 이벤트 | `deal_events` | event_type, created_at |
| 주문 | `S.orders` | status, payment_status |
| 서류 | `S.documents` | doc_type, status |
| 넛지 | `S._autopilotNudges` | type, priority, message |
| 바이어 신뢰 | `_getBuyerTrust(buyerId)` | grade, score, tags |
| 가격 이력 | `_getPriceRef(itemName)` | count, avg, last |

#### 연동 엔진
- **Autopilot**: 해당 딜에 활성 넛지가 있으면 최우선 표시
- **Trust Score**: 바이어 등급이 D면 "⚠️ 저신뢰 바이어 — 선결제 권장" 경고
- **Price Memory**: 견적 단계면 이전 거래가 참조 표시

#### 응답 요약 문장 예시
```
📍 ABC Trading 거래는 현재 [견적] 단계입니다.
바이어가 견적을 확인 중이며, 3일째 응답 대기 중입니다.
→ 다음 단계: 바이어 확인 후 [샘플] 진행
```

#### 근거 데이터 구조
```javascript
{
  deal_id: "uuid",
  current_stage: "quotation",           // DEAL_STAGES[2]
  days_in_stage: 3,
  buyer: { name: "ABC Trading", country: "US", trust_grade: "B" },
  pending_actions: ["바이어 견적 확인 대기"],
  next_stage: "sample",
  next_actions: ["샘플 발송 준비", "샘플 비용 확인"],
  active_nudges: [{type: "stale_deal", msg: "3일 정체"}],
  price_ref: {item: "Snail Cream", avg: 8.5, count: 5},
  documents: [{type: "PI", status: "sent"}, {type: "CI", status: "draft"}],
  risk_flags: []                        // or ["저신뢰 바이어", "가격 이상치"]
}
```

#### 액션 버튼
| 버튼 | 함수 매핑 | 승인 필요 |
|------|----------|----------|
| 📩 바이어에게 리마인드 | `chatSend("견적 확인 요청")` | No |
| 📦 샘플 준비 시작 | `nav('orders')` → 샘플 등록 | No |
| 📄 PI 수정 | `nav('docgen')` → PI 편집 | No |
| ⏭️ 다음 단계로 이동 | `advanceDeal(dealId, nextStage)` | **Yes** |

#### 승인/확인 버튼
- 단계 이동(advanceDeal)은 "정말 [샘플] 단계로 이동하시겠습니까?" 확인 필요
- 서류 전송은 미리보기 후 승인

#### 실패/빈 상태 처리
| 상황 | 표시 |
|------|------|
| 딜 미선택 | "먼저 거래를 선택하세요. 프로젝트 목록에서 바이어를 선택하거나, 바이어 이름을 말씀해주세요." |
| 딜 없음 | "진행 중인 거래가 없습니다. [AI 바이어 매칭]으로 새 거래를 시작해보세요." + 버튼 |
| 데이터 로딩 실패 | "거래 정보를 불러올 수 없습니다. 네트워크를 확인하세요." |

#### 역할별 차이
| 역할 | 차이점 |
|------|--------|
| **제조사** | 전체 액션 버튼 + 서류 생성 + 바이어 채팅 |
| **바이어** | 읽기 위주 + 견적 수락/거절 + 샘플 요청 |
| **관리자** | 양측 데이터 + 강제 단계 변경 + 에스컬레이션 |

---

### 명령 2: "이 바이어 신뢰도 어때?"

#### 사용자 입력 예시
1. "이 바이어 신뢰도 어때?"
2. "ABC Trading 믿을 만해?"
3. "이 바이어 결제 잘 하는 편이야?"
4. "거래 전에 이 바이어 검증해줘"
5. "trust score 보여줘"
6. "Is this buyer reliable?"
7. "이 셀러 평판 어때?" (바이어 관점)

#### 내부 Intent
`trust.check`

#### 필요 데이터 소스
| 소스 | 테이블/함수 | 필드 |
|------|------------|------|
| Trust Score | `_getBuyerTrust(buyerId)` / `_getSellerTrust(sellerId)` | score, grade, tags, breakdown, reasons |
| 거래 이력 | `matchings` + `orders` | completed count, rejected count |
| 결제 이력 | `payment_milestones` + `payment_proofs` | on-time rate |
| 채팅 이력 | `messages` | response time avg |
| 서류 이력 | `documents` | completeness |

#### 연동 엔진
- **Trust Score**: 핵심 — 5축(응답/결제/거래완료/서류/프로필) 전체 표시
- **Autopilot**: D등급이면 활성 넛지에 "저신뢰" 라벨 추가된 상태
- **Price Memory**: 해당 바이어와의 가격 편차 이력

#### 응답 요약 문장 예시
```
🛡️ ABC Trading의 신뢰 등급은 B (72점)입니다.
강점: Fast Responder, Proven Track Record
약점: 서류 완성도 낮음 (45점)
→ 거래 진행 가능하나, 서류 확인에 주의하세요.
```

#### 근거 데이터 구조
```javascript
{
  entity_id: "buyer-uuid",
  role: "buyer",
  score: 72,
  grade: "B",
  tags: ["Fast Responder", "Proven Track Record"],
  breakdown: {
    response: 85,    // 응답 속도
    payment: 78,     // 결제 이행
    completion: 70,  // 거래 완료율
    documents: 45,   // 서류 완성도
    profile: 82      // 프로필 검증
  },
  reasons: {
    response: "평균 2시간 내 응답",
    payment: "4건 중 3건 기한 내 결제",
    completion: "7건 중 5건 완료",
    documents: "필수 서류 3개 중 1개 미제출",
    profile: "사업자등록 + 회사 인증 완료"
  },
  trade_history: { total: 7, completed: 5, rejected: 1, active: 1 },
  price_deviation: { avg_deviation: 8.2, outlier_count: 0 }
}
```

#### 액션 버튼
| 버튼 | 함수 매핑 | 승인 필요 |
|------|----------|----------|
| 💬 바이어에게 서류 요청 | `chatSend("서류 보완 요청")` | No |
| 📊 상세 거래 이력 | `nav('deals')` 필터 | No |
| ⚠️ 관리자 에스컬레이션 | admin 알림 전송 | **Yes** |
| 🔄 신뢰 점수 갱신 | `_refreshSellerTrust()` | No |

#### 실패/빈 상태 처리
| 상황 | 표시 |
|------|------|
| 바이어 미지정 | "어떤 바이어의 신뢰도를 확인하시겠습니까?" + 바이어 목록 |
| 거래 이력 없음 | "이 바이어와의 거래 이력이 없습니다. 신뢰 점수를 산출할 수 없습니다." |
| 점수 산출 불가 | "데이터 부족 — 최소 1건 이상의 거래가 필요합니다." |

#### 역할별 차이
| 역할 | 차이점 |
|------|--------|
| **제조사** | 바이어 신뢰도 조회 + D등급 경고 |
| **바이어** | 셀러 신뢰도 조회 (loadSellerTrustScores) |
| **관리자** | 양측 신뢰도 + D등급 목록 + 강제 플래그 |

---

### 명령 3: "주문 생성해"

#### 사용자 입력 예시
1. "주문 생성해"
2. "이 견적 기준으로 주문 넣어줘"
3. "ABC Trading한테 주문서 만들어"
4. "PI 기반으로 오더 생성"
5. "5000개 주문 만들어줘"
6. "Create an order for this deal"
7. "주문서 작성하고 바이어한테 보내"

#### 내부 Intent
`order.create`

#### 필요 데이터 소스
| 소스 | 테이블 | 필드 |
|------|--------|------|
| 현재 딜 | `S._currentDeal` / `S.matchings` | buyer_id, product, qty, price |
| 최근 견적 | `S.documents` (PI) | content.items, content.ref |
| 가격 이력 | `_getPriceRef(item)` | avg, last, count |
| 바이어 정보 | `S.buyers` | company_name, address, country |
| 이상치 체크 | `_checkPriceOutlier(item, price, cat)` | outlier, deviation |

#### 연동 엔진
- **Price Memory**: 주문 단가와 이전 평균 비교 → 이상치면 경고
- **Trust Score**: D등급 바이어면 "선결제 조건 권장" 제안
- **Autopilot**: 주문 생성 후 자동으로 넛지 재계산

#### 응답 요약 문장 예시
```
📋 ABC Trading 주문서 초안을 생성했습니다.
- 품목: Snail Cream 5,000개 × $8.50 = $42,500
- 이전 거래가: 평균 $8.20 (현재 +3.7% — 정상 범위)
- 결제 조건: T/T 30% advance
→ 확인 후 [주문 확정] 버튼을 눌러주세요.
```

#### 근거 데이터 구조
```javascript
{
  order_draft: {
    buyer_id: "uuid",
    items: [{ name: "Snail Cream", qty: 5000, unit_price: 8.50, currency: "USD" }],
    total: 42500,
    payment_terms: "T/T 30% advance, 70% before shipment",
    delivery_date: "2026-04-15",
    incoterms: "FOB Busan"
  },
  price_check: {
    "Snail Cream": { prev_avg: 8.20, deviation: "+3.7%", outlier: false }
  },
  trust_warning: null,  // or "D등급 바이어 — 선결제 비율 상향 권장"
  source_doc: { type: "PI", id: "pi-uuid", doc_no: "PI-2026-001" },
  missing_fields: []     // or ["delivery_date", "incoterms"]
}
```

#### 액션 버튼
| 버튼 | 함수 매핑 | 승인 필요 |
|------|----------|----------|
| ✅ 주문 확정 | `sb.from('orders').insert(draft)` | **Yes** |
| ✏️ 수정 | 주문 편집 폼 표시 | No |
| 📄 PI 먼저 생성 | `nav('docgen')` → PI | No |
| ❌ 취소 | 초안 폐기 | No |

#### 승인/확인
- 주문 확정은 **반드시** 사용자 승인 필요 (execute 액션)
- 가격 이상치 경고가 있으면 추가 확인: "이전 평균 대비 +30% 높습니다. 진행하시겠습니까?"

#### 실패/빈 상태 처리
| 상황 | 표시 |
|------|------|
| 딜/바이어 미선택 | "어떤 바이어에게 주문을 보내시겠습니까?" + 바이어 목록 |
| PI 없음 | "견적서(PI)가 없습니다. 먼저 PI를 생성하시겠습니까?" + 버튼 |
| 필수 필드 누락 | "배송일/결제조건이 비어 있습니다. 작성해주세요." |

#### 역할별 차이
| 역할 | 차이점 |
|------|--------|
| **제조사** | 주문 생성 + 확정 가능 |
| **바이어** | 주문 요청만 가능 (제조사 승인 필요) |
| **관리자** | 양측 주문 조회 + 강제 상태 변경 |

---

### 명령 4: "결제 요청 보내"

#### 사용자 입력 예시
1. "결제 요청 보내"
2. "이 주문 결제 요청해줘"
3. "deposit 30% 청구해"
4. "잔금 요청 보내"
5. "payment reminder 보내줘"
6. "Send payment request to buyer"
7. "T/T 안내 보내줘"

#### 내부 Intent
`payment.request`

#### 필요 데이터 소스
| 소스 | 테이블 | 필드 |
|------|--------|------|
| 주문 | `S.orders` | id, total, payment_terms, payment_status |
| 결제 마일스톤 | `payment_milestones` | milestone_type, amount, status, due_date |
| 바이어 | `S.buyers` | email, company_name |
| 결제 증빙 | `payment_proofs` | status (pending/approved/rejected) |
| Trust | `_getBuyerTrust(buyerId)` | payment axis score |

#### 연동 엔진
- **Trust Score**: 결제 축 점수 낮으면 "결제 이행률 낮음 — 에스크로 권장" 경고
- **Autopilot**: 미결제 넛지가 이미 있으면 "이미 알림이 발송되었습니다" 표시
- **Price Memory**: 관련 없음

#### 응답 요약 문장 예시
```
💰 ABC Trading에게 결제 요청을 보냅니다.
- 주문: ORD-2026-042 ($42,500)
- 요청 금액: $12,750 (30% advance)
- 결제 방법: T/T (은행 송금)
- 바이어 결제 이행률: 78% (B등급)
→ [결제 요청 전송] 버튼을 눌러 바이어에게 알림을 보냅니다.
```

#### 근거 데이터 구조
```javascript
{
  order_id: "uuid",
  order_no: "ORD-2026-042",
  total: 42500,
  milestone: { type: "advance", percentage: 30, amount: 12750, due_date: "2026-03-15" },
  payment_method: "T/T",
  buyer: { name: "ABC Trading", email: "buyer@abc.com" },
  buyer_payment_score: 78,
  existing_nudge: null,  // or {type: "unpaid", age: 5}
  bank_info: { bank: "KEB하나은행", account: "xxx-xxxx", swift: "KOEXKRSE" }
}
```

#### 액션 버튼
| 버튼 | 함수 매핑 | 승인 필요 |
|------|----------|----------|
| 💳 결제 요청 전송 | 채팅 + 이메일 발송 | **Yes** |
| 📧 이메일로만 발송 | `send-outbound-email` EF | **Yes** |
| 💬 채팅으로 안내 | `chatSend(결제 안내)` | No |
| 🔒 에스크로 전환 | 에스크로 생성 | **Yes** |

#### 실패/빈 상태 처리
| 상황 | 표시 |
|------|------|
| 주문 없음 | "결제 요청할 주문이 없습니다. 먼저 주문을 생성하세요." |
| 이미 완납 | "이 주문은 이미 결제 완료되었습니다." |
| 결제 조건 미설정 | "결제 조건이 설정되지 않았습니다. 주문서를 수정하세요." |

#### 역할별 차이
| 역할 | 차이점 |
|------|--------|
| **제조사** | 결제 요청 발송 + 에스크로 설정 |
| **바이어** | 결제 증빙 업로드 + 결제 확인 |
| **관리자** | 증빙 승인/거절 + 에스크로 해제 |

---

### 명령 5: "정체된 거래만 보여줘"

#### 사용자 입력 예시
1. "정체된 거래만 보여줘"
2. "오래된 딜 목록"
3. "뭐가 막혀있어?"
4. "7일 넘은 거래"
5. "stale deals"
6. "조치 필요한 것만"
7. "긴급한 거 뭐 있어?"

#### 내부 Intent
`deal.stale_list`

#### 필요 데이터 소스
| 소스 | 테이블/함수 | 필드 |
|------|------------|------|
| 넛지 목록 | `S._autopilotNudges` | 전체 (priority, type, age) |
| 매칭 | `S.matchings` | status, updated_at |
| 주문 | `S.orders` | status, payment_status, updated_at |
| Trust | `_getBuyerTrust()` | D등급 여부 |
| Price | `_checkPriceOutlier()` | 이상치 여부 |

#### 연동 엔진
- **Autopilot**: **핵심** — 넛지 목록이 곧 정체 거래 목록
- **Trust Score**: D등급 바이어 거래는 별도 하이라이트
- **Price Memory**: 가격 이상치가 있는 거래도 포함

#### 응답 요약 문장 예시
```
⚠️ 조치가 필요한 거래 3건:

1. 🔴 P1 | ABC Trading — 주문 미결제 14일 (LOW TRUST)
2. 🟡 P2 | XYZ Corp — 거래 매칭 9일 정체
3. 🟡 P2 | DEF Inc — 출하 등록 미완 7일

→ 가장 긴급한 건: ABC Trading 미결제 (14일)
```

#### 근거 데이터 구조
```javascript
{
  stale_deals: [
    {
      priority: 1,
      type: "unpaid_order",
      ref_type: "order",
      ref_id: "uuid",
      buyer: "ABC Trading",
      age_days: 14,
      message: "주문 미결제 14일",
      low_trust: true,
      action: { label: "결제 요청", page: "orders" }
    },
    // ...
  ],
  summary: { total: 3, p1: 1, p2: 2, low_trust: 1 },
  price_outliers: 0
}
```

#### 액션 버튼 (목록 수준)
| 버튼 | 함수 매핑 | 승인 필요 |
|------|----------|----------|
| 📋 해당 주문으로 이동 | `viewOrder(orderId)` | No |
| 💬 바이어에게 리마인드 | `chatSend(리마인드)` | No |
| 🚨 관리자 에스컬레이션 | admin 알림 | **Yes** |
| ✅ 이 넛지 무시 | `dismissNudge(nudgeId)` | No |

#### 실패/빈 상태 처리
| 상황 | 표시 |
|------|------|
| 정체 거래 없음 | "🎉 모든 거래가 정상 진행 중입니다! 정체된 거래가 없습니다." |
| 데이터 로딩 중 | 스켈레톤 UI + "거래 상태 분석 중..." |

#### 역할별 차이
| 역할 | 차이점 |
|------|--------|
| **제조사** | 본인 거래의 넛지 목록 |
| **바이어** | 본인 참여 거래의 대기 항목 (결제/서류/서명) |
| **관리자** | **전체** 정체 거래 + D등급 + 미결제 + 이상치 통합 |

---

## 2. 자유 대화 구조 설계

### 2.1 자유 입력 → Intent 매핑 구조

```
[사용자 자유 입력]
      ↓
[1단계: 클라이언트 키워드 매칭] ← 빠른 경로 (EF 호출 불필요)
      ↓ 매칭 실패 시
[2단계: whistle-ai EF 호출] ← AI intent 분류
      ↓
[intent + parameters 반환]
      ↓
[3단계: 로컬 데이터 수집] ← S 상태 객체에서 데이터 추출
      ↓
[4단계: 응답 카드 생성] ← 구조화된 HTML 응답
      ↓
[5단계: 액션 버튼 렌더링] ← 권한별 필터링
```

### 2.2 1단계: 클라이언트 키워드 매칭 (EF 호출 없이 즉시 응답)

```javascript
var INTENT_KEYWORDS = {
  'deal.next_step':    ['다음 단계', '다음에 뭐', '어디까지', '진행 상황', 'next step', 'what\'s next'],
  'trust.check':       ['신뢰', '믿을', '신뢰도', 'trust', 'reliable', '검증'],
  'order.create':      ['주문 생성', '주문 만들', '오더', 'create order', '주문서'],
  'payment.request':   ['결제 요청', '결제 보내', 'payment', '청구', '잔금', 'deposit'],
  'deal.stale_list':   ['정체', '막혀', 'stale', '오래된', '긴급', '조치 필요', '뭐가 막혀'],
  'deal.list':         ['거래 목록', '딜 목록', '진행 중인', 'my deals'],
  'doc.create':        ['서류 만들', 'PI 생성', 'CI 생성', 'invoice', '인보이스'],
  'doc.status':        ['서류 상태', '서명 상태', '승인 상태'],
  'buyer.list':        ['바이어 목록', '거래처', 'my buyers'],
  'price.check':       ['가격', '단가', '이전 거래가', 'price', '시세'],
  'analysis.run':      ['분석', '수출 분석', 'analyze', '리포트'],
  'shipping.track':    ['배송', '출하', '물류', 'tracking', '선적'],
  'help':              ['도움', '뭐 할 수 있어', 'help', '기능']
};
```

### 2.3 거래 실행 Intent Taxonomy

| Category | Intent | Type | 설명 |
|----------|--------|------|------|
| **Deal** | `deal.next_step` | read | 현재 단계 + 다음 단계 제안 |
| | `deal.stale_list` | read | 정체 거래 목록 |
| | `deal.list` | read | 전체 거래 목록 |
| | `deal.advance` | **execute** | 단계 진행 |
| | `deal.create` | **execute** | 새 거래 생성 |
| **Trust** | `trust.check` | read | 신뢰 점수 조회 |
| | `trust.refresh` | execute | 점수 갱신 |
| **Order** | `order.create` | **approval-required** | 주문 생성 |
| | `order.status` | read | 주문 상태 조회 |
| | `order.update` | **execute** | 주문 수정 |
| **Payment** | `payment.request` | **approval-required** | 결제 요청 발송 |
| | `payment.status` | read | 결제 상태 조회 |
| | `payment.confirm` | **approval-required** | 결제 확인 |
| **Document** | `doc.create` | **execute** | 서류 생성 |
| | `doc.send` | **approval-required** | 서류 전송 |
| | `doc.status` | read | 서류 상태 |
| | `doc.consistency` | read | 서류 일관성 체크 |
| **Price** | `price.check` | read | 가격 이력 조회 |
| | `price.outlier` | read | 이상치 확인 |
| **Analysis** | `analysis.run` | **execute** | AI 수출 분석 실행 |
| | `analysis.view` | read | 분석 결과 조회 |
| **Shipping** | `shipping.track` | read | 물류 추적 |
| | `shipping.register` | **execute** | 출하 등록 |
| **Chat** | `chat.send` | execute | 메시지 전송 |
| **Help** | `help` | read | 도움말 |

### 2.4 액션 타입 분류 (read / suggest / execute / approval-required)

| 타입 | 설명 | 사용자 인터랙션 | 예시 |
|------|------|----------------|------|
| **read** | 데이터 조회만 | 즉시 표시 | 신뢰도 조회, 주문 상태 |
| **suggest** | 다음 액션 제안 | 버튼 제시 | "다음 단계" 제안 |
| **execute** | 즉시 실행 | 1-click | 채팅 전송, 넛지 무시 |
| **approval-required** | 실행 전 확인 필수 | 확인 다이얼로그 | 주문 생성, 결제 요청, 서류 전송 |

### 2.5 관리자 에스컬레이션 규칙

```
자동 에스컬레이션 조건:
1. D등급 바이어의 거래 금액 > $10,000
2. 미결제 > 14일
3. 가격 이상치 > ±50% (30%는 경고, 50%는 에스컬레이션)
4. 분쟁(dispute) 등록 시
5. 사용자가 수동 에스컬레이션 요청 시

에스컬레이션 실행:
- admin.html 긴급 섹션에 카드 추가
- deal_nudges 테이블에 P1 우선순위로 삽입
- (향후) 텔레그램/이메일 알림
```

### 2.6 권한별 허용 액션 범위

| Intent | 제조사 | 바이어 | 관리자 |
|--------|--------|--------|--------|
| deal.next_step | ✅ | ✅ (본인 참여 딜만) | ✅ (전체) |
| trust.check | ✅ (바이어만) | ✅ (셀러만) | ✅ (전체) |
| order.create | ✅ | ❌ (요청만) | ✅ |
| payment.request | ✅ | ❌ | ✅ |
| deal.stale_list | ✅ (본인) | ✅ (본인) | ✅ (전체) |
| doc.create | ✅ | ❌ | ✅ |
| doc.send | ✅ | ❌ | ✅ |
| deal.advance | ✅ | ❌ | ✅ |
| analysis.run | ✅ | ✅ | ✅ |
| shipping.register | ✅ | ❌ | ✅ |

---

## 3. 응답 UI 공통 구조 설계

### 3.1 응답 카드 표준 구조

모든 AI 응답은 아래 구조를 따릅니다:

```
┌─────────────────────────────────────────┐
│ 📍 요약 (1-2문장, 굵은 텍스트)            │
├─────────────────────────────────────────┤
│ 현재 상태                                │
│ ┌───────────────────────────────────┐   │
│ │ 단계: [견적] ●●●○○○○○○            │   │
│ │ 경과: 3일 | 바이어: ABC Trading    │   │
│ │ 신뢰: B (72) | 결제: 미결제        │   │
│ └───────────────────────────────────┘   │
├─────────────────────────────────────────┤
│ 근거 데이터 (접힘 가능)                   │
│ • 이전 거래가: $8.20 (5건 평균)          │
│ • 결제 이행률: 78%                       │
│ • 정체 일수: 3일                         │
├─────────────────────────────────────────┤
│ ⚠️ 리스크/병목 (있을 때만 표시)           │
│ • 저신뢰 바이어 (D등급)                  │
│ • 가격 이상치 (+32%)                    │
├─────────────────────────────────────────┤
│ → 다음 액션 제안                         │
│ "바이어에게 견적 확인을 요청하세요"         │
├─────────────────────────────────────────┤
│ [📩 리마인드 전송] [📄 PI 수정] [⏭ 다음] │
│                          🔒 승인 필요 ↑  │
└─────────────────────────────────────────┘
```

### 3.2 카드 타입별 변형

| 카드 타입 | 표시 조건 | 핵심 컴포넌트 |
|-----------|----------|-------------|
| **Status Card** | read intent | 요약 + 상태 바 + 근거 |
| **Action Card** | suggest/execute | 요약 + 버튼 목록 |
| **Alert Card** | 리스크 발견 시 | 빨간 테두리 + 경고 + 즉시 액션 |
| **Approval Card** | approval-required | 상세 정보 + 확인/취소 |
| **List Card** | 목록 조회 | 요약 + 아이템 카드 배열 |
| **Empty Card** | 데이터 없음 | 안내 메시지 + CTA 버튼 |
| **Error Card** | 실패 | 에러 메시지 + 재시도 |

### 3.3 구현 함수 시그니처

```javascript
// 응답 카드 렌더링 (공통)
function _aiResponseCard(opts) {
  // opts = {
  //   type: 'status'|'action'|'alert'|'approval'|'list'|'empty'|'error',
  //   summary: "요약 문장",
  //   status: { stage, days, buyer, trust_grade },  // optional
  //   evidence: [{ label, value, color }],           // optional
  //   risks: [{ level, message }],                   // optional
  //   suggestion: "다음 액션 제안 문장",              // optional
  //   actions: [{ label, icon, fn, approval }],      // optional
  //   items: [{ ... }],                              // for list type
  //   collapsed_sections: ['evidence']               // 접힌 상태로 시작
  // }
  return html_string;
}
```

### 3.4 모바일/데스크탑 차이

| 항목 | 데스크탑 | 모바일 |
|------|---------|--------|
| 카드 너비 | max-width: 600px | 100% |
| 버튼 배치 | 가로 나열 | 세로 스택 |
| 근거 데이터 | 기본 펼침 | 기본 접힘 |
| 단계 바 | 9단계 전체 표시 | 현재+전후 3단계 |
| 입력 바 | 하단 고정 (480px) | 하단 고정 (100%) |

### 3.5 역할별 표시 차이

| 컴포넌트 | 제조사 | 바이어 | 관리자 |
|----------|--------|--------|--------|
| Trust 뱃지 | 바이어 등급 | 셀러 등급 | 양측 |
| 가격 이력 | 본인 판매 이력 | 카테고리 평균 | 전체+이상치 |
| 액션 버튼 | 생성/전송/진행 | 확인/승인/결제 | 강제변경/에스컬레이션 |
| 넛지 | 본인 거래 | 본인 대기 건 | 전체 정체+D등급 |
| 에스컬레이션 | 요청 가능 | 요청 가능 | 수신+처리 |

---

## 4. 기존 엔진과의 연결 정리

### 4.1 Deal Autopilot 엔진

#### 어떤 질문에 호출되는가
| Intent | 호출 방식 |
|--------|----------|
| `deal.stale_list` | `S._autopilotNudges` 전체 반환 |
| `deal.next_step` | 해당 딜의 활성 넛지 필터 |
| `order.create` | 미결제 넛지 존재 여부 확인 |
| `help` | "현재 N건의 조치 필요 항목이 있습니다" |

#### 어떤 데이터를 반환하는가
```javascript
{
  nudges: [{
    id: "stale_deal_uuid",
    type: "stale_deal",           // stale_deal, unpaid_order, stale_order, no_shipment, low_activity
    ref_type: "matching",         // matching or order
    ref_id: "uuid",
    priority: 1,                  // 1=긴급, 2=주의, 3=참고
    message: "거래 매칭 ABC Trading 9일 정체",
    action_label: "확인",
    action_page: "deals",
    age: 9,
    lowTrust: true                // D등급 바이어 여부
  }],
  summary: { total: 3, p1: 1, p2: 2, low_trust: 1 }
}
```

#### 어떤 UI 카드로 보여줄지
- **List Card**: 우선순위별 정렬된 넛지 카드 목록
- 각 아이템: 우선순위 뱃지(🔴/🟡/🟢) + 메시지 + 경과일 + LOW TRUST 뱃지
- 맨 위: "⚠️ 조치가 필요한 거래 N건"

#### 어떤 액션 버튼으로 이어지는가
| 넛지 타입 | 버튼 | 함수 |
|-----------|------|------|
| stale_deal | 거래 확인 | `openDeal(dealId)` |
| unpaid_order | 결제 요청 | `viewOrder(orderId)` |
| stale_order | 주문 확인 | `viewOrder(orderId)` |
| no_shipment | 출하 등록 | `nav('tracking')` |
| low_activity | 채팅 보내기 | `openChatRoom(buyerId)` |

---

### 4.2 Trust Score 엔진

#### 어떤 질문에 호출되는가
| Intent | 호출 방식 |
|--------|----------|
| `trust.check` | `_getBuyerTrust(buyerId)` 직접 호출 |
| `deal.next_step` | 바이어 등급 확인 → D등급 경고 |
| `order.create` | D등급이면 "선결제 권장" 제안 |
| `payment.request` | 결제 축 점수 표시 |
| `deal.stale_list` | D등급 바이어 거래 하이라이트 |

#### 어떤 데이터를 반환하는가
```javascript
{
  score: 72,
  grade: "B",                     // A(>=80), B(>=65), C(>=50), D(<50)
  tags: ["Fast Responder", "Proven Track Record"],
  breakdown: {
    response: 85,                  // 가중치 20%
    payment: 78,                   // 가중치 25%
    completion: 70,                // 가중치 25%
    documents: 45,                 // 가중치 15%
    profile: 82                    // 가중치 15%
  },
  reasons: {
    response: "평균 2시간 내 응답",
    payment: "4건 중 3건 기한 내 결제",
    completion: "7건 중 5건 완료",
    documents: "필수 서류 3개 중 1개 미제출",
    profile: "사업자등록 완료"
  }
}
```

#### 어떤 UI 카드로 보여줄지
- **Status Card**: 등급 원형 뱃지(A/B/C/D) + 점수 + 강점 태그
- 5축 바 차트 (각 축별 점수 + 이유)
- 리스크 섹션: D등급이면 빨간 경고

#### 어떤 액션 버튼으로 이어지는가
| 상황 | 버튼 |
|------|------|
| 서류 낮음 | "바이어에게 서류 요청" → chatSend |
| D등급 | "관리자 에스컬레이션" → admin 알림 |
| 일반 | "상세 거래 이력" → 거래 목록 필터 |

---

### 4.3 Price Memory 엔진

#### 어떤 질문에 호출되는가
| Intent | 호출 방식 |
|--------|----------|
| `price.check` | `_getPriceRef(itemName)` + `_getCatPriceRange(category)` |
| `order.create` | `_checkPriceOutlier(item, price, cat)` |
| `doc.create` | `_priceHintHTML(itemName)` 인라인 |
| `deal.stale_list` | 가격 이상치 카운트 (관리자) |

#### 어떤 데이터를 반환하는가
```javascript
// _getPriceRef 반환
{
  count: 5,
  avg: 8.20,
  min: 6.50,
  max: 10.00,
  last: { price: 8.50, date: "2026-02-15", buyer: "ABC Trading" },
  currency: "USD"
}

// _checkPriceOutlier 반환
{
  outlier: true,
  deviation: 0.35,          // 35%
  direction: "high",        // "high" or "low"
  avg: 8.20,
  threshold: 0.30           // ±30%
}
```

#### 어떤 UI 카드로 보여줄지
- **Status Card**: 이전 N건 평균 + 범위 + 최근 가격
- 이상치 경고: `⚠️ 카테고리 평균 대비 +35% — 확인 필요`
- 3건 미만: "참고 데이터 부족" 회색 표시

#### 어떤 액션 버튼으로 이어지는가
| 상황 | 버튼 |
|------|------|
| 이상치 발견 | "가격 조정" → 서류 편집 |
| 이력 있음 | "이전 가격으로 적용" → 자동 입력 |
| 이력 부족 | "시장가 분석" → analyze-export EF |

---

## 5. 구현 우선순위 제안

### 5.1 가장 먼저 만들 1개 루프

**`deal.next_step` — "이 딜 다음 단계 뭐야?"**

### 5.2 그 이유

1. **데이터가 가장 풍부**: 딜 상태 + 넛지 + 신뢰 + 가격 = 4개 소스 전부 연결
2. **기존 코드 재사용 최대**: `DEAL_STAGES`, `_computeNudges`, `_getBuyerTrust`, `_getPriceRef` 모두 이미 존재
3. **사용자 가치 즉시 체감**: "다음에 뭐 해야 하지?"는 모든 사용자의 1번 질문
4. **양방향 검증 가능**: 제조사/바이어/관리자 3역할 모두 테스트 가능
5. **액션 버튼 패턴 확립**: 이 루프에서 read → suggest → execute → approval 전체 패턴 검증

### 5.3 최소 구현 범위

| 컴포넌트 | 설명 | 난이도 |
|----------|------|--------|
| **AI 입력 바** | 하단 고정 입력창 + 전송 버튼 | 낮음 |
| **키워드 매칭** | INTENT_KEYWORDS 기반 클라이언트 분류 | 낮음 |
| **deal.next_step 핸들러** | S 상태에서 데이터 수집 + 응답 구성 | 중간 |
| **_aiResponseCard 렌더러** | 공통 카드 구조 HTML 생성 | 중간 |
| **액션 버튼 연결** | 기존 함수 매핑 (nav, chatSend, viewOrder) | 낮음 |
| **빈 상태 처리** | 딜 미선택/없음 분기 | 낮음 |

**EF 호출 불필요** — 1단계는 클라이언트 키워드 매칭 + 로컬 데이터만으로 작동

### 5.4 건드릴 파일

| 파일 | 변경 내용 |
|------|----------|
| `whistle.html` | AI 입력 바 + intent 매핑 + 핸들러 + 카드 렌더러 추가 (~200줄) |
| `buyer.html` | 동일 구조 바이어 버전 (~100줄) |
| `admin.html` | 관리자 버전은 2순위 (기존 대시보드가 이미 정체 거래 표시) |

### 5.5 예상 리스크

| 리스크 | 대응 |
|--------|------|
| 키워드 매칭 정확도 낮음 | 1단계는 키워드, 2단계에 whistle-ai EF로 AI 분류 추가 |
| 응답 카드가 너무 길어짐 | 근거 데이터 기본 접힘 + 모바일은 요약만 |
| 기존 render() 충돌 | AI 응답은 별도 오버레이/하단 패널로 분리 |
| 딜 컨텍스트 자동 감지 | 현재 페이지 기반: deals 페이지면 선택된 딜, 아니면 "어떤 딜?" 질문 |

### 5.6 MVP 이후 확장 순서

| 순서 | 루프 | 핵심 추가 |
|------|------|----------|
| **1** | `deal.next_step` | 키워드 매칭 + 로컬 데이터 + 카드 UI |
| **2** | `deal.stale_list` | Autopilot 넛지 목록 카드 |
| **3** | `trust.check` | Trust Score 카드 |
| **4** | `price.check` | Price Memory 카드 |
| **5** | `order.create` | approval-required 플로우 |
| **6** | `payment.request` | 실행형 승인 플로우 |
| **7** | `doc.create` + `doc.send` | 서류 생성/전송 실행 |
| **8** | whistle-ai EF 연동 | 키워드 실패 시 AI 분류 |
| **9** | 바이어/관리자 확장 | buyer.html + admin.html 동일 구조 |
| **10** | 대화 이력 저장 | ai_conversations 테이블 |

---

## 6. 1순위 구현안 한 장 요약

```
┌────────────────────────────────────────────────────┐
│          WHISTLE AI 대화형 MVP — 1일차 구현안         │
├────────────────────────────────────────────────────┤
│                                                    │
│  목표: "이 딜 다음 단계 뭐야?" 1개 루프 완성          │
│                                                    │
│  1. AI 입력 바 (whistle.html 하단 고정)              │
│     ┌──────────────────────────────┬────┐          │
│     │ 무엇이든 물어보세요...          │ 전송 │          │
│     └──────────────────────────────┴────┘          │
│                                                    │
│  2. Intent 매핑 (클라이언트 키워드)                    │
│     입력 → INTENT_KEYWORDS 매칭 → handler 호출       │
│                                                    │
│  3. deal.next_step 핸들러                            │
│     _currentDeal || _matchings[0]                   │
│     + DEAL_STAGES[현재].next                        │
│     + _autopilotNudges.filter(deal)                 │
│     + _getBuyerTrust(buyerId)                       │
│     + _getPriceRef(items)                           │
│     → _aiResponseCard(opts)                         │
│                                                    │
│  4. 응답 카드 출력 (채팅 영역 또는 하단 패널)           │
│     요약 + 상태 바 + 근거 + 버튼                      │
│                                                    │
│  5. 액션 버튼 → 기존 함수 호출                        │
│     "리마인드" → chatSend()                          │
│     "다음 단계" → advanceDeal() (승인 필요)           │
│     "PI 수정" → nav('docgen')                       │
│                                                    │
│  건드릴 파일: whistle.html (+200줄)                   │
│  EF 호출: 불필요 (로컬 데이터만)                       │
│  예상 시간: 반나절                                    │
│  검증: Playwright 시나리오 테스트                      │
│                                                    │
│  성공 기준:                                          │
│  ✓ "다음 단계 뭐야" 입력 → 구조화된 카드 응답           │
│  ✓ 카드에 실제 거래 데이터 표시                        │
│  ✓ 버튼 클릭 → 기존 페이지/함수 실행                   │
│  ✓ 딜 없을 때 빈 상태 안내                            │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## 7. 기술 구현 상세 (내일 바로 착수용)

### 7.1 AI 입력 바 구조

```javascript
// whistle.html render() 함수 내부, 항상 표시
function _aiInputBar() {
  return '<div id="ai-bar" style="position:fixed;bottom:0;left:var(--sidebar-w,220px);right:0;' +
    'background:var(--bg);border-top:1px solid var(--bd);padding:12px 20px;z-index:100;' +
    'display:flex;gap:10px;align-items:center">' +
    '<div style="flex:1;position:relative">' +
    '<input id="ai-input" class="input" placeholder="무엇이든 물어보세요... (예: 이 딜 다음 단계 뭐야?)" ' +
    'style="width:100%;padding:12px 16px;border-radius:12px;font-size:14px" ' +
    'onkeydown="if(event.key===\'Enter\')App._aiSubmit()">' +
    '</div>' +
    '<button class="btn btn-pri" onclick="App._aiSubmit()" ' +
    'style="padding:12px 20px;border-radius:12px;font-weight:700">AI</button>' +
    '</div>';
}
```

### 7.2 Intent 매칭 엔진

```javascript
function _aiSubmit() {
  var input = document.getElementById('ai-input');
  if (!input) return;
  var text = input.value.trim();
  if (!text) return;
  input.value = '';

  // 1단계: 키워드 매칭
  var intent = _matchIntent(text);

  // 2단계: 핸들러 디스패치
  var response = _intentHandlers[intent.id](intent.params, text);

  // 3단계: 응답 카드 렌더링
  _showAiResponse(response);
}

function _matchIntent(text) {
  var t = text.toLowerCase();
  for (var id in INTENT_KEYWORDS) {
    var kws = INTENT_KEYWORDS[id];
    for (var i = 0; i < kws.length; i++) {
      if (t.includes(kws[i])) {
        return { id: id, params: _extractParams(t, id), confidence: 'keyword' };
      }
    }
  }
  // 매칭 실패 → 기본 help 또는 EF 호출 (2단계)
  return { id: 'help', params: {}, confidence: 'fallback' };
}
```

### 7.3 deal.next_step 핸들러

```javascript
var _intentHandlers = {
  'deal.next_step': function(params, raw) {
    // 컨텍스트 딜 결정
    var deal = S._currentDeal || _findDealByText(raw);
    if (!deal) {
      return { type: 'empty', summary: '먼저 거래를 선택하세요.',
        actions: [{ label: '프로젝트 보기', icon: '🚀', fn: "App.nav('projects')" }] };
    }

    var stIdx = DEAL_STAGES.findIndex(function(s) { return s.id === deal.stage; });
    var nextStage = stIdx < DEAL_STAGES.length - 1 ? DEAL_STAGES[stIdx + 1] : null;
    var age = _daysSince(deal.updated_at);
    var buyerTrust = _getBuyerTrust(deal.buyerId);
    var nudges = (S._autopilotNudges || []).filter(function(n) {
      return n.ref_id === deal.matchingId || n.ref_id === deal.orderId;
    });

    var risks = [];
    if (buyerTrust && buyerTrust.grade === 'D') risks.push({ level: 'high', message: '저신뢰 바이어 (D등급)' });
    if (age >= 7) risks.push({ level: 'medium', message: age + '일 정체 중' });

    // 가격 이력 (견적 단계면)
    var priceRef = null;
    if (deal.stage === 'quotation' || deal.stage === 'negotiation') {
      var items = (deal.items || []);
      if (items[0]) priceRef = _getPriceRef(items[0].name);
    }

    return {
      type: nudges.length ? 'alert' : 'status',
      summary: (deal.buyer || 'Unknown') + ' 거래는 현재 [' + DEAL_STAGES[stIdx].label + '] 단계입니다.' +
        (age > 0 ? ' ' + age + '일째 진행 중.' : ''),
      status: {
        stage: deal.stage,
        stage_idx: stIdx,
        total_stages: DEAL_STAGES.length,
        days: age,
        buyer: deal.buyer,
        trust: buyerTrust
      },
      evidence: [
        buyerTrust ? { label: '신뢰 등급', value: buyerTrust.grade + ' (' + buyerTrust.score + ')', color: _gradeColor(buyerTrust.grade) } : null,
        priceRef ? { label: '이전 거래가', value: '$' + priceRef.avg + ' (' + priceRef.count + '건)', color: 'var(--pri)' } : null,
        { label: '경과일', value: age + '일', color: age >= 7 ? 'var(--err)' : 'var(--ok)' }
      ].filter(Boolean),
      risks: risks,
      suggestion: nextStage ? '다음 단계: [' + nextStage.label + '] — ' + _stageActionHint(nextStage.id) : '최종 단계입니다.',
      actions: _buildDealActions(deal, nextStage, nudges)
    };
  }
};
```

### 7.4 응답 표시 위치

```
옵션 A: 채팅 패널 (하단 슬라이드업)
  - 장점: 대화 흐름 자연스러움
  - 단점: 기존 채팅과 혼동

옵션 B: 인라인 카드 (입력 바 위)     ← 권장
  - 장점: 현재 페이지 컨텍스트 유지
  - 단점: 긴 응답 시 스크롤

옵션 C: 사이드 패널 (우측 300px)
  - 장점: 항상 보임
  - 단점: 모바일 불가
```

**권장: 옵션 B** — 입력 바 바로 위에 카드가 슬라이드업으로 나타남. 닫기 버튼으로 해제.

---

## 부록: 기존 Edge Function 활용 계획

| EF 이름 | 현재 용도 | 대화형 연동 계획 |
|---------|----------|----------------|
| `whistle-ai` (v3) | 범용 AI | 2단계: intent 분류 fallback |
| `analyze-export` (v20) | 수출 분석 | `analysis.run` intent |
| `translate-text` (v2) | 채팅 번역 | AI 응답도 자동 번역 |
| `classify-hs` (v2) | HS코드 | `price.check`에서 참조 |
| `create-document` (v2) | 서류 생성 | `doc.create` intent |
| `send-document` (v3) | 서류 전송 | `doc.send` intent |
| `smart-negotiator` (v1) | 협상 가이드 | `deal.next_step`에서 협상 단계일 때 |
| `payment-risk` (v1) | 결제 리스크 | `payment.request`에서 참조 |
| `trust-score` (v1) | 신뢰 점수 | `trust.check` 심화 분석 |

---

> **이 문서는 2026-03-07 밤 작성되었으며, 내일 09:00 즉시 개발 착수 가능합니다.**
> 1순위: `deal.next_step` 루프 (whistle.html +200줄, EF 불필요, 반나절)
