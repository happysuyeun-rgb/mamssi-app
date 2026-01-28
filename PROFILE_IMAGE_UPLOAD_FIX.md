# 프로필 이미지 업로드 오류 해결 가이드

## 🔴 에러 메시지
```
Storage 버킷 'profile-images'이 존재하지 않아요. Supabase Dashboard에서 버킷을 생성해주세요.
```

## 원인
Supabase Storage에 `profile-images` 버킷이 생성되지 않았습니다.

## 해결 방법

### 방법 1: SQL Editor에서 실행 (권장)

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard 접속
   - 프로젝트 선택

2. **SQL Editor 열기**
   - 왼쪽 메뉴에서 "SQL Editor" 클릭
   - "New query" 클릭

3. **버킷 생성 SQL 실행**
   - `create_profile_images_bucket.sql` 파일의 전체 내용을 복사
   - SQL Editor에 붙여넣기
   - "Run" 버튼 클릭 (또는 `Ctrl+Enter`)

4. **실행 결과 확인**
   - 성공 메시지 확인
   - 에러가 발생하면 에러 메시지를 확인하세요

### 방법 2: Storage UI에서 수동 생성

1. **Supabase Dashboard → Storage 클릭**
   - 왼쪽 메뉴에서 "Storage" 클릭

2. **"New bucket" 클릭**
   - 오른쪽 상단의 "New bucket" 버튼 클릭

3. **버킷 설정**
   - **Name**: `profile-images`
   - **Public bucket**: 체크 (ON) ✅
   - **File size limit**: `5242880` (5MB)
   - **Allowed MIME types**: `image/jpeg, image/jpg, image/png, image/webp, image/gif`

4. **"Create bucket" 클릭**

5. **RLS 정책 설정**
   - Storage UI에서 버킷을 생성한 후, RLS 정책을 설정해야 합니다
   - `create_profile_images_bucket.sql` 파일의 RLS 정책 부분을 실행하세요

## RLS 정책 설정

버킷 생성 후 다음 RLS 정책을 설정해야 합니다:

```sql
-- SELECT 정책: 모든 사용자가 프로필 이미지 조회 가능 (public bucket)
CREATE POLICY "Profile images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-images');

-- INSERT 정책: 본인만 프로필 이미지 업로드 가능
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
```

## 확인 방법

### 1. 버킷 확인
```sql
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'profile-images';
```

### 2. RLS 정책 확인
```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%profile%'
ORDER BY policyname;
```

다음 정책이 모두 존재해야 합니다:
- `Profile images are publicly accessible` (SELECT)
- `Users can upload their own profile image` (INSERT)
- `Users can update their own profile image` (UPDATE)
- `Users can delete their own profile image` (DELETE)

## 테스트

1. 브라우저를 새로고침하거나 앱을 재시작
2. 프로필 설정 화면에서 프로필 이미지 업로드 시도
3. 이미지가 정상적으로 업로드되는지 확인

## 참고 파일

- `create_profile_images_bucket.sql`: 버킷 생성 및 RLS 정책 설정 SQL
- `src/utils/profileImageUpload.ts`: 프로필 이미지 업로드 로직
