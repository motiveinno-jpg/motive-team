# ChatGPT QA 테스트 케이스 + 티켓 템플릿

> ChatGPT가 생성한 QA 계획 (2026-03-02)

1) Google Sheet 형태 테스트 케이스 (Markdown Table, 40+)

Status는 기본 미실행으로 시작 → PASS/FAIL/BLOCKED로 갱신
Step은 “한 케이스 = 한 검증 단위”로 쪼갠 버전입니다.

TC-ID	페르소나	Step	조작 내용	Expected Result	Severity(P0/P1/P2)	Status(미실행)
A-01	A(제조사)	1	whistle-landing 접속 → 로그인	로그인 성공, 대시보드 진입, 콘솔 에러 0	P0	미실행
A-02	A	2	대시보드 KPI/타임라인 로딩 확인	KPI 카드 렌더/로딩 스피너 해제, 오류 토스트 없음	P1	미실행
A-03	A	3	설정(회사/은행) 필수값 일부 저장	저장 성공, DB 반영, 재진입 시 값 유지	P0	미실행
A-04	A	4	제품 등록 1개(이미지 포함)	제품 row 생성, 이미지 업로드 성공, 목록에 카드 표시	P0	미실행
A-05	A	5	AI 수출 분석: URL 입력 → 실행	analyze-export 성공, 결과 섹션 13개 렌더	P0	미실행
A-06	A	6	AI 수출 분석: 이미지 업로드만 → 실행	Vision/분석 성공(또는 명확한 오류+재시도 버튼)	P0	미실행
A-07	A	7	AI 분석 결과 PDF 다운로드	PDF 생성/다운로드 성공, 내용 비어있지 않음	P1	미실행
A-08	A	8	AI 분석 결과 → “딜/프로젝트 생성” CTA 클릭	딜 또는 프로젝트 생성 성공, 해당 상세로 이동	P0	미실행
A-09	A	9	딜 파이프라인에서 새 딜 생성	deals row 생성, deal_participants seller 부여	P0	미실행
A-10	A	10	딜룸 오버레이 열기(openDealRoom)	mount 성공, 메시지/참여자/단계 로딩	P0	미실행
A-11	A	11	딜룸 채팅 텍스트 1건 전송	optimistic→DB insert→Realtime 반영, 중복/유실 없음	P0	미실행
A-12	A	12	딜룸: 바이어 초대 링크 생성(INV)	deal_invites 생성, 링크 복사 가능, 만료시간 표시	P0	미실행
A-13	A	13	견적 작성 모달 열기 → item 1개 추가	폼 검증 정상, item 렌더/합계 계산 정상	P1	미실행
A-14	A	14	Send Quote 클릭(send-quote EF)	quote 생성+quote_items 생성, quote_card 메시지 생성(sent)	P0	미실행
A-15	A	15	견적 revision 요청 상태에서 Revise & Resend	새 quote version 생성, supersedes 체인 연결, 카드 갱신	P0	미실행
A-16	A	16	PI 생성(create-document EF)	documents row draft 생성, 번호 채번, document_card 생성(또는 sidebar 반영)	P0	미실행
A-17	A	17	Draft 문서 전송(send-document EF)	status_v2 draft→sent, 카드 생성/갱신, 이벤트 기록	P0	미실행
A-18	A	18	PI PDF 다운로드(클라이언트 렌더)	PDF 생성 성공, header/items/totals 정상	P1	미실행
A-19	A	19	CI 생성 시 PI 데이터 자동복사(현재 상태 확인)	CI 기본필드가 PI/quote 기반으로 프리필(없으면 이슈)	P1	미실행
A-20	A	20	PL 생성 시 items 기반 자동복사	PL에 items/수량/패킹 필드 기본값 생성	P1	미실행
A-21	A	21	결제 마일스톤 생성(Deposit)	payment_milestones 생성, payment_card 메시지 생성	P0	미실행
A-22	A	22	주문/출하 기능 접근(있다면)	권한/화면 접근 정상, “미구현”은 명확히 표시	P2	미실행
A-23	A	23	기존 pgChat(폴링) 접근	딜룸과 혼선 없이 동작/또는 “딜룸 사용 권장” 안내	P2	미실행
A-24	A	24	알리바바 메뉴 진입(가이드)	페이지 렌더, 에러 없이 안내/CTA 표시	P2	미실행
A-25	A	25	구독/결제 페이지 진입	placeholder 키일 경우 “준비중/문의”로 안전 처리(결제 시도 차단)	P0	미실행
B-01	B(바이어/일본)	1	초대 링크(INV)로 딜룸 진입	consume-invite 성공, anonymous/guest 세션 생성, 딜룸 열람 가능	P0	미실행
B-02	B	2	게스트 상태에서 메시지 열람	메시지 리스트 로딩, 권한 에러 없음	P0	미실행
B-03	B	3	게스트가 텍스트 메시지 전송	deal_messages insert 성공(sender_role=guest/buyer), Realtime 반영	P0	미실행
B-04	B	4	quote_card에서 Approve 클릭	approve-quote EF 성공, 상태 approved, 버튼 제거/배지 표시	P0	미실행
B-05	B	5	quote_card에서 Revision 요청(모달)	reason 저장, status revision_requested, system 메시지 기록	P0	미실행
B-06	B	6	document_card(PI sent) Download 클릭	PDF 다운로드 성공(일본 로케일에서도 깨짐 없음)	P1	미실행
B-07	B	7	document_card Approve 클릭	approve-document EF 성공, status_v2 approved/final, 버튼 제거	P0	미실행
B-08	B	8	payment_card에서 증빙 업로드	upload-payment-proof 성공, 파일 저장, 상태 submitted	P0	미실행
B-09	B	9	증빙 업로드 후 대기 상태 확인	승인대기 UI 표시, 이벤트 기록	P1	미실행
B-10	B	10	가입 게이트 트리거(PI 승인/다운로드 시)	최소 폼 노출, 완료 시 계정 연결/딜 접근 유지	P0	미실행
B-11	B	11	가입 게이트에서 이미 가입된 이메일 입력	계정 연결 흐름 정상(로그인 유도/링크), 데이터 유실 없음	P0	미실행
B-12	B	12	바이어 액션바 권한 확인	바이어는 최소 액션만 보임(승인/다운로드 등), 셀러 전용 숨김	P1	미실행
B-13	B	13	buyer.html 제품검색 1회	검색 결과 렌더, 필터 동작, 콘솔 에러 0	P2	미실행
B-14	B	14	buyer.html 딜 목록/딜룸 진입	딜룸 공유 모듈 정상 동작, 역할 자동감지	P1	미실행
C-01	C(운영/알리바바 대행)	1	admin 로그인 → 대시보드 로딩	KPI/알림/서비스큐 표시, 콘솔 에러 0	P0	미실행
C-02	C	2	사용자 관리: 제조사/바이어 필터 조회	리스트 로딩, 검색/필터 정상	P1	미실행
C-03	C	3	딜/딜룸 거래 모니터 진입	딜 리스트/상태 표시, 특정 딜 상세 열기 가능	P1	미실행
C-04	C	4	결제 증빙 승인(verify-payment-proof)	승인 성공, milestone status=verified, 이벤트 기록	P0	미실행
C-05	C	5	문서 목록/감사 로그 확인	status_v2/버전/연결 quote 확인 가능	P1	미실행
C-06	C	6	분석 이력에서 실패 분석 확인	실패 사유(error_message) 표시, request_id 노출	P0	미실행
C-07	C	7	분석 재실행 버튼(있다면)	새 버전 생성, 이전 기록 보존, 성공/실패 명확	P1	미실행
C-08	C	8	Rate limit 동작 검증(analyze-export 10회/시간)	11번째 요청 시 429/에러 코드 명확, UI 안내	P1	미실행
C-09	C	9	RLS 보안 점검: 타 유저 딜 접근 시도	401/403 또는 빈 결과, 데이터 노출 0	P0	미실행
C-10	C	10	client_errors 수집 확인(강제 에러 유발)	client_errors row 생성, 페이지/유저/스택 저장	P1	미실행
X-01	공통	1	Realtime 재연결: 네트워크 off→on	갭 fetch로 누락 메시지 보완, 중복 없음	P0	미실행
X-02	공통	2	Realtime 다중 탭: 같은 딜 2탭 열기	메시지 중복/경합 없이 정상	P1	미실행
X-03	공통	3	XSS 방어: 메시지에 <img onerror=...> 입력	렌더에서 실행되지 않음(escape/safeUrl)	P0	미실행
X-04	공통	4	파일 업로드 제한(10MB 초과)	업로드 거절 + 사용자 친화적 메시지	P1	미실행
X-05	공통	5	Edge Function 에러 포맷 통일	{ok:false, code, message, request_id} 형태 유지	P1	미실행
X-06	공통	6	결제 placeholder(Stripe 키 미설정)	결제 플로우 진입 차단 + 안내 문구, 에러 없이	P0	미실행
X-07	공통	7	문서 상태 전이 규칙 위반 시도(draft 아닌데 send)	RPC/EF가 차단, 사용자에게 이유 표시	P0	미실행
X-08	공통	8	견적 아이템 0개 Send 시도	클라이언트/서버 둘 다 차단, 명확한 오류	P0	미실행
X-09	공통	9	“버튼 연타” 방어(send-quote 연속 클릭)	중복 생성 방지(idempotency 또는 disable)	P0	미실행
X-10	공통	10	Stage 전이 버튼: 불가능 전이 클릭	추천/차단 메시지, stage_transitions 기반	P2	미실행

위 50개로 시작하면 충분합니다. (A 25 + B 14 + C 10 + 공통 10 중 일부 중복 포함)

2) Claude QA 티켓 템플릿 (이슈 발견 시 작성 규칙)

아래 템플릿을 그대로 이슈(예: GitHub Issue / Notion / Jira)로 쓰면 됩니다.

Markdown
# [SEV-P0/P1/P2] <간단한 제목>

## 요약(1문장)
- 무엇이 안 되는가? (사용자 입장에서)

## 환경
- URL: (whistle/buyer/admin/landing)
- 브라우저/OS: (Chrome 00 / macOS / Windows)
- 계정/역할: (seller/buyer/admin/guest)
- 딜/문서/견적 ID: (가능하면)

## 재현 경로(클릭 순서)
1) ...
2) ...
3) ...

## 실제 결과(Actual)
- 화면/동작:
- 토스트/에러 메시지:
- 네트워크 응답:

## 기대 결과(Expected)
- ...

## 콘솔/네트워크 로그(필수)
- Console error: (복붙)
- Network: (Edge Function 호출명 + status code)
- request_id: (응답에 포함된 UUID)

## 관련 DB Row ID(필수)
- deal_id:
- quote_id:
- document_id:
- payment_milestone_id:
- payment_proof_id:
- user_id / company_id:
- deal_invite_id:

## 스크린샷/영상(필수)
- 첨부

## 원인 추정(있으면)
- 예: RLS 차단 / RPC validation / UI 상태 불일치 / Realtime 갭

## 수정 제안(가능하면)
- 어디 파일/함수:
- 예상 수정:
- 회귀 테스트 케이스(TC-ID):
  - 예: A-14, B-04

## 완료 조건(Definition of Done)
- 해당 TC-ID가 PASS
- 회귀 테스트: (관련 2~3개 TC도 PASS)
Severity 규칙(강제)

P0: 데이터 노출/권한 뚫림, 거래 루프 막힘(견적/문서/결제), 분석 완전 실패, 유실/중복으로 신뢰 붕괴

P1: 우회는 가능하지만 사용자 혼란/전환 저하/관리 리스크 큰 것(버튼 상태, 메시지 불명확, 로깅 누락)

P2: 개선/미구현/성능 튜닝(런칭 후)

3) QA 실행 후 Claude가 해야 할 작업 목록(우선순위)
P0 즉시 수정(런칭 불가급)

analyze-export 실패 원인 고정

API Key/모델ID/env 누락/429 혼동/에러 저장 누락

조치: env 검증 + admin 재실행 + error_message/request_id 저장

RLS/권한 관련 403/404로 루프가 막히는 케이스

seller/buyer/guest/admin 각각: quote/doc/payment 접근/전이 실패

딜룸 메시지 유실/중복/갭 fetch 실패

Realtime 재연결/다중 탭/필터 누락

중복 생성 방지(연타) 미흡

send-quote/send-document/create-payment-milestone 중복 row 생성

결제 placeholder로 인한 런타임 에러

pgSub에서 키 placeholder 상태일 때 결제 시도 자체가 에러를 내면 P0

P1 런칭 전 수정(전환/운영 안정)

게스트→가입 게이트 edge case

동일 이메일 기존 가입자 / 다중 딜 참여 / 게스트 세션 만료

문서 상태/버전 UX 일관성

status_v2 배지/버튼 노출/버전 체인 표시

문서 PDF 품질 체크(PI/CI/PL)

다국어/숫자/합계/레이아웃 깨짐, 폰트 누락

이메일 알림 best-effort 가시화

Resend 미설정/실패 시 admin 이벤트/토스트/재전송 버튼

admin 핵심 운영판 최소 완성

증빙 승인 큐 / 문서 전송 실패 / 분석 실패 재실행

P2 런칭 후 개선(성장/편의)

buyer.html 자체 소싱/검색 고도화

AI 바이어 매칭 실데이터/품질 강화

트렌드/리서치 기능 프로덕션 전환(localhost 제거)

프로세스맵/가이드 콘텐츠 확장

정식 PG/에스크로(Tazapay/Stripe Connect) Phase 1~3

Claude 실행 팁(실무용)

테스트는 A→B→C 순서로 1회 “완주” 먼저 하고, 그 다음 공통/XSS/RLS/재연결 케이스를 돌려야 효율이 납니다.

PASS/FAIL 업데이트는 위 표를 그대로 CSV로 저장해도 되고, 구글시트에 붙여넣으면 됩니다.

원하시면 다음 메시지에서:

위 테스트 케이스를 CSV(구글시트 import용) 형태로도 변환해드릴게요.