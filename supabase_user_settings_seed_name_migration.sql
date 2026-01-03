-- ============================================
-- user_settings 테이블에 seed_name 컬럼 추가 마이그레이션
-- ============================================

-- seed_name 컬럼 추가 (이미 존재하면 무시)
alter table public.user_settings 
  add column if not exists seed_name text;

-- RLS 정책 업데이트 (기존 정책 삭제 후 재생성)
drop policy if exists "user_settings self only" on public.user_settings;
drop policy if exists "user_settings_select" on public.user_settings;
drop policy if exists "user_settings_update" on public.user_settings;
drop policy if exists "user_settings_insert" on public.user_settings;

-- SELECT 정책: 본인만 조회 가능
create policy "user_settings_select"
  on public.user_settings for select
  using (auth.uid() = user_id);

-- UPDATE 정책: 본인만 수정 가능
create policy "user_settings_update"
  on public.user_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- INSERT 정책: 본인만 생성 가능
create policy "user_settings_insert"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

-- 주석 추가
comment on column public.user_settings.seed_name is '씨앗 이름 (10자 이내)';


