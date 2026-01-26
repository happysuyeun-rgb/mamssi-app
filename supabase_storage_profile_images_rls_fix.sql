-- ============================================
-- 프로필 이미지 Storage Bucket RLS 정책 수정
-- 경로 규칙: profile-images/{userId}/{filename}
-- Public URL 사용 (프로필 이미지는 공개)
-- ============================================

-- Bucket 생성 (이미 존재하면 무시, public=true로 설정)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Profile images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own profile image" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile image" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile image" ON storage.objects;

-- SELECT 정책: 모든 사용자가 프로필 이미지 조회 가능 (public bucket)
-- 경로 형식: profile-images/{userId}/{filename}
CREATE POLICY "Profile images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-images');

-- INSERT 정책: 본인만 프로필 이미지 업로드 가능
-- 경로 형식: profile-images/{userId}/{filename}
-- name에서 첫 번째 폴더명이 user_id와 일치해야 함
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

-- 정책 확인 쿼리 (실행 후 확인용)
-- SELECT 
--   policyname,
--   cmd,
--   qual,
--   with_check
-- FROM pg_policies
-- WHERE schemaname = 'storage' 
--   AND tablename = 'objects'
--   AND policyname LIKE '%profile%'
-- ORDER BY policyname;
