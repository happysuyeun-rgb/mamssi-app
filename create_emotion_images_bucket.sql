-- ============================================
-- emotion-images Storage 버킷 생성 및 RLS 정책 설정
-- ============================================

-- 1. 버킷 생성 (이미 존재하면 무시)
-- 주의: Supabase Dashboard의 Storage 섹션에서 수동으로 생성하거나 아래 SQL 실행
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'emotion-images',
  'emotion-images',
  true,  -- public 버킷 (감정 기록 이미지는 공개)
  10485760,  -- 10MB 제한
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE 
SET 
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- 2. 기존 RLS 정책 삭제 (재생성을 위해)
DROP POLICY IF EXISTS "Emotion images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own emotion images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own emotion images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own emotion images" ON storage.objects;

-- 추가로 존재할 수 있는 다른 이름의 정책들도 삭제
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname LIKE '%emotion%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
  END LOOP;
END $$;

-- 3. RLS 정책 생성

-- SELECT 정책: 모든 사용자가 조회 가능 (공개 이미지)
CREATE POLICY "Emotion images are publicly accessible"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'emotion-images');

-- INSERT 정책: 본인만 업로드 가능
-- 경로 규칙: {userId}/{uuid}.{extension}
CREATE POLICY "Users can upload their own emotion images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'emotion-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- UPDATE 정책: 본인만 수정 가능
CREATE POLICY "Users can update their own emotion images"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'emotion-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'emotion-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE 정책: 본인만 삭제 가능
CREATE POLICY "Users can delete their own emotion images"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'emotion-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. 정책 확인
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%emotion%'
ORDER BY policyname;

-- ============================================
-- 완료
-- ============================================
-- 
-- 이 스크립트는 다음을 수행합니다:
-- 1. emotion-images 버킷 생성 (public, 10MB 제한)
-- 2. RLS 정책 설정:
--    - SELECT: 모든 사용자 조회 가능 (공개)
--    - INSERT: 본인만 업로드 가능 (경로: {userId}/{filename})
--    - UPDATE: 본인만 수정 가능
--    - DELETE: 본인만 삭제 가능
--
-- 실행 후 감정 기록 이미지 업로드를 다시 시도해보세요.
