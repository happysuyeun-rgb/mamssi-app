-- ============================================
-- 마음씨(Mamssi) 감정 기록(emotions) 테이블 설정
-- ============================================

-- ============================================
-- 1. emotions 테이블 생성
-- ============================================

create table if not exists public.emotions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  emotion_type text not null, -- 대표 감정명 (예: 기쁨, 슬픔 등)
  intensity int check (intensity between 1 and 5),
  content text not null,
  image_url text,
  is_public boolean not null default false,
  category_id text, -- 공감숲 카테고리 (예: 'daily', 'worry', 'love' 등)
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- ============================================
-- 2. FK 제약 조건: public.users.id → emotions.user_id
-- ============================================

-- FK가 이미 존재하는지 확인하고 없을 때만 생성
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'emotions_user_id_fkey'
      and conrelid = 'public.emotions'::regclass
  ) then
    alter table public.emotions
      add constraint emotions_user_id_fkey
      foreign key (user_id)
      references public.users(id)
      on delete cascade;
  end if;
end $$;

-- ============================================
-- 3. RLS (Row Level Security) 정책
-- ============================================

-- RLS 활성화
alter table public.emotions enable row level security;

-- 기존 정책 삭제 (재실행 시)
drop policy if exists "emotions select public or self" on public.emotions;
drop policy if exists "emotions insert self" on public.emotions;
drop policy if exists "emotions update self" on public.emotions;
drop policy if exists "emotions delete self" on public.emotions;

-- SELECT 정책: 공개글은 모두 조회 가능, 비공개글은 본인만 조회 가능
create policy "emotions select public or self"
  on public.emotions for select
  using ( is_public = true or auth.uid() = user_id );

-- INSERT 정책: 본인만 삽입 가능
create policy "emotions insert self"
  on public.emotions for insert
  with check ( auth.uid() = user_id );

-- UPDATE 정책: 본인만 수정 가능
create policy "emotions update self"
  on public.emotions for update
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

-- DELETE 정책: 본인만 삭제 가능
create policy "emotions delete self"
  on public.emotions for delete
  using ( auth.uid() = user_id );

-- ============================================
-- 4. updated_at 자동 갱신 트리거
-- ============================================

-- updated_at 자동 업데이트 함수
create or replace function public.handle_emotions_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 기존 트리거가 있으면 삭제
drop trigger if exists emotions_updated_at on public.emotions;

-- updated_at 트리거 생성
create trigger emotions_updated_at
  before update on public.emotions
  for each row
  execute function public.handle_emotions_updated_at();

-- ============================================
-- 5. 인덱스 추가 (성능 최적화)
-- ============================================

create index if not exists idx_emotions_user_id on public.emotions(user_id);
create index if not exists idx_emotions_created_at on public.emotions(created_at desc);
create index if not exists idx_emotions_is_public on public.emotions(is_public) where is_public = true;
create index if not exists idx_emotions_category_id on public.emotions(category_id) where category_id is not null;
create index if not exists idx_emotions_user_created on public.emotions(user_id, created_at desc);
