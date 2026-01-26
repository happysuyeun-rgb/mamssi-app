-- ============================================
-- user_settings 테이블 RLS 정책 통합 및 정리
-- 중복 정책 제거, 표준화된 정책 1세트로 통일
-- ============================================

-- ============================================
-- 1. 기존 모든 정책 삭제 (중복 제거)
-- ============================================

-- 모든 가능한 정책 이름 삭제
DROP POLICY IF EXISTS "user_settings self only" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_select" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_update" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_insert" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_delete" ON public.user_settings;

-- 추가로 존재할 수 있는 다른 이름의 정책들도 삭제
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_settings'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_settings', policy_record.policyname);
  END LOOP;
END $$;

-- ============================================
-- 2. RLS 활성화 확인
-- ============================================

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. 표준화된 RLS 정책 생성 (1세트만)
-- ============================================

-- SELECT 정책: 본인만 조회 가능
-- using: auth.uid() = user_id
CREATE POLICY "user_settings_select"
  ON public.user_settings
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT 정책: 본인만 생성 가능
-- with check: auth.uid() = user_id
CREATE POLICY "user_settings_insert"
  ON public.user_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE 정책: 본인만 수정 가능
-- using: auth.uid() = user_id (기존 행 확인)
-- with check: auth.uid() = user_id (새 행 확인)
CREATE POLICY "user_settings_update"
  ON public.user_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE 정책: 본인만 삭제 가능 (필요한 경우)
-- using: auth.uid() = user_id
CREATE POLICY "user_settings_delete"
  ON public.user_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 4. 정책 확인 쿼리
-- ============================================

-- 생성된 정책 확인
-- SELECT 
--   policyname,
--   cmd,
--   qual,
--   with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename = 'user_settings'
-- ORDER BY policyname;

-- ============================================
-- 완료
-- ============================================
-- 
-- 정책 요약:
-- 1. SELECT: 본인만 조회 (using: auth.uid() = user_id)
-- 2. INSERT: 본인만 생성 (with check: auth.uid() = user_id)
-- 3. UPDATE: 본인만 수정 (using + with check: auth.uid() = user_id)
-- 4. DELETE: 본인만 삭제 (using: auth.uid() = user_id)
--
-- 모든 정책은 auth.uid() = user_id로 표준화됨
-- 중복 정책은 모두 제거되고 1세트만 유지됨
