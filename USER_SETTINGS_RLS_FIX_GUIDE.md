# user_settings RLS 정책 수정 가이드

## 문제 상황
프로필 이미지 URL 저장 시 `"new row violates row-level security policy"` 에러 발생

## 원인 분석

### upsert 동작 방식
`useSettings.ts`에서 `upsert`를 사용하고 있습니다:
```typescript
.upsert(
  { user_id: userId, ...payload },
  { onConflict: 'user_id' }
)
```

`upsert`는 다음 두 경우를 처리합니다:
1. **레코드가 없을 때**: INSERT 수행 → INSERT 정책 필요
2. **레코드가 있을 때**: UPDATE 수행 → UPDATE 정책 필요

### 현재 정책 상태
- ✅ SELECT 정책: 존재함
- ✅ INSERT 정책: 존재함 (`with check (auth.uid() = user_id)`)
- ✅ UPDATE 정책: 존재함 (`using` + `with check`)

### 문제 가능성
1. 정책이 실제로 적용되지 않았을 수 있음
2. 정책이 삭제되었을 수 있음
3. 정책 이름이 다를 수 있음

## 해결 방법

### 방법 1: RLS 정책 재생성 (권장)

**파일**: `supabase_user_settings_rls_fix.sql`

Supabase SQL Editor에서 실행:

```sql
-- 기존 정책 모두 삭제
DROP POLICY IF EXISTS "user_settings self only" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_select" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_update" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_insert" ON public.user_settings;

-- SELECT 정책: 본인만 조회 가능
CREATE POLICY "user_settings_select"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT 정책: 본인만 생성 가능 (upsert 시 필수)
CREATE POLICY "user_settings_insert"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE 정책: 본인만 수정 가능 (upsert 시 필수)
CREATE POLICY "user_settings_update"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 방법 2: 정책 확인 및 수동 수정

현재 정책 확인:
```sql
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
WHERE tablename = 'user_settings';
```

정책이 없거나 잘못된 경우 위의 SQL을 실행하세요.

## 정책 설명

### SELECT 정책
```sql
CREATE POLICY "user_settings_select"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);
```
- **목적**: 본인의 설정만 조회 가능
- **조건**: `auth.uid() = user_id` (현재 로그인한 사용자 ID와 일치)

### INSERT 정책
```sql
CREATE POLICY "user_settings_insert"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```
- **목적**: 본인만 새 레코드 생성 가능
- **조건**: `WITH CHECK` - 새로 생성되는 row의 `user_id`가 `auth.uid()`와 일치해야 함
- **upsert 중요**: 레코드가 없을 때 INSERT가 발생하므로 필수

### UPDATE 정책
```sql
CREATE POLICY "user_settings_update"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```
- **목적**: 본인만 기존 레코드 수정 가능
- **USING**: 수정할 수 있는 row 조건 (기존 row 체크)
- **WITH CHECK**: 수정 후 row가 만족해야 할 조건 (새 row 체크)
- **upsert 중요**: 레코드가 있을 때 UPDATE가 발생하므로 필수

## 테스트 방법

### 1. 정책 적용 확인
```sql
-- 정책 목록 확인
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'user_settings';
```

예상 결과:
- `user_settings_select` (SELECT)
- `user_settings_insert` (INSERT)
- `user_settings_update` (UPDATE)

### 2. 기능 테스트
1. 프로필 이미지 업로드 시도
2. 에러가 발생하지 않으면 성공
3. 브라우저 콘솔에서 에러 메시지 확인

### 3. 디버깅
에러가 계속 발생하면:
```sql
-- RLS 활성화 확인
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_settings';
-- rowsecurity가 true여야 함

-- auth.uid() 확인 (Supabase Dashboard에서 실행)
SELECT auth.uid();
```

## 주의사항

1. **정책 순서**: 정책 삭제 후 재생성 순서 중요
2. **auth.uid()**: 로그인한 사용자만 정상 작동 (익명 사용자는 NULL)
3. **upsert**: INSERT와 UPDATE 정책 모두 필요
4. **WITH CHECK**: INSERT/UPDATE 시 새 row 검증에 필수

## 추가 확인 사항

### user_id와 auth.uid() 일치 확인
`useSettings.ts`에서 `userId`가 `auth.uid()`와 일치하는지 확인:
```typescript
// useSettings.ts
const { data: { user } } = await supabase.auth.getUser();
if (user?.id !== userId) {
  console.error('user_id와 auth.uid() 불일치');
}
```

### PostgREST Schema Cache Reload
정책 변경 후 스키마 캐시 리로드:
```sql
NOTIFY pgrst, 'reload schema';
```

