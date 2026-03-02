-- ============================================
-- 마이그레이션: RLS 스택 깊이 초과 오류 수정
-- 날짜: 2026-03-02
-- 원인: can_access_deal() 함수가 9개 테이블에서 재귀 호출 → PostgreSQL 스택 오버플로우
-- 해결: deal_participants 캐시 테이블 → O(1) 조회로 교체
-- ============================================

-- 1. deal_participants 캐시 테이블 생성
create table if not exists public.deal_participants (
  deal_id uuid not null references public.deals(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  participant_role text not null
    check (participant_role in ('seller_owner','seller_member','buyer','guest','admin')),
  company_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (deal_id, user_id)
);

create index if not exists idx_deal_participants_user on public.deal_participants(user_id, deal_id);
create index if not exists idx_deal_participants_deal on public.deal_participants(deal_id);

alter table public.deal_participants enable row level security;

create policy deal_participants_select_self on public.deal_participants
for select using (user_id = auth.uid() or public.is_admin());

create policy deal_participants_write_admin on public.deal_participants
for all using (public.is_admin()) with check (public.is_admin());

-- 2. 기존 딜 데이터로 deal_participants 초기 채우기
insert into public.deal_participants (deal_id, user_id, participant_role)
select d.id, d.seller_id, 'seller_owner'
from public.deals d
where d.seller_id is not null
on conflict (deal_id, user_id) do nothing;

insert into public.deal_participants (deal_id, user_id, participant_role)
select d.id, d.buyer_id, 'buyer'
from public.deals d
where d.buyer_id is not null
on conflict (deal_id, user_id) do nothing;

-- 3. 빠른 접근 함수 (기존 can_access_deal 대체)
create or replace function public.can_access_deal_fast(p_deal_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.deal_participants dp
    where dp.deal_id = p_deal_id and dp.user_id = auth.uid()
  ) or public.is_admin();
$$;

-- 4. 기존 RLS 정책 교체 (재귀 can_access_deal → 단순 deal_participants 조회)
-- 4a. documents
drop policy if exists "documents_select" on public.documents;
create policy "documents_select" on public.documents
for select using (
  exists(select 1 from public.deal_participants dp where dp.deal_id = documents.deal_id and dp.user_id = auth.uid())
  or public.is_admin()
  or user_id = auth.uid()
);

-- 4b. quotes
drop policy if exists "quotes_select" on public.quotes;
create policy "quotes_select" on public.quotes
for select using (
  exists(select 1 from public.deal_participants dp where dp.deal_id = quotes.deal_id and dp.user_id = auth.uid())
  or public.is_admin()
);

-- 4c. messages
drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages
for select using (
  exists(select 1 from public.deal_participants dp where dp.deal_id = messages.deal_id and dp.user_id = auth.uid())
  or public.is_admin()
);

-- 4d. shipments
drop policy if exists "shipments_select" on public.shipments;
create policy "shipments_select" on public.shipments
for select using (
  exists(select 1 from public.deal_participants dp where dp.deal_id = shipments.deal_id and dp.user_id = auth.uid())
  or public.is_admin()
  or user_id = auth.uid()
);

-- 4e. payment_milestones (deal_id를 통해)
drop policy if exists "payment_milestones_select" on public.payment_milestones;
create policy "payment_milestones_select" on public.payment_milestones
for select using (
  exists(
    select 1 from public.orders o
    join public.deal_participants dp on dp.deal_id = o.deal_id
    where o.id = payment_milestones.order_id and dp.user_id = auth.uid()
  )
  or public.is_admin()
);

-- 4f. deal_events
drop policy if exists "deal_events_select" on public.deal_events;
create policy "deal_events_select" on public.deal_events
for select using (
  exists(select 1 from public.deal_participants dp where dp.deal_id = deal_events.deal_id and dp.user_id = auth.uid())
  or public.is_admin()
);

-- 5. 자동 동기화 트리거 (딜 생성/수정 시 participants 자동 갱신)
create or replace function public.trg_deals_sync_participants()
returns trigger
language plpgsql
security definer
as $$
begin
  -- seller
  if new.seller_id is not null then
    insert into public.deal_participants(deal_id, user_id, participant_role)
    values (new.id, new.seller_id, 'seller_owner')
    on conflict (deal_id, user_id) do nothing;
  end if;

  -- buyer
  if new.buyer_id is not null then
    insert into public.deal_participants(deal_id, user_id, participant_role)
    values (new.id, new.buyer_id, 'buyer')
    on conflict (deal_id, user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_deals_sync_participants on public.deals;
create trigger trg_deals_sync_participants
after insert or update of seller_id, buyer_id on public.deals
for each row execute function public.trg_deals_sync_participants();

-- 6. products 테이블에 is_public 컬럼 추가 (바이어 마켓플레이스 노출용)
alter table public.products add column if not exists is_public boolean default false;

-- 7. guest_sessions에서 deal_participants로 자동 추가
create or replace function public.trg_guest_sync_participants()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.deal_participants(deal_id, user_id, participant_role)
  values (new.deal_id, new.guest_user_id, 'guest')
  on conflict (deal_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_guest_sync_participants on public.guest_sessions;
create trigger trg_guest_sync_participants
after insert on public.guest_sessions
for each row execute function public.trg_guest_sync_participants();

-- ============================================
-- 실행 방법: Supabase 대시보드 > SQL Editor에서 이 파일 전체를 복사-붙여넣기 후 실행
-- 실행 후 REST API 쿼리가 정상 작동하는지 확인
-- ============================================
