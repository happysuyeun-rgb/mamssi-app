-- ============================================
-- 마음씨(Mamssi) 성장/개화(flowers) 테이블 설정
-- ============================================

-- flowers 테이블 생성
create table if not exists public.flowers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  growth_pct int default 0,        -- 성장 게이지 % (0-100)
  bloom_level int default 0,       -- 개화 단계 (0~5: 씨앗~만개)
  last_updated timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  unique(user_id)
);

-- RLS 활성화
alter table public.flowers enable row level security;

-- 정책: 본인만 조회/수정 가능
create policy "flowers select self"
  on public.flowers for select
  using ( auth.uid() = user_id );

create policy "flowers insert self"
  on public.flowers for insert
  with check ( auth.uid() = user_id );

create policy "flowers update self"
  on public.flowers for update
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

-- 인덱스 추가
create index if not exists idx_flowers_user_id on public.flowers(user_id);

-- 성장 업데이트 함수
create or replace function public.update_flower_growth(uid uuid)
returns void as $$
declare
  record_count int;
  calculated_pct int;
  calculated_bloom int;
begin
  -- 최근 30일간 기록 수 계산
  select count(*) into record_count
  from public.emotions
  where user_id = uid
    and created_at > now() - interval '30 days';

  -- growth_pct 계산: (기록 수 / 30) * 100, 최대 100
  calculated_pct := least(100, (record_count * 100 / 30));

  -- bloom_level 계산: growth_pct 기반
  if calculated_pct >= 100 then
    calculated_bloom := 5; -- 만개
  elsif calculated_pct >= 80 then
    calculated_bloom := 4; -- 반개화
  elsif calculated_pct >= 60 then
    calculated_bloom := 3; -- 봉오리
  elsif calculated_pct >= 40 then
    calculated_bloom := 2; -- 줄기
  elsif calculated_pct >= 20 then
    calculated_bloom := 1; -- 새싹
  else
    calculated_bloom := 0; -- 씨앗
  end if;

  -- flowers 테이블 업데이트 또는 삽입
  insert into public.flowers (user_id, growth_pct, bloom_level, last_updated)
  values (uid, calculated_pct, calculated_bloom, now())
  on conflict (user_id)
  do update set
    growth_pct = calculated_pct,
    bloom_level = calculated_bloom,
    last_updated = now();
end;
$$ language plpgsql security definer;

-- emotions 테이블 변경 시 자동으로 flowers 업데이트하는 트리거
create or replace function public.auto_update_flower_on_emotion()
returns trigger as $$
begin
  -- emotions 변경 시 해당 사용자의 flowers 업데이트
  perform public.update_flower_growth(COALESCE(NEW.user_id, OLD.user_id));
  return COALESCE(NEW, OLD);
end;
$$ language plpgsql security definer;

-- 트리거 생성
drop trigger if exists trigger_update_flower_on_emotion on public.emotions;
create trigger trigger_update_flower_on_emotion
  after insert or update or delete on public.emotions
  for each row execute function public.auto_update_flower_on_emotion();

-- 사용자별 공감수 합계 함수 (선택사항)
create or replace function public.get_user_like_sum(uid uuid)
returns table(sum bigint) as $$
begin
  return query
  select coalesce(sum(cp.like_count), 0)::bigint as sum
  from public.community_posts cp
  where cp.user_id = uid;
end;
$$ language plpgsql security definer;


