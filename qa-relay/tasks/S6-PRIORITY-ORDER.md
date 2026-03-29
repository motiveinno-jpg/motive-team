# S6 수정 우선순위 — S0 지시 (2026-03-29 23:35)

## ★ 반드시 이 순서대로 수정. 한 건 끝나면 다음 건으로.

### 1순위: T() 함수 1줄 수정 (TASK-007) — 예상 5분
whistle-app.html T() 함수 최종 fallback 수정:
```javascript
// 현재 (line ~4771): return key;
// 수정: var v2=_T[key]; if(v2) return v2[1]; return key;
```
이것만으로 ja/de/vi 등에서 번역 키 대신 최소 영어가 표시됨.
**P0 5개 세션에서 동시 보고된 최우선 이슈.**

### 2순위: _buildPL() 사이드바 T() 호출 (TASK-008) — 예상 15분
whistle-app.html:19543 _buildPL() 내 하드코딩 영어 → T() 호출로 교체.
기존 `dashboard:'📊 Dashboard'` → `dashboard:'📊 '+T('nav_dashboard')` 패턴.

### 3순위: buyer-app 네비게이션 깨짐 (TASK-009) — 예상 30분
buyer-app.html 사이드바 링크가 제조사 앱으로 이동하는 문제.
바이어 앱 전체 사용 불가 상태.

### 4순위: 루트(/) 리다이렉트 (TASK-010) — 예상 15분
비인증 사용자가 whistle-ai.com 접속 시 랜딩이 아닌 /app/buyer로 리다이렉트.

### 5순위: 쿠키 배너 타이밍 (TASK-011) — 예상 5분
`localStorage.getItem('whistle_lang')` 직접 읽기로 1줄 수정.

---

## 수정 후 필수
1. `bash sync-htm.sh` 실행
2. fixes/ 폴더에 S6-fix-009.md~ 기록
3. git commit + push (자동 배포)

## ⚠️ 절대 금지
- 176개 버그 전부 보지 마. 위 5개만 순서대로.
- P2/P3 건드리지 마. P0부터.
- .html 수정 후 .htm 동기화 안 하면 배포 안 됨.
