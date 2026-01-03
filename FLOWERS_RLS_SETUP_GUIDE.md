# Flowers 테이블 RLS 설정 가이드

## 1. 순수 SQL (Supabase SQL Editor에 복사/붙여넣기)

```sql
-- ============================================
-- 마음씨(Mamssi) flowers 테이블 RLS 정책 설정
-- ============================================

-- RLS 활성화
alter table public.flowers enable row level security;

-- 기존 정책 삭제 (있는 경우)
drop policy if exists "flowers select self" on public.flowers;
drop policy if exists "flowers insert self" on public.flowers;
drop policy if exists "flowers update self" on public.flowers;
drop policy if exists "flowers delete self" on public.flowers;

-- 정책: 본인만 조회 가능
create policy "flowers select self"
  on public.flowers for select
  using ( auth.uid() = user_id );

-- 정책: 본인만 삽입 가능
create policy "flowers insert self"
  on public.flowers for insert
  with check ( auth.uid() = user_id );

-- 정책: 본인만 수정 가능
create policy "flowers update self"
  on public.flowers for update
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

-- 정책: 본인만 삭제 가능
create policy "flowers delete self"
  on public.flowers for delete
  using ( auth.uid() = user_id );

-- 인덱스 추가 (없으면)
create index if not exists idx_flowers_user_id on public.flowers(user_id);
create index if not exists idx_flowers_growth_percent on public.flowers(growth_percent);
create index if not exists idx_flowers_is_bloomed on public.flowers(is_bloomed) where is_bloomed = true;
```

## 2. 실행 순서 가이드

### (a) RLS 활성화 확인
```sql
-- RLS 활성화 여부 확인
select tablename, rowsecurity 
from pg_tables 
where schemaname = 'public' 
  and tablename = 'flowers';
```
- `rowsecurity = true`면 활성화됨
- `false`면 위 SQL의 `alter table public.flowers enable row level security;` 실행

### (b) Policy 생성
위 SQL의 `create policy` 구문들을 순서대로 실행 (이미 있으면 `drop policy if exists`로 삭제 후 재생성)

### (c) 인덱스 추가
위 SQL의 `create index if not exists` 구문들을 실행

## 3. 실행 후 확인 SQL

```sql
-- RLS 정책 확인
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where tablename = 'flowers';

-- 인덱스 확인
select indexname, indexdef
from pg_indexes
where tablename = 'flowers';
```




