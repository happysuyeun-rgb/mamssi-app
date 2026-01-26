-- ============================================
-- 마음씨(Mamssi) 사용자 설정(user_settings) 테이블 설정
-- ============================================

-- user_settings 테이블 생성
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text,
  mbti text,
  profile_url text, -- Supabase Storage URL
  seed_name text,  -- 씨앗 이름 (10자 이내)
  lock_type text,   -- 'pattern' | 'pin' | null
  lock_value text,  -- 암호화된 문자열 (해시)
  updated_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- RLS 활성화
alter table public.user_settings enable row level security;

-- 기존 정책 모두 삭제 (재생성을 위해)
DROP POLICY IF EXISTS "user_settings self only" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_select" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_update" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_insert" ON public.user_settings;

-- SELECT 정책: 본인만 조회 가능
-- using: 조회할 때 조건 체크
CREATE POLICY "user_settings_select"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT 정책: 본인만 생성 가능
-- with check: INSERT 시 새로 생성되는 row의 조건 체크
-- upsert 사용 시 필수: 레코드가 없을 때 INSERT가 발생하므로 이 정책이 필요
CREATE POLICY "user_settings_insert"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE 정책: 본인만 수정 가능
-- using: 기존 row를 수정할 수 있는지 체크 (WHERE 조건)
-- with check: 수정 후 row가 만족해야 할 조건 체크
-- upsert 사용 시 필수: 레코드가 있을 때 UPDATE가 발생하므로 이 정책이 필요
CREATE POLICY "user_settings_update"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 인덱스 추가
create index if not exists idx_user_settings_user_id on public.user_settings(user_id);

-- updated_at 자동 갱신 트리거
create or replace function public.update_user_settings_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trigger_update_user_settings_updated_at
  before update on public.user_settings
  for each row
  execute function public.update_user_settings_updated_at();

-- Storage 버킷 생성 (프로필 이미지용)
-- 참고: Supabase Dashboard에서 수동으로 생성하거나 아래 명령어 사용
-- insert into storage.buckets (id, name, public) values ('profile-images', 'profile-images', true);

-- Storage 정책 (프로필 이미지 업로드/조회)
-- create policy "Profile images are publicly accessible"
--   on storage.objects for select
--   using (bucket_id = 'profile-images');

-- create policy "Users can upload their own profile image"
--   on storage.objects for insert
--   with check (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- create policy "Users can update their own profile image"
--   on storage.objects for update
--   using (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- create policy "Users can delete their own profile image"
--   on storage.objects for delete
--   using (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);












