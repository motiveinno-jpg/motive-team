# [S1-한국제조사] Locale/언어 자동 감지 테스트 결과

## 테스트 조건
- Accept-Language: ko-KR,ko;q=0.9
- Geolocation: 화성 (37.1995, 126.8313)
- Timezone: Asia/Seoul
- 브라우저: Chrome headless (Playwright)

## 결과

| 항목 | 결과 |
|------|------|
| Accept-Language → 한국어 랜딩 자동 표시 | ✅ PASS — /ko로 자동 라우팅 |
| 언어 수동 전환 없이 한국어 기본 | ✅ PASS |
| /app 로그인 화면 한국어 | ✅ PASS — 라벨 "이메일 *", "비밀번호 *" |
| 대시보드 한국어 | ✅ PASS |
| 사이드바 메뉴 한국어 | ✅ PASS — 영어만 표시된 메뉴 0개 |
| 언어 전환 UI 존재 | ✅ PASS — "EN" 버튼 존재 |

## 언어 감지 메커니즘
- `navigator.language` 기반으로 자동 감지
- `localStorage.lang = "ko"` 로 저장
- i18n-detect.js 별도 스크립트 없음 (인라인 로직)
- 쿠키 기반 아님

## 통화
- KRW(₩, 원), USD($) 혼용 표시
- 자동 통화 전환은 확인 필요 (분석 결과에서)

## 상태: ALL PASS
