# 공개 기록이 공감숲에 표시되지 않는 문제 수정

## 문제 원인

1. **트리거 함수가 category_id를 사용**: `supabase_community_setup.sql`의 트리거 함수가 `category_id` 컬럼을 사용했지만, `community_posts` 테이블은 이제 `category` 컬럼을 사용합니다.

2. **카테고리 변환 누락**: `emotions.category_id` (영문: 'daily', 'worry' 등)를 `community_posts.category` (한글: '일상', '고민' 등)로 변환하는 로직이 트리거에 없었습니다.

3. **테이블 스키마 불일치**: `community_posts` 테이블에 `category` 컬럼이 없거나, `category_id`와 `category`가 혼재되어 있었습니다.

## 수정 사항

### 1. 마이그레이션 스크립트 생성
`supabase_community_category_migration.sql` 파일 생성:
- `category` 컬럼 추가
- 기존 데이터 마이그레이션 (category_id → category 변환)
- 트리거 함수 업데이트
- emotion_id unique constraint 추가

### 2. 트리거 함수 수정
`supabase_community_setup.sql`의 `sync_community_post_from_emotion()` 함수 수정:
- `category_id` → `category`로 변경
- 영문 카테고리 → 한글 카테고리 변환 로직 추가
- `is_public`, `is_hidden` 컬럼 추가
- `emotion_id` unique constraint를 사용한 `on conflict` 처리

### 3. 테이블 스키마 정리
- `category_id` 컬럼 제거 (주석 처리)
- `category` 컬럼 사용

## 실행 방법

1. **마이그레이션 스크립트 실행**:
   ```sql
   -- Supabase SQL Editor에서 실행
   -- supabase_community_category_migration.sql 파일의 내용 실행
   ```

2. **트리거 함수 재생성**:
   ```sql
   -- supabase_community_setup.sql의 트리거 함수 부분 실행
   ```

3. **확인**:
   - 공개 기록 저장 시 `community_posts` 테이블에 데이터가 생성되는지 확인
   - `category` 컬럼에 한글 값('일상', '고민' 등)이 저장되는지 확인
   - 공감숲 화면에서 게시글이 표시되는지 확인

## 주의사항

1. **emotions 테이블 컬럼명**: `emotion_type` 또는 `main_emotion` 사용 가능
   - 트리거 함수에서 `coalesce(NEW.main_emotion, NEW.emotion_type)` 사용
   - 실제 스키마에 맞게 조정 필요

2. **기존 데이터**: 기존에 `category_id`로 저장된 데이터는 마이그레이션 스크립트로 변환됩니다.

3. **unique constraint**: `emotion_id`에 unique constraint가 있어야 `on conflict` 처리가 가능합니다.



