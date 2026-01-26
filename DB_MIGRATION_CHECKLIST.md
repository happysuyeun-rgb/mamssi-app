# DB 마이그레이션 체크리스트

## 현재 이슈 해결을 위한 DB 확인 사항

### 1. 씨앗 이름 저장 문제

#### 확인 필요 사항:
- [ ] `user_settings` 테이블에 `seed_name` 컬럼이 존재하는지 확인
- [ ] `seed_name` 컬럼의 데이터 타입이 `text` 또는 `varchar`인지 확인
- [ ] RLS 정책이 올바르게 설정되어 있는지 확인

#### 실행해야 할 SQL:
```sql
-- 1. seed_name 컬럼 존재 확인
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_settings' 
  AND column_name = 'seed_name';

-- 2. seed_name 컬럼이 없으면 추가
ALTER TABLE public.user_settings 
  ADD COLUMN IF NOT EXISTS seed_name text;

-- 3. RLS 정책 확인
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'user_settings';
```

#### 마이그레이션 파일:
- `supabase_user_settings_seed_name_migration.sql` 실행 필요

---

### 2. 프로필 사진 업로드 문제

#### 확인 필요 사항:
- [ ] `profile-images` Storage 버킷이 존재하는지 확인
- [ ] 버킷이 `public`으로 설정되어 있는지 확인
- [ ] Storage RLS 정책이 올바르게 설정되어 있는지 확인
- [ ] 파일명 형식이 `{user_id}.{ext}`인지 확인

#### 실행해야 할 SQL:
```sql
-- 1. 버킷 존재 확인
SELECT id, name, public, created_at
FROM storage.buckets
WHERE id = 'profile-images';

-- 2. 버킷이 없으면 생성
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Storage RLS 정책 확인
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%profile%';
```

#### 마이그레이션 파일:
- `supabase_storage_profile_images_rls_fix.sql` 실행 필요 (새로 생성됨)

#### 문제점:
기존 `supabase_storage_profile_images_rls.sql` 파일의 RLS 정책이 잘못되었습니다:
- 기존: `storage.foldername(name)[1]` 사용 (폴더 구조 가정)
- 수정: `split_part(name, '.', 1)` 사용 (파일명에서 user_id 추출)

---

### 3. user_settings 테이블 전체 확인

#### 확인 필요 사항:
- [ ] 테이블 구조가 올바른지 확인
- [ ] 모든 필요한 컬럼이 존재하는지 확인
- [ ] RLS 정책이 올바르게 설정되어 있는지 확인

#### 실행해야 할 SQL:
```sql
-- 1. 테이블 구조 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_settings'
ORDER BY ordinal_position;

-- 2. 필요한 컬럼 목록:
-- - user_id (uuid, PK)
-- - nickname (text, nullable)
-- - mbti (text, nullable)
-- - profile_url (text, nullable)
-- - seed_name (text, nullable) ← 확인 필요
-- - lock_type (text, nullable)
-- - lock_value (text, nullable)
-- - updated_at (timestamp)
-- - created_at (timestamp)
```

---

## 마이그레이션 실행 순서

1. **user_settings 테이블 확인 및 seed_name 컬럼 추가**
   ```bash
   # Supabase Dashboard SQL Editor에서 실행
   # 또는 supabase_user_settings_seed_name_migration.sql 파일 실행
   ```

2. **Storage 버킷 및 RLS 정책 수정**
   ```bash
   # Supabase Dashboard SQL Editor에서 실행
   # supabase_storage_profile_images_rls_fix.sql 파일 실행
   ```

3. **RLS 정책 확인**
   ```sql
   -- user_settings RLS 정책 확인
   SELECT * FROM pg_policies WHERE tablename = 'user_settings';
   
   -- storage.objects RLS 정책 확인
   SELECT * FROM pg_policies 
   WHERE schemaname = 'storage' 
     AND tablename = 'objects' 
     AND policyname LIKE '%profile%';
   ```

---

## 예상되는 문제와 해결 방법

### 문제 1: "column seed_name does not exist"
**해결**: `supabase_user_settings_seed_name_migration.sql` 실행

### 문제 2: "new row violates row-level security policy"
**해결**: `supabase_user_settings_rls_fix.sql` 실행

### 문제 3: "bucket profile-images does not exist"
**해결**: `supabase_storage_profile_images_rls_fix.sql` 실행 (버킷 생성 포함)

### 문제 4: "permission denied for storage.objects"
**해결**: Storage RLS 정책이 올바르게 설정되었는지 확인

---

## 테스트 쿼리

### 씨앗 이름 저장 테스트:
```sql
-- 1. 현재 사용자의 설정 확인
SELECT * FROM user_settings WHERE user_id = auth.uid();

-- 2. seed_name 업데이트 테스트 (Supabase Dashboard에서 직접 실행 불가, 앱에서 테스트)
-- 앱에서 씨앗 이름 저장 시도 후 아래 쿼리로 확인
SELECT seed_name FROM user_settings WHERE user_id = auth.uid();
```

### 프로필 이미지 업로드 테스트:
```sql
-- 1. 버킷 확인
SELECT * FROM storage.buckets WHERE id = 'profile-images';

-- 2. 업로드된 파일 확인
SELECT name, created_at, updated_at 
FROM storage.objects 
WHERE bucket_id = 'profile-images'
ORDER BY created_at DESC
LIMIT 10;
```
