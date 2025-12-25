-- ============================================
-- 마음씨(Mamssi) 사용자 설정(user_settings) 테이블 설정
-- ============================================

-- user_settings 테이블 생성
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text,
  mbti text,
  profile_url text, -- Supabase Storage URL
  lock_type text,   -- 'pattern' | 'pin' | null
  lock_value text,  -- 암호화된 문자열 (해시)
  updated_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- RLS 활성화
alter table public.user_settings enable row level security;

-- 정책: 본인만 조회/수정 가능
create policy "user_settings self only"
  on public.user_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

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







