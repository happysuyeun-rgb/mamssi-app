-- ============================================
-- 공감숲 category_id → category 마이그레이션
-- ============================================

-- 1. category 컬럼 추가 (category_id가 없으면)
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
      and table_name = 'community_posts' 
      and column_name = 'category'
  ) then
    alter table public.community_posts 
      add column category text;
  end if;
end $$;

-- 2. category_id 값을 category로 변환 (기존 데이터 마이그레이션)
-- emotions.category_id (영문) → community_posts.category (한글) 변환
update public.community_posts cp
set category = case e.category_id
  when 'daily' then '일상'
  when 'worry' then '고민'
  when 'love' then '연애'
  when 'work' then '회사'
  when 'humor' then '유머'
  when 'growth' then '성장'
  when 'selfcare' then '자기돌봄'
  else null
end
from public.emotions e
where cp.emotion_id = e.id
  and cp.category is null
  and e.category_id is not null;

-- 3. category 인덱스 생성/재생성
drop index if exists idx_community_posts_category_id;
create index if not exists idx_community_posts_category 
  on public.community_posts(category) 
  where category is not null;

-- 4. emotion_id unique constraint 추가 (on conflict 사용을 위해)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.community_posts'::regclass
      and conname = 'community_posts_emotion_id_key'
  ) then
    create unique index community_posts_emotion_id_key 
      on public.community_posts(emotion_id) 
      where emotion_id is not null;
  end if;
end $$;

-- 5. 트리거 함수 업데이트 (category_id → category 변환 포함)
-- 참고: emotions 테이블의 실제 컬럼명은 main_emotion 또는 emotion_type일 수 있습니다.
-- 실제 스키마에 맞게 수정이 필요할 수 있습니다.
create or replace function sync_community_post_from_emotion()
returns trigger as $$
declare
  forest_category text;
  emotion_type_value text;
begin
  -- category_id를 한글 category로 변환
  forest_category := case NEW.category_id
    when 'daily' then '일상'
    when 'worry' then '고민'
    when 'love' then '연애'
    when 'work' then '회사'
    when 'humor' then '유머'
    when 'growth' then '성장'
    when 'selfcare' then '자기돌봄'
    else null
  end;

  -- emotion_type 또는 main_emotion 컬럼 사용 (실제 스키마에 맞게 조정 필요)
  -- useEmotions.ts에서 main_emotion을 사용하므로 main_emotion 우선 시도
  begin
    emotion_type_value := NEW.main_emotion;
  exception when undefined_column then
    emotion_type_value := NEW.emotion_type;
  end;

  if NEW.is_public = true and forest_category is not null then
    -- INSERT: 공개 기록이 생성될 때 community_posts에 추가
    insert into public.community_posts (
      emotion_id,
      user_id,
      content,
      emotion_type,
      image_url,
      category,
      is_public,
      is_hidden
    ) values (
      NEW.id,
      NEW.user_id,
      NEW.content,
      emotion_type_value,
      NEW.image_url,
      forest_category,
      true,
      false
    ) on conflict (emotion_id) do update
    set
      content = excluded.content,
      emotion_type = excluded.emotion_type,
      image_url = excluded.image_url,
      category = excluded.category,
      updated_at = now();
      
  elsif OLD.is_public = true and (NEW.is_public = false or forest_category is null) then
    -- DELETE: 공개에서 비공개로 변경되면 community_posts에서 삭제
    delete from public.community_posts where emotion_id = NEW.id;
    
  elsif NEW.is_public = true and forest_category is not null then
    -- UPDATE: 공개 기록이 업데이트되면 community_posts도 업데이트
    update public.community_posts
    set
      content = NEW.content,
      emotion_type = emotion_type_value,
      image_url = NEW.image_url,
      category = forest_category,
      updated_at = now()
    where emotion_id = NEW.id;
  end if;
  
  return NEW;
end; $$ language plpgsql security definer;

-- 트리거는 이미 존재하므로 재생성만 필요
drop trigger if exists sync_community_post_trigger on public.emotions;
create trigger sync_community_post_trigger
  after insert or update on public.emotions
  for each row execute function sync_community_post_from_emotion();

