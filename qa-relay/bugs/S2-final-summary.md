# [S2-일본제조사] 전체 QA 최종 종합 보고서
## 2026-03-29 | 1차+2차+3차 루프

---

## 페르소나
- 田中 悠希 (Tanaka Yuki) — ヘルスライフ株式会社, 오사카
- 건강식품/보충제 제조사, 미국 FDA 등록 완료
- 계정: qa.mfr.jp2@whistle-test.com (role=client, country=JP, language=ja)

---

## 총 버그: 24건 + 시각적 5건

### P0 — 서비스 불가 (4건)
| ID | 제목 | 상태 |
|----|------|------|
| S2-bug-008 | Accept-Language:ja-JP 자동 감지 실패 — 모든 페이지 영어 | OPEN |
| S2-bug-014 | 전체 앱 번역 키(코드 변수명) 대규모 노출 (export_intelligence 등) | OPEN |
| S2-bug-017 | whistle-ai.com(/) 접속 → /app/buyer로 리다이렉트 (랜딩 미표시) | OPEN |
| S2-bug-020 | loadUser()가 ?lang=ja 무시 → localStorage 오염 언어 유지 (근본 원인) | OPEN |

### P1 — 핵심 기능 장애 (6건)
| ID | 제목 | 상태 |
|----|------|------|
| S2-bug-003 | 언어 선택기 부재 | ✅ VERIFIED (S6-fix-004) |
| S2-bug-004 | Sign Up 클릭 → /app/buyer 리다이렉트 | OPEN |
| S2-bug-012 | 대시보드 ~30% 영어 혼재 | OPEN |
| S2-bug-013 | AI 분석 페이지 번역 키 노출 | OPEN |
| S2-bug-015 | Messages → /app/buyer#search 리다이렉트 | OPEN |
| S2-bug-018 | 크로스 세션 언어 오염 (de→ja 전환 안됨) | OPEN |
| S2-bug-019 | /ko_made → /buyer 리다이렉트 (서비스 프리뷰 깨짐) | OPEN |

### P2 — 불편 (6건)
| ID | 제목 | 상태 |
|----|------|------|
| S2-bug-001 | select_ellipsis 코드 노출 | ✅ FIXED (S6-fix-001) |
| S2-bug-005 | 쿠키 배너 미번역 | ❌ REOPEN (S6-fix-005 미반영) |
| S2-bug-006 | 바이어 "Source premium products with AI" 미번역 | OPEN |
| S2-bug-007 | Contact Name 미번역 | ❌ REOPEN (S6-fix-005 미반영) |
| S2-bug-016 | AI 분석 카테고리 전부 영어 + 국가명 혼재 | OPEN |
| S2-bug-021 | JPY 환율 계산 오류 — $18→¥18.18 (실제 ~¥2,700) | OPEN |
| S2-bug-021 | JPY 환율 계산 오류 — $18→¥18.18 (실제 ~¥2,700) | OPEN |
| S2-bug-022 | 수출 가이드 센터 전체 영어 — 일본어 없음 | OPEN |
| S2-bug-023 | 제품 등록 — "Product Name (KR)" 표시 (JP 계정인데) | OPEN |
| S2-bug-024 | 제품 등록 이미지 — "클릭" 한국어 하드코딩 | OPEN |

### P3 — 미미 (2건)
| ID | 제목 | 상태 |
|----|------|------|
| S2-bug-002 | country 라벨 소문자 | ✅ FIXED (S6-fix-001) |
| S2-bug-009 | "Loading Whistle AI..." 미번역 | OPEN |

### 시각적 UX (5건)
| ID | 심각도 | 제목 |
|----|--------|------|
| S2-visual-001 | P1 | 데스크톱 로딩 무한 대기 |
| S2-visual-002 | P2 | Contact Name 다국어 미번역 (모바일) |
| S2-visual-003 | P2 | 바이어 랜딩 모바일 스크롤 지옥 + 언어 선택 없음 |
| S2-visual-004 | P2 | 모바일 쿠키 배너 콘텐츠 가림 |
| S2-visual-005 | P3 | 모바일 Beta 배너 과다 면적 |

---

## 수정 검증 결과
| 수정 | 검증 결과 |
|------|-----------|
| S6-fix-001 (select_ellipsis + country) | ✅ VERIFIED |
| S6-fix-004 (13개 언어 선택기) | ✅ VERIFIED |
| S6-fix-005 (쿠키 배너 + Contact Name) | ❌ 미반영 — REOPEN |
| S6-fix-007 (buyer-app 언어 감지) | 부분 확인 (buyer 미테스트) |
| S6-fix-008 (바이어 role 교정) | ❌ 제조사 계정에서 재현 |

---

## Phase별 완료 현황
| Phase | 상태 | 핵심 발견 |
|-------|------|-----------|
| 1. 첫 만남 | ✅ 완료 | 자동 감지 실패, 언어 선택기 추가됨 |
| 2. 수출 분석 | ⚠️ 부분 | 폼 입력 OK, 분석 실행 실패 (API 400) |
| 3. 다국어 심층 | ✅ 완료 | 번역 키 대규모 노출, loadUser 언어 덮어쓰기 |
| 4. 서류 생성 | ✅ 완료 | 프리뷰 정상, 서류별 고유 디자인 확인 |
| 5. 코스트/통화 | ⚠️ 부분 | USD↔JPY 토글 존재, 세부 계산 미테스트 |
| 6. 바이어+채팅 | ❌ 미완 | 세션 불안정으로 미테스트 |
| 7. 에스크로+결제 | ❌ 미완 | |
| 8. 모바일 Safari | ✅ 완료 | 레이아웃 양호, 쿠키 배너 가림 |

---

## S0-fix-001 검증 (2026-03-30 00:15) — P0 대폭 해결!
- ✅ S2-bug-014 (P0): 번역 키 노출 → **VERIFIED** (영어 fallback으로 해결)
- ✅ S2-bug-020 (P0): loadUser 언어 덮어쓰기 → **VERIFIED** (country→lang 매핑)
- ✅ S2-bug-005 (P2): 쿠키 배너 → **VERIFIED** (일본어 표시)
- ✅ S2-bug-013 (P1): AI 분석 번역 키 → **VERIFIED**
- ✅ S2-bug-018 (P1): 크로스 세션 언어 오염 → **VERIFIED**
- ✅ 서류 생성: 일본어+영어 병기 표시 확인
- ✅ 설정: 일본어 표시 확인

## 남은 긴급 수정 우선순위
1. **S2-bug-017 (P0)**: 메인 URL(/) → 바이어 포털 리다이렉트 (랜딩 미표시)
2. **S2-bug-008 (P0)**: 자동 언어 감지 — 랜딩에서 미작동
3. **S2-bug-021 (P1)**: JPY 환율 계산 오류 ($18→¥18.18)
4. **S2-bug-024 (P1)**: "클릭" 한국어 하드코딩 (line 8724, 8798)
5. **S2-bug-023 (P1)**: Product Name (KR) — JP 계정에 KR 표시
6. **S2-bug-019 (P1)**: /ko_made 서비스 프리뷰 리다이렉트
7. **S2-bug-007 (P2)**: Contact Name 미번역 재확인 필요
