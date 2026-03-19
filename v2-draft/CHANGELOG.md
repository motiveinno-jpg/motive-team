# V2-Draft Changelog

모든 변경사항은 원본 파일의 복사본(v2-draft/)에서 진행됩니다.
대표님 확인 후 원본에 적용합니다.

---

## 2026-03-13 — 서비스 고도화 2차 (채팅/서류/인증/결제)

### whistle.html — 핵심 기능 고도화

#### 서류 시스템
- **PI vs CI 분리**: PI에 "비구속적 견적" 면책조항 + 유효기간, CI에 "결제 요청" 선언 + B/L 참조 + 원산지 선언 추가
- 이전에는 PI와 CI가 동일 출력이었음 → 이제 법적으로 올바른 구분

#### 딜 채팅 고도화
- **빠른 견적**: 채팅 안에서 품목/수량/단가/조건/유효기간 즉시 견적 전송
- **마진 계산기**: 채팅 안에서 원가/FOB/환율/포장비/물류비 입력 → 실시간 마진율 계산 + 채팅 공유
- **파일 첨부**: PDF/이미지/엑셀 등 최대 10MB 파일 직접 업로드 + Supabase Storage 저장
- **리치 카드**: 견적/마진/파일 메시지를 시스템 카드로 이쁘게 렌더링
- **채팅 상단 단축 버튼**: 💰 견적 / 📊 마진 / 📄 서류 아이콘 버튼

#### 인증/보안 개선
- **소셜 로그인**: .catch() 에러 처리 + 사용자 안내 토스트 추가
- **비밀번호 재설정**: .catch() 추가 + 이메일 주소 포함 성공 메시지
- **로그아웃**: 모든 상태(products/analyses/orders/deals/chat 등) 완전 초기화
- **로딩 타임아웃**: 5초 → 8초 + 사용자 안내 메시지 추가

#### 구독/결제 보안
- **구독 만료 체크**: _planGate()에서 end_date 확인 → 만료 시 free로 자동 다운그레이드

#### 비용 시뮬레이터
- **HS 코드 매칭 수정**: 점(.) 포함/미포함 HS 코드 모두 정확히 매칭 (calcC + calcCCompare 양쪽)
- 이전: "330499" vs "3304.99.5000" 매칭 실패 → 관세율 0% 표시 (심각한 오류)

#### 제품 등록 개선
- **description_ko 필드 추가**: 한글 설명 입력란 — AI 카탈로그 생성에 활용
- **가격 동기화 수정**: price_krw → fob_price 환산 로직 개선 (fob_price 비어있을 때도 처리)
- **수정 시 plan gate 제외**: 기존 제품 편집은 플랜 한도와 무관하게 항상 허용
- **빈 image_url 처리**: 이미지 없으면 기존 이미지 유지

#### 이메일 허브
- **전송 버튼 복구**: 발송 성공/실패 후 버튼 disabled 해제 + 텍스트 복원

#### 딜 파이프라인 안정성
- **삭제된 바이어 방어**: buyer가 null일 때 fallback 객체 사용 → 크래시 방지
- **딜 서류 폼 제품 자동 채우기**: 등록 제품 드롭다운에서 선택 → 품목명/수량/단가 자동 입력
- **온보딩 에러 처리**: 제품 등록 실패 시 에러 토스트 표시 + product_url DB 저장

### buyer.html — 바이어 경험 개선

#### 회원가입 강화
- **국가 필수**: Country 필드 required + "Select country" placeholder
- **관심분야 필수**: Interest 필드 required + Electronics/Machinery/Fashion/Living 카테고리 추가
- **JS 검증**: doSignup()에서 company_name/display_name/country/interest 미입력 시 에러 메시지

#### 인증/보안
- **소셜 로그인**: .catch() 에러 처리 + 영문 안내 토스트
- **비밀번호 재설정**: .catch() 추가 + 이메일 포함 성공 메시지

#### 채팅 고도화
- **파일 첨부**: 바이어도 채팅에서 파일 업로드 가능 (📎 Attach File 버튼)
- **리치 카드**: 빠른 견적/파일첨부/마진분석 메시지를 카드 UI로 렌더링
- **견적 수락**: 빠른 견적 카드에 Accept/Negotiate 버튼 표시

---

## 2026-03-13 — CSS/UX 프로덕션 품질 개선

### whistle.html (+3.8KB)

#### CSS Foundation Layer
- **버튼**: min-height 추가 (40px base, 36px small, 48px large) — 터치 타겟 최소 기준 충족
- **그리드 반응형**: @media 768px, 480px 브레이크포인트 추가
- **카드**: 패딩 증가 (card-h: 12px 16px, card-b: 16px), min-height 44px
- **폼 입력**: min-height 44px, padding 12px 14px, border/box-shadow 트랜지션
- **빈 상태**: 패딩 56px, 아이콘 52px, opacity .5, 텍스트 색상 개선
- **통계 카드**: hover 효과 (border-color, box-shadow 트랜지션)
- **테이블**: 반응형 래퍼 (.tbl-wrap overflow-x:auto), 모바일 미디어쿼리
- **모달**: 입장 애니메이션 (@keyframes modalIn), 너비 변형 (wide/narrow)
- **네비게이션**: 활성 표시 바 (시안 왼쪽 테두리 3px × 20px)
- **페이지 콘텐츠**: 패딩 20px 24px, 모바일 12px 16px

#### Accessibility & UX
- **포커스 표시**: `*:focus-visible` — 2px solid cyan 아웃라인 (키보드 네비게이션)
- **스크린 리더**: `.sr-only` 클래스 추가
- **로딩 스켈레톤**: `.skeleton`, `.skeleton-text`, `.skeleton-card` — shimmer 애니메이션
- **스크롤 투 탑**: 고정 버튼 (400px+ 스크롤 시 표시), 모바일 위치 조정
- **폼 유효성**: `.form-input.invalid` 스타일, `.form-hint`, `.form-error` 클래스

#### Light Theme
- **토스트**: 라이트 테마용 배경/테두리/색상 (ok/err/warn/info)
- **모바일 토스트**: 480px 이하 하단 고정, 전체 너비

### buyer.html (+1.5KB)
- **접근성**: `*:focus-visible` 포커스 링, `.sr-only` 스크린 리더 클래스
- CSS는 이미 대부분 잘 구성되어 있어 최소 수정

### whistle-landing.html (+0.4KB)
- **접근성**: `*:focus-visible` 포커스 스타일 (정적 CSS + JSX 동적 CSS 모두)
- **스무스 스크롤**: `html{scroll-behavior:smooth}` 추가
- **URL 수정**: github.io → whistle-ai.com (환불정책 링크)

### buyer-landing.html (+0.4KB)
- **접근성**: `*:focus-visible` 포커스 스타일
- **스무스 스크롤**: `html{scroll-behavior:smooth}` 추가

### whistle-main.html (+2.4KB)
- **접근성**: `:focus-visible` + `:focus:not(:focus-visible)` 패턴
- **스무스 스크롤**: `html{scroll-behavior:smooth}`
- **SEO**: canonical URL, og:url → whistle-ai.com 확인

---

## 검증 상태

| 파일 | CSS 개선 | 접근성 | URL 정리 | 모바일 |
|------|---------|--------|---------|--------|
| whistle.html | ✅ | ✅ | ✅ | ✅ |
| buyer.html | ✅ | ✅ | — | — |
| whistle-landing.html | ✅ | ✅ | ✅ | — |
| buyer-landing.html | ✅ | ✅ | — | — |
| whistle-main.html | ✅ | ✅ | ✅ | — |

### 코드 품질 확인
- ✅ 가짜 데이터 없음 — 모든 데이터는 Supabase 실시간 로드
- ✅ 플레이스홀더 콘텐츠 없음 — 빈 상태는 적절한 CTA 안내
- ✅ 결제: 토스 키 미설정 시 상담 CTA 자동 전환
- ✅ 인증: 소셜 로그인(Google/카카오) + 이메일 + 비밀번호 재설정
- ✅ 프로필 완성도 자동 계산 + 누락 항목 안내
- ✅ 모바일 하단 네비게이션 + 사이드바 토글
- ✅ 서류 생성 14종 — PI/CI/PL/CO/BL/SC + 8종 추가
- ✅ 온보딩 3단계 위자드 (회사→제품→분석)
- ✅ github.io URL 모두 whistle-ai.com으로 정리

### 대표님 확인 필요
1. v2-draft 파일들을 브라우저에서 직접 확인
2. 괜찮으면 원본에 덮어쓰기 + 배포
3. 토스 결제 실키 발급 후 `TOSS_CONFIG.ck` 교체
