# 공감숲 카테고리 에러 수정 요약

## 수정한 파일 목록

1. **src/services/community.ts**
   - CommunityPost 타입: `category_id` → `category`로 변경
   - fetchCommunityPosts: `.eq('category_id', category)` → `.eq('category', category)`로 변경
   - createCommunityPost: payload의 `category_id` → `category`로 변경
   - updateCommunityPost: payload의 `category_id` → `category`로 변경

2. **src/hooks/useCommunity.ts**
   - CommunityPost 타입: `category_id` → `category`로 변경
   - fetchPosts: `.eq('category_id', selectedCategory)` → `.eq('category', selectedCategory)`로 변경
   - BEST 탭 필터 금지 로직 추가: `selectedCategory !== 'BEST'` 체크

3. **src/pages/Forest.tsx**
   - communityPostToForestPost: `post.category_id` → `post.category`로 변경
   - RECORD_CATEGORY_TO_FOREST 매핑 제거 (category가 이미 TEXT 값)
   - RECORD_CATEGORY_TO_FOREST import 제거
   - visiblePosts 로직 정리: BEST 탭은 필터 없이 전체 게시글 표시

## 핵심 코드 변경 diff 요약

### 1. CommunityPost 타입 변경
```typescript
// 변경 전
category_id: string | null;

// 변경 후
category: string | null;
```

### 2. 쿼리 필터 변경
```typescript
// 변경 전
query = query.eq('category_id', category);

// 변경 후
query = query.eq('category', category);
```

### 3. payload 변경
```typescript
// 변경 전 (createCommunityPost)
category_id: payload.category_id

// 변경 후
category: payload.category
```

### 4. Forest.tsx 변환 함수 변경
```typescript
// 변경 전
const forestCategory = post.category_id
  ? (RECORD_CATEGORY_TO_FOREST[post.category_id] as ForestCategory) || 'DAILY'
  : 'DAILY';

// 변경 후
const forestCategory = (post.category as ForestCategory) || '일상';
```

### 5. BEST 탭 필터 로직
```typescript
// useCommunity.ts
// BEST 탭은 필터 금지
if (selectedCategory && selectedCategory !== 'BEST') {
  query = query.eq('category', selectedCategory);
}

// Forest.tsx
// BEST 탭: category 필터 금지 (selectedCategory가 null일 때)
// 나머지 탭: category 값으로 필터
if (selectedCategory) {
  filtered = filtered.filter((post) => post.category === selectedCategory);
}
```

## 체크리스트

### ✅ 실행한 쿼리 확인

#### 1. 목록 조회 쿼리 (useCommunity.ts fetchPosts)
- [ ] BEST 탭 선택 시:
  - 쿼리: `.from('community_posts').select('*').eq('is_public', true)`
  - category 필터 없음 (정상)
  - 정렬: sortType에 따라 `like_count DESC` 또는 `created_at DESC`

- [ ] 일반 탭 선택 시 (예: '일상'):
  - 쿼리: `.from('community_posts').select('*').eq('is_public', true).eq('category', '일상')`
  - category 필터 적용됨 (정상)
  - 정렬: sortType에 따라 정렬

- [ ] 콘솔에서 확인할 쿼리 로그:
  ```javascript
  // useCommunity.ts의 diag.log 확인
  {
    table: 'community_posts',
    filters: { is_public: true, category: selectedCategory },
    sort: sortType
  }
  ```

#### 2. 작성/수정 쿼리 (services/community.ts)
- [ ] createCommunityPost 호출 시:
  - payload에 `category` 필드 포함 (TEXT 값, 예: '일상', '고민' 등)
  - `category_id` 필드 없음

- [ ] updateCommunityPost 호출 시:
  - payload에 `category` 필드 포함
  - `category_id` 필드 없음

### ✅ 탭별 동작 확인

#### BEST 탭
- [ ] selectedCategory가 `null`로 설정됨
- [ ] category 필터가 적용되지 않음 (전체 게시글 표시)
- [ ] 정렬 옵션:
  - '최신순': `created_at DESC`
  - '공감순': `like_count DESC` (동일 시 `created_at DESC`)

#### 일반 탭 (일상, 고민, 연애, 회사, 유머, 성장, 자기돌봄)
- [ ] selectedCategory가 해당 카테고리 값으로 설정됨 (예: '일상')
- [ ] category 필터가 적용됨: `.eq('category', selectedCategory)`
- [ ] 정렬 옵션:
  - '최신순': `created_at DESC`
  - '공감순': `like_count DESC` (동일 시 `created_at DESC`)

#### 탭 전환 테스트
- [ ] BEST → 일반 탭: 필터 적용됨
- [ ] 일반 탭 → BEST: 필터 제거됨
- [ ] 일반 탭 → 다른 일반 탭: 필터 값 변경됨

### ✅ Console/Supabase Error 확인 항목

#### 브라우저 콘솔 확인
- [ ] `[useCommunity] fetchPosts 시작` 로그 확인
  - `selectedCategory` 값 확인 (BEST 탭: null, 일반 탭: 카테고리명)
  - `sortType` 값 확인

- [ ] `[useCommunity] Supabase 쿼리 실행` 로그 확인
  - `filters.category` 값 확인
  - BEST 탭: `category: null`
  - 일반 탭: `category: '일상'` (또는 해당 카테고리)

- [ ] `[fetchCommunityPosts]` 관련 에러 없음 확인
  - 에러 메시지에 `category_id` 관련 내용 없음
  - 컬럼 관련 에러 없음

- [ ] `[createCommunityPost]` / `[updateCommunityPost]` 에러 없음 확인
  - `category_id` 필드 관련 에러 없음

#### Supabase Dashboard 확인
- [ ] community_posts 테이블에 `category` 컬럼 존재 (TEXT 타입)
- [ ] `category_id` 컬럼 없음 (또는 사용하지 않음)
- [ ] 쿼리 실행 시 에러 없음

#### 네트워크 탭 확인
- [ ] POST `/rest/v1/community_posts` 요청 확인
  - payload에 `category` 필드 포함
  - payload에 `category_id` 필드 없음

- [ ] GET `/rest/v1/community_posts` 요청 확인
  - 쿼리 파라미터에 `category=eq.일상` 형태로 필터 적용
  - BEST 탭: `category` 필터 없음

### ✅ 기능별 테스트 체크리스트

#### 목록 화면 테스트
- [ ] 공감숲 목록 화면 로드 성공
- [ ] BEST 탭 선택 시 전체 게시글 표시
- [ ] 일반 탭 선택 시 해당 카테고리 게시글만 표시
- [ ] 정렬 토글 동작 (최신순/공감순)
- [ ] 페이지네이션 동작 (있는 경우)

#### 게시글 표시 테스트
- [ ] 게시글 카테고리 필드 정상 표시
- [ ] 카테고리명이 올바르게 표시됨 (예: '일상', '고민' 등)
- [ ] 게시글 상세 화면 정상 표시

#### 에러 케이스 테스트
- [ ] category 값이 null인 게시글 처리 (기본값 '일상'으로 표시)
- [ ] 존재하지 않는 category 값 처리
- [ ] 네트워크 에러 시 에러 메시지 표시

### ⚠️ 주의사항

1. **emotions 테이블의 category_id는 그대로 유지**
   - Record.tsx에서 사용하는 emotions 테이블의 category_id는 변경하지 않음
   - community_posts만 category (TEXT) 컬럼 사용

2. **Supabase 트리거/함수 확인 필요**
   - community_posts를 생성하는 트리거나 함수가 있다면
   - 해당 부분도 category 필드를 사용하도록 수정 필요할 수 있음
   - (현재 코드베이스에서 확인되지 않음)

3. **데이터 마이그레이션**
   - 기존 데이터가 있다면 category_id → category 마이그레이션 필요
   - 또는 트리거/함수에서 자동 변환 처리 필요



