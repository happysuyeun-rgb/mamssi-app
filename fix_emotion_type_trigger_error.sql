-- ============================================
-- sync_community_post_from_emotion 트리거 함수 수정
-- emotion_type 필드 참조 제거 (DB 스키마에는 main_emotion만 존재)
-- ============================================

-- 트리거 함수 재생성 (NEW.emotion_type 참조 제거)
create or replace function sync_community_post_from_emotion()
returns trigger as $$
declare
  forest_category text; -- 한글 카테고리
  emotion_type_value text;
  -- user_settings 참조 변수 (필요 시 사용)
  user_nickname text;
  user_seed_name text;
begin
  -- ============================================
  -- 1. emotion_type/main_emotion COALESCE 처리
  -- ============================================
  -- DB 스키마: main_emotion만 사용 (emotion_type 컬럼은 존재하지 않음)
  emotion_type_value := coalesce(NEW.main_emotion, '감정');

  -- ============================================
  -- 2. emotions.category (영문)를 한글 category로 변환
  -- ============================================
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

  -- ============================================
  -- 3. user_settings 참조 (필요 시, 방어적으로)
  -- ============================================
  -- 현재는 community_posts에 nickname/seed_name을 저장하지 않지만,
  -- 향후 확장을 위해 방어적으로 처리
  -- user_settings는 트리거에서 직접 참조하지 않으므로 주석 처리

  -- ============================================
  -- 4. INSERT 또는 UPDATE에 따라 분기 처리
  -- ============================================
  if TG_OP = 'INSERT' then
    -- INSERT: 공개 기록이고 카테고리가 있으면 community_posts에 추가
    if coalesce(NEW.is_public, false) = true and forest_category is not null then
      begin
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
          coalesce(NEW.content, ''),
          emotion_type_value,
          NEW.image_url, -- NULL 허용
          NEW.category, -- 영문 카테고리 (NULL 허용)
          forest_category, -- 한글 카테고리
          true,
          false
        ) on conflict (emotion_id) do update
        set
          content = coalesce(excluded.content, ''),
          emotion_type = coalesce(excluded.emotion_type, '감정'),
          image_url = excluded.image_url,
          emotion_category = excluded.emotion_category,
          category = excluded.category,
          is_public = excluded.is_public,
          is_hidden = excluded.is_hidden,
          updated_at = now();
      exception
        when others then
          -- 트리거 실패 시 로깅 (PostgreSQL 로그에 기록)
          raise warning 'sync_community_post_from_emotion INSERT 실패: %', SQLERRM;
          -- 실패해도 emotions INSERT는 계속 진행 (트리거는 AFTER이므로)
      end;
    end if;
    
  elsif TG_OP = 'UPDATE' then
    -- UPDATE: 공개에서 비공개로 변경되면 community_posts에서 삭제
    if coalesce(OLD.is_public, false) = true and (coalesce(NEW.is_public, false) = false or forest_category is null) then
      begin
        delete from public.community_posts where emotion_id = NEW.id;
      exception
        when others then
          raise warning 'sync_community_post_from_emotion DELETE 실패: %', SQLERRM;
      end;
      
    -- UPDATE: 공개 기록이 업데이트되면 community_posts도 업데이트
    elsif coalesce(NEW.is_public, false) = true and forest_category is not null then
      begin
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
          coalesce(NEW.content, ''),
          emotion_type_value,
          NEW.image_url,
          NEW.category, -- 영문 카테고리
          forest_category, -- 한글 카테고리
          true,
          false
        ) on conflict (emotion_id) do update
        set
          content = coalesce(excluded.content, ''),
          emotion_type = coalesce(excluded.emotion_type, '감정'),
          image_url = excluded.image_url,
          emotion_category = excluded.emotion_category,
          category = excluded.category,
          is_public = excluded.is_public,
          is_hidden = excluded.is_hidden,
          updated_at = now();
      exception
        when others then
          raise warning 'sync_community_post_from_emotion UPDATE 실패: %', SQLERRM;
      end;
    end if;
  end if;
  
  return NEW;
end; $$ language plpgsql security definer;

-- ============================================
-- 완료
-- ============================================
-- 
-- 실행 후:
-- 1. 브라우저를 새로고침하거나 앱을 재시작하세요
-- 2. 기록 저장을 다시 시도하세요
-- 
-- 변경 사항:
-- - NEW.emotion_type 참조 제거 (DB 스키마에 존재하지 않음)
-- - NEW.main_emotion만 사용하도록 수정
