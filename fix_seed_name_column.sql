-- ============================================
-- seed_name 컬럼 추가 및 스키마 캐시 갱신
-- ============================================

-- 1. seed_name 컬럼 존재 여부 확인
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_settings' 
      AND column_name = 'seed_name'
  ) THEN
    -- 컬럼이 없으면 추가
    ALTER TABLE public.user_settings 
    ADD COLUMN seed_name text;
    
    RAISE NOTICE 'seed_name 컬럼이 추가되었습니다.';
  ELSE
    RAISE NOTICE 'seed_name 컬럼이 이미 존재합니다.';
  END IF;
END $$;

-- 2. 컬럼 주석 추가
COMMENT ON COLUMN public.user_settings.seed_name IS '씨앗 이름 (10자 이내)';

-- 3. RLS 정책 확인 및 재생성 (필요한 경우)
-- 기존 정책 삭제
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

-- RLS 활성화
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- SELECT 정책: 본인만 조회 가능
CREATE POLICY "user_settings_select"
  ON public.user_settings
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT 정책: 본인만 생성 가능
CREATE POLICY "user_settings_insert"
  ON public.user_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE 정책: 본인만 수정 가능
CREATE POLICY "user_settings_update"
  ON public.user_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE 정책: 본인만 삭제 가능
CREATE POLICY "user_settings_delete"
  ON public.user_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- 4. 컬럼 확인 쿼리
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_settings'
  AND column_name = 'seed_name';

-- 5. 테스트 쿼리 (현재 사용자 기준)
-- 주의: 이 쿼리는 Supabase Dashboard의 SQL Editor에서 실행해야 합니다.
-- SELECT * FROM user_settings WHERE user_id = auth.uid();

-- ============================================
-- 완료
-- ============================================
-- 
-- 실행 후:
-- 1. Supabase Dashboard에서 이 SQL을 실행하세요
-- 2. 브라우저를 새로고침하거나 앱을 재시작하세요
-- 3. 씨앗 이름 저장을 다시 시도하세요
