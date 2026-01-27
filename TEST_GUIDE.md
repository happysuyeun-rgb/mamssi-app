# 마음씨 앱 테스트 가이드

## 테스트 환경 설정

1. **개발 서버 실행 확인**
   ```bash
   npm run dev
   ```
   - 서버 주소: http://localhost:5173

2. **브라우저 개발자 도구 열기**
   - F12 또는 Ctrl+Shift+I
   - Console 탭 선택
   - Network 탭도 열어두기 (선택)

## 테스트 시나리오

### 시나리오 1: 신규 사용자 가입 및 온보딩

#### 1-1. 회원가입
1. 브라우저에서 http://localhost:5173 접속
2. 소셜 로그인 버튼 클릭 (Google/Apple/Kakao 중 선택)
3. 로그인 완료 후 `/auth/callback`으로 리다이렉트 확인

**확인 사항:**
- [ ] 로그인 성공 메시지 표시
- [ ] 콘솔에서 `[AuthProvider] SIGNED_IN 이벤트` 로그 확인
- [ ] `users` 테이블에 새 레코드 생성 확인 (Supabase Dashboard)

#### 1-2. 온보딩 진행
1. 온보딩 화면 자동 표시 확인
2. 각 단계 진행:
   - Step 0: 환영 메시지
   - Step 1: 서비스 소개
   - Step 2: 기능 안내
   - Step 3: 약관 동의
   - Step 4: 씨앗 이름 짓기 (예: "봄비")
   - Step 5: 완료

**확인 사항:**
- [ ] 각 단계가 순서대로 진행됨
- [ ] 씨앗 이름 입력 및 저장 성공
- [ ] 콘솔에서 `[OnboardingGuest] users 테이블 업데이트 성공` 로그 확인
- [ ] 콘솔에서 `[OnboardingGuest] userProfile 갱신 완료` 로그 확인
- [ ] 홈 화면으로 자동 이동

#### 1-3. 온보딩 완료 후 확인
1. 홈 화면 표시 확인
2. 씨앗 이름이 입력한 값으로 표시되는지 확인

**확인 사항:**
- [ ] 홈 화면 정상 표시
- [ ] 씨앗 이름이 "봄비"로 표시됨
- [ ] 콘솔에서 `[Guard] userProfile에서 onboarding_completed 확인: { onboarding_completed: true }` 로그 확인
- [ ] Supabase Dashboard에서 `users.onboarding_completed = true` 확인

### 시나리오 2: 재접속 테스트 (온보딩 완료 사용자)

#### 2-1. 앱 종료 후 재접속
1. 브라우저 탭 닫기
2. 새 탭에서 http://localhost:5173 접속
3. 자동 로그인 확인

**확인 사항:**
- [ ] 로그인 화면이 아닌 홈 화면으로 바로 이동
- [ ] 온보딩 화면이 표시되지 않음
- [ ] 콘솔에서 `[AuthProvider] fetchUserProfile 성공: { onboarding_completed: true }` 로그 확인
- [ ] 콘솔에서 `[Guard] userProfile에서 onboarding_completed 확인: { onboarding_completed: true }` 로그 확인
- [ ] 콘솔에서 `[Guard] 온보딩 완료 사용자, 주요 화면 진입 허용` 로그 확인

#### 2-2. 새로고침 테스트
1. F5로 페이지 새로고침
2. 홈 화면 유지 확인

**확인 사항:**
- [ ] 새로고침 후에도 홈 화면 유지
- [ ] 온보딩 화면으로 리다이렉트되지 않음

### 시나리오 3: 씨앗 이름 수정 테스트

#### 3-1. 씨앗 이름 수정
1. 홈 화면에서 씨앗 이름 옆 ✏️ 버튼 클릭
2. 모달에서 새 이름 입력 (예: "달빛산책")
3. 확인 버튼 클릭

**확인 사항:**
- [ ] 성공 메시지: "씨앗 이름이 '달빛산책'으로 변경되었어요. ✨"
- [ ] UI에 즉시 반영됨
- [ ] 콘솔에서 다음 로그 순서 확인:
  ```
  ✅ [FlowerBadge] 씨앗 이름 저장 시작
  ✅ [useSettings] 설정 업데이트 시작
  ✅ [useSettings] 설정 업데이트 성공
  ✅ [FlowerBadge] 씨앗 이름 저장 성공
  ✅ [FlowerBadge] 홈 데이터 새로고침 시작
  ✅ [useHomeData] refetch 호출됨
  ✅ [useHomeData] seedName 업데이트: { finalSeedName: "달빛산책" }
  ✅ [FlowerBadge] 홈 데이터 새로고침 완료
  ```

#### 3-2. 새로고침 후 확인
1. F5로 페이지 새로고침
2. 씨앗 이름이 "달빛산책"으로 유지되는지 확인

**확인 사항:**
- [ ] 새로고침 후에도 변경된 이름 유지
- [ ] Supabase Dashboard에서 `user_settings.seed_name = "달빛산책"` 확인

### 시나리오 4: 감정 기록 테스트

#### 4-1. 감정 기록 작성
1. 홈 화면에서 "오늘 기록하기" 버튼 클릭
2. 감정 선택 (예: "기쁨")
3. 내용 입력 (5자 이상)
4. 저장 버튼 클릭

**확인 사항:**
- [ ] 기록 저장 성공 메시지
- [ ] 홈 화면의 주간 감정 위젯에 기록 반영
- [ ] 콘솔에서 `[updateFlowerGrowth] 성장 업데이트 성공` 로그 확인
- [ ] Supabase Dashboard에서 `emotions` 테이블에 새 레코드 확인

#### 4-2. 씨앗 성장 확인
1. 홈 화면에서 씨앗 성장률 확인
2. 게이지가 증가했는지 확인

**확인 사항:**
- [ ] 성장률이 증가함 (개인 기록: +5pt, 공개 기록: +10pt)
- [ ] 성장 단계가 변경되었는지 확인 (0→1→2→3→4→5)

### 시나리오 5: 에러 케이스 테스트

#### 5-1. 씨앗 이름 수정 - 빈 값
1. 씨앗 이름 수정 모달 열기
2. 공백만 입력
3. 확인 버튼 클릭

**확인 사항:**
- [ ] 경고 메시지: "씨앗 이름을 입력해주세요. ⚠️"
- [ ] 저장되지 않음

#### 5-2. 씨앗 이름 수정 - 10자 초과
1. 씨앗 이름 수정 모달 열기
2. 11자 이상 입력
3. 확인 버튼 클릭

**확인 사항:**
- [ ] 경고 메시지: "씨앗 이름은 10자 이내로 입력해주세요. ⚠️"
- [ ] 저장되지 않음

## 콘솔 로그 체크리스트

### 정상 동작 시 예상 로그

#### 온보딩 완료 시:
```
✅ [OnboardingGuest] users 테이블 업데이트 성공
✅ [OnboardingGuest] 로컬 스토리지 onboarding_completed 업데이트: true
✅ [OnboardingGuest] userProfile 갱신 완료
✅ [AuthProvider] refreshUserProfile 완료: { onboarding_completed: true }
```

#### 재접속 시:
```
✅ [AuthProvider] fetchUserProfile 성공: { onboarding_completed: true }
✅ [Guard] userProfile에서 onboarding_completed 확인: { onboarding_completed: true }
✅ [Guard] 온보딩 완료 사용자, 주요 화면 진입 허용
```

#### 씨앗 이름 수정 시:
```
✅ [FlowerBadge] 씨앗 이름 저장 시작
✅ [useSettings] 설정 업데이트 성공
✅ [useHomeData] seedName 업데이트: { finalSeedName: "..." }
```

### 에러 발생 시 확인할 로그

#### RLS 정책 에러:
```
❌ [AuthProvider] RLS 정책 에러 - users 테이블 조회 권한 없음
❌ error.code === '42501'
```

#### DB 저장 실패:
```
❌ [useSettings] 설정 업데이트 실패: { error, code, message }
```

#### userProfile 조회 실패:
```
❌ [AuthProvider] fetchUserProfile 에러: { code, message }
⚠️ [Guard] userProfile이 null입니다. DB 재조회 시도
```

## Supabase Dashboard 확인 사항

### users 테이블
- [ ] `onboarding_completed` 컬럼이 `true`인지 확인
- [ ] `is_deleted` 컬럼이 `false`인지 확인
- [ ] `created_at`, `updated_at` 타임스탬프 확인

### user_settings 테이블
- [ ] `seed_name` 컬럼에 입력한 값이 저장되어 있는지 확인
- [ ] `updated_at` 타임스탬프가 최신인지 확인

### flowers 테이블
- [ ] `user_id`별로 진행 중 꽃(`is_bloomed = false`)이 1개만 있는지 확인
- [ ] `growth_percent`가 기록에 따라 증가하는지 확인

### emotions 테이블
- [ ] 작성한 감정 기록이 저장되어 있는지 확인
- [ ] `emotion_date`가 올바른지 확인

## 문제 발생 시 체크리스트

### 온보딩 화면이 반복 노출되는 경우
1. 콘솔에서 `[Guard]` 로그 확인
2. `userProfile.onboarding_completed` 값 확인
3. Supabase Dashboard에서 `users.onboarding_completed` 값 확인
4. 로컬 스토리지 확인: `localStorage.getItem('onboardingComplete')`

### 씨앗 이름이 저장되지 않는 경우
1. 콘솔에서 `[useSettings]` 로그 확인
2. 에러 코드 및 메시지 확인
3. Supabase Dashboard에서 `user_settings` 테이블 확인
4. RLS 정책 확인 (UPDATE 권한)

### 홈 데이터가 갱신되지 않는 경우
1. 콘솔에서 `[useHomeData]` 로그 확인
2. `__refreshHomeData` 함수 호출 여부 확인
3. Realtime 구독 상태 확인

## 테스트 완료 체크리스트

- [ ] 신규 가입 및 온보딩 완료
- [ ] 재접속 시 홈 화면으로 바로 이동
- [ ] 씨앗 이름 수정 및 저장
- [ ] 감정 기록 작성 및 저장
- [ ] 씨앗 성장 확인
- [ ] 에러 케이스 처리 확인
- [ ] 콘솔 로그 정상 출력 확인
- [ ] Supabase Dashboard 데이터 확인

## 테스트 결과 기록

### 테스트 일시:
### 테스트 사용자:
### 발견된 문제:
### 해결 방법:
