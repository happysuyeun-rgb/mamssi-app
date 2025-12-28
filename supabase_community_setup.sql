-- ============================================
-- 마음씨(Mamssi) 공감숲(Community) 테이블 설정
-- ============================================

-- community_posts 테이블 생성
create table if not exists public.community_posts (
  id uuid primary key default uuid_generate_v4(),
  emotion_id uuid references public.emotions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  emotion_type text,
  image_url text,
  category_id text, -- 공감숲 카테고리
  like_count int default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- community_likes 테이블 생성
create table if not exists public.community_likes (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid references public.community_posts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  unique (post_id, user_id)
);

-- reports 테이블 생성
create table if not exists public.reports (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid references public.community_posts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  reason text not null,
  details text, -- 추가 상세 내용
  created_at timestamp with time zone default now()
);

-- RLS 활성화
alter table public.community_posts enable row level security;
alter table public.community_likes enable row level security;
alter table public.reports enable row level security;

-- 정책: 공개글은 누구나 조회 가능
create policy "community_posts read all"
  on public.community_posts for select
  using (true);

-- 정책: 본인만 수정/삭제 가능
create policy "community_posts modify self"
  on public.community_posts for all
  using ( auth.uid() = user_id );

-- 정책: 공감은 누구나 조회 가능
create policy "community_likes read all"
  on public.community_likes for select
  using (true);

-- 정책: 본인만 공감 추가/삭제 가능
create policy "community_likes insert self"
  on public.community_likes for insert
  with check ( auth.uid() = user_id );

create policy "community_likes delete self"
  on public.community_likes for delete
  using ( auth.uid() = user_id );

-- 정책: 신고는 본인만 조회 가능 (관리자용)
create policy "reports read self"
  on public.reports for select
  using ( auth.uid() = user_id );

-- 정책: 누구나 신고 가능
create policy "reports insert all"
  on public.reports for insert
  with check (true);

-- 인덱스 추가 (성능 최적화)
create index if not exists idx_community_posts_user_id on public.community_posts(user_id);
create index if not exists idx_community_posts_created_at on public.community_posts(created_at desc);
create index if not exists idx_community_posts_like_count on public.community_posts(like_count desc);
create index if not exists idx_community_posts_category_id on public.community_posts(category_id) where category_id is not null;

create index if not exists idx_community_likes_post_id on public.community_likes(post_id);
create index if not exists idx_community_likes_user_id on public.community_likes(user_id);
create index if not exists idx_community_likes_unique on public.community_likes(post_id, user_id);

create index if not exists idx_reports_post_id on public.reports(post_id);
create index if not exists idx_reports_user_id on public.reports(user_id);

-- like_count 자동 업데이트 함수
create or replace function update_post_like_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.community_posts
    set like_count = like_count + 1
    where id = NEW.post_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update public.community_posts
    set like_count = greatest(0, like_count - 1)
    where id = OLD.post_id;
    return OLD;
  end if;
  return null;
end; $$ language plpgsql;

-- like_count 트리거
drop trigger if exists update_like_count_on_like on public.community_likes;
create trigger update_like_count_on_like
  after insert or delete on public.community_likes
  for each row execute function update_post_like_count();

-- updated_at 자동 업데이트
drop trigger if exists update_community_posts_updated_at on public.community_posts;
create trigger update_community_posts_updated_at
  before update on public.community_posts
  for each row execute function update_updated_at_column();

-- emotions 테이블에서 공개 기록이 생성될 때 community_posts에 자동 생성
create or replace function sync_community_post_from_emotion()
returns trigger as $$
begin
  if NEW.is_public = true and NEW.category_id is not null then
    insert into public.community_posts (
      emotion_id,
      user_id,
      content,
      emotion_type,
      image_url,
      category_id
    ) values (
      NEW.id,
      NEW.user_id,
      NEW.content,
      NEW.emotion_type,
      NEW.image_url,
      NEW.category_id
    ) on conflict do nothing;
  elsif OLD.is_public = true and (NEW.is_public = false or NEW.category_id is null) then
    -- 공개에서 비공개로 변경되면 community_posts에서 삭제
    delete from public.community_posts where emotion_id = NEW.id;
  elsif NEW.is_public = true and NEW.category_id is not null then
    -- 공개 기록이 업데이트되면 community_posts도 업데이트
    update public.community_posts
    set
      content = NEW.content,
      emotion_type = NEW.emotion_type,
      image_url = NEW.image_url,
      category_id = NEW.category_id
    where emotion_id = NEW.id;
  end if;
  return NEW;
end; $$ language plpgsql security definer;

-- emotions 테이블 트리거
drop trigger if exists sync_community_post_trigger on public.emotions;
create trigger sync_community_post_trigger
  after insert or update on public.emotions
  for each row execute function sync_community_post_from_emotion();








