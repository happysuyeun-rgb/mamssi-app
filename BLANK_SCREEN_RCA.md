# 빈 화면 문제 원인 분석 및 해결 (Blank Screen RCA)

## 재현 방법

1. 앱 첫 진입 시 빈 화면 발생
2. 새로고침 후에도 간헐적으로 빈 화면 발생
3. OAuth 로그인 후 복귀 시 빈 화면 발생

## 원인 분석

### 1. Guard 무한 리다이렉트
- **문제**: `sessionInitialized`가 `false`인 상태에서 Guard가 실행되어 리다이렉트 루프 발생
- **증상**: 콘솔에 리다이렉트 로그가 반복적으로 출력되며 화면이 렌더링되지 않음
- **해결**: `sessionInitialized`가 `true`가 될 때까지 Guard 비활성화, LoadingSplash 표시

### 2. ENV 미설정
- **문제**: `VITE_SUPABASE_URL` 또는 `VITE_SUPABASE_ANON_KEY`가 없을 때 앱이 크래시
- **증상**: 개발 환경에서 즉시 에러, 프로덕션에서는 조용히 실패
- **해결**: ENV 검증 로직 추가, 명확한 에러 로깅, 소프트 폴백

### 3. Storage 접근 실패
- **문제**: 프라이빗 모드/쿠키 차단 등에서 localStorage 접근 실패 시 예외 발생
- **증상**: 온보딩 완료 플래그 저장 실패로 인한 재진입 루프
- **해결**: `safeStorage` 래퍼로 메모리 스토리지 fallback 제공

### 4. 온보딩 플래그 저장 누락
- **문제**: 게스트 모드/온보딩 완료 시 플래그 저장이 확실하지 않음
- **증상**: 재진입 시 온보딩 화면으로 다시 리다이렉트
- **해결**: `safeStorage`로 확실히 저장, `replace: true`로 히스토리 관리

### 5. OAuth 리다이렉트 루프
- **문제**: OAuth 콜백 후 쿼리스트링이 남아있어 Guard 조건과 충돌
- **증상**: `/auth/callback?code=...`에서 무한 리다이렉트
- **해결**: 쿼리스트링 제거 후 `/`로 이동

## 적용한 수정 포인트

### 1. 진단 로그 시스템 (`src/boot/diag.ts`)
- 모든 주요 단계에 `diag.log/err/warn` 추가
- 브라우저 콘솔에서 `window.__maeumssi_diag`로 접근 가능

### 2. ErrorBoundary 강화 (`src/components/ErrorBoundary.tsx`)
- 전역 에러 캐치
- 사용자 친화적 에러 UI
- 개발 환경에서 에러 상세 정보 표시

### 3. LoadingSplash 강화 (`src/components/LoadingSplash.tsx`)
- 세션 로딩 중 무조건 표시
- 씨앗 회전 애니메이션

### 4. safeStorage 래퍼 (`src/lib/safeStorage.ts`)
- localStorage 실패 시 메모리 스토리지 fallback
- 프라이빗 모드/권한 에러 차단
- 접근성 테스트 함수 제공

### 5. AuthProvider 로딩 상태 보장 (`src/providers/AuthProvider.tsx`)
- `sessionInitialized` 상태 추가
- ENV 검증 및 로깅
- Storage 접근성 테스트
- 각 단계별 진단 로그

### 6. Guard 무한 리다이렉트 방지 (`src/components/Guard.tsx`)
- `sessionInitialized` 확인 후 가드 실행
- `redirectedRef`로 중복 리다이렉트 방지
- 모든 분기점에 진단 로그
- `/debug` 경로는 가드 우회

### 7. /debug 페이지 (`src/pages/Debug.tsx`)
- ENV/세션/스토리지 상태 시각화
- 플래그 수동 설정/해제 기능
- 경로 이동 테스트 기능

### 8. OAuth 콜백 개선 (`src/pages/AuthCallback.tsx`)
- 쿼리스트링 제거 후 이동
- `safeStorage` 사용
- 진단 로그 추가

### 9. 온보딩 버튼 이벤트 수정 (`src/components/onboarding/OnboardingGuest.tsx`)
- `safeStorage`로 확실히 저장
- `replace: true`로 히스토리 관리
- 진단 로그 추가

### 10. 빈 화면 감지 타임아웃 (`src/main.tsx`)
- 3초 내 첫 paint 미감지 시 배너 표시
- `/debug` 링크 제공

### 11. ENV 에러 로깅 (`src/lib/supabaseClient.ts`)
- 명확한 에러 메시지
- 개발 환경에서는 throw, 프로덕션에서는 경고

### 12. vite.config.ts 업데이트
- `@boot`, `@types` alias 추가

## 테스트 체크리스트

- [x] 첫 진입 시 Splash/Onboarding/Home 중 하나가 즉시 표시
- [x] 콘솔에 Guard/Auth/Storage/ENV 진입 로그 출력
- [x] `/debug`에서 상태 확인 가능
- [x] OAuth 복귀 후 정상 진입, 쿼리스트링 제거
- [x] Storage 접근 실패 시에도 앱 정상 작동
- [x] ENV 미설정 시 명확한 에러 표시

## 추가 개선 사항

1. **Performance Observer**: 첫 paint 감지로 빈 화면 조기 탐지
2. **전역 진단 객체**: 브라우저 콘솔에서 `window.__maeumssi_diag` 접근 가능
3. **상태 시각화**: `/debug` 페이지로 실시간 상태 확인

## 참고

- 모든 진단 로그는 `[MAEUMSSI]` 접두사로 구분
- 에러는 `[MAEUMSSI][ERR]`, 경고는 `[MAEUMSSI][WARN]` 접두사 사용
- 프로덕션 빌드에서도 진단 로그는 유지 (디버깅 용이성)


