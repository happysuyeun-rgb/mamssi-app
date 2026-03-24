# 안정성 테스트 결과 (2026-03-16)

> 최종 업데이트: 2026-03-24


## 요약

| 항목 | 결과 | 비고 |
|------|------|------|
| **TypeScript** | ✅ 통과 | `npm run typecheck` |
| **ESLint** | ✅ 에러 0 (경고 56) | 조건부 훅 에러 수정 반영 |
| **Vitest** | ⚠️ 67 통과 / 13 실패 | 3개 테스트 파일 실패 |

---

## 1. TypeScript 타입 검사

- **명령:** `npm run typecheck`
- **결과:** 통과 (에러 없음)

---

## 2. ESLint

- **명령:** `npm run lint`
- **수정 반영:** `App.tsx` 조건부 훅 호출 제거
  - `useState`/`useEffect`를 early return 이전에 항상 호출하도록 변경
  - OAuth 콜백 경로 체크는 훅 호출 이후로 이동
- **현재:** 에러 0건, 경고 56건 (미사용 변수, exhaustive-deps 등)

---

## 3. Vitest 단위/통합 테스트

- **명령:** `npm run test:ci`
- **결과:** 10개 파일 중 7개 통과, 3개 실패 / 80개 테스트 중 67 통과, 13 실패

### 실패한 테스트 파일

| 파일 | 원인 |
|------|------|
| **WeeklyMoodWidget.test.tsx** | `getByAltText('감정 기록 이미지 1')` 해당 요소가 렌더 결과에 없음 (구조/데이터와 기대 불일치) |
| **useEmotions.test.ts** | Supabase 목이 `.from().select()` 체인을 지원하지 않음 — `supabase.from(...).select is not a function` (목 구조 보강 필요) |
| **scenarios.test.ts** | 서비스 호출 반환값이 `{ data, error }` 형태가 아님 — `createUserResult.error` 등이 `undefined` (실제 API/목 시그니처와 테스트 기대 불일치) |

### 통과한 테스트 파일 (7개)

- `app.test.ts`
- `dateUtils.test.ts`
- `validation.test.ts`
- `imageUpload.test.ts`
- `profileImageUpload.test.ts`
- `Record.test.tsx`
- `SignupOnboardingStep.test.tsx`

---

## 권장 후속 작업

1. **useEmotions.test.ts**  
   Supabase 목에 `.from('emotions').select(...)` 체인을 반환하도록 목 구현 보강.

2. **WeeklyMoodWidget.test.tsx**  
   위젯이 “감정 기록 이미지 1” alt를 가진 이미지를 실제로 렌더하는지 확인 후, 테스트 데이터 또는 쿼리(예: `getByAltText` / `getByRole`)를 수정.

3. **scenarios.test.ts**  
   `usersService`, `emotionsService` 등 실제 반환 형태(`{ data, error }` 여부)에 맞게 expect 수정 또는 서비스 목 반환값 정리.

4. **ESLint 경고**  
   필요 시 미사용 변수 제거, `react-hooks/exhaustive-deps` 의존성 배열 정리로 점진적으로 경고 감소.

---

## 실행 방법

```bash
npm run typecheck   # 타입 검사
npm run lint        # 린트
npm run test:ci     # 테스트 (watch 없이 1회 실행)
```
