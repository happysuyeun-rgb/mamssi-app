-- ============================================
-- 마음씨(Mamssi) 감정 기록(emotions) 테이블 설정
-- ============================================

-- emotions 테이블 생성
create table if not exists public.emotions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  emotion_type text not null, -- 대표 감정명 (예: 기쁨, 슬픔 등)
  intensity int check (intensity between 1 and 5),
  content text not null,
  image_url text,
  is_public boolean default false,
  category_id text, -- 공감숲 카테고리 (예: 'daily', 'worry', 'love' 등)
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- RLS (Row Level Security) 활성화
alter table public.emotions enable row level security;

-- 정책: 공개글은 모두 조회 가능, 비공개글은 본인만 조회 가능
create policy "emotions read public or self"
  on public.emotions for select
  using ( is_public = true or auth.uid() = user_id );

-- 정책: 본인만 수정/삭제 가능
create policy "emotions modify self"
  on public.emotions for all
  using ( auth.uid() = user_id );

-- updated_at 자동 업데이트 함수 (이미 존재하면 스킵)
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

-- updated_at 트리거
drop trigger if exists update_emotions_updated_at on public.emotions;
create trigger update_emotions_updated_at
  before update on public.emotions
  for each row execute function update_updated_at_column();

-- 인덱스 추가 (성능 최적화)
create index if not exists idx_emotions_user_id on public.emotions(user_id);
create index if not exists idx_emotions_created_at on public.emotions(created_at desc);
create index if not exists idx_emotions_is_public on public.emotions(is_public) where is_public = true;
create index if not exists idx_emotions_category_id on public.emotions(category_id) where category_id is not null;



