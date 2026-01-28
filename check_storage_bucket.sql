-- ============================================
-- profile-images Storage 버킷 확인 및 생성
-- ============================================

-- 1. 버킷 존재 여부 확인
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at,
  updated_at
FROM storage.buckets
WHERE id = 'profile-images';

-- 2. 버킷이 없으면 생성
-- 주의: storage.buckets 테이블에 직접 INSERT하는 것은 권한 문제로 실패할 수 있습니다.
-- 이 경우 Supabase Dashboard의 Storage UI에서 수동으로 생성해야 합니다.
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

-- 3. RLS 정책 확인
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

-- 4. 버킷이 없고 INSERT가 실패한 경우
-- Supabase Dashboard > Storage > New bucket에서 수동으로 생성하세요:
-- - Name: profile-images
-- - Public bucket: ON
-- - File size limit: 5242880 (5MB)
-- - Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp, image/gif
