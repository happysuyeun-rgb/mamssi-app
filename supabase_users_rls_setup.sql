-- ============================================
-- 마음씨(Mamssi) Supabase public.users 테이블 RLS 정책 설정
-- ============================================

-- RLS (Row Level Security) 활성화
alter table public.users enable row level security;

-- 기존 정책이 있으면 삭제 (재실행 시)
drop policy if exists "users select self" on public.users;
drop policy if exists "users insert self" on public.users;
drop policy if exists "users update self" on public.users;

-- 본인만 조회 가능
create policy "users select self"
  on public.users for select
  using ( auth.uid() = id );

-- 본인만 삽입 가능
create policy "users insert self"
  on public.users for insert
  with check ( auth.uid() = id );

-- 본인만 수정 가능
create policy "users update self"
  on public.users for update
  using ( auth.uid() = id )
  with check ( auth.uid() = id );




