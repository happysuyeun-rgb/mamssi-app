# 리팩터링 진행 상황 (4-8단계)

## ✅ 완료된 작업

### 4. 권한/게스트/온보딩 가드 통합 ✅
- **파일**: `src/lib/guards.ts`
- **내용**:
  - `requireAuth()` - 인증 필수 가드
  - `requireOnboardingComplete()` - 온보딩 완료 필수 가드
  - `requireGuest()` - 게스트 전용 가드
  - `requireOnboardingIncomplete()` - 온보딩 미완료 필수 가드
  - `requireWriteAction()` - 쓰기 액션 가드
  - `requireAll()`, `requireAny()` - 복합 가드

### 5. Storage 업로드 경로/정책 완전 일치 ✅
- **파일**: `src/services/storage.ts`
- **내용**:
  - 경로 규칙 통일: `{bucket}/{userId}/{filename}`
  - Public URL 사용
  - `uploadFile()` - 파일 업로드
  - `deleteFile()` - 파일 삭제
  - `deleteUserFiles()` - 사용자 폴더 전체 삭제
  - `getPublicUrl()` - Public URL 가져오기

### 6. 중복 생성 방지 개선 ✅
- **파일**: `src/services/flowers.ts`
- **내용**:
  - `ensureFlowerRow()` - ServiceResult 패턴으로 변경
  - Unique constraint 위반 시 재조회 로직 개선
  - `hasEmotionOnDate()` - ServiceResult 패턴으로 변경
  - `getConsecutiveDays()` - ServiceResult 패턴으로 변경

### 추가 서비스 레이어 확장 ✅
- **파일**: `src/services/users.ts`
- **내용**:
  - `fetchUserProfile()` - 사용자 프로필 조회
  - `createUser()` - 사용자 생성 (중복 방지 포함)
  - `completeOnboarding()` - 온보딩 완료 처리
  - `deleteUser()` - 계정 삭제 처리

## 🔄 진행 중인 작업

### 4-1. Guard.tsx 리팩터링
- **대상**: `src/components/Guard.tsx`
- **작업**: 가드 유틸(`src/lib/guards.ts`) 사용하도록 수정
- **상태**: 📋 예정

### 4-2. useActionGuard.ts 리팩터링
- **대상**: `src/hooks/useActionGuard.ts`
- **작업**: 가드 유틸 사용하도록 수정
- **상태**: 📋 예정

### 5-1. profileImageUpload.ts 리팩터링
- **대상**: `src/utils/profileImageUpload.ts`
- **작업**: Storage 서비스 사용하도록 수정
- **상태**: 📋 예정

### 5-2. imageUpload.ts 리팩터링
- **대상**: `src/utils/imageUpload.ts`
- **작업**: Storage 서비스 사용하도록 수정
- **상태**: 📋 예정

### 6-1. flowers.ts 완전 리팩터링
- **대상**: `src/services/flowers.ts`
- **작업**: 
  - `updateFlowerGrowth()` - ServiceResult 패턴으로 변경
  - `fetchBloomedFlowers()` - ServiceResult 패턴으로 변경
- **상태**: 📋 예정

## 📋 예정된 작업

### 7. 품질 도구 추가
- **작업**:
  - ESLint 설정
  - Prettier 설정
  - React Hooks 규칙
  - Pre-commit hook 설정
- **상태**: 📋 예정

### 8. 통합 시나리오 테스트
- **작업**:
  - 신규 계정 시나리오 테스트
  - 기존 계정 시나리오 테스트
  - 권한 케이스 테스트
  - 실패 시 레이어별 로그 추적
- **상태**: 📋 예정

## 변경된 파일 목록

### 신규 생성 (4개)
1. `src/lib/guards.ts` - 가드 유틸
2. `src/services/users.ts` - 사용자 서비스
3. `src/services/storage.ts` - Storage 서비스
4. `REFACTORING_PROGRESS.md` - 진행 상황 문서

### 수정 (1개)
1. `src/services/flowers.ts` - ServiceResult 패턴 적용 (부분)

## 핵심 개선 사항

### 1. 가드 통합
- 모든 권한 체크를 단일 가드 유틸로 통합
- 일관된 에러 처리 및 리다이렉트 로직
- 복합 가드 지원 (AND/OR 조건)

### 2. Storage 경로 통일
- 모든 Storage 작업을 서비스 레이어로 분리
- 경로 규칙 통일: `{bucket}/{userId}/{filename}`
- Public URL 사용으로 단순화

### 3. 중복 생성 방지
- Unique constraint 기반 중복 생성 방지
- 동시성 문제 대응 (재조회 로직)
- ServiceResult 패턴으로 에러 처리 통일

## 다음 단계

1. Guard.tsx 리팩터링 (가드 유틸 사용)
2. useActionGuard.ts 리팩터링 (가드 유틸 사용)
3. profileImageUpload.ts 리팩터링 (Storage 서비스 사용)
4. imageUpload.ts 리팩터링 (Storage 서비스 사용)
5. flowers.ts 완전 리팩터링 (ServiceResult 패턴)
6. 품질 도구 추가 (ESLint/Prettier)
7. 통합 테스트 작성
