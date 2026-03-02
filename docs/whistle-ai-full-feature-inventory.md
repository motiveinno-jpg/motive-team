# Whistle AI — 전체 기능 인벤토리 (ChatGPT 공유용)

> 이 문서는 Whistle AI 플랫폼의 모든 페이지, 메뉴, 기능, API를 포함합니다.
> ChatGPT가 페르소나 기반 QA 계획을 수립하고, 감사 목표를 설정하는 데 활용됩니다.
> 작성일: 2026-03-02 | 작성자: Claude (자동 감사)

---

## 플랫폼 개요

| 항목 | 내용 |
|---|---|
| 서비스명 | Whistle AI (휘슬 AI) |
| 목적 | 한국 제조사의 수출 통합 관리 솔루션 |
| 기술 스택 | Vanilla JS SPA (단일 HTML), Supabase (Auth/DB/Realtime/Edge Functions), jsPDF |
| 호스팅 | GitHub Pages (motiveinno-jpg.github.io/motive-team/) |
| Supabase | lylktgxngrlxmsldxdqj.supabase.co |
| 결제 | Stripe + Toss Payments |
| AI | Claude API (릴레이 서버 경유) |

### 전체 페이지 구성 (6개)

| 파일명 | 역할 | 대상 사용자 | 규모 |
|---|---|---|---|
| whistle.html | 제조사 어드민 | 한국 제조사/셀러 | 7,129줄, 220+ 메서드 |
| buyer.html | 바이어 어드민 | 해외 바이어/수입자 | 3,708줄, 60+ 메서드 |
| admin.html | 관리자 어드민 | 모티브 운영팀 | 2,300+줄, 64 메서드 |
| whistle-landing.html | 제조사 랜딩 | 잠재 제조사 고객 | 1,540줄, React+Babel |
| buyer-landing.html | 바이어 랜딩 | 잠재 바이어 고객 | 2,277줄, React+Babel |
| whistle-alibaba-bp-v5.html | 알리바바 BP | 알리바바 임원진 | 729줄, 정적 HTML |

---

## 1. 제조사 어드민 (whistle.html)

### 사이드바 메뉴 (28개)

| 메뉴명 | 내부 ID | 페이지 함수 | 설명 |
|---|---|---|---|
| 대시보드 | dashboard | pgDash() | 메인 홈, KPI, 빠른 액션, 타임라인 |
| AI 수출 분석 | analysis | pgAnalysis() | AI 분석 폼/목록/보고서 (3 서브페이지) |
| 프로젝트 | projects | pgProjects() | 수출 프로젝트 관리 (8단계) |
| 제품 카드 | products | pgProducts() | 제품 CRUD, 이미지, 카탈로그 |
| 딜 파이프라인 | deals | pgDeals() | 거래 관리 + 딜룸 채팅 |
| 바이어 | buyers | pgBuyers() | 바이어 목록/추가/AI 발굴 |
| 바이어 장터 | marketplace | pgMarketplace() | 바이어 거래 요청 + 제안 입찰 |
| 검색 트렌드 | trends | pgTrends() | 키워드 트렌드 + AI 리포트 |
| 일정관리 | meetings | pgMeetings() | 미팅 등록/관리/AI 브리핑 |
| 주문관리 | orders | pgOrders() | 주문 CRUD + 결제/상태 관리 |
| 물류 추적 | tracking | pgTracking() | 배송 추적 + B/L + 상태 업데이트 |
| 제작 이동 맵 | processmap | pgProcessMap() | 9단계 수출 프로세스 시각화 |
| 서류 생성 | docgen | pgDocgen() | PI/CI/PL/CO/SC 자동 생성 + PDF |
| 바이어 채팅 | chat | pgChat() | 1:1 메시지 + 서류 첨부 + Rich Card |
| 이메일 | emailhub | pgEmail() | 이메일 작성/발송/로그 |
| 원가 계산 | costsim | pgCost() | 제품원가/마진시뮬/물류비 (3탭) |
| 알리바바 | alibaba | pgAlibaba() | 스토어/매뉴얼/API/파이프라인 (4탭) |
| 서비스 신청 | services | pgServices() | 6개 전문 서비스 카드 |
| 구독 | subscription | pgSub() | Free/Starter/Pro 요금제 + 결제 |
| 바우처 보고서 | voucherreport | pgVoucherReport() | 정부 바우처 가이드 + 리포트 |
| 초대/레퍼럴 | invite | pgInviteReferral() | 바이어/제조사 초대 + 레퍼럴 코드 |
| 제휴 문의 | partnership | pgPartnership() | 제휴 문의 폼 |
| 가이드 센터 | guide | pgGuide() | 수출기본/산업별/국가별/용어/전시회 (5탭) |
| 설정 | settings | pgSettings() | 회사정보/은행/인증서/계정 |

### 주요 기능 상세

#### AI 수출 분석 (최우선 기능)
- **입력**: 제품명, 카테고리, URL(최대 3개), 이미지, 시장 선택, 추가 요청
- **출력**: 13개 섹션 보고서 (시장성, HS코드, 인증, 경쟁사, FOB가격, 타겟시장, 리스크, 실행 로드맵, 키워드, 원가시뮬레이션, 생산가이드, 서류체크리스트, 알리바바 적합도)
- **Plan Gate**: FREE(월3회), STARTER(월10회), PRO(무제한)
- **후속 액션**: PDF 다운로드, 바이어 매칭, 프로젝트 생성, 이메일 공유

#### 딜 파이프라인 + 딜룸
- **딜 목록**: 거래 상태, 바이어, 제품, 금액, 단계 배지
- **딜룸 (Chat-Centric Layout)**:
  - 좌측: 거래 정보 사이드바 (토글 가능) — 바이어/제품/결제 마일스톤
  - 우측: 실시간 채팅 — 텍스트/Rich Card (견적/주문/선적/결제)
  - Action Chips: 주문관리, 물류추적, 원가계산, 서류, 샘플, 선적
  - AI 번역 토글 (한→영, 영→한)

#### 서류 생성
- **지원 문서**: PI(견적송장), CI(상업송장), PL(포장명세서), CO(원산지증명서), SC(운송확인서)
- **자동 채우기**: 과거 거래 정보 기반
- **라인 아이템**: 제품명/수량/단가 추가/제거
- **PDF**: jsPDF 클라이언트 렌더링
- **Plan Gate**: FREE 불가, STARTER부터

#### 원가 계산 (3탭)
- **제품 원가**: 제품별 FOB 자동 계산
- **마진 시뮬레이터**: 제품원가+운송비+관세+마진율 → FOB/CIF/소매가 추정
- **물류비**: 출발지/도착지+중량/CBM+Incoterm → 해상/항공 운임 + 포워더 RFQ

#### 알리바바 (alibaba 플랜만)
- **개요**: 스토어 상태, 제품 수, 문의 수, 응답률
- **매뉴얼 입점**: Alibaba.com 수동 가이드
- **API 연동**: 토큰 관리, 로그
- **파이프라인**: 문의 관리, AI 자동 응답, 거래 진행

#### 주요 모달 (20+개)
- pm(제품), nvm(네이버시장조사), sm(서비스신청), dpm(서류유형선택), em(이메일), cpm(간편원가), om(주문), od(주문상세), bm(바이어), mm(미팅), mv(미팅상세), tkm(배송상세), tum(배송상태), asm(알리바바스토어), aim(알리바바문의), aiv(문의상세), spm(샘플), shm(선적), ckm(플랜변경), mkt-modal(AI마케팅소재)

### App 메서드 분류 (220+개)

| 카테고리 | 주요 메서드 | 개수 |
|---|---|---|
| 인증 | doLogin, doSignup, doReset, doLogout, socialLogin | 6 |
| 분석 | startAForm, submitA, viewA, delA, addUrl, rmUrl | 8 |
| 프로젝트 | createPj, viewPj, setPjStage, addPjNote, delPj | 10 |
| 제품 | saveP, editP, delP, genCatalogEN, genMarketingContent | 8 |
| 서류 | startDoc, addDocItem, rmDocItem, genDoc, genDocPDF | 10 |
| 이메일 | composeE, sendE, cpEmail, loadEmailLogs | 6 |
| 채팅 | openChatRoom, chatSend, chatAttach, chatSendDoc | 8 |
| 원가 | calcC, calcMarginSim, calcProduct, genForwarderRFQ | 8 |
| 주문 | saveOrder, viewOrder, setOrderStatus, setOrderPay | 8 |
| 바이어 | saveBuyer, findBuyersAI, saveAIBuyer, buyerCtx | 6 |
| 미팅 | saveMeeting, viewMeeting, getMeetingPrep, completeMeeting | 8 |
| 물류 | viewTrackingDetail, updateTrackingStatus, trackBL | 6 |
| 딜룸 | openDealRoom, sendDealChat, submitDealDoc, advanceDeal | 20 |
| 알리바바 | saveAlibabaStore, saveAlibabaInquiry, getAlibabaReply | 10 |
| 마켓플레이스 | loadMarketplace, viewMarketRequest, submitProposal | 4 |
| 트렌드 | loadTrends, genTrendReport, setTrendAutoFreq | 6 |
| 구독/결제 | openCheckout, initStripeCheckout, initTossCheckout, chgPlan | 8 |
| 설정 | saveSt, uploadCompDoc, saveCompanyProfile | 5 |
| 기타 | doSearch, toggleMob, toggleNotif, exportCSV, downloadReportPDF | 15 |

---

## 2. 바이어 어드민 (buyer.html)

### 사이드바 메뉴 (14개)

| 메뉴명 | 페이지 함수 | 설명 |
|---|---|---|
| Dashboard | pgDash() | 통계 카드 + 최근 활동 피드 |
| Product Search | pgSearch() | AI 기반 제품 검색/필터 (Whistle+Naver) |
| Find Manufacturers | pgSourcing() | 9개 카테고리별 제조사 탐색 |
| Sourcing Pipeline | pgDeals() / pgDealRoom() | 딜 관리 + 9단계 파이프라인 |
| My Inquiries | pgInquiries() | 문의 이력 + 상태 관리 |
| Marketplace | pgMarketplace() | 바이어 요청 게시판 |
| Messages | pgMessages() | 셀러와 1:1 메시지 |
| Orders | pgOrders() | 주문 추적 + 상태 |
| Shipments | pgShipments() | 배송 추적 |
| Documents | pgDocs() | 공유 서류 (PI/CI/PL/CO/SC) |
| Saved Products | pgSaved() | 북마크한 제품 |
| Profile | pgProfile() | 계정 + 구독 관리 |
| Partnership | pgPartnership() | 제휴 문의 |
| Logout | B.doLogout() | 로그아웃 |

### 주요 기능 상세

#### 제품 검색
- Whistle 내부 DB + Naver 마켓 검색 전환
- 카테고리/가격/회사/재질 필터
- 관련성/평점/가격 정렬
- **Plan Gate**: FREE(월3회), STARTER(월30회), PRO(월200회)

#### 소싱 (9개 카테고리)
- K-Beauty, K-Food, Health Supplements, Electronics, Fashion, Organic, Home, Medical, Industrial
- 카테고리별 제조사 수 표시
- 스펙별 필터 (예: K-Beauty → 피부타입, 성분)

#### 딜룸 (9단계 파이프라인)
1. Inquiry(문의) → 2. Matched(매칭) → 3. Quotation(견적) → 4. Sample(샘플) → 5. Negotiation(협상) → 6. Order(주문) → 7. Production(생산) → 8. Shipping(출하) → 9. Completed(완료)
- 실시간 채팅 + 서류 공유
- Action Chips: 견적요청, 견적수락, 샘플확인, 주문준비, 배송확인
- 리뷰 제출 (별점, 태그, 코멘트)
- AI 번역 토글

#### 마켓플레이스
- 바이어가 요청 게시 → 셀러가 제안 입찰
- 제안 수락/거절/요청 마감

### B 메서드 분류

| 카테고리 | 주요 메서드 |
|---|---|
| 인증 | doLogin, doSignup, doReset, doLogout, socialLogin |
| 검색 | doSearch, quickSearch, setSource, setFilter, clearFilters |
| 문의 | openInquiry, submitInquiry, showInquiryDetail |
| 제품 | saveProduct, unsaveProduct, openProductDetail |
| 딜 | openDeal, sendDealMessage, requestQuote, acceptQuote, confirmSampleOk, confirmReadyToOrder, confirmDelivery |
| 채팅 | openChat, sendChat, translateMsg |
| 주문 | showOrderDetail |
| 리뷰 | setReviewStar, toggleReviewTag, submitReview |
| 마켓플레이스 | showRequestForm, submitRequest, viewRequest, acceptProposal, rejectProposal, closeRequest |
| 소싱 | openSourcingCat, searchFromSourcing, submitSourcingReq |
| 온보딩 | toggleBuyerCat, setBuyerExp, nextBuyerOb, completeBuyerOnboarding |
| 구독 | openBuyerCheckout, initBuyerStripe, openBillingPortal |

### 통화 지원
- USD (기본), KRW, JPY, AED, EUR, GBP

---

## 3. 관리자 어드민 (admin.html)

### 사이드바 메뉴 (17개)

| 메뉴명 | 내부 ID | 페이지 함수 | 뱃지 |
|---|---|---|---|
| 대시보드 | dashboard | pgDash() | - |
| 서비스 요청 | services | pgServiceReq() | 미배정 건수 |
| 분석/통계 | analytics | pgAnalytics() | - |
| 제조사 관리 | sellers | pgSellers() | 제조사 수 |
| 바이어 관리 | buyersMgmt | pgBuyers() | 바이어 수 |
| 유저 관리 | users | pgUsers() | 전체 유저 수 |
| 매칭/딜 | matchings | pgMatchings() | 활성 딜 수 |
| 딜룸 거래 | dealsMgmt | pgDeals() | 활성 딜 수 |
| 주문/매출 | ordersMgmt | pgOrders() | - |
| 분쟁 관리 | disputes | pgDisputes() | 미해결 건수 |
| 결제/에스크로 | payments | pgPayments() | 미확인 증빙 수 |
| 채팅 모니터 | chat | pgChat() | 미읽은 메시지 수 |
| 분석 이력 | analyses | pgAnalyses() | 분석중 건수 |
| 제품 관리 | products | pgProducts() | - |
| 프로젝트 | projects | pgProjects() | - |
| 서류 | documents | pgDocuments() | - |
| 알리바바 관리 | alibabaMgmt | pgAlibabaMgmt() | - |
| 시스템 상태 | health | pgHealth() | - |
| 설정 | settings | pgSettings() | - |

### 주요 기능 상세

#### 대시보드 (pgDash)
- **긴급 알림**: 미배정 요청, SLA 초과, 미읽은 메시지
- **5개 KPI 카드**: 전체 유저, 활성 딜, 전환율, 누적 매출, 국가수
- **플랜 분포 차트**
- **파이프라인 퍼널**: proposed→interested→sample→negotiation→contract→completed
- **국가별 바이어 분포**
- **최근 메시지 (미읽음 표시)**

#### 결제/에스크로 (pgPayments — 5탭)
- **수익**: MRR, ARR, 에스크로 보유액, 수수료, 플로트
- **증빙 리뷰**: 결제 증빙 확인/승인/반려
- **구독**: 바이어/제조사 요금제 테이블
- **에스크로**: 트랜잭션 파이프라인 (계약금대기→입금→생산→배송→검사→출금)
- **정책**: 취소/환불 정책

#### 분쟁 관리 (pgDisputes)
- **유형**: 품질, 배송, 결제, 소통, 기타
- **우선순위**: low/medium/high/critical
- **상태**: open/investigating/resolved/closed/escalated
- **해결**: 분쟁 내용 + 당사자 정보 + 해결 노트

#### 바이어 관리 (pgBuyers)
- 실제/목(Mock) 바이어 필터
- 태그 관리 (추가/삭제)
- 관리자 메모
- 매칭 생성 (바이어↔셀러)

#### 매칭/딜 (pgMatchings)
- **상태**: 제안/관심/샘플/협상/계약/완료/거절
- 태그 관리
- 관리자 메모
- 상태 변경

### Adm 메서드 (64개)

| 카테고리 | 주요 메서드 |
|---|---|
| 네비게이션 | set, nav, setPg, setSearch, setTab |
| 인증 | doLogin, doLogout, doReset |
| 유저 | viewUser, editUserPlan, editUserRole, toggleUserActive |
| 분석 | viewAnalysis, updateAStatus, deleteAnalysis |
| 서비스 | viewSR, updateSR, quickSR, deleteSR, notifySR(텔레그램) |
| 셀러 | viewSeller |
| 바이어 | viewBuyer, showBuyerForm, saveBuyerForm, addBuyerTag, rmBuyerTag, saveBuyerMemo |
| 매칭 | viewMatching, showMatchingForm, saveMatchingForm, changeMatchingStatus, addMatchingTag, rmMatchingTag, saveMatchingMemo |
| 주문 | viewOrder, changeOrderStatus, changeOrderPayment, markMilestonePaid |
| 분쟁 | viewDispute, showDisputeForm, saveDisputeForm, changeDisputeStatus, changeDisputePriority, saveDisputeResolution, resolveDispute, closeDispute |
| 딜 | viewDeal, changeDealStage |
| 결제 | viewProofDetail, approveProof, rejectProof |
| 알리바바 | editAlibabaSync, saveAlibabaSync |
| 시스템 | render, refreshAll, exportCSV, toggleMob, closeMob, closeModal, showModal |

---

## 4. 제조사 랜딩 (whistle-landing.html)

### 페이지 섹션 (13개)

| 순서 | 섹션명 | 내용 |
|---|---|---|
| 1 | Hero | "사진 한 장이면 수출이 시작됩니다" + 익명 AI 분석 폼 (URL/파일 업로드) |
| 2 | Social Proof | 6개 카테고리 아이콘 + 3개 고객 후기 |
| 3 | Pain Points | 4개 고통점 → 해결방안 카드 |
| 4 | How It Works | 3가지 입력방식 + 13개 분석 섹션 요약 + 샘플 분석 결과 |
| 5 | Pipeline | 4단계 수출 여정 (분석→전략→입점→매칭) |
| 6 | Export Guide | 10단계 수출 체크리스트 (인터랙티브, D-0~D-70) |
| 7 | Cost Simulator | AI 자동 원가 계산기 + 마진 시나리오 3개 |
| 8 | All-in-One | 7개 통합 기능 + Before/After 비교 (40시간→8시간) |
| 9 | Pricing | Free/Starter/Pro + 결제 주기 토글 + 바우처 토글 |
| 10 | Alibaba | 총판/독립 2모델 + 수수료 구조 |
| 11 | Voucher (서브) | 수출바우처/혁신바우처 + 자가진단 계산기 |
| 12 | Partner (서브) | 4가지 제휴 유형 + 문의 폼 |
| 13 | FAQ + CTA | 6개 FAQ 아코디언 + 최종 CTA |

### 주요 폼/모달
- **회원가입 모달**: 역할 선택(제조사/바이어) + 회사명/담당자/이메일/비밀번호/연락처/제품/약관
- **로그인 모달**: 이메일/비밀번호 + 비밀번호 찾기
- **익명 AI 분석**: URL 입력 또는 파일 업로드(최대 10MB) → 5단계 로딩 → 결과 표시 (30초 후 블러+가입유도)
- **바우처 자가진단**: 업종/매출/수출경험 → 적격 바우처 + 지원한도 계산
- **제휴 문의 폼**: 유형/회사/담당자/이메일/전화/설명

### API 호출
- `sb.auth.signUp()` — 회원가입
- `sb.auth.signInWithPassword()` — 로그인
- `POST /api/whistle/analyze-anonymous` — 익명 AI 분석 (90초 타임아웃)
- `POST /api/whistle/chat-inquiry` — 채팅 위젯
- `sb.from("users").upsert()` — 프로필 생성
- `sb.from("companies").insert()` — 회사 생성
- `sb.from("contact_requests").insert()` — 제휴 문의

---

## 5. 바이어 랜딩 (buyer-landing.html)

### 페이지 섹션

| 순서 | 섹션명 | 내용 |
|---|---|---|
| 1 | Hero | "한국 상품, 정말 확인하고 사는 법" + 검색 CTA |
| 2 | Product Search | 검색바 + 카테고리/가격/원산지 필터 + 정렬 |
| 3 | Product Grid | 제품 카드 (이미지/이름/가격/원산지배지/별점) |
| 4 | Trending | 주간/월간 인기 상품 캐러셀 |
| 5 | AI Deep Analysis | 제품별 심층 분석 모달 (13개 섹션) |
| 6 | Pricing | Free/Starter(₩29K)/Pro(₩89K) + 통화 전환 |
| 7 | Trust Signals | 검증 배지 + 4.8★ + 2,500+ 리뷰 |
| 8 | FAQ | 6-8개 아코디언 |
| 9 | Chat Widget | 플로팅 채팅 + 빠른 응답 + 상담 폼 |

### 주요 기능
- **원산지 검증 배지**: 검증됨/가능성있음/미확인 (색상 코딩)
- **AI Deep Analysis**: 제품 클릭 → 13개 섹션 분석 결과
- **다국어**: EN/KO/JA 전환
- **통화 전환**: USD/KRW/JPY/AED

---

## 6. 알리바바 BP (whistle-alibaba-bp-v5.html)

### 문서 구성 (13페이지)

| 페이지 | 제목 | 내용 |
|---|---|---|
| 1 | Cover | Whistle AI × Alibaba.com Partnership Proposal |
| 2 | Executive Summary | 15+ 모듈, 13 AI 분석 섹션, 3분 분석 |
| 3 | Platform Evolution | 이전 vs Whistle AI 비교표 |
| 4 | Architecture | 15개 핵심 모듈 상세 |
| 5 | Automation Flow | 6단계: 분석→인증→매칭→서류→물류→알리바바 |
| 6 | Revenue Model | SaaS/알리바바/서비스/바우처/수수료 5개 수익원 |
| 7 | Financial | 3년 매출 전망 (₩8.7억→₩32억, CAGR 76%) |
| 8 | Win-Win | 상호 이점 |
| 9 | Competitive | 경쟁사 비교 매트릭스 |
| 10 | Roadmap | 2026 분기별 마일스톤 |
| 11 | Team | 조직 구조 + AI 자동화 영역 |
| 12 | Discussion | 협상 항목 + 다음 단계 |
| 13 | Closing | 연락처 + 미팅 요청 |

---

## 딜룸 시스템 (app/dealroom/)

### 독립 모듈 구조
별도 JS 모듈로 분리된 실시간 거래 채팅 시스템

#### 메시지 타입 (messageItem.js)
| 타입 | 렌더링 함수 | 설명 |
|---|---|---|
| text | renderText() | 일반 텍스트 메시지 |
| system | renderSystem() | 시스템 알림 |
| quote_card | renderQuoteCard() | 견적 카드 (승인/수정요청 버튼) |
| document_card | renderDocumentCard() | 서류 카드 (승인/수정요청/다운로드) |
| payment_card | renderPaymentCard() | 결제 카드 (증빙 업로드/확인) |
| ai_guide | renderAiGuide() | AI 가이드 (다음 단계/체크리스트/제안) |

#### 액션 바 (actionBar.js)
- **셀러**: 바이어 초대, 견적작성, 서류생성, 문서전송, 결제등록, 출하등록
- **바이어**: 서류 다운로드 (read-only)

#### 액션 라우터 (actionRouter.js)
| 액션 | 처리 |
|---|---|
| document_approve | Edge Function: approve-document |
| quote_approve | Edge Function: approve-quote |
| quote_revision | 수정 사유 모달 → Edge Function |
| quote_revise | Edge Function: approve-quote (revise_resend) |
| document_revision | 수정 사유 모달 → Edge Function |
| upload_proof | 증빙 업로드 모달 |
| ai_suggestion | 채팅 입력란에 텍스트 자동 입력 |
| document_download | DB 조회 → jsPDF 렌더링 (PI/CI/PL) |

#### 모달들
- inviteModal: 바이어 초대
- quoteModal: 견적 작성
- docGenModal: 서류 생성
- sendDocModal: 문서 전송
- paymentMilestoneModal: 결제 마일스톤 등록
- proofUploadModal: 결제 증빙 업로드

---

## Supabase Edge Functions (17개)

| 함수명 | 용도 |
|---|---|
| api | 릴레이 라우터 (랜딩 → 백엔드) |
| analyze-export | AI 수출 분석 (v5) |
| approve-document | 문서 승인/수정요청 |
| approve-quote | 견적 승인/수정요청/재발송 |
| send-quote | 견적 발송 |
| create-document | 서류 생성 |
| send-document | 문서 전송 |
| consume-invite | 초대 링크 사용 |
| upload-payment-proof | 결제 증빙 업로드 |
| verify-payment-proof | 결제 증빙 확인 |
| create-payment-milestone | 결제 마일스톤 생성 |
| toss-billing-issue | 토스 빌링 발행 |
| toss-billing-charge | 토스 빌링 결제 |
| toss-webhook | 토스 웹훅 |
| stripe-webhook | Stripe 웹훅 |
| create-checkout-session | Stripe 결제 세션 |
| create-billing-portal | Stripe 빌링 포털 |

---

## 요금제 구조

### 제조사 (whistle.html)
| 기능 | FREE | STARTER (₩99K) | PRO (₩299K) |
|---|---|---|---|
| AI 분석 | 3/월 | 10/월 | 무제한 |
| 제품 등록 | 5개 | 20개 | 무제한 |
| 프로젝트 | 1개 | 5개 | 무제한 |
| 서류 생성 | 불가 | 무제한 | 무제한 |
| 이메일 허브 | 불가 | 50/월 | 무제한 |
| 바이어 매칭 | 불가 | 불가 | 1/월 |
| 관세사 검토 | 불가 | 불가 | 가능 |
| 전담 매니저 | 불가 | 불가 | 가능 |

### 바이어 (buyer.html)
| 기능 | FREE | STARTER (₩29K) | PRO (₩89K) |
|---|---|---|---|
| 검색 | 3/월 | 30/월 | 200/월 |
| Deep Analysis | 불가 | 3/월 | 무제한 |
| 저장/위시리스트 | 불가 | 가능 | 가능 |
| 이메일 알림 | 불가 | 가능 | 가능 |
| 공급자 매칭 | 불가 | 불가 | 가능 |

---

## 데이터베이스 테이블 (주요)

| 테이블 | 용도 |
|---|---|
| users / profiles | 사용자 프로필 |
| companies / seller_profiles | 회사 정보 |
| products | 제품 카드 |
| analyses | AI 분석 결과 |
| projects | 수출 프로젝트 |
| documents | 서류 (PI/CI/PL/CO/SC) |
| orders | 주문 |
| shipments | 배송/물류 |
| deals | 딜룸 거래 |
| messages | 채팅 메시지 |
| matchings / buyer_matchings | 매칭 |
| buyers / buyer_links | 바이어 관리 |
| samples | 샘플 |
| inquiries | 문의 |
| notifications | 알림 |
| reviews | 리뷰 |
| email_logs | 이메일 발송 기록 |
| search_logs | 검색 크레딧 추적 |
| payment_milestones | 결제 마일스톤 |
| payment_proofs | 결제 증빙 |
| alibaba_stores | 알리바바 스토어 |
| alibaba_inquiries | 알리바바 문의 |
| buyer_requests / buyer_request_proposals | 마켓플레이스 |
| disputes | 분쟁 |
| contact_requests | 제휴 문의 |
| client_errors | 클라이언트 에러 로그 |
| page_views | 페이지뷰 분석 |

---

## 실시간 기능

| 기능 | 구현 |
|---|---|
| 딜룸 채팅 | Supabase Realtime (messages 테이블) |
| 알림 | Supabase Realtime (notifications 테이블) + 토스트 |
| 바이어 채팅 | Supabase Realtime (messages 테이블) |
| 딜 상태 변경 | 시스템 메시지 자동 생성 |

---

## 테스트 대상 페르소나 (제안)

### 페르소나 1: 한국 제조사 (셀러)
- **프로필**: K-Beauty 중소기업 대표, 수출 경험 없음
- **목표**: AI 분석으로 수출 가능성 확인 → 바이어 찾기 → 첫 거래 완료
- **테스트 범위**: whistle-landing.html → whistle.html 전체 메뉴

### 페르소나 2: 해외 바이어 (수입자)
- **프로필**: 일본 유통업체 바이어, 한국 화장품 소싱
- **목표**: 제품 검색 → 제조사 연결 → 샘플 → 주문 → 배송
- **테스트 범위**: buyer-landing.html → buyer.html 전체 메뉴

### 페르소나 3: 모티브 직원 (알리바바 대행)
- **프로필**: 모티브이노베이션 운영팀원, 알리바바 대행 업무
- **목표**: 제조사 관리 → 바이어 매칭 → 딜 진행 → 분쟁 해결 → 매출 관리
- **테스트 범위**: admin.html 전체 메뉴 + whistle.html 알리바바 섹션

---

## 최근 수정 사항 (2026-03-02)

### whistle.html (커밋 12125da)
- render() try/catch 래핑 + 에러 UI + DB 로깅
- 글로벌 error/unhandledrejection 핸들러
- pgGuide/pgGuideGlossary 이중 render() 제거
- pgDash 40+ 배열 접근 방어 코딩 (||[])
- buildSellerDeals() 방어 코딩

### buyer.html (커밋 cc4ac42)
- _doRender() try/catch 래핑 + 에러 UI + DB 로깅
- 글로벌 error/unhandledrejection 핸들러
- c.lastMsg null 체크
- deal.documents/dealSamples 20+ 위치 방어 코딩

### admin.html
- 감사 결과: 0개 이슈, 완전 작동

---

## ChatGPT에게 요청할 사항

1. **페르소나 기반 QA 계획 수립**: 위 3개 페르소나별 A-to-Z 테스트 시나리오
2. **감사 목표 설정**: 각 페이지별 기능 완성도 기준, 합격/불합격 기준
3. **우선순위 제안**: 수정이 필요한 기능의 중요도/긴급도 매트릭스
4. **UX 개선 제안**: 버튼 크기/위치/용어 통일, 사용자 동선 최적화
5. **추가 개발 백로그**: 누락된 기능이나 개선이 필요한 영역 식별
