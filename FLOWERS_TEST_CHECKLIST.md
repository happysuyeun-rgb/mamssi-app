# Flowers 성장 로직 테스트 체크리스트

## 1. 신규 가입 → 로그인 → 감정 1개 저장

### 프론트엔드 확인
- [ ] 감정 기록 저장 성공
- [ ] 콘솔에 `[ensureFlowerRow] flowers row 생성 시도` 로그 확인
- [ ] 콘솔에 `[ensureFlowerRow] flowers row 생성 성공` 로그 확인
- [ ] 콘솔에 `[updateFlowerGrowth] 성장 업데이트 성공` 로그 확인
- [ ] 콘솔에 `[Record] 홈 데이터 refetch 완료` 로그 확인
- [ ] 홈 화면 게이지가 즉시 업데이트되는지 확인

### DB 확인 SQL
```sql
-- flowers row 생성 여부 확인
select 
  id,
  user_id,
  flower_type,
  growth_percent,
  is_bloomed,
  bloomed_at,
  created_at,
  updated_at
from public.flowers
where user_id = 'YOUR_USER_ID_HERE';  -- 실제 user_id로 변경

-- growth_percent가 1인지 확인
select 
  user_id,
  growth_percent,
  case 
    when growth_percent = 1 then '✅ 정상 (0→1 증가)'
    else '❌ 오류 (예상: 1, 실제: ' || growth_percent || ')'
  end as status
from public.flowers
where user_id = 'YOUR_USER_ID_HERE';
```

## 2. 같은 날 감정 수정

### 프론트엔드 확인
- [ ] 감정 기록 수정 성공
- [ ] 콘솔에 `[updateFlowerGrowth] UPDATE 모드 - 성장 증가 없음` 로그 확인
- [ ] `growth_percent`가 추가 증가하지 않는지 확인

### DB 확인 SQL
```sql
-- 수정 전 growth_percent 기록
-- (수정 전에 실행)
select growth_percent, updated_at 
from public.flowers 
where user_id = 'YOUR_USER_ID_HERE';

-- 수정 후 growth_percent 확인 (변화 없어야 함)
select 
  growth_percent,
  updated_at,
  case 
    when updated_at > (select updated_at from public.flowers where user_id = 'YOUR_USER_ID_HERE' limit 1 offset 1) 
    then '✅ updated_at만 변경됨 (성장 증가 없음)'
    else '❌ 오류'
  end as status
from public.flowers
where user_id = 'YOUR_USER_ID_HERE';
```

## 3. 다음날 감정 저장

### 프론트엔드 확인
- [ ] 다음날 감정 기록 저장 성공
- [ ] 콘솔에 `[updateFlowerGrowth] 성장 업데이트 성공` 로그 확인
- [ ] `oldGrowth`와 `newGrowth`가 +1 차이인지 확인
- [ ] 홈 화면 게이지가 새로고침 없이 즉시 반영되는지 확인

### DB 확인 SQL
```sql
-- growth_percent 증가 확인
select 
  user_id,
  growth_percent,
  updated_at,
  case 
    when growth_percent = (select growth_percent from public.flowers where user_id = 'YOUR_USER_ID_HERE' limit 1 offset 1) + 1
    then '✅ 정상 (+1 증가)'
    else '❌ 오류'
  end as status
from public.flowers
where user_id = 'YOUR_USER_ID_HERE'
order by updated_at desc
limit 1;
```

## 4. 100% 달성 시 개화

### 프론트엔드 확인
- [ ] `growth_percent >= 100`일 때 콘솔에 `[updateFlowerGrowth] 개화 달성! 🌸` 로그 확인
- [ ] 홈 화면에서 개화 상태 표시 확인

### DB 확인 SQL
```sql
-- 개화 상태 확인
select 
  user_id,
  growth_percent,
  is_bloomed,
  bloomed_at,
  case 
    when growth_percent >= 100 and is_bloomed = true and bloomed_at is not null
    then '✅ 개화 완료'
    when growth_percent >= 100 and (is_bloomed = false or bloomed_at is null)
    then '❌ 개화 로직 오류'
    else '⏳ 아직 개화 전'
  end as status
from public.flowers
where user_id = 'YOUR_USER_ID_HERE';
```

## 5. 홈 화면 게이지 즉시 반영

### 프론트엔드 확인
- [ ] 감정 저장 후 홈 화면으로 이동
- [ ] "나의정원" 게이지가 새로고침 없이 즉시 업데이트되는지 확인
- [ ] 콘솔에 `[Record] 홈 데이터 refetch 완료 (flowers 업데이트 후)` 로그 확인

### DB 확인 SQL
```sql
-- 최근 flowers 업데이트 시간 확인
select 
  user_id,
  growth_percent,
  updated_at,
  now() - updated_at as time_since_update
from public.flowers
where user_id = 'YOUR_USER_ID_HERE'
order by updated_at desc
limit 1;
```

## 6. ensureFlowerRow 호출 시점 확인

### 호출 위치
1. **Record.tsx** - `updateFlowerGrowth` 내부에서 호출
2. **useHomeData.ts** - flowers 조회 실패 시 fallback으로 호출

### 콘솔 로그 확인
- `[ensureFlowerRow] flowers row 생성 시도` - row가 없을 때
- `[ensureFlowerRow] flowers row 존재` - row가 이미 있을 때
- `[ensureFlowerRow] flowers row 생성 성공` - 생성 성공 시
- `[ensureFlowerRow] flowers 생성 실패` - 생성 실패 시 (RLS/권한 오류 가능)

## 7. updateFlowerGrowth 호출 시점 확인

### 호출 위치
1. **Record.tsx** - 감정 저장 성공 후 (신규: `isNewRecord=true`, 수정: `isNewRecord=false`)

### 콘솔 로그 확인
- `[updateFlowerGrowth] 성장 업데이트 성공` - 성공 시
- `[updateFlowerGrowth] UPDATE 모드 - 성장 증가 없음` - 수정 모드
- `[updateFlowerGrowth] 오늘 이미 기록 존재 - 성장 증가 없음` - 중복 방지
- `[updateFlowerGrowth] flowers 업데이트 실패` - 실패 시

## 8. 홈 데이터 refetch 확인

### 호출 위치
1. **Record.tsx** - `updateFlowerGrowth` 성공 후 `refetchHomeData()` 호출

### 콘솔 로그 확인
- `[Record] 홈 데이터 refetch 완료 (flowers 업데이트 후)` - 성공 시
- `[Record] 홈 데이터 refetch 실패` - 실패 시

## 9. 문제 해결 체크리스트

### growth_percent가 안 오르는 경우
1. [ ] RLS 정책이 올바르게 설정되었는지 확인
2. [ ] `ensureFlowerRow`가 정상 호출되는지 확인 (콘솔 로그)
3. [ ] `updateFlowerGrowth`가 정상 호출되는지 확인 (콘솔 로그)
4. [ ] `isNewRecord` 파라미터가 올바른지 확인 (`true`여야 증가)
5. [ ] 같은 날 중복 기록이 아닌지 확인 (`hasEmotionToday` 체크)
6. [ ] DB에서 직접 `growth_percent` 값 확인

### 홈 게이지가 즉시 반영되지 않는 경우
1. [ ] `refetchHomeData()`가 `updateFlowerGrowth` **이후**에 호출되는지 확인
2. [ ] `refetchHomeData()` 성공 로그 확인
3. [ ] `useHomeData`의 `flower` state가 업데이트되는지 확인
4. [ ] 브라우저 새로고침 후 게이지 확인 (캐시 문제 가능)

