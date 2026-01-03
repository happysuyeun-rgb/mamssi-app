-- ============================================
-- 프로필 이미지 Storage Bucket RLS 정책 설정
-- ============================================

-- Bucket 생성 (이미 존재하면 무시)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Profile images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own profile image" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile image" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile image" ON storage.objects;

-- SELECT 정책: 모든 사용자가 프로필 이미지 조회 가능 (public bucket)
CREATE POLICY "Profile images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-images');

-- INSERT 정책: 본인만 프로필 이미지 업로드 가능
-- 파일명 형식: {user_id}.{ext} (예: abc123.jpg)
CREATE POLICY "Users can upload their own profile image"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- UPDATE 정책: 본인만 프로필 이미지 수정 가능
CREATE POLICY "Users can update their own profile image"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'profile-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- DELETE 정책: 본인만 프로필 이미지 삭제 가능
CREATE POLICY "Users can delete their own profile image"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

