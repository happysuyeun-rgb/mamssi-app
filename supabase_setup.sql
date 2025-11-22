-- ============================================
-- 마음씨(Mamssi) Supabase 프로필 테이블 설정
-- ============================================

-- profiles 테이블 생성: auth.users와 1:1 관계
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text,
  seed_name text,
  onboarding_complete boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- RLS (Row Level Security) 활성화
alter table public.profiles enable row level security;

-- 본인만 조회 가능
create policy "profiles select self"
  on public.profiles for select
  using ( auth.uid() = id );

-- 본인만 삽입 가능
create policy "profiles insert self"
  on public.profiles for insert
  with check ( auth.uid() = id );

-- 본인만 수정 가능
create policy "profiles update self"
  on public.profiles for update
  using ( auth.uid() = id )
  with check ( auth.uid() = id );

-- 가입 시 자동 프로필 생성 트리거 함수
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end; $$ language plpgsql security definer;

-- 기존 트리거가 있으면 삭제
drop trigger if exists on_auth_user_created on auth.users;

-- 새 유저 생성 시 트리거 생성
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at 자동 업데이트 함수
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

-- updated_at 트리거
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();


