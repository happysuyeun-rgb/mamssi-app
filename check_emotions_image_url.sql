-- emotions 테이블의 image_url 컬럼 확인 및 수정 스크립트

-- 1. 현재 스키마 확인
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'emotions' 
  AND column_name = 'image_url';

-- 2. image_url 컬럼이 없으면 추가
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'emotions' 
          AND column_name = 'image_url'
    ) THEN
        ALTER TABLE emotions 
        ADD COLUMN image_url TEXT;
        
        RAISE NOTICE 'image_url 컬럼이 추가되었습니다.';
    ELSE
        RAISE NOTICE 'image_url 컬럼이 이미 존재합니다.';
    END IF;
END $$;

-- 3. image_url 컬럼이 NOT NULL이면 NULL 허용으로 변경
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'emotions' 
          AND column_name = 'image_url'
          AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE emotions 
        ALTER COLUMN image_url DROP NOT NULL;
        
        RAISE NOTICE 'image_url 컬럼이 NULL을 허용하도록 변경되었습니다.';
    ELSE
        RAISE NOTICE 'image_url 컬럼이 이미 NULL을 허용합니다.';
    END IF;
END $$;

-- 4. 최종 스키마 확인
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'emotions' 
  AND column_name = 'image_url';

-- 5. RLS 정책 확인 (INSERT, UPDATE)
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'emotions'
  AND (cmd = 'INSERT' OR cmd = 'UPDATE')
ORDER BY cmd, policyname;
