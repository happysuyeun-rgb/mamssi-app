-- ============================================
-- user_settings 테이블 RLS 정책 수정
-- "new row violates row-level security policy" 에러 해결
-- ============================================

-- 기존 정책 모두 삭제 (재생성을 위해)
DROP POLICY IF EXISTS "user_settings self only" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_select" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_update" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_insert" ON public.user_settings;

-- SELECT 정책: 본인만 조회 가능
-- using: 조회할 때 조건 체크
CREATE POLICY "user_settings_select"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT 정책: 본인만 생성 가능
-- with check: INSERT 시 새로 생성되는 row의 조건 체크
CREATE POLICY "user_settings_insert"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE 정책: 본인만 수정 가능
-- using: 기존 row를 수정할 수 있는지 체크 (WHERE 조건)
-- with check: 수정 후 row가 만족해야 할 조건 체크
CREATE POLICY "user_settings_update"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 정책 확인 쿼리 (실행 후 확인용)
-- SELECT 
--   schemaname,
--   tablename,
--   policyname,
--   permissive,
--   roles,
--   cmd,
--   qual,
--   with_check
-- FROM pg_policies
-- WHERE tablename = 'user_settings';

