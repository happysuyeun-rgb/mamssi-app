# 공감숲 최종 SQL 수정 완료 요약

## 주요 수정 사항

### 1. reports 테이블 수정
- ✅ `user_id` 컬럼 제거 (reporter_id만 사용)
- ✅ `user_id` 관련 마이그레이션 로직 제거
- ✅ `idx_reports_user_id` 인덱스 제거
- ✅ RLS 정책은 이미 reporter_id 기준으로 유지됨

### 2. community_posts 테이블 구조 확정
- ✅ `emotion_category` 컬럼 추가 (영문 카테고리 저장)
- ✅ `category` 컬럼 유지 (한글 카테고리 저장)
- ✅ 트리거 함수에서 둘 다 저장:
  - `emotion_category` = `NEW.category` (영문: 'daily', 'worry' 등)
  - `category` = 한글 매핑 결과 ('일상', '고민' 등)

### 3. 트리거 통합
- ✅ `sync_community_post_trigger` 1개만 유지
- ✅ `after insert or update on public.emotions`

### 4. 기타 개선사항
- ✅ emotion_id NOT NULL + UNIQUE CONSTRAINT
- ✅ TG_OP 분기로 INSERT/UPDATE 안전하게 처리
- ✅ updated_at 자동 갱신 활성화

## 실행 순서

1. **`supabase_community_final.sql` 전체 실행**
2. **`supabase_community_verification.sql`로 검증**

## 검증 체크리스트

- [ ] 트리거 1개만 존재 (`sync_community_post_trigger`)
- [ ] emotion_id unique constraint 존재
- [ ] emotion_category, category 컬럼 둘 다 존재
- [ ] reports 테이블에 user_id 없음 (reporter_id만 존재)
- [ ] 트리거 함수가 emotion_category와 category 둘 다 저장
- [ ] 동기화 테스트 통과
- [ ] 카테고리 매핑 정상 작동

## 파일 목록

- `supabase_community_final.sql` - 최종 통합 SQL
- `supabase_community_verification.sql` - 검증 SQL
- `COMMUNITY_FINAL_EXECUTION_ORDER.md` - 실행 순서 및 체크리스트

