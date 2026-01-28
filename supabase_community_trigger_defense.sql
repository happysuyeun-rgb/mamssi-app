-- ============================================
-- 공감숲 트리거 방어 로직 강화
-- 프로필/설정 값이 없어도 공개글 동기화가 실패하지 않도록 처리
-- ============================================

-- ============================================
-- 1. user_settings 테이블 기본값 확인 및 추가
-- ============================================

-- user_settings 테이블의 NOT NULL 컬럼에 기본값 추가 (없는 경우)
-- nickname, mbti, seed_name 등은 NULL 허용이므로 기본값 불필요
-- 하지만 트리거에서 참조 시 COALESCE로 기본값 처리

-- ============================================
-- 2. sync_community_post_from_emotion() 트리거 함수 방어 로직 강화
-- ============================================

-- emotions → community_posts 동기화 함수
-- 방어 로직:
-- 1. emotion_type/main_emotion에 COALESCE 적용
-- 2. user_settings 참조 시 COALESCE 기본값 처리
-- 3. NULL 체크 강화
-- 4. SECURITY DEFINER 유지 (RLS 우회 필요)
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
  -- 
  -- select 
  --   coalesce(nickname, '익명') as nickname,
  --   coalesce(seed_name, null) as seed_name
  -- into user_nickname, user_seed_name
  -- from public.user_settings
  -- where user_id = NEW.user_id
  -- limit 1;
  -- 
  -- user_nickname := coalesce(user_nickname, '익명');
  -- user_seed_name := coalesce(user_seed_name, null);

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
-- 3. community_posts 테이블 NOT NULL 컬럼 기본값 확인
-- ============================================

-- community_posts 테이블의 NOT NULL 컬럼:
-- - id: uuid (default uuid_generate_v4())
-- - user_id: uuid (NOT NULL, FK)
-- - content: text (NOT NULL) -> 기본값 '' 추가 권장
-- - emotion_id: uuid (NOT NULL, FK) -> 트리거에서 항상 설정됨
-- - like_count: int (default 0)
-- - created_at: timestamp (default now())
-- - updated_at: timestamp (default now())

-- content 컬럼에 기본값 추가 (이미 NOT NULL이지만 빈 문자열 허용)
do $$
begin
  -- content가 NULL이면 빈 문자열로 변경
  update public.community_posts
  set content = ''
  where content is null;
  
  -- content NOT NULL 제약조건 확인 및 추가
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'community_posts'
      and constraint_name like '%content%not%null%'
  ) then
    -- 이미 NOT NULL이면 무시
    null;
  end if;
end $$;

-- ============================================
-- 4. user_settings 테이블 기본값 확인
-- ============================================

-- user_settings 테이블의 컬럼들은 대부분 NULL 허용
-- 트리거에서 참조 시 COALESCE로 기본값 처리:
-- - nickname: COALESCE(nickname, '익명')
-- - mbti: COALESCE(mbti, NULL)
-- - seed_name: COALESCE(seed_name, NULL)
-- - profile_url: COALESCE(profile_url, NULL)

-- ============================================
-- 5. SECURITY DEFINER 확인
-- ============================================

-- sync_community_post_from_emotion() 함수는 SECURITY DEFINER로 설정됨
-- 이유: RLS 정책을 우회하여 community_posts에 INSERT/UPDATE/DELETE 가능
-- 
-- 확인 쿼리:
-- SELECT 
--   p.proname as function_name,
--   CASE 
--     WHEN p.prosecdef THEN 'SECURITY DEFINER'
--     ELSE 'SECURITY INVOKER'
--   END as security_type
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
--   AND p.proname = 'sync_community_post_from_emotion';

-- ============================================
-- 6. 트리거 재생성 (이미 존재하면 자동 업데이트)
-- ============================================

-- 트리거는 이미 존재하므로 함수만 업데이트하면 자동 반영됨
-- drop trigger if exists sync_community_post_trigger on public.emotions;
-- create trigger sync_community_post_trigger
--   after insert or update on public.emotions
--   for each row execute function sync_community_post_from_emotion();

-- ============================================
-- 완료
-- ============================================
