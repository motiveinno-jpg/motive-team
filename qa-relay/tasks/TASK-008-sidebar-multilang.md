# [S0→S6] P0 구체적 수정: 사이드바 다국어 (TASK-007 하위)

## 근본 원인
whistle-app.html:19543 `_buildPL()` 함수가 `_isKorean ? 한국어 : 영어`로만 분기.
일본어/독일어/베트남어 등 12개 언어 미대응.

## 수정 방법

### Option A (빠른 수정): _buildPL()에서 T() 함수 사용
```javascript
// 기존: dashboard:'📊 Dashboard'
// 변경: dashboard:'📊 '+T('nav_dashboard')
```
_T 딕셔너리(line 1367~)에 이미 nav_ai_analysis 등 키가 있으므로, _buildPL()에서 T()를 호출하면 _ML fallback이 자동 작동.

### 주의
- _buildPL()은 사이드바 렌더링 시 호출 → T()가 초기화된 후여야 함
- 23,900줄 파일이므로 정확한 위치에서만 수정
- 수정 후 sync-htm.sh 필수

## 영향 범위
- 사이드바 메뉴 약 30개 항목
- 모든 언어에서 번역된 사이드바 표시
