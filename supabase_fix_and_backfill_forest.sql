-- ============================================
-- 1) 트리거 수정 (emotion_type 오류 방지)
--    emotions 테이블에는 main_emotion만 있으므로 여기만 사용
-- ============================================
create or replace function sync_community_post_from_emotion()
returns trigger as $$
declare
  forest_category text;
begin
  forest_category := case coalesce(NEW.category, '')
    when 'daily' then '일상'
    when 'worry' then '고민'
    when 'love' then '연애'
    when 'work' then '회사'
    when 'humor' then '유머'
    when 'growth' then '성장'
    when 'selfcare' then '자기돌봄'
    else null
  end;

  if TG_OP = 'INSERT' then
    if coalesce(NEW.is_public, false) = true and forest_category is not null then
      begin
        insert into public.community_posts (
          emotion_id, user_id, content, image_url,
          emotion_category, category, is_public, is_hidden
        ) values (
          NEW.id, NEW.user_id, coalesce(NEW.content, ''),
          NEW.image_url,
          NEW.category, forest_category, true, false
        ) on conflict (emotion_id) do update set
          content = coalesce(excluded.content, ''),
          image_url = excluded.image_url,
          emotion_category = excluded.emotion_category,
          category = excluded.category,
          is_public = excluded.is_public,
          is_hidden = excluded.is_hidden,
          updated_at = now();
      exception when others then
        raise warning 'sync_community_post_from_emotion INSERT 실패: %', SQLERRM;
      end;
    end if;

  elsif TG_OP = 'UPDATE' then
    if coalesce(OLD.is_public, false) = true and (coalesce(NEW.is_public, false) = false or forest_category is null) then
      begin
        delete from public.community_posts where emotion_id = NEW.id;
      exception when others then
        raise warning 'sync_community_post_from_emotion DELETE 실패: %', SQLERRM;
      end;
    elsif coalesce(NEW.is_public, false) = true and forest_category is not null then
      begin
        insert into public.community_posts (
          emotion_id, user_id, content, image_url,
          emotion_category, category, is_public, is_hidden
        ) values (
          NEW.id, NEW.user_id, coalesce(NEW.content, ''),
          NEW.image_url,
          NEW.category, forest_category, true, false
        ) on conflict (emotion_id) do update set
          content = coalesce(excluded.content, ''),
          image_url = excluded.image_url,
          emotion_category = excluded.emotion_category,
          category = excluded.category,
          is_public = excluded.is_public,
          is_hidden = excluded.is_hidden,
          updated_at = now();
      exception when others then
        raise warning 'sync_community_post_from_emotion UPDATE 실패: %', SQLERRM;
      end;
    end if;
  end if;
  return NEW;
end; $$ language plpgsql security definer;

-- 트리거가 없으면 생성 (이미 있으면 그대로 둠)
drop trigger if exists sync_community_post_trigger on public.emotions;
create trigger sync_community_post_trigger
  after insert or update on public.emotions
  for each row execute function sync_community_post_from_emotion();


-- ============================================
-- 2) 이미 저장된 공개 기록 → 공감숲에 한 번 넣기 (백필)
--    이미 community_posts에 있는 건 건너뜀
-- ============================================
-- emotion_category 컬럼이 없을 수 있으므로 있으면 추가
alter table if exists public.community_posts
  add column if not exists emotion_category text;

insert into public.community_posts (
  emotion_id, user_id, content, image_url,
  emotion_category, category, is_public, is_hidden
)
select
  e.id,
  e.user_id,
  coalesce(e.content, ''),
  e.image_url,
  e.category,
  case e.category
    when 'daily' then '일상'
    when 'worry' then '고민'
    when 'love' then '연애'
    when 'work' then '회사'
    when 'humor' then '유머'
    when 'growth' then '성장'
    when 'selfcare' then '자기돌봄'
    else null
  end,
  true,
  false
from public.emotions e
left join public.community_posts cp on cp.emotion_id = e.id
where e.is_public = true
  and e.category is not null
  and e.category in ('daily','worry','love','work','humor','growth','selfcare')
  and cp.id is null
on conflict (emotion_id) do update set
  content = coalesce(excluded.content, ''),
  image_url = excluded.image_url,
  emotion_category = excluded.emotion_category,
  category = excluded.category,
  is_public = excluded.is_public,
  is_hidden = excluded.is_hidden,
  updated_at = now();
