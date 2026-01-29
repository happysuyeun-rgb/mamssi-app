# 리팩터링 요약

## 완료된 작업

### 1. 타입 정의 통합 ✅
- **파일**: `src/types/database.ts`
- 모든 DB row 타입을 한 곳에서 정의하여 전역 사용 가능

### 2. 에러 처리 규약 통일 ✅
- **파일**: `src/lib/errors.ts`
- `AppError` 클래스로 모든 에러 통일
- `ServiceResult<T>` 타입으로 일관된 반환 형태
- Supabase/Network/Storage 에러 자동 변환

### 3. Logger 유틸 생성 ✅
- **파일**: `src/lib/logger.ts`
- 개발 환경에서만 로그 출력
- 일관된 로그 포맷

### 4. 서비스 레이어 확장 ✅
- **파일**: `src/services/emotions.ts`
  - 모든 emotions CRUD 작업 서비스 레이어로 분리
  - `ServiceResult<T>` 반환으로 에러 처리 통일
  
- **파일**: `src/services/settings.ts`
  - user_settings CRUD 작업 서비스 레이어로 분리
  - `ServiceResult<T>` 반환으로 에러 처리 통일

## 변경된 파일 목록

### 신규 생성
1. `src/types/database.ts` - DB row 타입 정의
2. `src/lib/errors.ts` - 에러 처리 규약
3. `src/lib/logger.ts` - 로거 유틸
4. `src/services/emotions.ts` - 감정 기록 서비스
5. `src/services/settings.ts` - 사용자 설정 서비스
6. `REFACTORING_PLAN.md` - 리팩터링 계획 문서
7. `REFACTORING_SUMMARY.md` - 리팩터링 요약 문서

### 수정 필요 (다음 단계)
1. `src/hooks/useEmotions.ts` - 서비스 레이어 사용하도록 수정
2. `src/hooks/useSettings.ts` - 서비스 레이어 사용하도록 수정
3. `src/hooks/useHomeData.ts` - 서비스 레이어 사용하도록 수정
4. `src/hooks/useCommunity.ts` - report 기능 서비스 레이어로 이동

## 핵심 설계 결정

### 1. 에러 처리 규약
- **방식**: `ServiceResult<T>` 반환 (throw 금지)
- **형태**: `{ data: T, error: null } | { data: null, error: AppError }`
- **이유**: 
  - 일관된 에러 처리
  - 타입 안정성 향상
  - 에러 핸들링 명확화

### 2. Storage URL 방식
- **방식**: Public URL 사용
- **경로 규칙**: `{bucket}/{userId}/{filename}`
- **이유**:
  - 프로필 이미지, 감정 기록 이미지는 공개 가능
  - RLS 정책으로 접근 제어
  - Signed URL 관리 복잡도 감소

### 3. 서비스 레이어 분리
- **원칙**: UI/컴포넌트에서 `supabase.from(...)` 직접 호출 금지
- **구조**: `services/` 폴더에 모든 CRUD 작업 집중
- **이유**:
  - 관심사 분리
  - 테스트 용이성
  - 재사용성 향상

## 다음 단계

1. Hooks 리팩터링 (서비스 레이어 사용)
2. 가드 통합
3. Storage 경로 통일
4. 중복 생성 방지 개선
5. 품질 도구 추가
6. 통합 테스트 작성
