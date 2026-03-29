# [S5-동남아바이어] QA 최종 보고서

## 페르소나
- **이름**: Nguyen Thi Mai (여, 28세)
- **사업**: 1인 온라인 뷰티 셀러, 호치민, Shopee+Lazada
- **IT수준**: 상 (모바일 퍼스트, iPhone 13 Mini)
- **언어**: 베트남어 모국어, 영어 초급
- **접속**: Accept-Language: vi-VN, 뷰포트 375x812

## 테스트 계정
- `test-buyer-jp@whistle-qa.com` (country=VN으로 변경, pw: VnTest2026!@)
- bcrypt cost factor 6 필수 (GoTrue 호환)

---

## 전체 버그 현황: **P1: 3건 | P2: 8건 | P3: 4건 | 시각적: 3건 = 총 18건**

---

## Phase 1: 모바일 첫 경험

### ✅ 작동하는 것
- 모바일 레이아웃 (사이드바 숨김, 하단 네비 표시)
- 페이지 로딩: 827ms (양호)
- 베트남어 번역: 480+ 항목, 품질 우수
- 온보딩 4단계 플로우 베트남어로 작동
- 하단 네비 베트남어: Trang chủ, Tìm kiếm, Giao dịch, Trò chuyện, Hồ sơ

### ❌ 안 되는 것
- **S5-bug-001 [P1]**: Accept-Language 무시 — navigator.language 미사용, `return 'en'` 하드코딩
- **S5-bug-002 [P2]**: 터치 타겟 44px 미달 — 체크박스 13px, 링크 15px, 버튼 42px
- **S5-bug-003 [P1]**: 가입 429 에러 메시지 "email rate limit exceeded" + 폼 리셋
- **S5-bug-005 [P2]**: 로그인 페이지에 언어 선택 UI 없음
- **S5-bug-011 [P1]**: `<html lang="ko">` 하드코딩

---

## Phase 2: 베트남어 UI 품질

### ✅ 잘 번역된 영역
- 로그인/가입: Đăng nhập, Mật khẩu, Đăng ký ✅
- 검색 필터: Tất cả danh mục, Giá tối thiểu/đa, MOQ, Liên quan nhất ✅
- 프로필: Hồ sơ, Xác minh, Thông tin hồ sơ ✅
- 채팅: Cuộc trò chuyện, Gửi yêu cầu ✅
- 비용 시뮬레이터: Ước tính tổng chi phí, Phí vận chuyển, Thuế quan ✅
- 에러 메시지: "Email hoặc mật khẩu không hợp lệ." ✅
- 온보딩 Step 1,3: 완전 베트남어 ✅

### ❌ 번역 누락
- **S5-bug-012 [P2]**: 온보딩 Step 2 카테고리명 전부 영어 (Beauty, Food, Electronics...)
- **S5-bug-013 [P3]**: 온보딩 Step 4 "You're all set!" 영어
- **S5-bug-014 [P2]**: 거래 탭 "Active Deals"/"Inquiries" 영어 + 버튼 텍스트 잘림
- **S5-bug-015 [P3]**: 대시보드 "Sourcing Guide" 영어
- **S5-bug-006 [P3]**: 쿠키 배너 언어 불일치 (영어 고정)
- 온보딩 공통: "Let's set up your buyer profile in a few quick steps" 영어

---

## Phase 3: VND 통화 표시

### ✅ 작동하는 것
- 검색 필터에서 VND 선택 가능 (20개 통화 중)
- 제품 카드: ₫223,102, ₫393,709 정상 표시
- 제품 상세: FOB 가격 VND + 원래 USD 함께 표시 (좋은 UX)
- 비용 시뮬레이터: ₫111,550,767, ₫136,813,735 등 큰 숫자 레이아웃 OK

### ❌ 안 되는 것
- **S5-bug-004 [P2]**: 대시보드 통화 VND 미표시 — USD 고정 ($33,500.00)
- VND 천 단위 구분자가 콤마(₫223,102) — 베트남 관행은 마침표(223.102)
- preferred_currency=VND 설정해도 검색에서 매번 수동 선택 필요

---

## Phase 4: 영어 초급자 관점

- **S5-bug-007 [P2]**: 무역 용어(FOB, CIF, MOQ, HS Code) 설명 툴팁 0개
- **S5-bug-010 [P2]**: 샘플 주문 프로세스 불명확 (Request Sample 버튼 없음)

---

## Phase 5: 시각적 UX (TASK-003)

- **S5-visual-001 [P3]**: 대시보드 통계 카드 빽빽함
- **S5-visual-002 [P2]**: 검색 필터 모바일 화면 절반 이상 차지 → 제품 0개 보임
- **S5-visual-003 [P2]**: 쿠키 배너가 하단 네비 + 온보딩 Next 버튼 가림

---

## Phase 7: 성능 (간략)

| 지표 | 값 | 판정 |
|------|-----|------|
| TTFB | 362ms | ✅ |
| DOM Ready | 827ms | ✅ |
| 리소스 수 | 24개 | ✅ |
| 406 에러 | 4건 | ⚠️ (Supabase RLS 관련 추정) |

---

## TASK-001: 지역/언어 자동 감지 결과

| 체크항목 | 결과 |
|---------|------|
| Accept-Language: vi-VN → 베트남어 자동? | ❌ 무시됨 |
| navigator.language 감지? | ❌ 코드에 없음 |
| IP geolocation 감지? | ❌ 없음 |
| 베트남어 미지원 시 영어 fallback? | N/A (vi 지원함) |
| 통화 VND 자동 전환? | ❌ 수동 선택 필요 |
| 언어 설정 저장? | ✅ localStorage |
| 새로고침 유지? | ✅ |
| URL 구조 (/vi, ?lang=vi)? | ?lang=vi 지원 (코드에 있음) |

**결론: 자동 감지 메커니즘 0% — P0 수준**

---

## 코드 분석 발견사항

### 언어 강제 오버라이드 (buyer-app.html:2570-2572)
```javascript
_isKorean = (_authCountry==='KR');
if(!_isKorean && _userLang==='ko') { _userLang='en'; }
else if(_isKorean && _userLang!=='ko') { _userLang='ko'; }
```
→ KR 사용자는 언어 변경 불가 (무조건 ko 강제). P2 버그.

### Supabase bcrypt 호환성
- GoTrue는 `$2a$06$` 사용
- PostgreSQL `gen_salt('bf', 10)`은 `$2a$10$` 생성 → **로그인 실패**
- `gen_salt('bf', 6)`으로 해야 GoTrue와 호환

---

## 전체 버그 목록

| # | 파일 | 심각도 | 제목 |
|---|------|-------|------|
| 001 | S5-bug-001.md | **P1** | 언어 자동 감지 없음 — Accept-Language 무시 |
| 002 | S5-bug-002.md | P2 | 터치 타겟 44px 미달 (체크박스 13px) |
| 003 | S5-bug-003.md | **P1** | 가입 429 에러 메시지 불친절 + 폼 리셋 |
| 004 | S5-bug-004.md | P2 | 대시보드 통화 VND 미표시 — USD 고정 |
| 005 | S5-bug-005.md | P2 | 로그인 페이지에 언어 선택 UI 없음 |
| 006 | S5-bug-006.md | P3 | 쿠키 배너 언어 불일치 |
| 007 | S5-bug-007.md | P2 | 무역 용어 설명 툴팁 없음 |
| 008 | S5-bug-008.md | P3 | 하단 네비 Home ≠ Dashboard 명칭 |
| 009 | S5-bug-009.md | P3 | 검색 필터 모바일 8줄 — 제품 밀림 |
| 010 | S5-bug-010.md | P2 | 샘플 주문 기능 불명확 |
| 011 | S5-bug-011.md | **P1** | html lang="ko" 하드코딩 |
| 012 | S5-bug-012.md | P2 | 온보딩 Step 2 카테고리명 영어 잔류 |
| 013 | S5-bug-013.md | P3 | 온보딩 Step 4 "You're all set!" 영어 |
| 014 | S5-bug-014.md | P2 | 거래 탭명 영어 + 버튼 텍스트 잘림 |
| 015 | S5-bug-015.md | P3 | 대시보드 "Sourcing Guide" 영어 |
| V001 | S5-visual-001.md | P3 | 대시보드 통계 카드 빽빽함 |
| V002 | S5-visual-002.md | P2 | 검색 필터 모바일 화면 절반 차지 |
| V003 | S5-visual-003.md | P2 | 쿠키 배너 하단 네비+버튼 가림 |

**P1: 3건 | P2: 8건 | P3: 4건 | 시각적: 3건 = 총 18건**

---

## 미완료 / 다음 세션

- [ ] Phase 8: 태국(th), 인도네시아(id) 페르소나 반복
- [ ] 3G 네트워크 throttling 테스트
- [ ] VND 천 단위 구분자 관행 (콤마→마침표)
- [ ] Stripe 결제 모바일 최적화
- [ ] KR 사용자 언어 강제 오버라이드 문제 상세 분석
- [ ] 가로 모드(landscape) 레이아웃 테스트
