-- ============================================
-- 공감숲 설정 검증 SQL
-- ============================================

-- 1. 트리거 확인 (1개만 있어야 함)
select 
  trigger_name,
  event_manipulation,
  action_statement
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table = 'emotions'
  and trigger_name like '%community_post%'
order by trigger_name;

-- 예상 결과: sync_community_post_trigger 1개만 존재

-- ============================================
-- 2. emotion_id unique index 확인
-- ============================================

select 
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'community_posts'
  and indexname = 'community_posts_emotion_id_key';

-- 예상 결과: community_posts_emotion_id_key unique index 존재

-- ============================================
-- 3. community_posts 테이블 스키마 확인
-- ============================================

select 
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'community_posts'
order by ordinal_position;

-- 예상 결과: category, is_public, is_hidden 컬럼 존재 (category_id 없음)

-- ============================================
-- 4. 트리거 함수 확인 (category 사용 여부)
-- ============================================

select 
  proname as function_name,
  prosrc as function_body
from pg_proc
where proname = 'sync_community_post_from_emotion';

-- 예상 결과: NEW.category 사용 (NEW.category_id 없음)

-- ============================================
-- 5. 테스트: emotions 기록을 공개로 변경하여 community_posts 생성 확인
-- ============================================

-- 최신 emotions 1개 조회
select 
  id,
  user_id,
  category,
  is_public,
  is_hidden,
  content
from public.emotions
order by created_at desc
limit 1;

-- 위에서 조회한 id를 사용하여 공개로 변경 (실제 테스트 시 id 값 수정 필요)
-- update public.emotions
-- set is_public = true, category = 'daily'
-- where id = '위에서-조회한-id-값';

-- community_posts에 생성되었는지 확인
select 
  cp.id,
  cp.emotion_id,
  cp.category,
  cp.is_public,
  cp.is_hidden,
  cp.content,
  e.category as emotion_category,
  e.is_public as emotion_is_public
from public.community_posts cp
join public.emotions e on cp.emotion_id = e.id
order by cp.created_at desc
limit 10;

-- 예상 결과:
-- - category가 한글('일상', '고민' 등)로 저장됨
-- - emotion_category는 영문('daily', 'worry' 등)
-- - is_public = true, is_hidden = false

-- ============================================
-- 6. 카테고리 매핑 확인
-- ============================================

select distinct
  e.category as emotion_category_영문,
  cp.category as community_post_category_한글,
  count(*) as count
from public.emotions e
join public.community_posts cp on e.id = cp.emotion_id
where e.category is not null
group by e.category, cp.category
order by e.category;

-- 예상 결과:
-- daily -> 일상
-- worry -> 고민
-- love -> 연애
-- work -> 회사
-- humor -> 유머
-- growth -> 성장
-- selfcare -> 자기돌봄

-- ============================================
-- 7. 중복 데이터 확인 (emotion_id 기준)
-- ============================================

select 
  emotion_id,
  count(*) as duplicate_count
from public.community_posts
where emotion_id is not null
group by emotion_id
having count(*) > 1;

-- 예상 결과: 0 rows (중복 없음)

-- ============================================
-- 8. RLS 정책 확인
-- ============================================

select 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('community_posts', 'community_likes', 'reports')
order by tablename, policyname;

-- 예상 결과: 각 테이블마다 적절한 정책이 존재

-- ============================================
-- 9. 인덱스 확인
-- ============================================

select 
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('community_posts', 'community_likes', 'reports')
order by tablename, indexname;

-- 예상 결과: 필요한 인덱스들이 모두 존재

