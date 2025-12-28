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

### ✅ 2. emotion_id unique index 확인

```sql
select indexname
from pg_indexes
where tablename = 'community_posts'
  and indexname = 'community_posts_emotion_id_key';
```

**예상 결과**: `community_posts_emotion_id_key` 존재

---

### ✅ 3. 테이블 스키마 확인

```sql
select column_name, data_type
from information_schema.columns
where table_name = 'community_posts'
  and column_name in ('category', 'is_public', 'is_hidden', 'category_id');
```

**예상 결과**:
- ✅ `category` 존재 (text)
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
  cp.category as community_post_category,
  cp.is_public,
  cp.is_hidden,
  e.category as emotion_category
from public.community_posts cp
join public.emotions e on cp.emotion_id = e.id
where cp.emotion_id = '실제-id-값-여기에-입력';
```

**예상 결과**:
- ✅ community_post_category = `일상` (한글)
- ✅ emotion_category = `daily` (영문)
- ✅ is_public = `true`
- ✅ is_hidden = `false`

---

### ✅ 6. 카테고리 매핑 확인

```sql
select distinct
  e.category as emotion_category_영문,
  cp.category as community_post_category_한글
from public.emotions e
join public.community_posts cp on e.id = cp.emotion_id
where e.category is not null
order by e.category;
```

**예상 결과**:
```
emotion_category_영문 | community_post_category_한글
---------------------|---------------------------
daily               | 일상
worry               | 고민
love                | 연애
work                | 회사
humor               | 유머
growth              | 성장
selfcare            | 자기돌봄
```

---

### ✅ 7. 중복 데이터 확인

```sql
select emotion_id, count(*) as count
from public.community_posts
where emotion_id is not null
group by emotion_id
having count(*) > 1;
```

**예상 결과**: 0 rows (중복 없음)

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

## 문제 해결

### 문제 1: ON CONFLICT 오류

**오류 메시지**:
```
ERROR: there is no unique constraint matching the ON CONFLICT specification
```

**해결 방법**:
```sql
-- unique index 확인
select indexname from pg_indexes 
where tablename = 'community_posts' 
  and indexname = 'community_posts_emotion_id_key';

-- 없으면 생성
create unique index community_posts_emotion_id_key 
  on public.community_posts(emotion_id) 
  where emotion_id is not null;
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
- ✅ emotion_id unique constraint가 설정되었습니다

## 다음 단계

1. 앱에서 공개 기록 생성 테스트
2. 공감숲 화면에서 게시글 표시 확인
3. 카테고리 필터링 동작 확인
4. BEST 탭 정렬 확인

