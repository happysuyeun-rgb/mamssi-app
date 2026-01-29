# 코드 품질 향상 리팩터링 계획

## 목표
- 타입 안정성↑
- 에러/로깅 일관성↑
- 권한/게스트 가드 안정화↑
- Storage/DB 중복 생성 방지↑
- 유지보수성↑

## 작업 진행 상황

### ✅ 완료된 작업

#### 1. 타입 정의 통합
- **파일**: `src/types/database.ts`
- **내용**: 모든 DB row 타입을 한 곳에서 정의
  - UserRow
  - UserSettingsRow
  - EmotionRow
  - FlowerRow
  - CommunityPostRow
  - CommunityLikeRow
  - ReportRow
  - NotificationRow
  - ProfileRow

#### 2. 에러 처리 규약 통일
- **파일**: `src/lib/errors.ts`
- **내용**:
  - `AppError` 클래스 정의
  - `ServiceResult<T>` 타입 정의
  - Supabase/Network/Storage 에러 변환 유틸
  - `success()`, `failure()`, `toServiceResult()` 헬퍼 함수

#### 3. Logger 유틸 생성
- **파일**: `src/lib/logger.ts`
- **내용**:
  - 개발 환경에서만 로그 출력
  - 테스트 환경에서는 로그 출력 안 함
  - 일관된 로그 포맷

#### 4. 서비스 레이어 확장
- **파일**: `src/services/emotions.ts`
- **내용**:
  - `fetchEmotions()` - 감정 기록 목록 조회
  - `fetchEmotionById()` - 감정 기록 단일 조회
  - `createEmotion()` - 감정 기록 생성
  - `updateEmotion()` - 감정 기록 수정
  - `deleteEmotion()` - 감정 기록 삭제
  - `hasEmotionOnDate()` - 특정 날짜 기록 존재 확인
  - 모든 함수는 `ServiceResult<T>` 반환

- **파일**: `src/services/settings.ts`
- **내용**:
  - `fetchUserSettings()` - 사용자 설정 조회
  - `upsertUserSettings()` - 사용자 설정 생성/수정
  - 모든 함수는 `ServiceResult<T>` 반환

### 🔄 진행 중인 작업

#### 1. Hooks 리팩터링
- **대상 파일**:
  - `src/hooks/useEmotions.ts` - 서비스 레이어 사용하도록 수정 필요
  - `src/hooks/useSettings.ts` - 서비스 레이어 사용하도록 수정 필요
  - `src/hooks/useHomeData.ts` - 서비스 레이어 사용하도록 수정 필요
  - `src/hooks/useCommunity.ts` - report 기능 서비스 레이어로 이동 필요

**진행 방법**:
1. 기존 hooks의 Supabase 직접 호출을 서비스 함수 호출로 변경
2. 에러 처리를 AppError로 통일
3. 로깅을 logger로 통일

**주의사항**:
- 기존 hooks의 복잡한 로직은 유지하되, DB 접근만 서비스 레이어로 분리
- 점진적 마이그레이션 (한 번에 모두 변경하지 않고 단계적으로)

### 📋 예정된 작업

#### 2. 권한/게스트/온보딩 가드 통합
- **대상 파일**:
  - `src/components/Guard.tsx`
  - `src/hooks/useActionGuard.ts`
  - `src/providers/AuthProvider.tsx`

**작업 내용**:
- `requireAuth()` - 인증 필수 가드
- `requireOnboardingComplete()` - 온보딩 완료 필수 가드
- `requireGuest()` - 게스트 전용 가드
- 단일 가드 유틸로 분산 로직 통합

#### 3. Storage 업로드 경로/정책 완전 일치
- **대상 파일**:
  - `src/utils/profileImageUpload.ts`
  - `src/utils/imageUpload.ts`
  - Storage RLS 정책 SQL 파일들

**작업 내용**:
- 경로 규칙 통일: `{bucket}/{userId}/{filename}`
- Public URL vs Signed URL 결정 및 통일
- 코드/정책/버킷 경로 일치 확인

#### 4. 중복 생성 방지
- **대상**:
  - seed/flower 생성 (`src/services/flowers.ts`)
  - user_settings 생성 (`src/services/settings.ts`)

**작업 내용**:
- Unique index 기반 중복 생성 방지 재검증
- Upsert 로직 개선
- DB 제약조건 확인 및 추가

#### 5. 품질 도구 추가
- **작업 내용**:
  - ESLint 설정
  - Prettier 설정
  - React Hooks 규칙
  - Pre-commit hook 설정

#### 6. 통합 시나리오 테스트
- **작업 내용**:
  - 신규 계정 시나리오 테스트
  - 기존 계정 시나리오 테스트
  - 권한 케이스 테스트
  - 실패 시 레이어별 로그 추적

## 설계 결정 문서

### 에러 처리 규약
- **방식**: `ServiceResult<T>` 반환 (throw 금지)
- **이유**: 
  - 일관된 에러 처리
  - 타입 안정성 향상
  - 에러 핸들링 명확화

### Storage URL 방식
- **방식**: Public URL 사용
- **이유**:
  - 프로필 이미지, 감정 기록 이미지는 공개 가능
  - RLS 정책으로 접근 제어
  - Signed URL 관리 복잡도 감소

### 가드 정책
- **방식**: 단일 가드 유틸 함수
- **이유**:
  - 중복 로직 제거
  - 일관된 권한 체크
  - 테스트 용이성 향상

## 마이그레이션 가이드

### Hooks에서 서비스 레이어 사용하기

**Before**:
```typescript
const { data, error } = await supabase
  .from('emotions')
  .select('*')
  .eq('user_id', userId);
```

**After**:
```typescript
const result = await fetchEmotions({ userId });
if (result.error) {
  // 에러 처리
  return;
}
const emotions = result.data;
```

### 에러 처리

**Before**:
```typescript
try {
  // ...
} catch (err) {
  console.error('에러:', err);
  throw err;
}
```

**After**:
```typescript
const result = await someServiceFunction();
if (result.error) {
  logger.error('작업 실패', {
    userId,
    operation: 'someOperation',
    error: result.error
  });
  // 에러 처리
  return;
}
```

## 다음 단계

1. [ ] useEmotions.ts 리팩터링
2. [ ] useSettings.ts 리팩터링
3. [ ] useHomeData.ts 리팩터링
4. [ ] useCommunity.ts report 기능 서비스 레이어로 이동
5. [ ] 가드 통합
6. [ ] Storage 경로 통일
7. [ ] 중복 생성 방지 개선
8. [ ] 품질 도구 추가
9. [ ] 통합 테스트 작성
