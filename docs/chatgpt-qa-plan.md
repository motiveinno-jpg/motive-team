아래는 **“희웅님 지시(페르소나 설정 + 감사/QA 목표/기준 + A-to-Z 시나리오 + 우선순위 매트릭스 + UX 통일 + 백로그)”**를 바로 실행 가능한 QA 문서 형태로 정리한 버전입니다.
(Claude는 이 계획을 기준으로 테스트→이슈 등록→수정→재검증 루프를 돌리면 됩니다.)

0) QA 운영 원칙 (이번 런칭용)
목표

**“서비스 런칭 가능 상태”**를 1차 합격선으로 정의

“완벽”이 아니라 거래 루프/신뢰/로그/보안/장애복구가 끊기지 않게

QA 범위(이번 회차)

핵심 루프: AI 분석 → 딜 생성/딜룸 → 견적 → 서류(PI/CI/PL) 생성/전송/승인 → 결제 마일스톤/증빙/승인

부 루프: 바이어 초대(게스트) → 최소 온보딩/게이트 → 바이어 액션

운영 루프: admin에서 모니터링/재실행/분쟁/결제승인/로그 확인

합격 기준(Definition of Done)

P0(치명) 버그 0개

P1(높음) 버그 3개 이하 + 우회 가능

분석/딜룸/문서/결제 루프에서 에러 발생 시에도 UI가 복구되고, admin 로그/에러가 남아 원인 추적 가능

1) 페르소나 정의(3개)
Persona A: 한국 제조사(수출 초보)

목표: “처음 수출 딜을 성사시키고 문서/결제를 실수 없이 끝내기”

주요 공포: 영어, 서류, 결제 실수, 사기, 무엇부터 해야 할지 모름

Persona B: 해외 바이어(일본 유통업체)

목표: “신뢰 가능한 제조사와 빠르게 견적/서류 받고 승인”

주요 공포: 사기, 서류 오류, 커뮤니케이션 지연, 프로세스 복잡

Persona C: 모티브 직원(알리바바 대행/운영자)

목표: “문의 인입→딜 전환→운영/검증/승인→문제 해결”

주요 공포: 운영 폭발(수동 처리 과다), 로그/권한/실패 원인 불명확

2) 페르소나별 A-to-Z 테스트 시나리오

아래 시나리오는 “실제 클릭/입력 단위”로 구성했습니다.
각 Step마다 ‘Expected Result(기대 결과)’가 충족되지 않으면 이슈 등록입니다.

A. 제조사(수출 초보) A-to-Z 시나리오
A-0. 첫 진입/온보딩

whistle-landing 접속 → 가입 CTA → 로그인

기대: 로그인 성공, 대시보드 진입, 에러 토스트 없음

설정(Profile)에서 회사정보/은행/인증서 일부 등록

기대: 저장 성공, 프로필 완성도/경고 정상 반영

A-1. AI 수출 분석 (유입 퍼널 핵심)

AI 분석 메뉴 → URL 또는 이미지 1개로 분석 실행

기대: analyze-export Edge Function 성공(또는 명시적 에러 + 재시도 버튼)

기대: 분석 결과 13개 섹션 렌더링

기대: “딜/프로젝트로 만들기” CTA 노출

분석 리포트 PDF 다운로드

기대: PDF 생성/다운로드 성공 (깨짐/빈 페이지/한글 폰트 문제 체크)

A-2. 딜 생성 → 딜룸 진입

딜 파이프라인에서 “새 딜 생성” → 딜룸 오버레이 열기

기대: 딜룸 mount 성공, 메시지 리스트 로딩

기대: 사이드바 Next Actions 정상(셀러 관점)

채팅 텍스트 메시지 1개 전송

기대: optimistic → DB insert → realtime 반영, 중복/유실 없음

A-3. 바이어 초대(게스트)

“바이어 초대” 버튼 → INV 토큰 생성 → 링크 복사

기대: invite 생성 성공, 토큰 유효시간/권한 정상

기대: 링크를 새 시크릿 창에서 열 때 consume-invite 호출 & 딜룸 접속 준비

A-4. 견적 작성/전송

“견적작성” → item 1개 이상 추가 → Send Quote

기대: send-quote EF 성공

기대: quote_card 메시지 생성(상태 sent)

기대: seller UI에 “대기중” 상태 표시

A-5. 문서 생성/전송

“서류생성” → PI 생성(draft)

기대: create-document EF 성공, 문서번호 생성

기대: 문서 사이드바에 PI draft 표시

“문서전송” → draft 선택 → Sent 전환

기대: send-document EF 성공, document_card 생성

기대: (Resend secret 없으면) 이메일 스킵 이벤트 기록

PI/CI/PL PDF 다운로드

기대: 3종 모두 렌더 정상(품목/합계/인코텀즈/은행정보)

A-6. 결제 마일스톤 + 증빙 승인 루프(Phase 0)

결제 패널 → 마일스톤 생성(Deposit)

기대: create-payment-milestone EF 성공, payment_card 생성

바이어가 증빙 업로드 후(페르소나 B에서) 어드민 승인 처리되어 상태 변경 확인

기대: milestone status 업데이트 realtime 반영

기대: Next Actions가 다음 단계로 바뀜

B. 바이어(일본 유통업체) A-to-Z 시나리오
B-0. 초대 링크로 진입(게스트/익명)

INV 링크 접속 → 딜룸 진입

기대: anonymous auth 동작(또는 guest 세션), 딜 메시지/카드 열람 가능

quote_card 확인 → Approve 또는 Revision 요청

기대: approve-quote EF 동작

기대: 승인 시 버튼 사라지고 상태 배지 approved

기대: revision 요청 시 모달로 reason 입력 후 상태 revision_requested + system 메시지 기록

B-1. 문서 확인/다운로드/승인

document_card(PI sent) → Download PDF

기대: 다운로드 성공 (일본어 환경에서도 깨짐 여부 체크)

document_card → Approve

기대: approve-document EF 성공, 상태 approved/final 전이 규칙 준수

기대: 승인 후 버튼 제거

B-2. 결제 증빙 업로드

payment_card 확인 → Upload proof

기대: upload-payment-proof EF 성공, 파일 업로드 성공(10MB 제한/파일 타입 제한 체크)

기대: “승인 대기” 표시

B-3. 가입 게이트(있다면)

PI 승인/다운로드 시 가입 게이트 트리거

기대: 이메일/회사명/국가 입력 최소 폼

기대: 완료 시 guest→buyer로 merge, 기존 딜 접근 유지

C. 모티브 직원(알리바바 대행/운영자) A-to-Z 시나리오
C-0. 운영 대시보드/큐 모니터링

admin 로그인 → 대시보드 KPI/알림 확인

기대: 서비스 요청 큐, 결제 증빙 승인 대기, 에러 top 표시

C-1. 딜/문서/결제 운영

결제 proof 승인 대기 항목 → verify-payment-proof 처리

기대: 승인 시 상태 반영, deal_events 기록

문서 감사 탭에서 특정 문서(PI/CI/PL) 조회

기대: status_v2 및 버전/연결 quote 확인 가능

C-2. AI 분석 운영

분석 실패 항목 필터 → 재실행 버튼(있다면)

기대: 재실행 시 새로운 version 생성 + error clear

C-3. 보안/권한 운영 체크

임의 사용자로 타 딜 접근 시도(링크만)

기대: RLS로 차단(401/403), 데이터 노출 0

3) 감사 목표 + 합격/불합격 기준(정량)
기능 완성도 기준(핵심 5영역)

Deal OS 루프 완주율:

QA 시나리오 A/B에서 “딜 생성→견적→PI sent→PI 승인→결제 증빙 업로드→승인”까지 1회 완주

합격: 1회라도 완주 가능 + 중간 실패 시 재시도/복구 가능

불합격: 어느 단계든 ‘막힘’이 발생하여 루프가 끝까지 불가

Trust OS(로그/감사):

deal_events에 주요 이벤트 기록 존재

합격: quote/doc/payment 이벤트가 모두 남음

불합격: 이벤트 유실/순서 꼬임/권한 오류로 기록 불가

보안(RLS):

타 사용자 딜/문서/메시지 접근 불가

합격: 403/404로 차단

불합격(P0): 데이터 노출 1건이라도 발생

오류 관측 가능성:

client_errors, deal_events, EF request_id로 추적 가능

합격: 실패 시 원인 로그가 남고 재현 가능

불합격: “아무 정보 없이 안 됨” 상태

성능/안정성(최소):

딜룸 메시지 200개 로딩 시 3초 내 표시(대략)

Realtime 재연결 시 갭 패치 정상

불합격: 메시지 유실/중복/무한 로딩

4) 수정 필요 기능 중요도/긴급도 매트릭스(샘플)
항목	중요도	긴급도	판정	이유
analyze-export 실패(키/모델)	매우 높음	매우 높음	P0	유입 퍼널 핵심이 멈춤
Stripe/Toss placeholder	높음	중간	P1	결제는 Phase0로 우회 가능
바이어 가입 게이트 누락	높음	높음	P0/P1	리드 증발, 재방문/추적 불가
1:1 채팅 폴링(기존 pgChat)	중간	낮음	P2	딜룸이 핵심, pgChat은 후순위 가능
트렌드 localhost 의존	중간	중간	P2	런칭 MVP에서 제외 가능

실제 매트릭스는 QA 결과 기반으로 30~50개 항목으로 확장.

5) UX 개선 제안(통일 규칙)
용어 통일(강제)

“딜” vs “프로젝트” vs “파이프라인” 혼용 금지

딜(Deal): 바이어별 거래

프로젝트(Project): 제품/시장 기획(딜 N개 포함 가능)

“서류 전송(Send Document)” / “문서 승인(Approve)”

“견적 승인(Approve Quote)” / “수정요청(Request Revision)”

버튼/배치(강제)

카드 액션 버튼은 우측 하단 고정

primary 버튼 색상/라벨 통일: Approve / Request Revision / Download / Upload Proof

모바일: action bar 버튼 3개까지만(더보기 메뉴)

6) 추가 개발 백로그(런칭 직전/직후)
런칭 전(P0~P1)

analyze-export 안정화: env/모델/키 로테이션 + admin 재실행

바이어 게이트/merge 완성도: 중복 이메일/다중 딜 참여 edge case

결제/증빙 UX: proof 승인 결과를 바이어에게 명확히(토스트+카드상태+이메일 optional)

런칭 직후(P2)

CI/PL 자동복사(PI 기반) + 문서 일관성 검증 Phase1

admin 운영판 강화: 에러 top, 이메일 실패, 재전송 버튼

알리바바 문의→딜 전환 자동화(CSV/복붙/템플릿)

7) Claude가 “실제로 QA 실행”하는 방식 제안(운영 프로세스)

위 시나리오를 체크리스트로 만들어 PASS/FAIL + 스크린샷/콘솔 로그 저장

FAIL은 반드시:

재현 경로(클릭 순서)

콘솔 에러/네트워크 응답(request_id)

관련 테이블 row id(deal_id, quote_id 등)

P0부터 고치고, 고칠 때마다 해당 시나리오 부분 재실행(Regression)

마지막으로: 지금 가장 먼저 QA에서 터질 가능성이 큰 P0 3개

analyze-export 키/모델 문제(말씀하신 상태 그대로면 거의 1번 터짐)

바이어 게스트 진입/merge edge case(동일 이메일 존재/다중 딜)

RLS에서 새로 붙인 payment/doc/quote 관련 테이블 권한 누락(한 군데라도 빠지면 특정 역할에서 막힘)

원하면 다음 메시지에서,

위 시나리오를 **Google Sheet 형태(테스트 케이스 ID / Step / Expected / Result / Severity / Issue Link)**로 바로 옮길 수 있게 포맷까지 만들어 줄게요.
또는 Claude가 바로 쓰기 좋게 “QA 티켓 템플릿(이슈 작성 규칙)”도 같이 드릴게요.