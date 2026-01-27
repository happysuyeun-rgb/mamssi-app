# 온보딩 완료 사용자 접근 차단 테스트 체크리스트

## 🎯 테스트 목표
1. 온보딩 완료 사용자가 온보딩 화면에 접근하지 못하도록 차단
2. 온보딩 화면에서 꽃 ID 중복 생성 방지
3. 씨앗명이 올바르게 저장되는지 확인

## 📋 테스트 시나리오

### 시나리오 1: 온보딩 완료 사용자 재접속 테스트

#### 준비
1. 기존에 온보딩을 완료한 사용자로 로그인
2. Supabase Dashboard에서 `users.onboarding_completed = true` 확인

#### 테스트 단계
1. 브라우저에서 http://localhost:5173 접속
2. 자동 로그인 확인
3. URL을 직접 `/onboarding` 또는 `/onboarding?step=5`로 변경 시도

#### 예상 결과
- ✅ 홈 화면(`/home`)으로 자동 리다이렉트
- ✅ 온보딩 화면이 표시되지 않음
- ✅ 콘솔에서 다음 로그 확인:
  ```
  [Guard] 온보딩 완료 사용자가 온보딩 화면 접근 시도, 홈으로 리다이렉트
  GUARD -> to /home: { reason: '온보딩 완료 사용자, 온보딩 화면 접근 차단' }
  ```

#### 확인 사항
- [ ] 홈 화면으로 리다이렉트됨
- [ ] 온보딩 화면이 표시되지 않음
- [ ] 콘솔 로그 정상 출력
- [ ] Supabase Dashboard에서 `flowers` 테이블에 새 row가 생성되지 않음

---

### 시나리오 2: 신규 사용자 온보딩 테스트

#### 준비
1. 새로운 소셜 계정으로 가입 (또는 테스트 계정 생성)
2. Supabase Dashboard에서 `users.onboarding_completed = false` 확인

#### 테스트 단계
1. 소셜 로그인 진행
2. 온보딩 화면 자동 표시 확인
3. 각 단계 진행:
   - Step 0-4: 기본 안내
   - Step 5: 씨앗 받기
   - Step 6: 씨앗명 입력 (예: "봄비")
   - Step 7: 완료

#### 예상 결과
- ✅ 온보딩 화면이 정상적으로 표시됨
- ✅ 씨앗명 입력 및 저장 성공
- ✅ 홈 화면으로 이동
- ✅ 콘솔에서 다음 로그 확인:
  ```
  [OnboardingGuest] 씨앗명 저장 시작
  [OnboardingGuest] 씨앗명 저장 성공
  [OnboardingGuest] users 테이블 업데이트 성공
  [OnboardingGuest] userProfile 갱신 완료
  ```

#### 확인 사항
- [ ] 온보딩 화면 정상 표시
- [ ] 씨앗명 입력 및 저장 성공
- [ ] 홈 화면으로 이동
- [ ] Supabase Dashboard에서 `user_settings.seed_name = "봄비"` 확인
- [ ] Supabase Dashboard에서 `users.onboarding_completed = true` 확인
- [ ] 콘솔에서 `[useHomeData] 온보딩 라우트 감지, useEffect skip` 로그 확인 (온보딩 중)

---

### 시나리오 3: 꽃 ID 중복 생성 방지 테스트

#### 준비
1. 온보딩 완료 사용자로 로그인
2. Supabase Dashboard에서 `flowers` 테이블 확인
   - 해당 `user_id`의 진행 중 꽃(`is_bloomed = false`)이 1개만 있는지 확인

#### 테스트 단계
1. 홈 화면 접속
2. 콘솔에서 `[useHomeData]` 로그 확인
3. Supabase Dashboard에서 `flowers` 테이블 확인

#### 예상 결과
- ✅ 진행 중 꽃이 1개만 존재
- ✅ 새로 생성되지 않음
- ✅ 콘솔에서 다음 로그 확인:
  ```
  [useHomeData] 진행 중 꽃 조회 성공
  [useHomeData] 진행 중 꽃 존재: { flowerId, growthPercent, isBloomed: false }
  ```

#### 확인 사항
- [ ] `flowers` 테이블에 진행 중 꽃이 1개만 존재
- [ ] 홈 화면 접속 시 새 꽃이 생성되지 않음
- [ ] 콘솔에서 `[useHomeData] 진행 중 꽃 조회 성공` 로그 확인

---

### 시나리오 4: 온보딩 중 useHomeData 실행 차단 테스트

#### 준비
1. 신규 사용자로 온보딩 진행 중

#### 테스트 단계
1. 온보딩 화면에서 개발자 도구 콘솔 열기
2. `[useHomeData]` 로그 확인

#### 예상 결과
- ✅ `[useHomeData] 온보딩 라우트 감지, 데이터 조회 skip` 로그 확인
- ✅ `[useHomeData] 온보딩 라우트 감지, useEffect skip` 로그 확인
- ✅ `fetchData` 함수가 실행되지 않음
- ✅ Realtime 구독이 생성되지 않음

#### 확인 사항
- [ ] 콘솔에서 skip 로그 확인
- [ ] `fetchData` 실행 로그 없음
- [ ] Realtime 구독 생성 로그 없음
- [ ] Supabase Dashboard에서 `flowers` 테이블에 새 row가 생성되지 않음

---

## 🔍 콘솔 로그 체크리스트

### 정상 동작 시 예상 로그

#### 온보딩 완료 사용자 접속 시:
```
✅ [AuthProvider] fetchUserProfile 성공: { onboarding_completed: true }
✅ [Guard] userProfile에서 onboarding_completed 확인: { onboarding_completed: true }
✅ [Guard] 온보딩 완료 사용자, 주요 화면 진입 허용
```

#### 온보딩 완료 사용자가 온보딩 화면 접근 시도 시:
```
✅ [Guard] 온보딩 완료 사용자가 온보딩 화면 접근 시도, 홈으로 리다이렉트
✅ GUARD -> to /home: { reason: '온보딩 완료 사용자, 온보딩 화면 접근 차단' }
```

#### 온보딩 중:
```
✅ [useHomeData] 온보딩 라우트 감지, 데이터 조회 skip
✅ [useHomeData] 온보딩 라우트 감지, useEffect skip
```

#### 온보딩 완료 시:
```
✅ [OnboardingGuest] 씨앗명 저장 시작
✅ [OnboardingGuest] 씨앗명 저장 성공
✅ [OnboardingGuest] users 테이블 업데이트 성공
✅ [OnboardingGuest] userProfile 갱신 완료
```

### 에러 발생 시 확인할 로그

#### userProfile 조회 실패:
```
❌ [AuthProvider] fetchUserProfile 에러: { code, message }
⚠️ [Guard] userProfile이 null입니다. DB 재조회 시도
```

#### 씨앗명 저장 실패:
```
❌ [OnboardingGuest] 씨앗명 저장 실패: { error, code, message }
```

#### 꽃 생성 실패:
```
❌ [useHomeData] 진행 중 꽃 생성 실패
❌ [ensureFlowerRow] 씨앗 생성 실패
```

---

## 🗄️ Supabase Dashboard 확인 사항

### users 테이블
- [ ] `onboarding_completed` 컬럼이 `true`인지 확인
- [ ] `is_deleted` 컬럼이 `false`인지 확인
- [ ] `updated_at` 타임스탬프 확인

### user_settings 테이블
- [ ] `seed_name` 컬럼에 입력한 값이 저장되어 있는지 확인
- [ ] `updated_at` 타임스탬프가 최신인지 확인

### flowers 테이블
- [ ] 각 `user_id`별로 진행 중 꽃(`is_bloomed = false`)이 1개만 있는지 확인
- [ ] 온보딩 완료 사용자가 재접속해도 새 꽃이 생성되지 않았는지 확인
- [ ] `growth_percent`가 올바른지 확인

---

## 🐛 문제 발생 시 체크리스트

### 온보딩 화면이 계속 표시되는 경우
1. 콘솔에서 `[Guard]` 로그 확인
2. `userProfile.onboarding_completed` 값 확인
3. Supabase Dashboard에서 `users.onboarding_completed` 값 확인
4. 로컬 스토리지 확인: `localStorage.getItem('onboardingComplete')`

### 꽃 ID가 계속 생성되는 경우
1. 콘솔에서 `[useHomeData]` 로그 확인
2. `[useHomeData] 온보딩 라우트 감지` 로그가 있는지 확인
3. Supabase Dashboard에서 `flowers` 테이블 확인
4. `ensureFlowerRow` 함수 호출 여부 확인

### 씨앗명이 저장되지 않는 경우
1. 콘솔에서 `[OnboardingGuest] 씨앗명 저장` 로그 확인
2. 에러 코드 및 메시지 확인
3. Supabase Dashboard에서 `user_settings` 테이블 확인
4. RLS 정책 확인 (UPDATE 권한)

---

## ✅ 테스트 완료 체크리스트

- [ ] 시나리오 1: 온보딩 완료 사용자 재접속 테스트 통과
- [ ] 시나리오 2: 신규 사용자 온보딩 테스트 통과
- [ ] 시나리오 3: 꽃 ID 중복 생성 방지 테스트 통과
- [ ] 시나리오 4: 온보딩 중 useHomeData 실행 차단 테스트 통과
- [ ] 모든 콘솔 로그 정상 출력 확인
- [ ] Supabase Dashboard 데이터 확인 완료

---

## 📝 테스트 결과 기록

### 테스트 일시:
### 테스트 사용자:
### 발견된 문제:
### 해결 방법:
