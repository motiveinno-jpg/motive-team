# Whistle AI Changelog

## 2026-03-27: 24시간 자동 모집/홍보 시스템 구축

### 새로 생성한 파일
- `supabase/migrations/20260327_drip_sequences.sql` — 드립 시퀀스 테이블 (drip_sequences, drip_steps, drip_enrollments, marketing_automations) + 3개 시퀀스 × 4단계 시드 데이터
- `supabase/migrations/20260327_marketing_drip_cron.sql` — pg_cron 등록 (하루 2회 드립 + 주간 리드 수집)
- `supabase/functions/marketing-drip/index.ts` — 드립 엔진 Edge Function (12개 이메일 템플릿, 배치 발송, 타임존 그룹핑)
- `supabase/functions/collect-public-leads/index.ts` — 공개 DB 자동 수집 (data.go.kr, openFDA, UN Comtrade) + 자동 드립 등록
- `scripts/import-outreach-contacts.ts` — global-outreach-db.md 파싱 → marketing_contacts 임포트 스크립트
- `.github/workflows/indexnow.yml` — SEO 자동 제출 GitHub Action (sitemap/blog 변경 시 + 주간)

### 아직 안 된 것
- Supabase 마이그레이션 미적용 (supabase db push 필요)
- Edge Function 미배포 (supabase functions deploy 필요)
- data.go.kr API 키 미등록 (DATA_GO_KR_API_KEY 환경변수)
- IndexNow 키 GitHub Secret 미등록 (INDEXNOW_KEY)
- admin.html 드립 대시보드 UI 미구현
- 앱 내 추천 유도 UI 미구현
