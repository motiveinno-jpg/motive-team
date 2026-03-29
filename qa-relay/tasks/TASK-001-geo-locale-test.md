# [전체 세션 공통] 지역/언어 자동 감지 테스트 — 필수 추가

## 배경
각 국가 페르소나가 현지에서 접속할 때, 사이트가 자동으로 현지어 페이지를 보여주는지 반드시 테스트해야 함.

## Puppeteer로 현지 접속 시뮬레이션 방법

### 1. Accept-Language 헤더 설정
```javascript
// 일본 사용자
await page.setExtraHTTPHeaders({ 'Accept-Language': 'ja-JP,ja;q=0.9' });

// 독일 사용자
await page.setExtraHTTPHeaders({ 'Accept-Language': 'de-DE,de;q=0.9' });

// 베트남 사용자
await page.setExtraHTTPHeaders({ 'Accept-Language': 'vi-VN,vi;q=0.9' });

// 미국 사용자
await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
```

### 2. Geolocation 설정
```javascript
// 일본 (도쿄)
await page.setGeolocation({ latitude: 35.6762, longitude: 139.6503 });

// 독일 (뮌헨)
await page.setGeolocation({ latitude: 48.1351, longitude: 11.5820 });

// 베트남 (호치민)
await page.setGeolocation({ latitude: 10.8231, longitude: 106.6297 });

// 미국 (LA)
await page.setGeolocation({ latitude: 34.0522, longitude: -118.2437 });

// 한국 (화성)
await page.setGeolocation({ latitude: 37.1995, longitude: 126.8313 });
```

### 3. Timezone 설정
```javascript
await page.emulateTimezone('Asia/Tokyo');       // 일본
await page.emulateTimezone('Europe/Berlin');     // 독일
await page.emulateTimezone('Asia/Ho_Chi_Minh');  // 베트남
await page.emulateTimezone('America/Los_Angeles'); // 미국
await page.emulateTimezone('Asia/Seoul');        // 한국
```

## 체크리스트 (각 페르소나 세션별)

### S1 (한국 제조사 — 화성)
- [ ] Accept-Language: ko-KR → 한국어 랜딩/앱 자동 표시?
- [ ] 언어 수동 전환 없이 한국어가 기본인지?

### S2 (일본 제조사 — 오사카)
- [ ] Accept-Language: ja-JP → 일본어 자동 표시?
- [ ] 첫 접속 시 영어? 일본어? 한국어? — 무엇이 나오는지 기록
- [ ] 자동 감지 안 되면 → 언어 선택 UI 쉽게 찾을 수 있는지?
- [ ] 일본어 선택 후 새로고침해도 유지되는지?

### S3 (독일 제조사 — 뮌헨)
- [ ] Accept-Language: de-DE → 독일어 자동 표시?
- [ ] 독일어 미지원 시 → 영어 fallback 되는지?
- [ ] Accept-Language 기반 자동 감지 vs IP 기반 자동 감지

### S4 (미국 바이어 — LA)
- [ ] Accept-Language: en-US → 영어 자동 표시?
- [ ] 바이어앱 기본 언어가 영어인지?

### S5 (베트남 바이어 — 호치민)
- [ ] Accept-Language: vi-VN → 베트남어 자동 표시?
- [ ] 베트남어 미지원 시 → 영어 fallback?
- [ ] 통화도 VND로 자동 전환되는지?

## 공통 확인 사항
1. **자동 언어 감지 메커니즘이 존재하는가?**
   - navigator.language 기반?
   - Accept-Language 헤더 기반?
   - IP geolocation 기반?
   - 아무것도 없으면 → P1 버그 (글로벌 서비스인데 자동 감지 없음)

2. **언어 설정 저장**
   - 한번 선택하면 다음 접속에도 유지?
   - localStorage? cookie? DB?

3. **통화 자동 전환**
   - 언어에 따라 통화도 바뀌는지?
   - JPY, EUR, VND, USD, KRW

4. **URL 구조**
   - /ko, /en, /ja 같은 언어별 경로?
   - 쿼리파라미터 ?lang=ja?
   - 현재 구조에서 현지 접속 시 어떻게 라우팅?

## 우선순위: P1
글로벌 서비스에서 현지어 자동 감지가 안 되면 첫인상에서 이탈.

## 버그 발견 시
각 세션 고유 형식으로 기록. 예:
~/motive-team/qa-relay/bugs/S2-bug-XXX.md — "일본 접속 시 한국어 표시됨"
