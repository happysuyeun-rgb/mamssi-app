-- ============================================
-- 마음씨(Mamssi) 공감숲(Community) 최종 통합 설정
-- ============================================
-- 실행 전 주의사항:
-- 1. 이 스크립트는 기존 중복 트리거/정책을 정리합니다
-- 2. emotions 테이블은 category (영문), is_public, is_hidden 컬럼을 사용합니다
-- 3. community_posts 테이블은 emotion_category (영문), category (한글) 컬럼을 사용합니다
-- 4. reports 테이블은 reporter_id만 사용합니다 (user_id 없음)

-- ============================================
-- 1. 테이블 생성 및 수정
-- ============================================

-- community_posts 테이블 생성 (없으면 생성)
create table if not exists public.community_posts (
  id uuid primary key default uuid_generate_v4(),
  emotion_id uuid references public.emotions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  emotion_type text,
  image_url text,
  category text, -- 공감숲 카테고리 (한글: '일상', '고민' 등)
  like_count int default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- emotion_id를 NOT NULL로 변경 (ON CONFLICT 사용을 위해 필수)
-- 기존 데이터가 있다면 null인 행 처리 필요
do $$
begin
  -- emotion_id가 null인 행이 있으면 삭제 (트리거로 생성되지 않아야 하는 데이터)
  if exists (select 1 from public.community_posts where emotion_id is null) then
    delete from public.community_posts where emotion_id is null;
  end if;
  
  -- emotion_id를 NOT NULL로 변경 (이미 NOT NULL이면 오류 무시)
  begin
    alter table public.community_posts alter column emotion_id set not null;
  exception when others then
    -- 이미 NOT NULL이거나 다른 이유로 실패해도 계속 진행
    null;
  end;
end $$;

-- community_posts 컬럼 추가 (없으면 추가)
alter table if exists public.community_posts 
  add column if not exists is_public boolean default true,
  add column if not exists is_hidden boolean default false,
  add column if not exists emotion_category text; -- emotions.category (영문) 저장용

-- community_likes 테이블 생성
create table if not exists public.community_likes (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid references public.community_posts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  unique (post_id, user_id)
);

-- reports 테이블 생성 (reporter_id만 사용, user_id 없음)
create table if not exists public.reports (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid references public.community_posts(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete cascade not null,
  reason text not null,
  details text,
  status text default 'pending',
  created_at timestamp with time zone default now()
);

-- ============================================
-- 2. 중복 트리거 정리 (모두 제거)
-- ============================================

drop trigger if exists sync_community_post_trigger on public.emotions;
drop trigger if exists sync_community_post_from_emotion_trigger on public.emotions;
drop trigger if exists sync_community_post_from_emotion on public.emotions;
-- 기타 유사한 이름의 트리거도 제거
do $$
declare
  trigger_record record;
begin
  for trigger_record in 
    select trigger_name 
    from information_schema.triggers 
    where event_object_schema = 'public' 
      and event_object_table = 'emotions'
      and trigger_name like '%community_post%'
  loop
    execute format('drop trigger if exists %I on public.emotions', trigger_record.trigger_name);
  end loop;
end $$;

-- ============================================
-- 3. emotion_id unique constraint/index 정리 및 추가
-- ============================================

-- 기존 emotion_id 관련 unique index/constraint 모두 제거 (중복 정리)
do $$
declare
  index_record record;
  constraint_record record;
begin
  -- 기존 unique index 제거
  for index_record in 
    select indexname 
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'community_posts'
      and (
        indexname like '%emotion_id%unique%'
        or indexname like '%emotion_id%uidx%'
        or indexname like '%emotion_id%key%'
        or indexname = 'community_posts_emotion_id_unique'
        or indexname = 'community_posts_emotion_id_uidx'
        or indexname = 'community_posts_emotion_id_key'
      )
  loop
    execute format('drop index if exists %I', index_record.indexname);
  end loop;
  
  -- 기존 unique constraint 제거
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.community_posts'::regclass
      and contype = 'u'
      and (
        conname like '%emotion_id%'
        or array_length(conkey, 1) = 1 
        and (select attname from pg_attribute where attrelid = 'public.community_posts'::regclass and attnum = conkey[1]) = 'emotion_id'
      )
  loop
    execute format('alter table public.community_posts drop constraint if exists %I', constraint_record.conname);
  end loop;
end $$;

-- 최종적으로 하나의 unique constraint만 생성 (일반 UNIQUE CONSTRAINT)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.community_posts'::regclass
      and conname = 'community_posts_emotion_id_unique'
      and contype = 'u'
  ) then
    alter table public.community_posts
      add constraint community_posts_emotion_id_unique unique (emotion_id);
  end if;
end $$;

-- ============================================
-- 4. RLS (Row Level Security) 정책 설정
-- ============================================

-- RLS 활성화
alter table public.community_posts enable row level security;
alter table public.community_likes enable row level security;
alter table public.reports enable row level security;

-- 기존 정책 모두 삭제 (중복 제거)
drop policy if exists "community_posts read all" on public.community_posts;
drop policy if exists "community_posts modify self" on public.community_posts;
drop policy if exists "community_posts read public or self" on public.community_posts;
drop policy if exists "community_posts insert self" on public.community_posts;
drop policy if exists "community_posts update self" on public.community_posts;
drop policy if exists "community_posts delete self" on public.community_posts;

drop policy if exists "community_likes read all" on public.community_likes;
drop policy if exists "community_likes insert self" on public.community_likes;
drop policy if exists "community_likes delete self" on public.community_likes;

drop policy if exists "reports read self" on public.reports;
drop policy if exists "reports insert all" on public.reports;

-- community_posts 정책: 공개글은 누구나 조회, 숨김글은 본인만 조회
create policy "community_posts read public or self"
  on public.community_posts for select
  using (
    (is_public = true and is_hidden = false) or 
    (is_hidden = true and auth.uid() = user_id)
  );

-- community_posts 정책: 본인만 작성 가능
create policy "community_posts insert self"
  on public.community_posts for insert
  with check ( auth.uid() = user_id );

-- community_posts 정책: 본인만 수정 가능
create policy "community_posts update self"
  on public.community_posts for update
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

-- community_posts 정책: 본인만 삭제 가능
create policy "community_posts delete self"
  on public.community_posts for delete
  using ( auth.uid() = user_id );

-- community_likes 정책: 누구나 조회 가능
create policy "community_likes read all"
  on public.community_likes for select
  using (true);

-- community_likes 정책: 본인만 공감 추가 가능
create policy "community_likes insert self"
  on public.community_likes for insert
  with check ( auth.uid() = user_id );

-- community_likes 정책: 본인만 공감 취소 가능
create policy "community_likes delete self"
  on public.community_likes for delete
  using ( auth.uid() = user_id );

-- reports 정책: 본인만 조회 가능
create policy "reports read self"
  on public.reports for select
  using ( auth.uid() = reporter_id );

-- reports 정책: 누구나 신고 가능 (reporter_id는 auth.uid()로 자동 설정)
create policy "reports insert all"
  on public.reports for insert
  with check ( auth.uid() = reporter_id );

-- ============================================
-- 5. 인덱스 생성 (성능 최적화)
-- ============================================

-- community_posts 인덱스
create index if not exists idx_community_posts_user_id on public.community_posts(user_id);
create index if not exists idx_community_posts_created_at on public.community_posts(created_at desc);
create index if not exists idx_community_posts_like_count on public.community_posts(like_count desc);
create index if not exists idx_community_posts_category on public.community_posts(category) where category is not null;
create index if not exists idx_community_posts_is_public on public.community_posts(is_public) where is_public = true;
create index if not exists idx_community_posts_is_hidden on public.community_posts(is_hidden) where is_hidden = true;

-- community_likes 인덱스
create index if not exists idx_community_likes_post_id on public.community_likes(post_id);
create index if not exists idx_community_likes_user_id on public.community_likes(user_id);
create index if not exists idx_community_likes_unique on public.community_likes(post_id, user_id);

-- reports 인덱스
create index if not exists idx_reports_post_id on public.reports(post_id);
create index if not exists idx_reports_reporter_id on public.reports(reporter_id);
create index if not exists idx_reports_status on public.reports(status);

-- ============================================
-- 6. 함수 생성
-- ============================================

-- updated_at 자동 업데이트 함수 (공통 유틸리티)
create or replace function update_updated_at_column()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end; $$ language plpgsql;

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

-- 신고 시 자동 숨김 처리 함수
create or replace function auto_hide_post_on_report()
returns trigger as $$
begin
  -- 신고가 생성되면 해당 게시글을 숨김 처리
  update public.community_posts
  set is_hidden = true
  where id = NEW.post_id;
  return NEW;
end; $$ language plpgsql security definer;

-- emotions → community_posts 동기화 함수
-- emotions.category (영문) → community_posts.emotion_category (영문) + category (한글)
-- TG_OP로 INSERT/UPDATE 분리하여 OLD 참조 안전하게 처리
create or replace function sync_community_post_from_emotion()
returns trigger as $$
declare
  forest_category text; -- 한글 카테고리
  emotion_type_value text;
begin
  -- emotions.category (영문)를 한글 category로 변환
  forest_category := case NEW.category
    when 'daily' then '일상'
    when 'worry' then '고민'
    when 'love' then '연애'
    when 'work' then '회사'
    when 'humor' then '유머'
    when 'growth' then '성장'
    when 'selfcare' then '자기돌봄'
    else null
  end;

  -- emotion_type 또는 main_emotion 컬럼 사용
  -- 실제 스키마에 맞게 조정 (main_emotion 우선, 없으면 emotion_type)
  emotion_type_value := coalesce(NEW.main_emotion, NEW.emotion_type);

  -- INSERT 또는 UPDATE에 따라 분기 처리
  if TG_OP = 'INSERT' then
    -- INSERT: 공개 기록이고 카테고리가 있으면 community_posts에 추가
    if NEW.is_public = true and forest_category is not null then
      insert into public.community_posts (
        emotion_id,
        user_id,
        content,
        emotion_type,
        image_url,
        emotion_category,
        category,
        is_public,
        is_hidden
      ) values (
        NEW.id,
        NEW.user_id,
        NEW.content,
        emotion_type_value,
        NEW.image_url,
        NEW.category, -- 영문 카테고리
        forest_category, -- 한글 카테고리
        true,
        false
      ) on conflict (emotion_id) do update
      set
        content = excluded.content,
        emotion_type = excluded.emotion_type,
        image_url = excluded.image_url,
        emotion_category = excluded.emotion_category,
        category = excluded.category,
        is_public = excluded.is_public,
        is_hidden = excluded.is_hidden,
        updated_at = now();
    end if;
    
  elsif TG_OP = 'UPDATE' then
    -- UPDATE: 공개에서 비공개로 변경되면 community_posts에서 삭제
    if OLD.is_public = true and (NEW.is_public = false or forest_category is null) then
      delete from public.community_posts where emotion_id = NEW.id;
      
    -- UPDATE: 공개 기록이 업데이트되면 community_posts도 업데이트
    elsif NEW.is_public = true and forest_category is not null then
      insert into public.community_posts (
        emotion_id,
        user_id,
        content,
        emotion_type,
        image_url,
        emotion_category,
        category,
        is_public,
        is_hidden
      ) values (
        NEW.id,
        NEW.user_id,
        NEW.content,
        emotion_type_value,
        NEW.image_url,
        NEW.category, -- 영문 카테고리
        forest_category, -- 한글 카테고리
        true,
        false
      ) on conflict (emotion_id) do update
      set
        content = excluded.content,
        emotion_type = excluded.emotion_type,
        image_url = excluded.image_url,
        emotion_category = excluded.emotion_category,
        category = excluded.category,
        is_public = excluded.is_public,
        is_hidden = excluded.is_hidden,
        updated_at = now();
    end if;
  end if;
  
  return NEW;
end; $$ language plpgsql security definer;

-- ============================================
-- 7. 트리거 생성 (단 하나만)
-- ============================================

-- like_count 자동 업데이트 트리거
drop trigger if exists update_like_count_on_like on public.community_likes;
create trigger update_like_count_on_like
  after insert or delete on public.community_likes
  for each row execute function update_post_like_count();

-- updated_at 자동 업데이트 트리거
drop trigger if exists update_community_posts_updated_at on public.community_posts;
create trigger update_community_posts_updated_at
  before update on public.community_posts
  for each row execute function update_updated_at_column();

-- 신고 시 자동 숨김 처리 트리거
drop trigger if exists trigger_auto_hide_post_on_report on public.reports;
create trigger trigger_auto_hide_post_on_report
  after insert on public.reports
  for each row execute function auto_hide_post_on_report();

-- emotions → community_posts 동기화 트리거 (단 하나만)
drop trigger if exists sync_community_post_trigger on public.emotions;
create trigger sync_community_post_trigger
  after insert or update on public.emotions
  for each row execute function sync_community_post_from_emotion();

-- ============================================
-- 완료
-- ============================================

