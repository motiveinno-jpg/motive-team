# [S0→S6] 긴급 P0: 현지어 자동 감지 전면 미작동

## 우선순위: P0 — 최우선 수정

## 문제 요약
글로벌 서비스인데 현지 접속 시 현지어가 자동으로 안 나옴.
일본(ja), 독일(de), 베트남(vi) 등 모든 비한국/비영어 사용자에게 영어만 표시.
첫인상에서 이탈 → 글로벌 서비스 자체가 성립 안 됨.

## 근본 원인 (S2-bug-008, S3-bug-008에서 분석됨)
1. **whistle-main.html**: navigator.language 감지 없음. 항상 영어.
2. **whistle-landing.html**: ko vs en만 구분. 다른 언어 감지 없음.
3. **whistle-app.html:1336-1352**: navigator.language 감지 있으나, 비인증 시 랜딩으로 리다이렉트되어 실행 안 됨.
4. 서버 사이드(Cloudflare) Accept-Language 감지 없음.

## 수정 방향
### 즉시 (Phase 1)
1. whistle-main.html에 navigator.language 감지 추가
   - 감지된 언어가 지원 목록(ko,en,ja,zh,vi,th,de,fr,es,pt,id,ms)에 있으면 해당 언어로 자동 전환
   - localStorage에 저장하여 재방문 시 유지
2. whistle-landing.html에도 동일 로직 추가
3. 언어 선택 UI를 랜딩 헤더에 추가 (현재 English/한국어만 → 12개 언어)

### 동시 수정 필요
- S6-fix-004 (로그인/가입 언어 선택기)가 이미 만들어졌으면 배포 확인
- buyer.html (바이어 랜딩)에도 동일 감지 로직

## 관련 버그
- S2-bug-003: 일본어 선택기 부재
- S2-bug-008: ja Accept-Language 감지 실패 (P0)
- S3-bug-001: 랜딩에 언어 전환 없음
- S3-bug-004: whistle-main.html 언어 설정 무시
- S3-bug-008: Accept-Language 미사용, navigator.language만 의존 (P1)

## 수정 후
- bash sync-htm.sh
- git commit
- S7(검증QA)에 검증 요청: fixes/ 에 기록
