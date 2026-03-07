-- ============================================
-- 고객 문의 테이블 (support_inquiries)
-- ============================================

create table if not exists public.support_inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  category text not null,
  title text not null,
  content text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- RLS 활성화
alter table public.support_inquiries enable row level security;

-- anon, authenticated 역할에 테이블 사용 권한 부여 (API/클라이언트에서 접근 가능하도록)
grant usage on schema public to anon, authenticated;
grant select, insert on public.support_inquiries to anon, authenticated;

-- 정책은 이미 있으면 제거 후 다시 생성 (재실행 가능하도록)
drop policy if exists "support_inquiries insert all" on public.support_inquiries;
create policy "support_inquiries insert all"
  on public.support_inquiries for insert
  with check (true);

drop policy if exists "support_inquiries select own" on public.support_inquiries;
create policy "support_inquiries select own"
  on public.support_inquiries for select
  using (auth.uid() = user_id);

-- 인덱스
create index if not exists idx_support_inquiries_user_id on public.support_inquiries(user_id);
create index if not exists idx_support_inquiries_status on public.support_inquiries(status);
create index if not exists idx_support_inquiries_created_at on public.support_inquiries(created_at desc);

comment on table public.support_inquiries is '고객 문의';
comment on column public.support_inquiries.status is 'pending | in_progress | resolved';
