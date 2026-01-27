# 씨앗 이름 저장 실패 디버깅 가이드

## 🔍 문제 진단 체크리스트

### 1. 브라우저 콘솔 확인

씨앗 이름 저장 시도 시 다음 로그를 확인하세요:

#### 정상 동작 시 예상 로그:
```
✅ [FlowerBadge] 씨앗 이름 저장 시작: { userId, seedName, ... }
✅ [useSettings] 설정 업데이트 시작: { userId, payload: { seed_name: "..." }, ... }
✅ [useSettings] upsert payload: { user_id, seed_name: "...", ... }
✅ [useSettings] 설정 업데이트 성공: { userId, data: { seed_name: "..." }, ... }
✅ [FlowerBadge] 씨앗 이름 저장 성공: { savedSeedName: "..." }
```

#### 에러 발생 시 확인할 로그:
```
❌ [useSettings] 설정 업데이트 실패: { 
  error, 
  code,        // 중요: 에러 코드 확인
  message,     // 중요: 에러 메시지 확인
  details,     // 중요: 상세 정보
  hint         // 중요: 해결 방법 힌트
}
```

### 2. 에러 코드별 대응 방법

#### 에러 코드: `42501` (Permission denied)
**원인**: RLS 정책 문제
**해결**: 
```sql
-- Supabase Dashboard에서 다음 SQL 실행:
-- supabase_user_settings_rls_unified.sql 파일의 내용 실행
```

#### 에러 코드: `23505` (Unique constraint violation)
**원인**: user_id 중복 (이상한 경우)
**해결**: Supabase Dashboard에서 user_settings 테이블 확인

#### 에러 코드: `PGRST301` (Network error)
**원인**: 네트워크 오류
**해결**: 네트워크 연결 확인, 재시도

#### 에러 코드: `PGRST116` (No rows returned)
**원인**: SELECT 결과가 없음 (upsert 후 select 실패)
**해결**: RLS 정책 확인, SELECT 권한 확인

### 3. Supabase Dashboard 확인

#### user_settings 테이블 확인:
```sql
-- 1. 테이블 구조 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_settings';

-- 2. RLS 정책 확인
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_settings'
ORDER BY policyname;

-- 3. 현재 사용자의 user_settings 확인
SELECT * FROM user_settings WHERE user_id = 'YOUR_USER_ID';
```

#### RLS 정책 확인:
다음 정책이 모두 존재해야 합니다:
- `user_settings_select` (SELECT)
- `user_settings_insert` (INSERT)
- `user_settings_update` (UPDATE)

### 4. 수동 테스트 (Supabase Dashboard SQL Editor)

```sql
-- 1. 현재 사용자 ID 확인
SELECT auth.uid() as current_user_id;

-- 2. user_settings 조회 테스트
SELECT * FROM user_settings WHERE user_id = auth.uid();

-- 3. user_settings 업데이트 테스트
UPDATE user_settings 
SET seed_name = '테스트', updated_at = now()
WHERE user_id = auth.uid();

-- 4. user_settings INSERT 테스트 (레코드가 없는 경우)
INSERT INTO user_settings (user_id, seed_name, updated_at)
VALUES (auth.uid(), '테스트', now())
ON CONFLICT (user_id) DO UPDATE 
SET seed_name = EXCLUDED.seed_name, updated_at = now();
```

### 5. Network 탭 확인

브라우저 개발자 도구 > Network 탭에서:
1. 씨앗 이름 저장 시도
2. `user_settings` 관련 요청 확인
3. Status 코드 확인 (200이어야 함)
4. Response 확인 (에러 메시지 확인)

### 6. 가능한 원인 및 해결 방법

#### 원인 1: RLS 정책이 적용되지 않음
**증상**: 에러 코드 `42501`
**해결**: 
```sql
-- supabase_user_settings_rls_unified.sql 실행
```

#### 원인 2: user_settings 테이블이 없음
**증상**: 에러 코드 `42P01` (table does not exist)
**해결**: 
```sql
-- supabase_user_settings_setup.sql 실행
```

#### 원인 3: seed_name 컬럼이 없음
**증상**: 에러 코드 `42703` (column does not exist)
**해결**: 
```sql
-- supabase_user_settings_seed_name_migration.sql 실행
```

#### 원인 4: upsert의 onConflict가 작동하지 않음
**증상**: 에러 코드 `23505` (unique constraint violation)
**해결**: user_id가 primary key인지 확인

#### 원인 5: SELECT 권한 없음 (upsert 후 select 실패)
**증상**: 에러 코드 `42501` 또는 `PGRST116`
**해결**: SELECT 정책 확인

### 7. 임시 해결 방법 (디버깅용)

만약 RLS 정책 문제라면, 임시로 다음을 시도:

```sql
-- 임시로 RLS 비활성화 (테스트용, 프로덕션에서는 사용 금지)
ALTER TABLE public.user_settings DISABLE ROW LEVEL SECURITY;

-- 테스트 후 다시 활성화
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
```

### 8. 로그 수집

씨앗 이름 저장 실패 시 다음 정보를 수집하세요:

1. **콘솔 로그 전체** (특히 `[useSettings]` 로그)
2. **Network 탭의 요청/응답**
3. **에러 코드 및 메시지**
4. **Supabase Dashboard의 RLS 정책 상태**
