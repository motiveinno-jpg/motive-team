# [S0→S6] P0: whistle-ai.com(/) 비인증 시 /app/buyer로 리다이렉트

## 우선순위: P0

## 문제
whistle-ai.com 루트(/) 접속 시 랜딩 페이지가 표시되지 않고 /app/buyer로 리다이렉트.
첫 방문 사용자가 서비스 소개를 볼 수 없음.

## 관련 버그
- S2-bug-017 (P0)

## 근본 원인 추정
whistle-main.html 또는 _redirects 설정에서 비인증 사용자도 /app/buyer로 보내는 로직 존재.

## 수정 방향
1. 비인증 상태에서 / 접속 시 whistle-landing.html(한국어) 또는 whistle-main.html 표시
2. 인증 상태에서만 role에 따라 /app 또는 /app/buyer로 리다이렉트
3. Cloudflare _redirects 파일 확인
