-- ============================================
-- 마음씨(Mamssi) flowers 테이블 RLS 정책 설정
-- (실제 DB 스키마에 맞게 수정)
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


