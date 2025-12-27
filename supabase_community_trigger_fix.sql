-- ============================================
-- 공감숲 동기화 트리거 수정
-- emotions 테이블의 main_emotion 컬럼 사용
-- ============================================

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
      NEW.main_emotion, -- emotion_type → main_emotion으로 수정
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
      emotion_type = NEW.main_emotion, -- emotion_type → main_emotion으로 수정
      image_url = NEW.image_url,
      category_id = NEW.category_id
    where emotion_id = NEW.id;
  end if;
  return NEW;
end; $$ language plpgsql security definer;

-- 트리거는 이미 존재하므로 재생성만 필요
-- drop trigger if exists sync_community_post_trigger on public.emotions;
-- create trigger sync_community_post_trigger
--   after insert or update on public.emotions
--   for each row execute function sync_community_post_from_emotion();

