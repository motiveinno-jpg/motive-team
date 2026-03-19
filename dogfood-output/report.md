# Dogfood Report: Whistle AI 제조사 여정

| Field | Value |
|-------|-------|
| **Date** | 2026-03-12 |
| **App URL** | https://motiveinno-jpg.github.io/motive-team/whistle.html |
| **Session** | whistle-maker |
| **Scope** | 제조사 전체 여정: 가입→AI분석→상품등록→바이어매칭→구독결제→서류→물류→채팅 |

## Summary

| Severity | Count |
|----------|-------|
| Critical | 1 |
| High | 1 |
| Medium | 2 |
| Low | 2 |
| **Total** | **6** |

## Issues

### ISSUE-001 — 회사명 필드에 별표(*) 중복 표시

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Category** | Content |
| **Page** | 대시보드 > 온보딩 1단계 (회사 정보) |
| **Screenshot** | `screenshots/issue-001.png` |
| **Repro Video** | N/A |

**Description:** 온보딩 1단계 회사 정보 입력 폼에서 "회사명" 라벨 옆에 필수 표시 별표(*)가 2개 표시됩니다 ("회사명 * *"). 다른 필수 필드에는 1개만 표시되어 일관성이 없습니다.

**Repro:** 회원가입 후 로그인 → 대시보드 → 온보딩 1단계에서 바로 확인 가능. 2단계 "제품명" 라벨에도 동일 증상.

---

### ISSUE-002 — AI 수출 분석 시작 시 DB 제약조건 에러 (핵심 기능 차단)

| Field | Value |
|-------|-------|
| **Severity** | Critical |
| **Category** | Functional |
| **Page** | AI 수출상품분석 > 새 분석 |
| **Screenshot** | `screenshots/issue-002.png`, `screenshots/ai-analysis-running.png` |
| **Repro Video** | N/A |

**Description:** AI 수출 분석 "바로 분석 시작" 클릭 시 에러 토스트 표시:
```
실패: new row for relation "analyses" violates check constraint "analyses_analysis_type_check"
```
DB의 `analyses` 테이블에 `analysis_type` 컬럼의 CHECK 제약조건 위반. 분석이 생성되지 않고 버튼이 disabled 상태로 전환되며 버튼 텍스트가 빈 상태가 됨. 제조사의 핵심 가치인 AI 분석이 완전히 차단됨.

**Repro:**
1. 로그인 후 온보딩 3단계에서 "AI 분석 시작하기" 클릭 (또는 사이드바 AI 수출상품분석 > 새 분석)
2. 제품명 입력, URL 입력
3. "🔬 바로 분석 시작" 클릭
4. 에러 토스트 표시 후 버튼 disabled

---

### ISSUE-003 — 서류 자동생성 한도 표시 "undefined/undefined"

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Category** | Functional |
| **Page** | 서류 생성 |
| **Screenshot** | `screenshots/issue-003.png` |
| **Repro Video** | N/A |

**Description:** 서류 자동생성 페이지 하단에 "🔒 서류 자동생성 한도 초과 (undefined/undefined) 업그레이드하세요." 메시지가 표시됩니다. 사용 횟수와 한도 값이 모두 `undefined`로 표시되어, 무료 사용자가 몇 건을 쓸 수 있는지/이미 썼는지 알 수 없습니다.

**Repro:** 로그인 후 사이드바 "서류 생성" 클릭 → 페이지 하단 잠금 영역에서 바로 확인 가능.

---

### ISSUE-004 — 서류 생성 오버레이가 모든 서류 카드 클릭 차단

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Category** | Functional |
| **Page** | 서류 생성 |
| **Screenshot** | `screenshots/doc-page-overlay.png` |
| **Repro Video** | N/A |

**Description:** 서류 생성 페이지의 잠금 오버레이(업그레이드 유도)가 상위 서류 카드(PI, CI, PL 등)의 "생성 →" 버튼 클릭까지 차단합니다. 오버레이의 `pointer-events` 또는 z-index 문제로, 무료 사용자가 상단에 보이는 서류(잠금 해제된 것으로 보이는)도 생성할 수 없습니다. FREE 플랜에서 일부 서류 생성이 허용되어야 하거나, 차단된다면 명확한 시각적 잠금 표시가 필요합니다.

**Repro:** 로그인 후 사이드바 "서류 생성" 클릭 → 아무 서류의 "생성 →" 버튼 클릭 시도 → 클릭 불가.

---

### ISSUE-005 — 콘솔 에러: 국가 데이터 로딩 실패 + 다수 리소스 에러

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Category** | Console / Errors |
| **Page** | 전역 (모든 페이지) |
| **Screenshot** | N/A (콘솔 출력) |
| **Repro Video** | N/A |

**Description:** 브라우저 콘솔에 다음 에러들이 반복 발생:
1. `Country data load failed: data.forEach is not a function` — 국가 데이터 로드 실패 (FTA/관세 관련 기능 영향 가능)
2. `ERR_NAME_NOT_RESOLVED` — DNS 해석 실패 (외부 리소스 URL 오류)
3. 다수의 HTTP 400, 406 에러 — API 호출 실패

**Impact:** 국가 데이터가 로드되지 않으면 HS코드 분류, FTA 관세 시뮬레이션, 타겟 시장 분석 등 핵심 기능에 영향.

**Repro:** 로그인 후 아무 페이지에서 브라우저 콘솔 확인.

---

### ISSUE-006 — 구독 가격 표기 불일치 (서류 페이지 vs 구독 페이지)

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Category** | Content |
| **Page** | 서류 생성 / 구독 & 서비스 |
| **Screenshot** | `screenshots/issue-003.png` (서류), `screenshots/subscription.png` (구독) |
| **Repro Video** | N/A |

**Description:** 같은 STARTER 요금제 가격이 페이지마다 다르게 표기됩니다:
- 서류 생성 페이지: "₩199,000 → **₩99,000**/월" (원 단위)
- 구독 & 서비스 페이지: "20만원 → **10만원**/월" (만원 단위)
금액은 동일하나 표기 방식이 일관되지 않아 혼란 가능. 하나로 통일 필요.

**Repro:** 서류 생성 페이지 하단 vs 구독 & 서비스 페이지 가격 카드 비교.

---

