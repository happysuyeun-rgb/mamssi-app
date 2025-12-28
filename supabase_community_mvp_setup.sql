-- ============================================
-- 마음씨(Mamssi) 공감숲(Community) MVP 테이블 설정
-- ============================================

-- community_posts 테이블 수정 (is_public, is_hidden 추가)
alter table if exists public.community_posts 
  add column if not exists is_public boolean default true,
  add column if not exists is_hidden boolean default false;

-- reports 테이블 수정 (reporter_id, status 추가)
alter table if exists public.reports
  add column if not exists reporter_id uuid references auth.users(id) on delete cascade,
  add column if not exists status text default 'pending'; -- pending, resolved, rejected

-- reports 테이블의 user_id를 reporter_id로 마이그레이션 (기존 데이터가 있다면)
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
      and table_name = 'reports' 
      and column_name = 'user_id'
      and column_name != 'reporter_id'
  ) then
    update public.reports
    set reporter_id = user_id
    where reporter_id is null;
  end if;
end $$;

-- RLS 정책 재설정
alter table public.community_posts enable row level security;
alter table public.community_likes enable row level security;
alter table public.reports enable row level security;

-- 기존 정책 삭제
drop policy if exists "community_posts read all" on public.community_posts;
drop policy if exists "community_posts modify self" on public.community_posts;
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

-- community_posts 정책: 본인만 수정/삭제 가능
create policy "community_posts update self"
  on public.community_posts for update
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

create policy "community_posts delete self"
  on public.community_posts for delete
  using ( auth.uid() = user_id );

-- community_likes 정책: 누구나 조회 가능
create policy "community_likes read all"
  on public.community_likes for select
  using (true);

-- community_likes 정책: 본인만 공감 추가/삭제 가능
create policy "community_likes insert self"
  on public.community_likes for insert
  with check ( auth.uid() = user_id );

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

-- 인덱스 추가 (성능 최적화)
create index if not exists idx_community_posts_is_public on public.community_posts(is_public) where is_public = true;
create index if not exists idx_community_posts_is_hidden on public.community_posts(is_hidden) where is_hidden = true;
create index if not exists idx_reports_reporter_id on public.reports(reporter_id);
create index if not exists idx_reports_status on public.reports(status);

-- 신고 시 자동 숨김 처리 함수 (MVP: 1회 신고 시 is_hidden=true)
create or replace function auto_hide_post_on_report()
returns trigger as $$
begin
  -- 신고가 생성되면 해당 게시글을 숨김 처리
  update public.community_posts
  set is_hidden = true
  where id = NEW.post_id;
  return NEW;
end;
$$ language plpgsql security definer;

-- 신고 트리거
drop trigger if exists trigger_auto_hide_post_on_report on public.reports;
create trigger trigger_auto_hide_post_on_report
  after insert on public.reports
  for each row execute function auto_hide_post_on_report();


