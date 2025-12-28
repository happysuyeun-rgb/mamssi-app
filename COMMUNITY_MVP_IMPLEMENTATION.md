# 공감숲 MVP 구현 가이드

## 1. DB 설정

### Supabase SQL Editor에서 실행

```sql
-- supabase_community_mvp_setup.sql 파일 내용 실행
```

이 SQL은 다음을 수행합니다:
- `community_posts`에 `is_public`, `is_hidden` 컬럼 추가
- `reports`에 `reporter_id`, `status` 컬럼 추가
- RLS 정책 재설정 (숨김글은 본인만 조회)
- 신고 시 자동 숨김 처리 트리거

## 2. 서비스 함수

`src/services/community.ts`에 다음 함수들이 구현되어 있습니다:

- `fetchCommunityPosts`: 페이지네이션 지원 게시글 목록 조회
- `fetchCommunityPost`: 단일 게시글 조회
- `createCommunityPost`: 게시글 작성
- `updateCommunityPost`: 게시글 수정
- `deleteCommunityPost`: 게시글 삭제
- `toggleLike`: 공감 토글
- `reportPost`: 게시글 신고 (자동 숨김 처리)
- `fetchMyPosts`: 내 게시글 목록 조회

## 3. 컴포넌트 수정 필요 사항

### Forest.tsx 수정

1. **무한 스크롤 추가**
   - `useInfiniteScroll` 훅 또는 `IntersectionObserver` 사용
   - `fetchCommunityPosts`의 `page` 파라미터 활용
   - `hasMore`로 다음 페이지 로드 여부 결정

2. **카테고리 탭**
   - `best`: `sortBy='best'` (like_count DESC)
   - 나머지: `category` 필터 + `sortBy='latest'` (created_at DESC)

3. **상세 모달 분기**
   - `ForestPostSheet`에서 `post.isMine`으로 분기
   - 일반: 공감하기/공유하기/신고하기/닫기
   - 작성자: 삭제하기/공유하기/수정하기/닫기 (+ 연필 아이콘)

4. **신고 bottom sheet**
   - `ReportModal`을 bottom sheet 스타일로 수정
   - 사유 필수 선택 (라디오 버튼)
   - 추가 메모 (선택, textarea)
   - 완료 토스트: "신고 접수가 되었어요. 완전하게 살펴볼게요"

5. **플로팅 버튼**
   - `FabMenu` 수정 완료
   - "내 글 보기" / "글 작성하기" 버튼

## 4. 테스트 체크리스트

### DB 설정
- [ ] `supabase_community_mvp_setup.sql` 실행 완료
- [ ] `community_posts.is_public`, `is_hidden` 컬럼 확인
- [ ] `reports.reporter_id`, `status` 컬럼 확인
- [ ] RLS 정책 확인

### 기능 테스트
- [ ] 카테고리 탭 전환 (best/일상/고민/연애/회사/유머/성장/자기돌봄)
- [ ] best 탭: like_count DESC 정렬 확인
- [ ] 나머지 탭: created_at DESC 정렬 확인
- [ ] 무한 스크롤 동작 확인
- [ ] 게시글 작성 (로그인 유저만)
- [ ] 공감하기/공감 취소
- [ ] 상세 모달 열기 (일반/작성자 분기)
- [ ] 신고하기 (사유 선택, 메모 입력)
- [ ] 신고 후 게시글 자동 숨김 확인
- [ ] 플로팅 버튼: "내 글 보기" / "글 작성하기"
- [ ] 게스트는 작성/공감/신고 제한 확인

### UI/UX 확인
- [ ] 피드 카드 요소: 카테고리 배지, best/유머 배지, 작성일시, 작성자(mbti), 내용, 공감수
- [ ] 공감 토스트: "공감 한 방울이 전해졌어요"
- [ ] 신고 완료 토스트: "신고 접수가 되었어요. 완전하게 살펴볼게요"
- [ ] 상세 모달: 일반/작성자 버튼 분기
- [ ] 신고 bottom sheet: 사유 필수 선택, 메모 선택

## 5. 주요 변경 사항

### 기존 코드와의 차이점

1. **서비스 함수 분리**
   - `src/services/community.ts`에 모든 CRUD 함수 구현
   - `useCommunity` 훅은 상태 관리만 담당

2. **페이지네이션**
   - `fetchCommunityPosts`에 `page`, `pageSize` 파라미터 추가
   - `hasMore` 반환값으로 다음 페이지 존재 여부 확인

3. **신고 자동 숨김**
   - `auto_hide_post_on_report()` 트리거 함수
   - 신고 1회 시 `is_hidden=true` 자동 처리

4. **RLS 정책 강화**
   - 숨김글은 본인만 조회 가능
   - 공개글은 누구나 조회 가능

## 6. 다음 단계 (선택)

- [ ] best 정렬 성능 최적화 (like_count 캐시 컬럼 방식)
- [ ] 신고 N회 기준으로 변경 (현재는 1회)
- [ ] 게시글 수정 기능 완성
- [ ] 이미지 업로드/삭제 연동


