# 씨앗 이름 저장 오류 해결 가이드

## 🔴 에러 메시지
```
Could not find the 'seed_name' column of 'user_settings' in the schema cache
```

## 원인
`user_settings` 테이블에 `seed_name` 컬럼이 없거나, Supabase의 스키마 캐시가 업데이트되지 않았습니다.

## 해결 방법

### 1단계: Supabase Dashboard에서 SQL 실행

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard 접속
   - 프로젝트 선택

2. **SQL Editor 열기**
   - 왼쪽 메뉴에서 "SQL Editor" 클릭
   - "New query" 클릭

3. **마이그레이션 SQL 실행**
   - `fix_seed_name_column.sql` 파일의 전체 내용을 복사
   - SQL Editor에 붙여넣기
   - "Run" 버튼 클릭 (또는 `Ctrl+Enter`)

4. **실행 결과 확인**
   - 성공 메시지 확인: "seed_name 컬럼이 추가되었습니다." 또는 "seed_name 컬럼이 이미 존재합니다."
   - 에러가 발생하면 에러 메시지를 확인하세요

### 2단계: 스키마 캐시 갱신

Supabase의 스키마 캐시가 자동으로 갱신되지만, 즉시 반영되지 않을 수 있습니다.

**방법 1: Supabase Dashboard에서 확인**
1. SQL Editor에서 다음 쿼리 실행:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_settings'
  AND column_name = 'seed_name';
```
2. 결과가 나오면 컬럼이 존재하는 것입니다.

**방법 2: 브라우저/앱 재시작**
- 브라우저를 완전히 종료하고 다시 시작
- 또는 개발 서버를 재시작 (`npm run dev` 중지 후 다시 시작)

### 3단계: 테스트

1. 앱에서 씨앗 이름 저장을 다시 시도
2. 성공하면 완료!

## 문제가 계속되면

### 추가 확인 사항

1. **테이블 존재 확인**
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name = 'user_settings'
);
```

2. **컬럼 존재 확인**
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_settings'
ORDER BY ordinal_position;
```

3. **RLS 정책 확인**
```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_settings';
```

4. **수동으로 컬럼 추가 (위 방법이 실패한 경우)**
```sql
-- 컬럼 추가
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS seed_name text;

-- 주석 추가
COMMENT ON COLUMN public.user_settings.seed_name IS '씨앗 이름 (10자 이내)';
```

## 참고 파일

- `fix_seed_name_column.sql`: 마이그레이션 SQL 스크립트
- `supabase_user_settings_seed_name_migration.sql`: 기존 마이그레이션 파일
- `supabase_user_settings_setup.sql`: 전체 테이블 설정 파일
