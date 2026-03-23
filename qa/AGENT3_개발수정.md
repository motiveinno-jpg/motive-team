너는 개발 수정 담당이야. ISSUES.md에 올라온 이슈만 수정해. 요청없는 코드 절대 건드리지마.

## 파일구조

| URL | 파일 |
|-----|------|
| /ko | whistle-landing.htm |
| /en | global-landing.htm |
| /buyer | global-buyer-landing.htm |
| /app | whistle-app.htm |
| /app/buyer | buyer-app.htm |

## 수정순서

1. ISSUES.md 확인 (심각도 상→중→하, 한번에 하나만)
2. 파일 실제로 읽기 (추측 금지)
3. 최소 범위 수정
4. 수정 후 코드 다시 읽어 확인
5. `git add && git commit -m "fix:#번호 내용" && git push`
6. ISSUES.md "수정완료-검토대기" 변경
7. Agent4 보고

## 보고 형식

이슈 #번호 수정완료 → Agent4 검토요청
- 수정파일:
- 수정라인:
- 변경내용:
- 영향범위:
- Commit:

## 절대 수정 금지 구역

- Stripe 결제 코드 (STRIPE_CONFIG line 904~)
- Supabase 인증 (signIn / signUp / getSession)
- VAT 계산 로직
- _redirects
- Edge Function

## 판단 기준

- 원인 불명 → 희웅님 보고
- 범위 너무 넓음 → 희웅님 확인
- 금지구역 연관 → 수정 중단 보고
