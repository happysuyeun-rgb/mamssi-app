-- ============================================
-- 마음씨(Mamssi) 알림(notifications) 테이블 설정
-- ============================================

-- notifications 테이블 생성
create table if not exists public.notifications (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null,
  icon text not null,
  title text not null,
  message text not null,
  category text not null,
  is_read boolean default false,
  meta jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

-- RLS 활성화
alter table public.notifications enable row level security;

-- 정책: 본인만 조회/수정/삭제 가능
create policy "notifications select self"
  on public.notifications for select
  using ( auth.uid() = user_id );

create policy "notifications insert self"
  on public.notifications for insert
  with check ( auth.uid() = user_id );

create policy "notifications update self"
  on public.notifications for update
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

create policy "notifications delete self"
  on public.notifications for delete
  using ( auth.uid() = user_id );

-- 인덱스 추가
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_user_id_is_read on public.notifications(user_id, is_read) where is_read = false;
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);

