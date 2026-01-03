# 공감숲 최종 설정 가이드

## 개요

`supabase_community_final.sql` 파일은 공감숲 관련 모든 설정을 통합한 최종 SQL 스크립트입니다.

## 실행 순서

### 1단계: 최종 SQL 실행

Supabase SQL Editor에서 다음 파일을 실행합니다:

```sql
-- supabase_community_final.sql 전체 내용 실행
```

이 스크립트는:
- 기존 중복 트리거/정책을 모두 제거
- 테이블 생성/수정
- emotion_id unique constraint 추가
- RLS 정책 설정
- 인덱스 생성
- 트리거 함수 및 트리거 생성 (단 하나만)

### 2단계: 검증 SQL 실행

`supabase_community_verification.sql` 파일의 검증 쿼리를 실행하여 설정이 올바르게 적용되었는지 확인합니다.

## 주요 변경 사항

### 1. category_id 완전 제거
- `emotions.category_id` 참조 제거
- `emotions.category` (영문) 사용
- `community_posts.category` (한글) 저장

### 2. 트리거 통합
- 중복 트리거 모두 제거
- `sync_community_post_trigger` 하나만 유지
- `after insert or update on public.emotions`

### 3. emotion_id unique constraint
- `community_posts_emotion_id_key` unique index 추가
- `ON CONFLICT (emotion_id)` 사용 가능

### 4. 카테고리 매핑
영문 → 한글 매핑:
- `daily` → `일상`
- `worry` → `고민`
- `love` → `연애`
- `work` → `회사`
- `humor` → `유머`
- `growth` → `성장`
- `selfcare` → `자기돌봄`

## 검증 체크리스트

`supabase_community_verification.sql` 실행 후 확인:

- [ ] **트리거 확인**: `sync_community_post_trigger` 1개만 존재
- [ ] **unique index 확인**: `community_posts_emotion_id_key` 존재
- [ ] **컬럼 확인**: `category`, `is_public`, `is_hidden` 존재 (category_id 없음)
- [ ] **함수 확인**: `sync_community_post_from_emotion()` 함수가 `NEW.category` 사용
- [ ] **동기화 테스트**: emotions 공개 기록 → community_posts 생성 확인
- [ ] **카테고리 매핑**: 영문 → 한글 변환 정상 작동
- [ ] **중복 확인**: emotion_id 기준 중복 없음
- [ ] **RLS 정책**: 필요한 정책 모두 존재
- [ ] **인덱스**: 필요한 인덱스 모두 존재

## 수동 테스트 절차

### 1. 공개 기록 생성 테스트

```sql
-- 최신 emotions 1개를 공개로 변경
update public.emotions
set is_public = true, category = 'daily'
where id = (select id from public.emotions order by created_at desc limit 1);

-- community_posts에 생성되었는지 확인
select * from public.community_posts
where emotion_id = (select id from public.emotions order by created_at desc limit 1);

-- 예상 결과:
-- - category = '일상' (한글)
-- - is_public = true
-- - is_hidden = false
```

### 2. 카테고리 변환 테스트

각 카테고리 값에 대해 테스트:

```sql
-- 테스트용 emotions 생성 (실제 환경에서는 앱을 통해 생성)
-- update public.emotions
-- set is_public = true, category = 'worry'  -- 'love', 'work' 등으로 변경하여 테스트
-- where id = '테스트-레코드-id';

-- community_posts 확인
select 
  e.category as emotion_category,
  cp.category as community_post_category
from public.emotions e
join public.community_posts cp on e.id = cp.emotion_id
where e.id = '테스트-레코드-id';

-- 예상 결과:
-- worry -> 고민
-- love -> 연애
-- work -> 회사
-- 등등...
```

### 3. 트리거 동작 확인

```sql
-- 트리거 목록 확인 (1개만 있어야 함)
select trigger_name 
from information_schema.triggers
where event_object_table = 'emotions'
  and trigger_name like '%community_post%';

-- 예상 결과: sync_community_post_trigger 1개만
```

## 문제 해결

### ON CONFLICT 오류 발생 시

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

### 트리거가 여러 개 생성되는 경우

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

### category_id 참조 오류 발생 시

트리거 함수가 `NEW.category_id`를 참조하는 경우, 함수를 재생성:

```sql
-- supabase_community_final.sql의 sync_community_post_from_emotion() 함수 재실행
```

## 주의사항

1. **실행 전 백업**: 프로덕션 환경에서는 반드시 백업 후 실행
2. **기존 데이터**: 기존에 `category_id`로 저장된 데이터는 자동으로 변환되지 않으므로, 필요 시 별도 마이그레이션 필요
3. **emotions 테이블**: `emotions.category` 컬럼이 영문 값('daily', 'worry' 등)을 저장해야 함
4. **트리거 순서**: 다른 스크립트와 충돌하지 않도록 기존 중복 트리거는 모두 제거됨

## 최종 파일 구조

```
supabase_community_final.sql       # 최종 통합 SQL (실행)
supabase_community_verification.sql # 검증 SQL (확인용)
COMMUNITY_FINAL_SETUP_GUIDE.md     # 이 가이드 문서
```

기존 파일들 (`supabase_community_setup.sql`, `supabase_community_mvp_setup.sql`, `supabase_community_category_migration.sql`)은 더 이상 사용하지 않습니다.





