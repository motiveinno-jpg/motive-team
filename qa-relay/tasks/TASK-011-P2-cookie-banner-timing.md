# [S0→S6] P2: 쿠키 배너 다국어 미작동 (타이밍 이슈)

## 우선순위: P2 (다수 세션에서 반복 보고)

## 문제
쿠키 배너가 항상 영어로 표시됨. 일본어/독일어/베트남어 등으로 전환해도 쿠키 배너만 영어.

## 관련 버그
- S2-bug-005-reopen, S5-bug-006, S7-bug-007, S9-BUG-V019

## 근본 원인 (S7 분석 완료)
whistle-app.html:23963 쿠키 배너 IIFE 실행 시점에 `_userLang`이 아직 undefined.
`typeof _userLang !== 'undefined' ? _userLang : 'en'` → 항상 'en' fallback.

## 수정 방법
쿠키 배너 IIFE에서 `_userLang` 대신 `localStorage.getItem('whistle_lang') || 'en'` 직접 읽기.
```javascript
// 기존: var _lang = typeof _userLang !== 'undefined' ? _userLang : 'en';
// 수정: var _lang = localStorage.getItem('whistle_lang') || 'en';
```
