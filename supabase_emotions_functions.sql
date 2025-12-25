-- ============================================
-- 마음씨(Mamssi) 감정 기록(emotions) CRUD 함수
-- ============================================
-- RLS 정책과 함께 사용하여 안전한 데이터 접근 보장
-- ============================================

-- ============================================
-- 1. 감정 기록 생성 함수
-- ============================================

create or replace function public.create_emotion(
  p_user_id uuid,
  p_emotion_type text,
  p_content text,
  p_intensity int default null,
  p_image_url text default null,
  p_is_public boolean default false,
  p_category_id text default null
)
returns public.emotions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_emotion public.emotions;
begin
  -- 인증 확인: 본인만 생성 가능
  if auth.uid() is null or auth.uid() != p_user_id then
    raise exception 'Unauthorized: 본인만 감정 기록을 생성할 수 있습니다.';
  end if;

  -- 필수 필드 검증
  if p_emotion_type is null or p_emotion_type = '' then
    raise exception 'emotion_type은 필수입니다.';
  end if;

  if p_content is null or p_content = '' then
    raise exception 'content는 필수입니다.';
  end if;

  -- intensity 범위 검증
  if p_intensity is not null and (p_intensity < 1 or p_intensity > 5) then
    raise exception 'intensity는 1~5 사이의 값이어야 합니다.';
  end if;

  -- 감정 기록 생성
  insert into public.emotions (
    user_id,
    emotion_type,
    intensity,
    content,
    image_url,
    is_public,
    category_id
  ) values (
    p_user_id,
    p_emotion_type,
    p_intensity,
    p_content,
    p_image_url,
    p_is_public,
    p_category_id
  )
  returning * into v_emotion;

  return v_emotion;
end;
$$;

-- ============================================
-- 2. 감정 기록 조회 함수 (단일)
-- ============================================

create or replace function public.get_emotion(
  p_emotion_id uuid
)
returns public.emotions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_emotion public.emotions;
begin
  -- RLS 정책에 따라 자동으로 필터링됨
  select * into v_emotion
  from public.emotions
  where id = p_emotion_id;

  if v_emotion is null then
    raise exception '감정 기록을 찾을 수 없습니다.';
  end if;

  return v_emotion;
end;
$$;

-- ============================================
-- 3. 감정 기록 목록 조회 함수
-- ============================================

create or replace function public.get_emotions(
  p_user_id uuid default null,
  p_public_only boolean default false,
  p_limit int default 100,
  p_offset int default 0
)
returns table (
  id uuid,
  user_id uuid,
  emotion_type text,
  intensity int,
  content text,
  image_url text,
  is_public boolean,
  category_id text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- RLS 정책에 따라 자동으로 필터링됨
  return query
  select
    e.id,
    e.user_id,
    e.emotion_type,
    e.intensity,
    e.content,
    e.image_url,
    e.is_public,
    e.category_id,
    e.created_at,
    e.updated_at
  from public.emotions e
  where
    (p_user_id is null or e.user_id = p_user_id)
    and (not p_public_only or e.is_public = true)
  order by e.created_at desc
  limit p_limit
  offset p_offset;
end;
$$;

-- ============================================
-- 4. 감정 기록 수정 함수
-- ============================================

create or replace function public.update_emotion(
  p_emotion_id uuid,
  p_emotion_type text default null,
  p_content text default null,
  p_intensity int default null,
  p_image_url text default null,
  p_is_public boolean default null,
  p_category_id text default null
)
returns public.emotions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_emotion public.emotions;
  v_user_id uuid;
begin
  -- 기존 기록 조회
  select * into v_emotion
  from public.emotions
  where id = p_emotion_id;

  if v_emotion is null then
    raise exception '감정 기록을 찾을 수 없습니다.';
  end if;

  -- 인증 확인: 본인만 수정 가능
  if auth.uid() is null or auth.uid() != v_emotion.user_id then
    raise exception 'Unauthorized: 본인만 감정 기록을 수정할 수 있습니다.';
  end if;

  -- intensity 범위 검증
  if p_intensity is not null and (p_intensity < 1 or p_intensity > 5) then
    raise exception 'intensity는 1~5 사이의 값이어야 합니다.';
  end if;

  -- 감정 기록 수정
  update public.emotions
  set
    emotion_type = coalesce(p_emotion_type, emotion_type),
    content = coalesce(p_content, content),
    intensity = coalesce(p_intensity, intensity),
    image_url = coalesce(p_image_url, image_url),
    is_public = coalesce(p_is_public, is_public),
    category_id = coalesce(p_category_id, category_id),
    updated_at = now()
  where id = p_emotion_id
  returning * into v_emotion;

  return v_emotion;
end;
$$;

-- ============================================
-- 5. 감정 기록 삭제 함수
-- ============================================

create or replace function public.delete_emotion(
  p_emotion_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  -- 기존 기록 조회
  select user_id into v_user_id
  from public.emotions
  where id = p_emotion_id;

  if v_user_id is null then
    raise exception '감정 기록을 찾을 수 없습니다.';
  end if;

  -- 인증 확인: 본인만 삭제 가능
  if auth.uid() is null or auth.uid() != v_user_id then
    raise exception 'Unauthorized: 본인만 감정 기록을 삭제할 수 있습니다.';
  end if;

  -- 감정 기록 삭제
  delete from public.emotions
  where id = p_emotion_id;

  return true;
end;
$$;

-- ============================================
-- 6. 날짜별 감정 기록 조회 함수
-- ============================================

create or replace function public.get_emotion_by_date(
  p_user_id uuid,
  p_date date
)
returns public.emotions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_emotion public.emotions;
begin
  -- 인증 확인: 본인만 조회 가능
  if auth.uid() is null or auth.uid() != p_user_id then
    raise exception 'Unauthorized: 본인만 감정 기록을 조회할 수 있습니다.';
  end if;

  -- 날짜별 감정 기록 조회
  select * into v_emotion
  from public.emotions
  where user_id = p_user_id
    and date(created_at) = p_date
  order by created_at desc
  limit 1;

  return v_emotion;
end;
$$;

-- ============================================
-- 7. 사용자별 감정 기록 통계 함수
-- ============================================

create or replace function public.get_emotion_stats(
  p_user_id uuid
)
returns table (
  total_count bigint,
  public_count bigint,
  private_count bigint,
  latest_created_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 인증 확인: 본인만 조회 가능
  if auth.uid() is null or auth.uid() != p_user_id then
    raise exception 'Unauthorized: 본인만 통계를 조회할 수 있습니다.';
  end if;

  -- 통계 조회
  return query
  select
    count(*) as total_count,
    count(*) filter (where is_public = true) as public_count,
    count(*) filter (where is_public = false) as private_count,
    max(created_at) as latest_created_at
  from public.emotions
  where user_id = p_user_id;
end;
$$;

