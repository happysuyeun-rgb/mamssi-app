# 코드 안정성 검사 보고서

> 최종 업데이트: 2026-03-24


검사일: 2025-02 기준  
대상: Supabase 트리거, community_posts 동기화, is_public/is_hidden, 에러 처리, 보안

---

## 1. Supabase 트리거가 제대로 작동하는지

### 1.1 `sync_community_post_from_emotion` (emotions → community_posts)

| 항목 | 상태 | 비고 |
|------|------|------|
| 트리거 존재 | ✅ | `sync_community_post_trigger` (AFTER INSERT OR UPDATE ON emotions) |
| 함수 버전 | ✅ | `supabase_fix_and_backfill_forest.sql` 기준: `main_emotion`만 사용, `emotion_type` 미참조 |
| INSERT 조건 | ✅ | `coalesce(NEW.is_public, false) = true` AND `forest_category is not null` |
| UPDATE 시 DELETE | ✅ | 공개→비공개 또는 category null 시 community_posts 행 삭제 |
| UPDATE 시 UPSERT | ✅ | 공개+카테고리 있으면 ON CONFLICT(emotion_id) DO UPDATE |
| 예외 처리 | ✅ | BEGIN/EXCEPTION WHEN OTHERS → raise warning, emotions 저장은 유지 |
| SECURITY DEFINER | ✅ | RLS 우회하여 트리거에서 community_posts INSERT/UPDATE/DELETE 가능 |

**권장:** 실제 Supabase 프로젝트에서 다음으로 트리거 적용 여부 확인.

```sql
SELECT tgname, tgenabled FROM pg_trigger
WHERE tgrelid = 'public.emotions'::regclass AND tgname LIKE '%community%';
```

### 1.2 `auto_hide_post_on_report` (reports INSERT 시 게시글 숨김)

| 항목 | 상태 | 비고 |
|------|------|------|
| 트리거 | ✅ | `trigger_auto_hide_post_on_report` AFTER INSERT ON reports |
| 동작 | ✅ | `update community_posts set is_hidden = true where id = NEW.post_id` |
| SECURITY DEFINER | ✅ | RLS 우회하여 업데이트 가능 |

---

## 2. community_posts에 데이터가 복사되는 로직

### 2.1 복사 경로 (단일)

- **emotions** 테이블에 INSERT/UPDATE 시 **트리거** `sync_community_post_from_emotion`만 사용.
- 프론트엔드에서 `community_posts`에 **직접 INSERT하는 코드는 없음** (감정 기록 저장 → emotions만 사용).
- `createCommunityPost()` 서비스 함수는 정의만 되어 있고, **현재 앱에서 호출하지 않음**.  
  (트리거가 복사하므로 정상 플로우에서는 불필요. 호출 시 `emotion_type` 컬럼 없으면 실패할 수 있음.)

### 2.2 트리거가 넣는 값

| 컬럼 | 값 |
|------|-----|
| emotion_id, user_id, content, image_url | emotions.NEW |
| emotion_category | NEW.category (영문) |
| category | forest_category (한글: 일상, 고민 등) |
| **is_public** | **true** (고정) |
| **is_hidden** | **false** (고정) |

### 2.3 백필

- `supabase_fix_and_backfill_forest.sql`의 백필 INSERT도 동일하게 `is_public = true`, `is_hidden = false`로 넣음.

---

## 3. is_public / is_hidden 값이 올바르게 들어가는지

### 3.1 트리거/백필

- INSERT 시 **항상** `true`, `false`를 명시적으로 넣음. NULL이 들어가지 않음.

### 3.2 RLS (supabase_community_final.sql)

- SELECT: `(is_public = true and is_hidden = false) or (is_hidden = true and auth.uid() = user_id)`
- **NULL 동작:** `is_public = true` 또는 `is_hidden = false`는 NULL과 비교 시 FALSE이므로, NULL인 행은 목록에 안 나옴 (의도에 부합).

### 3.3 프론트엔드 조회

- **community.ts** `fetchCommunityPosts`: `.eq('is_public', true).eq('is_hidden', false)` ✅
- **useCommunity** `fetchPosts`: `.eq('is_public', true)` 만 사용 → **권장:** `.eq('is_hidden', false)` 추가하여 RLS와 동일 조건으로 의도 명확히.

### 3.4 신고 시 숨김

- reports에 INSERT 시 트리거 `auto_hide_post_on_report`가 해당 `community_posts.id`에 대해 `is_hidden = true` 설정 ✅

---

## 4. 에러 처리가 빠진 곳

### 4.1 잘 되어 있는 곳

- **AuthProvider**: getSession / fetchUserProfile try-catch, 타임아웃, 로깅.
- **useEmotions**: insert/update/delete 후 error 체크, setError.
- **services/community.ts**: 각 함수 try-catch, console.error, throw.
- **useCommunity**: fetchPosts try-catch, RLS/네트워크 에러 메시지 분기.
- **트리거**: INSERT/UPDATE/DELETE 블록마다 EXCEPTION WHEN OTHERS → raise warning.

### 4.2 보완 권장

- **useCommunity** `toggleLike`, `reportPost`, `deletePost`: catch 후 사용자에게 알림(예: notify) 없이 로그만 하는 경우 있음. 실패 시 상태 롤백 또는 토스트 노출 검토.
- **Guard**: `refreshUserProfile()` 실패 시 이미 로컬 스토리지 fallback으로 진행하므로 치명적이진 않음.

---

## 5. 보안 취약점

### 5.1 reports 테이블 스키마 (확인됨)

**실제 DB 컬럼 (Supabase 조회 결과):**

| column_name | data_type | is_nullable |
|-------------|-----------|-------------|
| id | uuid | NO |
| reporter_id | uuid | NO |
| post_id | uuid | NO |
| reason | text | NO |
| **note** | text | YES |
| status | text | NO |
| created_at | timestamp with time zone | NO |

- **details 컬럼 없음.** 추가 메모는 **note** 컬럼에 저장.
- 앱에서는 reports INSERT 시 **post_id, reporter_id, reason, note** 전송 (note는 선택, UI에서 받은 추가 내용).

### 5.2 수정 반영된 보안 이슈

| 항목 | 조치 |
|------|------|
| reports INSERT | **reporter_id** 사용, **details 미전송** (컬럼 없음 확인됨). |

### 5.3 이미 잘 적용된 부분

- **RLS**: community_posts, community_likes, reports, emotions, user_settings 등 auth.uid() 기준 정책 적용.
- **이중 체크**: deleteCommunityPost, updateCommunityPost, updateEmotion 등에서 `.eq('user_id', userId)`로 서버 측 추가 검증.
- **트리거**: SECURITY DEFINER로 필요한 최소 권한만 사용, RLS 우회는 트리거 내부로 한정.
- **입력 검증**: useEmotions에서 main_emotion, content 필수 검증; Record 페이지에서 공개 시 카테고리 필수.

### 5.4 권장 추가 점검

- **content / memo / details** 등 사용자 입력은 DB 저장 시 이스케이프 불필요(PostgreSQL 파라미터 바인딩), 단 **화면 표시 시 XSS** 방지를 위해 React 기본 이스케이프 유지, HTML 직접 삽입 금지.
- Storage 버킷: 업로드 경로에 `user_id` 포함 여부 및 RLS로 본인만 접근 가능한지 확인.

---

## 6. 요약 및 적용한 수정

- **트리거:** 현재 프로젝트에 적용된 SQL(`supabase_fix_and_backfill_forest.sql`) 기준으로 정상 동작 설계. 실제 DB에 동일 버전 적용 여부는 Supabase에서 확인 필요.
- **community_posts 복사:** emotions 트리거만 사용, is_public/is_hidden 명시적 true/false.
- **에러 처리:** 전반적으로 try-catch 및 로깅 있음. 일부 UI 피드백 보강 권장.
- **보안:** reports INSERT를 **reporter_id** 및 **details**로 수정 필요. RLS·이중 체크는 양호.

아래는 이 보고서 반영 **코드 수정** 요약이다.

- useCommunity: reportPost 시 `reporter_id` 사용, fetchPosts 시 `is_hidden = false` 필터 추가.
- community.ts: reportPost INSERT 시 `details` 사용. createCommunityPost에서 emotion_type 제거(컬럼 없음 대응).
