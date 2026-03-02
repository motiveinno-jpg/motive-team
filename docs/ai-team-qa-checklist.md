# Whistle AI — AI 팀 QA 체크리스트

## AI 팀 역할 분담

| AI | 역할 | 강점 | 담당 영역 |
|---|---|---|---|
| **Claude (Opus)** | 코드 수정 + DB 운영 | 코드 직접 수정, Supabase 직접 접근, Git 배포 | 백엔드 로직, DB, Edge Function, 코드 레벨 QA |
| **ChatGPT** | 기획 + UX 리뷰 | 긴 맥락 분석, 기능 기획, 텍스트 생성 | UX 개선안, 기능 기획, 카피라이팅, 전략 |
| **Genspark** | 라이브 QA + 외부 테스트 | 실제 URL 방문, 화면 캡처, 인터랙션 테스트 | 비로그인 페이지 QA, UI 깨짐, 성능 체크 |

---

## Genspark QA 테스트 항목

### 1. 제조사 랜딩 (whistle-landing.html)
**URL:** https://motiveinno-jpg.github.io/motive-team/whistle-landing.html

- [ ] 페이지 정상 로드 확인
- [ ] 히어로 섹션 텍스트/CTA 버튼 표시
- [ ] "무료 AI 수출 분석" 버튼 클릭 → 분석 모달 열림
- [ ] 분석 모달에서 URL 입력 필드 표시
- [ ] 스크롤 시 각 섹션 정상 렌더링 (기능소개, 가격, FAQ)
- [ ] 모바일 뷰 (768px 이하) 레이아웃 깨짐 확인
- [ ] 로그인/회원가입 모달 정상 열림
- [ ] 푸터 링크 동작 여부
- [ ] 페이지 로드 속도 (3초 이내?)

### 2. 바이어 랜딩 (buyer-landing.html)
**URL:** https://motiveinno-jpg.github.io/motive-team/buyer-landing.html

- [ ] 페이지 정상 로드 확인
- [ ] 영문/한글 전환 (있다면)
- [ ] Product Search 기능 동작
- [ ] 하단 채팅 위젯 열림/닫힘
- [ ] 채팅 위젯에서 Quick Reply 버튼 클릭
- [ ] 로그인/회원가입 폼 표시
- [ ] 모바일 뷰 레이아웃
- [ ] 이미지/아이콘 깨짐 없음

### 3. 메인 앱 — 비로그인 화면 (whistle.html)
**URL:** https://motiveinno-jpg.github.io/motive-team/whistle.html

- [ ] 로그인 페이지 정상 표시
- [ ] 이메일/비밀번호 입력 필드
- [ ] 로그인 버튼 활성화
- [ ] 회원가입 탭 전환
- [ ] 비밀번호 찾기 링크
- [ ] 소셜 로그인 버튼 (Google 등) 표시
- [ ] 모바일 뷰 로그인 화면

### 4. 바이어 앱 — 비로그인 (buyer.html)
**URL:** https://motiveinno-jpg.github.io/motive-team/buyer.html

- [ ] 페이지 정상 로드
- [ ] 로그인/게스트 진입 화면
- [ ] 채팅 위젯 동작

### 5. 성능 체크
- [ ] 각 페이지 First Contentful Paint < 2초
- [ ] JavaScript 에러 콘솔에 없음
- [ ] 404 리소스 없음
- [ ] HTTPS 정상

---

## Claude가 이미 수정한 항목 (2026-03-02)

### 이번 세션 수정 완료
1. ~~검색 트렌드 "Other" 무한로딩~~ → `_trendLoaded` 플래그 + `.catch()` 추가
2. ~~필터 버튼 깜빡임~~ → 로딩 중 disabled 유지
3. ~~딜 파이프라인 빈 화면~~ → 시뮬레이션 데이터 6건 + 파이프라인 차트
4. ~~18개 데이터 로딩 함수 .catch() 누락~~ → 일괄 추가
5. ~~buyer.html XSS 취약점~~ → esc() 함수 & 이스케이프 추가

### 이전 세션 수정 완료
- 전역 로딩 프로그레스 바 (GP)
- 모바일 하단 네비게이션
- Realtime 구독 메모리 누수 해결
- AI 리포트 액션 아이템 패널
- 대시보드 딜 파이프라인 차트
- Empty State UX 4곳 개선
- 어드민 가입 트렌드 차트 + CSV 내보내기

---

## 대표님 직접 테스트 필요 항목 (로그인 후)

1. **AI 수출 분석**: 제품 URL 입력 → 분석 완료까지 전체 플로우
2. **딜 파이프라인**: 사이드바 "딜 관리" 클릭 → 시뮬레이션 카드 표시 + 클릭
3. **검색 트렌드**: 사이드바 "검색 트렌드" → "Other" 카테고리 선택 → 무한로딩 없음
4. **바이어 채팅**: 바이어 선택 → 메시지 전송
5. **수출 서류**: PI/CI 생성 → PDF 다운로드
6. **비용 시뮬레이터**: 제품원가 입력 → 마진 계산

---

*Last Updated: 2026-03-02 by Claude (Opus)*
