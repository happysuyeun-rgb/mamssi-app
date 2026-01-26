# Storage 경로 규칙 확정

## 📋 경로 규칙

### 프로필 이미지
- **버킷**: `profile-images`
- **경로 형식**: `{userId}/{filename}`
- **예시**: `abc123-def456-ghi789/profile.1704067200000.jpg`
- **URL 타입**: **Public URL** 사용 (프로필은 공개 이미지)

### 파일명 규칙
- 형식: `profile.{timestamp}.{ext}`
- 예시: `profile.1704067200000.jpg`
- 이유: 타임스탬프를 포함하여 중복 방지 및 캐시 무효화

---

## ✅ 코드 확인 사항

### 1. `src/utils/profileImageUpload.ts`
- [x] 경로 생성: `${userId}/${fileName}` 형식 사용
- [x] 파일명: `profile.{timestamp}.{ext}` 형식 사용
- [x] Public URL 사용: `getPublicUrl()` 사용
- [x] 기존 이미지 삭제: 해당 사용자 폴더의 모든 파일 삭제

### 2. Storage RLS 정책
- [x] 경로 패턴: `(string_to_array(name, '/'))[1] = auth.uid()::text`
- [x] 버킷: `profile-images` (public=true)
- [x] 정책 파일: `supabase_storage_profile_images_rls_fix.sql`

---

## 🔧 DB 마이그레이션 필요 사항

### 1. Storage 버킷 확인/생성
```sql
-- 버킷 존재 확인
SELECT id, name, public FROM storage.buckets WHERE id = 'profile-images';

-- 버킷 생성 (없으면)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;
```

### 2. Storage RLS 정책 적용
```sql
-- supabase_storage_profile_images_rls_fix.sql 파일 실행
-- 경로 형식: profile-images/{userId}/{filename}
```

### 3. user_settings 테이블 확인
```sql
-- seed_name 컬럼 확인
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'user_settings' AND column_name = 'seed_name';

-- 없으면 추가
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS seed_name text;
```

---

## 📝 실행 순서

1. **Storage 버킷 및 RLS 정책 적용**
   ```bash
   # Supabase Dashboard SQL Editor에서 실행
   supabase_storage_profile_images_rls_fix.sql
   ```

2. **user_settings 테이블 확인**
   ```bash
   # seed_name 컬럼 확인 및 추가
   supabase_user_settings_seed_name_migration.sql
   ```

3. **코드 배포**
   - `src/utils/profileImageUpload.ts` (이미 수정 완료)
   - 경로 규칙이 `{userId}/{filename}` 형식으로 통일됨

---

## 🎯 결정 사항

### Public URL vs Signed URL
- **결정**: **Public URL** 사용
- **이유**: 
  - 프로필 이미지는 공개 이미지
  - RLS 정책으로 접근 제어 (본인만 업로드/수정/삭제 가능)
  - Public URL이 더 간단하고 성능상 유리

### 경로 구조
- **결정**: `profile-images/{userId}/{filename}`
- **이유**:
  - 사용자별 폴더로 관리 용이
  - RLS 정책 적용 간단
  - 확장성 좋음 (나중에 여러 이미지 저장 가능)

---

## ⚠️ 주의사항

1. **기존 이미지 마이그레이션**
   - 기존에 `{userId}.{ext}` 형식으로 저장된 이미지가 있다면 마이그레이션 필요
   - 또는 기존 이미지는 그대로 두고 새 이미지만 새 형식 사용

2. **RLS 정책 테스트**
   - 업로드/수정/삭제 권한 테스트 필수
   - 다른 사용자의 이미지에 접근 불가 확인

3. **Public URL 캐싱**
   - 브라우저 캐싱 고려 (cacheControl: '3600' 설정됨)
   - 이미지 변경 시 파일명에 타임스탬프 포함하여 캐시 무효화
