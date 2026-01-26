# 트리거 방어 로직 체크리스트

## ✅ 완료된 작업

### 1. 트리거 함수 방어 로직 강화
- **파일**: `supabase_community_trigger_defense.sql`
- **변경 사항**:
  - `emotion_type_value`에 COALESCE 적용: `coalesce(NEW.main_emotion, NEW.emotion_type, '감정')`
  - `forest_category` 변환 시 NULL 체크 강화: `coalesce(NEW.category, '')`
  - `content`에 COALESCE 적용: `coalesce(NEW.content, '')`
  - `is_public`에 COALESCE 적용: `coalesce(NEW.is_public, false)`
  - 예외 처리 추가: `begin...exception...end` 블록으로 트리거 실패 시에도 emotions INSERT 계속 진행
  - 경고 로깅: `raise warning`으로 실패 시 로그 기록

### 2. SECURITY DEFINER 확인
- **현재 상태**: ✅ `sync_community_post_from_emotion()` 함수는 `SECURITY DEFINER`로 설정됨
- **이유**: RLS 정책을 우회하여 `community_posts`에 INSERT/UPDATE/DELETE 가능
- **확인 쿼리**:
```sql
SELECT 
  p.proname as function_name,
  CASE 
    WHEN p.prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END as security_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'sync_community_post_from_emotion';
```

### 3. NOT NULL 컬럼 기본값 처리
- **community_posts.content**: 
  - NOT NULL 제약조건 확인
  - NULL 값이 있으면 빈 문자열('')로 변경
  - 트리거에서 `coalesce(NEW.content, '')` 사용

### 4. 코드 레벨 방어 로직
- **파일**: `src/services/community.ts`
- **변경 사항**:
  - `fetchCommunityPosts()`: profiles 정보가 없으면 기본값 설정
  - `fetchCommunityPost()`: profiles 정보가 없으면 기본값 설정
  - 기본값: `{ nickname: '익명', seed_name: null, mbti: null }`

---

## 🔧 DB 마이그레이션 필요 사항

### 1. 트리거 함수 업데이트
```sql
-- supabase_community_trigger_defense.sql 실행
-- 이 파일은 sync_community_post_from_emotion() 함수를 방어 로직으로 업데이트합니다
```

### 2. community_posts 테이블 NULL 값 정리
```sql
-- content가 NULL인 경우 빈 문자열로 변경
UPDATE public.community_posts
SET content = ''
WHERE content IS NULL;
```

### 3. user_settings 테이블 확인
- 트리거에서 직접 참조하지 않으므로 추가 작업 불필요
- 하지만 코드에서 JOIN 시 기본값 처리 필요 (이미 완료)

---

## 📋 확인 사항

### 1. 트리거 동작 확인
```sql
-- 트리거가 정상 작동하는지 확인
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'emotions'
  AND trigger_name LIKE '%community_post%';
```

### 2. 함수 보안 설정 확인
```sql
-- SECURITY DEFINER 확인
SELECT 
  p.proname,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'sync_community_post_from_emotion';
```

### 3. RLS 정책 확인
```sql
-- community_posts RLS 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'community_posts';
```

---

## ⚠️ 주의사항

### 1. 트리거 실패 시 처리
- 트리거가 실패해도 `emotions` INSERT는 계속 진행됨 (AFTER 트리거이므로)
- 실패 시 `raise warning`으로 로그만 기록
- `community_posts` 동기화는 실패할 수 있지만, `emotions` 기록은 정상 저장됨

### 2. profiles JOIN 실패
- `user_settings` 테이블이 없거나 RLS 정책으로 접근이 막히면 JOIN 실패 가능
- 코드 레벨에서 기본값 처리로 방어 (이미 완료)
- 트리거에서는 `user_settings`를 직접 참조하지 않으므로 문제 없음

### 3. SECURITY DEFINER 보안
- `SECURITY DEFINER`는 RLS를 우회하므로 신중하게 사용해야 함
- 현재는 `community_posts`에만 INSERT/UPDATE/DELETE하므로 안전
- 향후 다른 테이블에 접근하는 경우 보안 검토 필요

---

## 🎯 테스트 시나리오

### 1. 프로필 없는 사용자가 공개 글 작성
- **시나리오**: `user_settings`에 레코드가 없는 사용자가 `is_public=true`로 감정 기록 작성
- **예상 결과**: 
  - `emotions` INSERT 성공
  - `community_posts` INSERT 성공 (트리거 동작)
  - `profiles` JOIN 실패 시 기본값 '익명' 표시

### 2. NULL 값이 있는 감정 기록
- **시나리오**: `content`, `emotion_type`, `category`가 NULL인 감정 기록
- **예상 결과**:
  - `content`: 빈 문자열('')로 처리
  - `emotion_type`: '감정'으로 처리
  - `category`: NULL이면 `forest_category`도 NULL, `community_posts` INSERT 안 됨

### 3. 트리거 실패 시나리오
- **시나리오**: `community_posts` INSERT 시 제약조건 위반 등으로 실패
- **예상 결과**:
  - `emotions` INSERT는 성공 (트리거는 AFTER이므로)
  - `community_posts` INSERT는 실패하지만 경고만 기록
  - 사용자에게는 정상적으로 보이지만 공감숲에는 표시 안 됨

---

## 📝 실행 순서

1. **트리거 함수 업데이트**
   ```bash
   # Supabase Dashboard SQL Editor에서 실행
   supabase_community_trigger_defense.sql
   ```

2. **NULL 값 정리**
   ```sql
   UPDATE public.community_posts
   SET content = ''
   WHERE content IS NULL;
   ```

3. **코드 배포**
   - `src/services/community.ts` (이미 수정 완료)
   - profiles 기본값 처리 추가됨

4. **테스트**
   - 프로필 없는 사용자로 공개 글 작성 테스트
   - NULL 값이 있는 감정 기록 테스트
   - 트리거 실패 시나리오 테스트
