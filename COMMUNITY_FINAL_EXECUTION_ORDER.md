# 공감숲 최종 SQL 실행 순서 및 체크리스트

## 실행 전 확인사항

- [ ] Supabase 프로젝트에 접속 가능
- [ ] SQL Editor 권한 확인
- [ ] 백업 수행 (프로덕션 환경인 경우)

## 실행 순서

### 1단계: 최종 SQL 실행

**파일**: `supabase_community_final.sql`

Supabase SQL Editor에서 전체 스크립트를 한 번에 실행합니다.

이 스크립트는 다음을 수행합니다:
- ✅ 기존 중복 트리거 모두 제거
- ✅ 테이블 생성/수정
- ✅ emotion_id unique constraint 추가
- ✅ RLS 정책 설정
- ✅ 인덱스 생성
- ✅ 트리거 함수 및 트리거 생성 (단 하나만)

### 2단계: 검증 SQL 실행

**파일**: `supabase_community_verification.sql`

각 검증 쿼리를 실행하여 결과를 확인합니다.

## 검증 체크리스트

### ✅ 1. 트리거 확인 (1개만 있어야 함)

```sql
select trigger_name
from information_schema.triggers
where event_object_table = 'emotions'
  and trigger_name like '%community_post%';
```

**예상 결과**: `sync_community_post_trigger` 1개만 존재

---

### ✅ 2. emotion_id unique constraint 확인

```sql
-- unique constraint 확인
select 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
from pg_constraint
where conrelid = 'public.community_posts'::regclass
  and conname = 'community_posts_emotion_id_unique'
  and contype = 'u';

-- emotion_id NOT NULL 확인
select is_nullable
from information_schema.columns
where table_name = 'community_posts'
  and column_name = 'emotion_id';

-- 중복 index 확인 (없어야 함)
select indexname
from pg_indexes
where tablename = 'community_posts'
  and indexname like '%emotion_id%'
  and indexname != 'community_posts_emotion_id_unique';
```

**예상 결과**: 
- `community_posts_emotion_id_unique` unique constraint 존재
- `is_nullable = 'NO'` (NOT NULL)
- 중복 index 없음 (0 rows)

---

### ✅ 3. 테이블 스키마 확인

```sql
select column_name, data_type
from information_schema.columns
where table_name = 'community_posts'
  and column_name in ('emotion_category', 'category', 'is_public', 'is_hidden', 'category_id');
```

**예상 결과**:
- ✅ `emotion_category` 존재 (text, 영문)
- ✅ `category` 존재 (text, 한글)
- ✅ `is_public` 존재 (boolean)
- ✅ `is_hidden` 존재 (boolean)
- ❌ `category_id` 없음

---

### ✅ 4. 트리거 함수 확인 (NEW.category 사용)

```sql
select prosrc
from pg_proc
where proname = 'sync_community_post_from_emotion';
```

**확인 사항**:
- ✅ `NEW.category` 사용 (영문 값)
- ✅ `emotion_category`에 `NEW.category` 저장
- ✅ `category`에 한글 매핑 저장
- ❌ `NEW.category_id` 참조 없음
- ✅ 한글 매핑 로직 존재 (`case NEW.category when 'daily' then '일상' ...`)

---

### ✅ 5. 동기화 테스트

#### 5-1. 최신 emotions 1개 조회

```sql
select id, category, is_public, is_hidden, content
from public.emotions
order by created_at desc
limit 1;
```

#### 5-2. 공개로 변경 (위에서 조회한 id 사용)

```sql
-- 실제 id 값으로 변경 필요
update public.emotions
set is_public = true, category = 'daily'
where id = '실제-id-값-여기에-입력';
```

#### 5-3. community_posts 생성 확인

```sql
select 
  cp.id,
  cp.emotion_id,
  cp.emotion_category,
  cp.category,
  cp.is_public,
  cp.is_hidden,
  e.category as emotion_category_원본
from public.community_posts cp
join public.emotions e on cp.emotion_id = e.id
where cp.emotion_id = '실제-id-값-여기에-입력';
```

**예상 결과**:
- ✅ emotion_category = `daily` (영문)
- ✅ category = `일상` (한글)
- ✅ is_public = `true`
- ✅ is_hidden = `false`

---

### ✅ 6. 카테고리 매핑 확인

```sql
select distinct
  e.category as emotion_category_영문,
  cp.emotion_category as community_post_emotion_category_영문,
  cp.category as community_post_category_한글,
  count(*) as count
from public.emotions e
join public.community_posts cp on e.id = cp.emotion_id
where e.category is not null
group by e.category, cp.emotion_category, cp.category
order by e.category;
```

**예상 결과**:
```
emotion_category_영문 | community_post_emotion_category_영문 | community_post_category_한글
---------------------|-----------------------------------|---------------------------
daily               | daily                             | 일상
worry               | worry                             | 고민
love                | love                              | 연애
work                | work                              | 회사
humor               | humor                             | 유머
growth              | growth                            | 성장
selfcare            | selfcare                          | 자기돌봄
```

---

### ✅ 7. 중복 데이터 및 NULL 확인

```sql
-- 중복 확인
select emotion_id, count(*) as count
from public.community_posts
group by emotion_id
having count(*) > 1;

-- NULL 확인 (없어야 함)
select count(*) as null_count
from public.community_posts
where emotion_id is null;
```

**예상 결과**: 
- 중복: 0 rows
- NULL: 0

---

### ✅ 8. RLS 정책 확인

```sql
select tablename, policyname
from pg_policies
where schemaname = 'public'
  and tablename in ('community_posts', 'community_likes', 'reports')
order by tablename, policyname;
```

**예상 결과**:

**community_posts**:
- ✅ `community_posts read public or self`
- ✅ `community_posts insert self`
- ✅ `community_posts update self`
- ✅ `community_posts delete self`

**community_likes**:
- ✅ `community_likes read all`
- ✅ `community_likes insert self`
- ✅ `community_likes delete self`

**reports**:
- ✅ `reports read self`
- ✅ `reports insert all`

---

### ✅ 9. 인덱스 확인

```sql
select tablename, indexname
from pg_indexes
where schemaname = 'public'
  and tablename in ('community_posts', 'community_likes', 'reports')
order by tablename, indexname;
```

**예상 결과**: 필요한 인덱스들이 모두 존재

---

### ✅ 10. updated_at 트리거 확인

```sql
-- 트리거 확인
select trigger_name, event_manipulation
from information_schema.triggers
where event_object_table = 'community_posts'
  and trigger_name = 'update_community_posts_updated_at';

-- 함수 확인
select proname
from pg_proc
where proname = 'update_updated_at_column';
```

**예상 결과**: 
- `update_community_posts_updated_at` 트리거 존재
- `update_updated_at_column` 함수 존재

---

## 문제 해결

### 문제 1: ON CONFLICT 오류

**오류 메시지**:
```
ERROR: there is no unique constraint matching the ON CONFLICT specification
```

**해결 방법**:
```sql
-- unique constraint 확인
select conname from pg_constraint
where conrelid = 'public.community_posts'::regclass
  and conname = 'community_posts_emotion_id_unique';

-- 없으면 생성 (emotion_id가 NOT NULL이어야 함)
-- 1. emotion_id NULL 값 정리
delete from public.community_posts where emotion_id is null;

-- 2. emotion_id NOT NULL 설정
alter table public.community_posts alter column emotion_id set not null;

-- 3. unique constraint 생성
alter table public.community_posts
  add constraint community_posts_emotion_id_unique unique (emotion_id);
```

---

### 문제 2: 트리거가 여러 개 생성됨

**해결 방법**:
```sql
-- 모든 community_post 관련 트리거 제거
do $$
declare
  trigger_record record;
begin
  for trigger_record in 
    select trigger_name 
    from information_schema.triggers 
    where event_object_table = 'emotions'
      and trigger_name like '%community_post%'
  loop
    execute format('drop trigger if exists %I on public.emotions', trigger_record.trigger_name);
  end loop;
end $$;

-- 정상 트리거만 생성
create trigger sync_community_post_trigger
  after insert or update on public.emotions
  for each row execute function sync_community_post_from_emotion();
```

---

### 문제 3: category_id 참조 오류

**오류 메시지**:
```
ERROR: column "category_id" does not exist
```

**해결 방법**:
```sql
-- 트리거 함수 재생성 (supabase_community_final.sql의 함수 부분만 재실행)
-- 또는 전체 스크립트 재실행
```

---

## 완료 확인

모든 체크리스트를 통과하면:

- ✅ 공감숲 동기화가 정상 작동합니다
- ✅ 중복 트리거가 제거되었습니다
- ✅ category_id가 완전히 제거되었습니다
- ✅ emotion_id unique constraint가 설정되었습니다 (NOT NULL)
- ✅ TG_OP 분기로 INSERT/UPDATE 안전하게 처리됩니다
- ✅ updated_at 자동 갱신이 활성화되었습니다

## 다음 단계

1. 앱에서 공개 기록 생성 테스트
2. 공감숲 화면에서 게시글 표시 확인
3. 카테고리 필터링 동작 확인
4. BEST 탭 정렬 확인

