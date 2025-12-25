-- ============================================
-- 마음씨(Mamssi) Supabase public.users 테이블 마감 처리
-- ============================================
-- 목표: soft delete/재가입/온보딩 분기에서 NULL/기본값 문제 없이 안정적으로 동작
-- ============================================

-- ============================================
-- 1. 기존 NULL 데이터 정리
-- ============================================

-- onboarding_completed: NULL → false
update public.users
set onboarding_completed = false
where onboarding_completed is null;

-- is_deleted: NULL → false
update public.users
set is_deleted = false
where is_deleted is null;

-- ============================================
-- 2. 컬럼 제약 조건 추가/수정
-- ============================================

-- onboarding_completed: NOT NULL DEFAULT false
alter table public.users
  alter column onboarding_completed set not null,
  alter column onboarding_completed set default false;

-- is_deleted: NOT NULL DEFAULT false
alter table public.users
  alter column is_deleted set not null,
  alter column is_deleted set default false;

-- created_at: DEFAULT now() 추가 (이미 NOT NULL이면 유지)
alter table public.users
  alter column created_at set default now();

-- updated_at: DEFAULT now() 추가
alter table public.users
  alter column updated_at set default now();

-- ============================================
-- 3. updated_at 자동 갱신 트리거
-- ============================================

-- updated_at 자동 업데이트 함수 (이미 존재하면 교체)
create or replace function public.handle_users_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 기존 트리거가 있으면 삭제
drop trigger if exists users_updated_at on public.users;

-- updated_at 트리거 생성
create trigger users_updated_at
  before update on public.users
  for each row
  execute function public.handle_users_updated_at();

-- ============================================
-- 4. FK 제약 조건 (중복 생성 방지)
-- ============================================

-- FK가 이미 존재하는지 확인하고 없을 때만 생성
-- pg_constraint에서 conname='users_id_fkey' 기준으로 체크

do $$
begin
  -- users.id → auth.users.id FK 확인 및 생성
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_id_fkey'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_id_fkey
      foreign key (id)
      references auth.users(id)
      on delete cascade;
  end if;
end $$;

-- ============================================
-- 5. 최종 검증 (선택사항)
-- ============================================

-- 컬럼 정보 확인 쿼리 (실행 후 확인용)
-- select
--   column_name,
--   data_type,
--   is_nullable,
--   column_default
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name = 'users'
--   and column_name in ('onboarding_completed', 'is_deleted', 'created_at', 'updated_at')
-- order by ordinal_position;

