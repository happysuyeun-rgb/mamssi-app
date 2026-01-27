-- ============================================
-- user_settings 테이블 RLS 정책 확인 및 수정
-- ============================================

-- 1. 현재 RLS 정책 확인
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_settings'
ORDER BY policyname;

-- 2. RLS 활성화 상태 확인
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'user_settings';

-- 3. 테이블 구조 확인
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_settings'
ORDER BY ordinal_position;

-- 4. 기존 정책 모두 삭제 (재생성을 위해)
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

-- 5. RLS 활성화 확인
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- 6. 표준화된 RLS 정책 생성

-- SELECT 정책: 본인만 조회 가능
CREATE POLICY "user_settings_select"
  ON public.user_settings
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT 정책: 본인만 생성 가능
-- upsert 사용 시 필수: 레코드가 없을 때 INSERT가 발생
CREATE POLICY "user_settings_insert"
  ON public.user_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE 정책: 본인만 수정 가능
-- upsert 사용 시 필수: 레코드가 있을 때 UPDATE가 발생
CREATE POLICY "user_settings_update"
  ON public.user_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE 정책: 본인만 삭제 가능 (필요한 경우)
CREATE POLICY "user_settings_delete"
  ON public.user_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- 7. 정책 확인 (재확인)
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_settings'
ORDER BY policyname;

-- 8. 테스트 쿼리 (현재 사용자 기준)
-- 주의: 이 쿼리는 Supabase Dashboard의 SQL Editor에서 실행해야 합니다.
-- 브라우저에서는 auth.uid()가 자동으로 설정됩니다.

-- SELECT 테스트
SELECT * FROM user_settings WHERE user_id = auth.uid();

-- INSERT 테스트 (레코드가 없는 경우)
INSERT INTO user_settings (user_id, seed_name, updated_at)
VALUES (auth.uid(), '테스트', now())
ON CONFLICT (user_id) DO UPDATE 
SET seed_name = EXCLUDED.seed_name, updated_at = now();

-- UPDATE 테스트
UPDATE user_settings 
SET seed_name = '테스트2', updated_at = now()
WHERE user_id = auth.uid();

-- 9. seed_name 컬럼 확인
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_settings'
  AND column_name = 'seed_name';

-- seed_name 컬럼이 없으면 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_settings' 
      AND column_name = 'seed_name'
  ) THEN
    ALTER TABLE public.user_settings 
    ADD COLUMN seed_name text;
    
    COMMENT ON COLUMN public.user_settings.seed_name IS '씨앗 이름 (10자 이내)';
    
    RAISE NOTICE 'seed_name 컬럼이 추가되었습니다.';
  ELSE
    RAISE NOTICE 'seed_name 컬럼이 이미 존재합니다.';
  END IF;
END $$;
