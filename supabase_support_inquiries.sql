-- ============================================
-- 고객 문의 테이블 (support_inquiries)
-- ============================================

create table if not exists public.support_inquiries (
  id uuid primary key default uuid_generate_v4(),
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

-- 정책: 누구나 문의 생성 가능 (INSERT)
create policy "support_inquiries insert all"
  on public.support_inquiries for insert
  with check (true);

-- 정책: 본인 문의만 조회 가능 (SELECT) - 운영자 조회는 service_role 사용
create policy "support_inquiries select own"
  on public.support_inquiries for select
  using (auth.uid() = user_id);

-- 인덱스
create index if not exists idx_support_inquiries_user_id on public.support_inquiries(user_id);
create index if not exists idx_support_inquiries_status on public.support_inquiries(status);
create index if not exists idx_support_inquiries_created_at on public.support_inquiries(created_at desc);

comment on table public.support_inquiries is '고객 문의';
comment on column public.support_inquiries.status is 'pending | in_progress | resolved';
