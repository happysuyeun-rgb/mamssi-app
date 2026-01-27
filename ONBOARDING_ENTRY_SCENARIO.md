# 온보딩 진입 시나리오 개선 가이드

## 🔍 문제점

온보딩을 완료한 사용자가 앱에 재진입 시 여전히 온보딩 화면이 표시되는 문제가 있었습니다.

## ✅ 해결 방법

### 1. AuthProvider 개선

**변경 전:**
- 온보딩 라우트(`/onboarding`)에서 `fetchUserProfile`을 skip
- Guard에서 온보딩 완료 여부를 확인할 수 없음

**변경 후:**
- 온보딩 라우트에서도 `userProfile` 조회 수행 (타임아웃 3초로 단축)
- Guard에서 온보딩 완료 여부를 명확히 확인 가능

### 2. Guard 로직 개선

**변경 전:**
- `userProfile`이 null인 경우 로컬 스토리지만 확인
- 온보딩 라우트에서 온보딩 완료 사용자 체크가 불완전

**변경 후:**
- 온보딩 라우트에서 `userProfile`이 null이지만 로컬 스토리지에 `onboarding_completed=true`가 있으면 홈으로 리다이렉트
- 루트 경로(`/`) 접근 시 명확한 리다이렉트 로직 추가

## 📋 진입 시나리오

### 시나리오 1: 온보딩 완료 사용자 (로그인)

1. **앱 진입** → `AuthProvider`에서 세션 확인
2. **userProfile 조회** → `users.onboarding_completed = true` 확인
3. **Guard 실행** → 온보딩 완료 확인
4. **리다이렉트**:
   - `/onboarding` 접근 시 → `/home`으로 리다이렉트
   - `/` 접근 시 → `/home`으로 리다이렉트
   - `/home` 접근 시 → 허용

### 시나리오 2: 온보딩 미완료 사용자 (로그인)

1. **앱 진입** → `AuthProvider`에서 세션 확인
2. **userProfile 조회** → `users.onboarding_completed = false` 확인
3. **Guard 실행** → 온보딩 미완료 확인
4. **리다이렉트**:
   - `/` 접근 시 → `/onboarding`으로 리다이렉트
   - `/home` 접근 시 → `/onboarding`으로 리다이렉트
   - `/onboarding` 접근 시 → 허용

### 시나리오 3: 온보딩 완료 게스트

1. **앱 진입** → 게스트 모드 확인
2. **로컬 스토리지 확인** → `onboardingComplete = true` 확인
3. **Guard 실행** → 온보딩 완료 확인
4. **리다이렉트**:
   - `/onboarding` 접근 시 → `/home`으로 리다이렉트
   - `/` 접근 시 → `/home`으로 리다이렉트
   - `/home` 접근 시 → 허용

### 시나리오 4: 온보딩 미완료 게스트

1. **앱 진입** → 게스트 모드 확인
2. **로컬 스토리지 확인** → `onboardingComplete = false` 또는 없음
3. **Guard 실행** → 온보딩 미완료 확인
4. **리다이렉트**:
   - `/` 접근 시 → `/onboarding`으로 리다이렉트
   - `/home` 접근 시 → `/onboarding`으로 리다이렉트
   - `/onboarding` 접근 시 → 허용

### 시나리오 5: userProfile이 null인 경우 (DB 조회 실패/지연)

1. **앱 진입** → `AuthProvider`에서 세션 확인
2. **userProfile 조회** → null 반환 (조회 실패 또는 지연)
3. **Guard 실행** → 로컬 스토리지 fallback 사용
4. **리다이렉트**:
   - 로컬 스토리지에 `onboarding_completed=true` 있으면 → `/home`으로 리다이렉트
   - 로컬 스토리지에 `onboarding_completed=true` 없으면 → `/onboarding`으로 리다이렉트
5. **재조회 시도** → `refreshUserProfile()` 호출하여 다음 렌더링에서 DB 값으로 재확인

## 🔄 온보딩 완료 플로우

1. **온보딩 Step 7 완료** → `handleGoHome()` 호출
2. **DB 업데이트**:
   - `users.onboarding_completed = true` 업데이트
   - `user_settings.seed_name` 저장 (있는 경우)
3. **로컬 스토리지 업데이트** → `onboardingComplete = true`
4. **userProfile 갱신** → `refreshUserProfile()` 호출 (2회, 300ms 간격)
5. **홈으로 이동** → `navigate('/home', { replace: true })`
6. **Guard 실행** → `userProfile.onboarding_completed = true` 확인 → 홈 허용

## 🎯 핵심 개선 사항

### 1. 온보딩 라우트에서도 userProfile 조회

```typescript
// AuthProvider.tsx
// 온보딩 라우트에서도 userProfile 조회 수행 (타임아웃 3초)
const timeoutMs = isOnboardingRoute ? 3000 : 10000;
```

### 2. Guard에서 로컬 스토리지 fallback 처리

```typescript
// Guard.tsx
// userProfile이 null이지만 로컬 스토리지에 onboarding_completed=true가 있으면
// 온보딩 완료로 간주하고 홈으로 리다이렉트
if (session && userProfile === null) {
  const localOnboarding = safeStorage.getItem(ONBOARDING_COMPLETE_KEY) === 'true';
  if (localOnboarding) {
    navigate('/home', { replace: true });
    return;
  }
}
```

### 3. 루트 경로 명확한 처리

```typescript
// Guard.tsx
// 루트 경로(/) 접근 시 명확한 리다이렉트
if (location.pathname === '/' || location.pathname === '') {
  if (onboardingComplete) {
    navigate('/home', { replace: true });
  } else {
    navigate('/onboarding', { replace: true });
  }
  return;
}
```

## 🧪 테스트 시나리오

### 테스트 1: 온보딩 완료 사용자 재진입
1. 온보딩 완료
2. 앱 종료
3. 앱 재시작
4. **예상 결과**: 홈 화면 표시 (온보딩 화면 아님)

### 테스트 2: 온보딩 완료 사용자가 /onboarding 직접 접근
1. 온보딩 완료
2. 브라우저에서 `/onboarding` 직접 입력
3. **예상 결과**: `/home`으로 자동 리다이렉트

### 테스트 3: 온보딩 미완료 사용자
1. 신규 가입 또는 온보딩 미완료 상태
2. 앱 진입
3. **예상 결과**: 온보딩 화면 표시

### 테스트 4: userProfile 조회 실패 시
1. 네트워크 오류 또는 DB 조회 실패
2. 로컬 스토리지에 `onboarding_completed=true` 있음
3. **예상 결과**: 홈 화면 표시 (로컬 스토리지 fallback)

## 📝 참고 사항

- `userProfile` 조회는 최대 3초(온보딩 라우트) 또는 10초(그 외) 타임아웃
- 로컬 스토리지는 DB 값의 fallback으로만 사용
- DB 값이 있으면 항상 DB 값을 우선 사용
- 온보딩 완료 후 `refreshUserProfile()`을 2회 호출하여 DB 반영 확인
