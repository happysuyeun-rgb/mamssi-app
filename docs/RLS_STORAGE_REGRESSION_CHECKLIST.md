# Supabase RLS/Storage 권한 회귀 테스트 체크리스트

배포 전 RLS 및 Storage 정책이 의도대로 동작하는지 검증하는 체크리스트입니다.

---

## 사전 준비

- [ ] Supabase 프로젝트 연결 확인 (`.env` 설정)
- [ ] `fix_user_settings_rls_policy.sql` 적용 여부 확인
- [ ] `create_profile_images_bucket.sql` 적용 여부 확인
- [ ] `create_emotion_images_bucket.sql` 적용 여부 확인
- [ ] `fix_emotion_type_trigger_error.sql` 적용 여부 확인 (emotions → community_posts 동기화)

---

## 시나리오 1: 신규 로그인 후 user_settings 보장 / seed_name 저장

**대상**: 신규 가입 사용자

| # | 검증 항목 | 예상 결과 | 확인 |
|---|-----------|-----------|------|
| 1.1 | 회원가입 후 온보딩 화면 진입 | `/onboarding`으로 리다이렉트 | ☐ |
| 1.2 | 씨앗 이름 입력 후 "시작하기" 클릭 | `user_settings` 레코드 생성 (INSERT) | ☐ |
| 1.3 | `user_settings.seed_name` 저장 | DB에 seed_name 값 저장됨 | ☐ |
| 1.4 | `users.onboarding_completed = true` | 온보딩 완료 플래그 저장됨 | ☐ |
| 1.5 | 홈 화면 진입 후 씨앗 배지 표시 | 입력한 seed_name이 UI에 표시됨 | ☐ |
| 1.6 | 씨앗 이름 수정 (편집 아이콘 → 저장) | `user_settings` UPDATE 성공 | ☐ |

**RLS 관련**:
- `user_settings_insert`: 본인만 INSERT 가능 (`auth.uid() = user_id`)
- `user_settings_update`: 본인만 UPDATE 가능
- `user_settings_select`: 본인만 SELECT 가능

**실패 시 확인**:
- Supabase Dashboard → Table Editor → user_settings
- RLS 정책: `fix_user_settings_rls_policy.sql` 재적용

---

## 시나리오 2: 프로필 업로드 / 삭제

**대상**: 로그인 사용자 (게스트 제외)

| # | 검증 항목 | 예상 결과 | 확인 |
|---|-----------|-----------|------|
| 2.1 | 마이프로필 → 프로필 설정 → 이미지 업로드 | `profile-images` 버킷에 저장됨 | ☐ |
| 2.2 | 경로 형식 | `{userId}/{filename}` (예: `abc123/profile.123.jpg`) | ☐ |
| 2.3 | `user_settings.profile_url` 업데이트 | Public URL 저장됨 | ☐ |
| 2.4 | 프로필 이미지 UI 표시 | 업로드한 이미지가 표시됨 | ☐ |
| 2.5 | "기본 이모티콘으로 변경" 클릭 | Storage에서 이미지 삭제 | ☐ |
| 2.6 | `user_settings.profile_url = null` | DB에 null 저장됨 | ☐ |

**Storage RLS 관련**:
- INSERT: `(string_to_array(name, '/'))[1] = auth.uid()::text` (본인 경로만 업로드)
- UPDATE/DELETE: 동일 경로 제한
- SELECT: public 버킷이므로 조회 가능

**실패 시 확인**:
- 버킷 `profile-images` 존재 여부
- `create_profile_images_bucket.sql` 재적용

---

## 시나리오 3: 비공개 기록 저장

**대상**: 로그인 사용자

| # | 검증 항목 | 예상 결과 | 확인 |
|---|-----------|-----------|------|
| 3.1 | 기록 화면 → 감정 선택, 내용 입력 | 공개 토글 OFF (비공개) | ☐ |
| 3.2 | 저장 버튼 클릭 | `emotions` 테이블에 INSERT 성공 | ☐ |
| 3.3 | `emotions.is_public = false` | 비공개로 저장됨 | ☐ |
| 3.4 | 공감숲 피드에 노출되지 않음 | `community_posts`에 동기화되지 않음 | ☐ |
| 3.5 | 본인 홈/주간 달력에서만 조회 가능 | 본인만 해당 기록 조회 | ☐ |

**RLS 관련**:
- `emotions insert self`: 본인만 INSERT
- `emotions select public or self`: `is_public = true` 또는 `auth.uid() = user_id`

---

## 시나리오 4: 공개 기록 저장 및 공감숲 노출

**대상**: 로그인 사용자

| # | 검증 항목 | 예상 결과 | 확인 |
|---|-----------|-----------|------|
| 4.1 | 기록 화면 → 감정 선택, 내용 입력 | 공개 토글 ON (공개) | ☐ |
| 4.2 | 저장 버튼 클릭 | `emotions` 테이블에 INSERT 성공 | ☐ |
| 4.3 | `emotions.is_public = true` | 공개로 저장됨 | ☐ |
| 4.4 | 트리거 `sync_community_post_from_emotion` 동작 | `community_posts`에 레코드 생성 | ☐ |
| 4.5 | 공감숲 탭 진입 | 해당 게시글이 피드에 노출됨 | ☐ |
| 4.6 | 카테고리 필터 적용 | 카테고리별 필터링 동작 | ☐ |

**RLS 관련**:
- `community_posts read all`: 공개글은 모두 조회 가능
- 트리거: `emotions.main_emotion` → `community_posts.emotion_type` (emotion_type 컬럼 사용)

---

## 시나리오 5: 권한 검증 (타인 글 수정/삭제 불가, 게스트 작성 불가, Storage 타인 경로 접근 불가)

**대상**: 다중 사용자 / 게스트

### 5-A. 타인 글 수정/삭제 불가

| # | 검증 항목 | 예상 결과 | 확인 |
|---|-----------|-----------|------|
| 5A.1 | 사용자 A로 로그인 → 공개 기록 작성 | 성공 | ☐ |
| 5A.2 | 사용자 B로 로그인 → A의 기록 수정 시도 (API/직접 호출) | RLS로 차단, 0 rows updated | ☐ |
| 5A.3 | 사용자 B로 A의 기록 삭제 시도 | RLS로 차단, 0 rows deleted | ☐ |
| 5A.4 | `community_posts` 타인 글 수정/삭제 | `community_posts modify self` 정책으로 차단 | ☐ |

### 5-B. 게스트 작성 불가

| # | 검증 항목 | 예상 결과 | 확인 |
|---|-----------|-----------|------|
| 5B.1 | 게스트 모드 진입 (온보딩 → 게스트로 둘러보기) | 홈 화면 진입, 읽기만 가능 | ☐ |
| 5B.2 | 게스트가 기록 저장 시도 | 로그인 유도 모달/토스트 표시 | ☐ |
| 5B.3 | 게스트가 공감(좋아요) 시도 | 로그인 유도 | ☐ |
| 5B.4 | 게스트가 프로필 수정 시도 | 버튼 비활성화 또는 로그인 유도 | ☐ |
| 5B.5 | `auth.uid()` 없이 emotions INSERT 시도 | RLS `emotions insert self` 실패 (anon 불가) | ☐ |

### 5-C. Storage 타인 경로 접근 불가

| # | 검증 항목 | 예상 결과 | 확인 |
|---|-----------|-----------|------|
| 5C.1 | 사용자 A의 `profile-images/{A_id}/xxx.jpg` 업로드 | A로 로그인 시 성공 | ☐ |
| 5C.2 | 사용자 B가 `profile-images/{A_id}/yyy.jpg` 업로드 시도 | RLS INSERT 정책 위반, 실패 | ☐ |
| 5C.3 | 사용자 B가 `profile-images/{A_id}/xxx.jpg` 삭제 시도 | RLS DELETE 정책 위반, 실패 | ☐ |
| 5C.4 | `emotion-images/{A_id}/zzz.jpg` — B가 A 경로에 업로드 시도 | RLS 실패 | ☐ |

**Storage RLS 정책 요약**:
- `profile-images`: `(string_to_array(name, '/'))[1] = auth.uid()::text`
- `emotion-images`: `(storage.foldername(name))[1] = auth.uid()::text`

---

## 요약: 최소 5개 시나리오

| 시나리오 | 설명 |
|----------|------|
| 1 | 신규 로그인 후 user_settings 보장 / seed_name 저장 |
| 2 | 프로필 업로드 / 삭제 |
| 3 | 비공개 기록 저장 |
| 4 | 공개 기록 저장 및 공감숲 노출 |
| 5 | 권한: 타인 글 수정/삭제 불가, 게스트 작성 불가, Storage 타인 경로 접근 불가 |

---

## 회귀 테스트 실행 순서

1. **로컬 개발 서버** 실행: `npm run dev`
2. **시나리오 1** → 신규 계정 생성 후 온보딩 및 seed_name 저장
3. **시나리오 2** → 프로필 이미지 업로드/삭제
4. **시나리오 3** → 비공개 기록 저장
5. **시나리오 4** → 공개 기록 저장 후 공감숲 확인
6. **시나리오 5** → 다중 계정/게스트로 권한 검증

---

## 관련 SQL 스크립트

| 파일 | 용도 |
|------|------|
| `fix_user_settings_rls_policy.sql` | user_settings RLS |
| `create_profile_images_bucket.sql` | profile-images 버킷 + RLS |
| `create_emotion_images_bucket.sql` | emotion-images 버킷 + RLS |
| `fix_emotion_type_trigger_error.sql` | emotions → community_posts 트리거 수정 |

---

## 테스트 결과 기록

- **테스트 일시**: _______________
- **테스터**: _______________
- **통과**: ___ / 5 시나리오
- **실패 항목**: _______________
- **비고**: _______________
