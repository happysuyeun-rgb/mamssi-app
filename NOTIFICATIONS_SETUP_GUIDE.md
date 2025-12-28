# Notifications 테이블 설정 가이드

## 1. 순수 SQL (Supabase SQL Editor에 복사/붙여넣기)

```sql
-- ============================================
-- 마음씨(Mamssi) 알림(notifications) 테이블 설정
-- ============================================

-- notifications 테이블 생성
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text,
  message text,
  is_read boolean default false,
  created_at timestamp with time zone default now()
);

-- 인덱스 추가
create index if not exists idx_notifications_user_id_created_at 
  on public.notifications(user_id, created_at desc);

-- RLS 활성화
alter table public.notifications enable row level security;

-- 기존 정책 삭제 (있는 경우)
drop policy if exists "notifications select self" on public.notifications;
drop policy if exists "notifications insert self" on public.notifications;
drop policy if exists "notifications update self" on public.notifications;
drop policy if exists "notifications delete self" on public.notifications;

-- 정책: 본인만 조회 가능
create policy "notifications select self"
  on public.notifications for select
  using ( auth.uid() = user_id );

-- 정책: 본인만 삽입 가능
create policy "notifications insert self"
  on public.notifications for insert
  with check ( auth.uid() = user_id );

-- 정책: 본인만 수정 가능
create policy "notifications update self"
  on public.notifications for update
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

-- 정책: 본인만 삭제 가능
create policy "notifications delete self"
  on public.notifications for delete
  using ( auth.uid() = user_id );
```

## 2. 실행 순서

1. Supabase SQL Editor 열기
2. 위 SQL 전체를 복사/붙여넣기
3. 실행 버튼 클릭
4. 성공 메시지 확인

## 3. 읽음 처리용 Update Query 예시

```sql
-- 단일 알림 읽음 처리
update public.notifications
set is_read = true
where user_id = auth.uid() and id = 'notification_id_here';

-- 모든 알림 읽음 처리
update public.notifications
set is_read = true
where user_id = auth.uid() and is_read = false;
```

## 4. 확인 SQL

```sql
-- RLS 정책 확인
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where tablename = 'notifications';

-- 인덱스 확인
select indexname, indexdef
from pg_indexes
where tablename = 'notifications';

-- 알림 데이터 확인 (본인 것만)
select id, type, title, message, is_read, created_at
from public.notifications
where user_id = auth.uid()
order by created_at desc
limit 10;
```


