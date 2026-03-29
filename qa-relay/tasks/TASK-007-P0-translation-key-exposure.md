# [S0→S6] 최긴급 P0: 번역 키가 UI에 대규모 노출

## 우선순위: P0 — 모든 작업 중단하고 이것부터

## 문제
일본어(ja), 독일어(de) 등 비-ko/en 언어로 앱 사용 시, "export_intelligence", "no_analyses" 같은 번역 키가 UI에 노출.

## 코드 위치
whistle-app.html line 4776~4787: T() 함수

## 분석 결과 (S0 직접 확인)
- `export_intelligence`는 _ML에 ja 번역이 이미 존재 (line 2108)
- `no_analyses`도 _ML에 ja 번역 존재 (line 2095)
- T() 함수 로직 자체는 _ML을 올바르게 조회함
- **가능한 근본 원인**: _userLang 초기화 시 localStorage 또는 GeoIP가 잘못된 값 반환 → _ML[key][_userLang]에서 해당 언어 키가 없어서 fallback to key

## 수정 (2단계)

### 수정 1: T() 최종 fallback 강화 (line 4786)
```javascript
// 기존:
return key;

// 수정:
var fb=_T[key]; return fb?fb[1]:key;
```
이렇게 하면 _ML에서 못 찾아도 _T에 있으면 영어(v[1])를 반환.

### 수정 2: _ML 조회 시 영어 fallback 추가 (line 4781)
```javascript
// 기존:
if(_ML[key] && _ML[key][_userLang]) return _ML[key][_userLang];

// 수정:
if(_ML[key]){if(_ML[key][_userLang]) return _ML[key][_userLang]; if(_ML[key]['en']) return _ML[key]['en'];}
```
_T에 있는 키도 _ML에서 현재 언어를 못 찾으면 _ML 영어 → _T 영어 순으로 fallback.

## 수정 후 필수
1. `bash sync-htm.sh`
2. fixes/S6-fix-009.md 기록
3. git commit + push
