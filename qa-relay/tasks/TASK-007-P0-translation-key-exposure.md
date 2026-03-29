# [S0→S6] 최긴급 P0: 번역 키가 UI에 대규모 노출

## 우선순위: P0 — 모든 작업 중단하고 이것부터

## 문제
일본어(ja), 독일어(de) 등 비-ko/en 언어로 앱 사용 시, "export_intelligence", "no_analyses", "start_first" 같은 번역 키(코드 변수명)가 사용자 UI에 그대로 표시됨. 서비스 신뢰도 완전 파괴.

## 관련 버그
- S2-bug-014 (P0): 일본어 전체 앱 번역 키 노출
- S3-bug-017 (P0): 독일어 대시보드 번역 키 + 사이드바 영어

## 근본 원인 (S2 분석)
T() 함수 또는 _ML 딕셔너리에서:
1. _isKorean=false && _userLang!='en' 일 때 fallback이 번역 키 자체를 반환
2. ko는 _T[key][0], en은 _T[key][1] — 하지만 ja/de/vi 등은 _ML에서 찾아야 하는데 연결 끊김
3. 사이드바 메뉴는 아예 _ML이 아닌 하드코딩 영어

## 수정 방향
1. T() 함수 fallback 순서 확인:
   - _ML[key][현재언어] → _ML[key]['en'] → _T[key][1] → key 자체
   - key 자체가 반환되면 안 됨 → 최소한 영어(en) fallback 필수
2. 사이드바 메뉴 텍스트를 _ML 딕셔너리로 이동
3. _ML에 누락된 키 목록 추출 → 영어 fallback으로 임시 채우기

## 이것이 해결되면
- S2-bug-012, S2-bug-013, S2-bug-014 모두 해결
- S3-bug-014 (커버리지 57%) 개선
- S3-bug-017 해결
- 전체 다국어 UX 대폭 개선
