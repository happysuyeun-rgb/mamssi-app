# 공개 기록이 공감숲에 안 보일 때

## 동작 방식

1. **감정 기록**을 "공개 기록"으로 저장하면 `emotions` 테이블에 `is_public = true`로 저장됩니다.
2. **공감숲**에 보이려면 같은 내용이 `community_posts` 테이블에도 있어야 합니다.
3. `community_posts`에는 **DB 트리거** `sync_community_post_from_emotion`이 `emotions` INSERT/UPDATE 시 자동으로 넣어 줍니다.

## 트리거 조건 (공감숲 노출 조건)

트리거가 `community_posts`에 넣는 조건은 **둘 다 만족**할 때입니다.

- `emotions.is_public = true`
- `emotions.category`가 **영문 키** 중 하나: `daily`, `worry`, `love`, `work`, `humor`, `growth`, `selfcare`

즉, **공개만 선택하고 "감정 카테고리"(일상/고민/연애 등)를 선택하지 않으면** `category`가 null이라 트리거가 동기화하지 않고, 공감숲에 글이 안 보입니다.

## 앱에서의 필수 입력

- 기록 화면에서 **"공개 기록"** 토글을 켜면 **"감정 카테고리"** 섹션이 나타납니다.
- **공감숲에 노출되려면 여기서 반드시 하나를 선택**해야 합니다. (저장 버튼도 카테고리 선택 시에만 활성화됩니다.)

## DB 쪽 점검 (개발자)

1. **트리거 적용 여부**  
   Supabase SQL Editor에서:
   ```sql
   select tgname from pg_trigger where tgrelid = 'public.emotions'::regclass and tgname like '%community%';
   ```
   → `sync_community_post_trigger` (또는 동일 트리거명)가 있어야 합니다.

2. **트리거 버전**  
   `emotions` 테이블에는 `main_emotion`만 있고 `emotion_type` 컬럼은 없을 수 있습니다.  
   트리거 함수가 `NEW.emotion_type`을 참조하면 에러로 INSERT가 실패할 수 있으므로, **`fix_emotion_type_trigger_error.sql`** 에서처럼 `coalesce(NEW.main_emotion, '감정')`만 사용하는 버전을 적용해야 합니다.

3. **community_posts에 들어갔는지 확인**  
   ```sql
   select id, emotion_id, user_id, category, is_public, is_hidden
   from public.community_posts
   order by created_at desc limit 20;
   ```
   해당 `emotion_id`가 있는지 확인합니다.

4. **RLS**  
   공감숲 조회는 `community_posts`의 `is_public = true`인 행을 읽습니다.  
   해당 SELECT용 RLS 정책이 있어야 하며, `is_hidden = false`인 글만 보이도록 필터링하는 경우 숨김 처리 여부도 확인합니다.

## 프론트엔드 보완

공개인데 카테고리가 비어 있는 경우(예: 예전 데이터, 수정 화면)를 대비해, **공개 기록일 때만** `category`가 없으면 기본값 `daily`를 넣어 주면 트리거가 항상 동기화할 수 있습니다. (아래 코드 반영됨)
