-- ============================================
-- profile-images Storage 버킷 생성 및 RLS 정책 설정
-- ============================================

-- 1. 버킷 생성 (이미 존재하면 무시)
-- 주의: Supabase Dashboard의 Storage 섹션에서 수동으로 생성하거나 아래 SQL 실행
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-images',
  'profile-images',
  true,  -- public 버킷 (프로필 이미지는 공개)
  5242880,  -- 5MB 제한
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE 
SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- 2. 기존 RLS 정책 삭제 (재생성을 위해)
DROP POLICY IF EXISTS "Profile images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own profile image" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile image" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile image" ON storage.objects;

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
      AND policyname LIKE '%profile%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
  END LOOP;
END $$;

-- 3. RLS 정책 생성

-- SELECT 정책: 모든 사용자가 프로필 이미지 조회 가능 (public bucket)
CREATE POLICY "Profile images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-images');

-- INSERT 정책: 본인만 프로필 이미지 업로드 가능
-- 경로 규칙: profile-images/{userId}/{filename}
CREATE POLICY "Users can upload their own profile image"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-images' 
    AND (string_to_array(name, '/'))[1] = auth.uid()::text
  );

-- UPDATE 정책: 본인만 프로필 이미지 수정 가능
CREATE POLICY "Users can update their own profile image"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-images' 
    AND (string_to_array(name, '/'))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'profile-images' 
    AND (string_to_array(name, '/'))[1] = auth.uid()::text
  );

-- DELETE 정책: 본인만 프로필 이미지 삭제 가능
CREATE POLICY "Users can delete their own profile image"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-images' 
    AND (string_to_array(name, '/'))[1] = auth.uid()::text
  );

-- 4. 버킷 확인
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'profile-images';

-- 5. 정책 확인
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%profile%'
ORDER BY policyname;

-- ============================================
-- 완료
-- ============================================
-- 
-- 실행 후:
-- 1. 브라우저를 새로고침하거나 앱을 재시작하세요
-- 2. 프로필 이미지 업로드를 다시 시도하세요
-- 
-- 참고:
-- - 버킷이 이미 존재하는 경우 ON CONFLICT로 업데이트됩니다
-- - 버킷이 없는 경우 새로 생성됩니다
-- - public=true로 설정되어 있어 모든 사용자가 프로필 이미지를 조회할 수 있습니다
