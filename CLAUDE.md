# Whistle AI — 프로젝트 규칙

## 필수 체크리스트 (모든 코드 수정 시)

### 수정 전
1. `grep`으로 수정할 함수의 호출처 확인 (0건 = dead code, 수정 금지)
2. whistle-app.html 수정 시 buyer-app.html 양방향 영향 확인
3. DB 작업 시 Supabase MCP로 스키마/RLS/버킷 실확인

### 수정 후
1. `bash sync-htm.sh` 실행 (.html → .htm 동기화)
2. changelog 기록 (memory/changelog-whistle.md)
3. 가능하면 browse 도구로 실제 브라우저 스크린샷 첨부
4. "안 되는 것"을 먼저 보고. 성공만 축소보고 금지

## 파일 구조
- `whistle-app.html` / `.htm` — 제조사 앱 (메인, ~16,500줄)
- `buyer-app.html` / `.htm` — 바이어 앱 (~5,300줄)
- `admin.html` / `.htm` — 관리자 포털 (~12,300줄)
- `whistle-main.html` / `.htm` — 메인 네비게이션 프레임
- `whistle-landing.html` / `.htm` — 한국어 랜딩 (React+Babel)
- `buyer.html` / `.htm` — 바이어 랜딩
- `.html` 수정 시 반드시 `.htm` 동기화 (Cloudflare 308 우회)

## 배포
- `git push` → GitHub Actions가 Cloudflare Pages 자동 배포
- 또는 `bash deploy.sh` (sync-htm + git push + wrangler)
- **pre-commit hook**이 .htm 자동 동기화

## 기술 스택
- Vanilla JS SPA (프레임워크 없음)
- `_isKorean` 플래그로 한/영 전환
- Supabase (Auth + RLS + Realtime + Edge Functions)
- Stripe (결제, Live mode)
- Cloudflare Pages (호스팅)

## 절대 하지 말 것
- `console.log`를 프로덕션에 남기지 말 것 (`console.error`만 허용)
- `.catch(function(){})` 빈 catch 금지
- 이중 `_isKorean` 삼항 금지: `_isKorean?(_isKorean?...):...`
- curl/SQL만으로 "완료" 보고 금지
- 소스 코드에 API 키, 비밀번호 하드코딩 금지
