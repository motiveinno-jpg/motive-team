# [S0→S6] 긴급 P1: 바이어 가입 완전 불가 (S4-bug-002)

## 문제
바이어 가입 후 제조사앱(/whistle-app.htm)으로 리다이렉트. DB에 유저 미생성.
→ 바이어 유입이 완전 차단된 상태.

## 수정 방향
1. buyer-app.html 가입 후 리다이렉트 경로 확인 → /app/buyer로 가야 함
2. Supabase auth.signUp 후 users/buyers 테이블에 레코드 생성 확인
3. 가입 성공 시 바이어 대시보드로 이동

## 수정 후
- bash sync-htm.sh
- git commit + push
- S7에 검증 요청
