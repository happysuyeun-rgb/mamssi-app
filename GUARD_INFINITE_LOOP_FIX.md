# Guard 무한 리다이렉트 루프 수정 가이드

## 🔴 문제점

1. **ERR_INSUFFICIENT_RESOURCES 에러**: 브라우저 리소스 부족으로 인한 에러 반복 발생
2. **React Router 네비게이션 throttling**: 무한 리다이렉트 루프로 인해 브라우저가 네비게이션을 제한
3. **WebSocket 연결 실패**: 리소스 부족으로 인한 WebSocket 연결 실패

## 🔍 원인 분석

### 1. useEffect 의존성 배열 문제
- `userProfile`과 `refreshUserProfile`이 의존성 배열에 포함되어 있음
- `refreshUserProfile` 호출 → `userProfile` 업데이트 → `useEffect` 재실행 → 무한 루프

### 2. 리다이렉트 중복 실행
- 경로가 변경되어도 `redirectedRef`가 초기화되지 않아 중복 리다이렉트 발생
- 디바운싱 없이 즉시 리다이렉트하여 빠른 연속 리다이렉트 발생

### 3. refreshUserProfile 무제한 호출
- `userProfile`이 null일 때마다 `refreshUserProfile` 호출
- 호출 제한 없이 반복 호출되어 리소스 고갈

## ✅ 해결 방법

### 1. 경로 변경 감지 및 redirectedRef 초기화

```typescript
// 경로가 변경되면 redirectedRef 초기화 (새 경로에서 리다이렉트 허용)
if (lastPathRef.current !== location.pathname) {
  console.log('[Guard] 경로 변경 감지, redirectedRef 초기화:', {
    from: lastPathRef.current,
    to: location.pathname
  });
  redirectedRef.current = null;
  lastPathRef.current = location.pathname;
}
```

### 2. userProfile 변경 감지 및 refreshAttemptedRef 관리

```typescript
// userProfile이 변경되면 refreshAttemptedRef 초기화 (재조회 허용)
if (lastUserProfileRef.current !== userProfile) {
  console.log('[Guard] userProfile 변경 감지:', {
    from: lastUserProfileRef.current,
    to: userProfile
  });
  lastUserProfileRef.current = userProfile;
  // userProfile이 null에서 값으로 변경되면 재조회 시도 플래그 초기화
  if (userProfile !== null) {
    refreshAttemptedRef.current = false;
  }
}
```

### 3. refreshUserProfile 호출 제한

```typescript
// userProfile이 null이면 재조회 시도
// 단, 이미 재조회를 시도했다면 무한 루프 방지를 위해 다시 시도하지 않음
if (refreshUserProfile && !redirectedRef.current && !refreshAttemptedRef.current) {
  console.log('[Guard] userProfile이 null이므로 재조회 시도 (한 번만)');
  refreshAttemptedRef.current = true;
  refreshUserProfile().catch((err) => {
    console.error('[Guard] refreshUserProfile 실패:', err);
    refreshAttemptedRef.current = false; // 실패 시 다시 시도 가능하도록
  });
} else if (refreshAttemptedRef.current) {
  console.log('[Guard] 이미 재조회를 시도했으므로 skip (무한 루프 방지)');
}
```

### 4. 리다이렉트 디바운싱

```typescript
const REDIRECT_DEBOUNCE_MS = 500; // 500ms 내 중복 리다이렉트 방지
const lastRedirectTimeRef = useRef<number>(0);

// 리다이렉트 전 디바운싱 체크
const now = Date.now();
if (redirectedRef.current !== '/home' && (now - lastRedirectTimeRef.current) > REDIRECT_DEBOUNCE_MS) {
  redirectedRef.current = '/home';
  lastRedirectTimeRef.current = now;
  navigate('/home', { replace: true });
}
```

## 📋 추가된 Refs

1. **lastPathRef**: 마지막 경로 추적 (경로 변경 감지)
2. **refreshAttemptedRef**: refreshUserProfile 호출 시도 여부 추적
3. **lastUserProfileRef**: 마지막 userProfile 값 추적 (변경 감지)
4. **lastRedirectTimeRef**: 마지막 리다이렉트 시간 추적 (디바운싱)

## 🎯 개선 효과

1. **무한 루프 방지**: refreshUserProfile 호출 제한으로 무한 루프 방지
2. **리소스 절약**: 디바운싱으로 불필요한 리다이렉트 방지
3. **안정성 향상**: 경로 변경 감지로 올바른 리다이렉트 처리
4. **에러 감소**: ERR_INSUFFICIENT_RESOURCES 에러 감소 예상

## 🧪 테스트 시나리오

### 테스트 1: 온보딩 완료 사용자 재진입
1. 온보딩 완료
2. 앱 재시작
3. **예상 결과**: 홈 화면 표시, 무한 루프 없음

### 테스트 2: userProfile null 상태
1. 네트워크 오류로 userProfile 조회 실패
2. 앱 진입
3. **예상 결과**: 로컬 스토리지 fallback 사용, 무한 재조회 없음

### 테스트 3: 빠른 경로 변경
1. 여러 경로를 빠르게 변경
2. **예상 결과**: 디바운싱으로 안정적인 리다이렉트

## 📝 참고 사항

- 디바운싱 시간: 500ms (필요시 조정 가능)
- refreshUserProfile 호출: 한 번만 시도 (실패 시 재시도 가능)
- 경로 변경 시: redirectedRef 자동 초기화
