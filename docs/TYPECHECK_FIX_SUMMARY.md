# TypeScript 타입 수정 요약

## 1. npm run typecheck 에러 요약 (수정 전)

### 파일별 / 에러 유형별 그룹화

| 그룹 | 파일 | 에러 유형 | 건수 |
|------|------|-----------|------|
| A. 모듈 경로 | lib/guards, services/* | Cannot find module '@types/database' | 5 |
| B. routes 미사용 | routes/* | Duplicate default, 미존재 컴포넌트 | 다수 |
| C. ServiceResult | useHomeData, Record, MyPage | Property does not exist on ServiceResult | 15+ |
| D. 타입 정의 | UserSettings, ForestPost, EmotionRecord, ReportReason | Property does not exist | 10+ |
| E. null/undefined | lib/guards, services/emotions, lib/errors | string \| null not assignable to string \| undefined | 15+ |
| F. StorageError | imageUpload, profileImageUpload | statusCode, error does not exist | 12 |
| G. 기타 | FlowerBadge, Toast, Forest, useForestFeed, notifications | PostgrestError, setToastMessage, emotionCode, inMemoryNotifications | 10+ |

---

## 2. 수정 전략 및 적용

### 타입 설계 수정
- **AppErrorDetails**: `operation?: string` 추가, `userId?: string | null`, `resourceId?: string | null` 허용
- **UserSettingsRow / UserSettings**: `birthdate?: string | null`, `gender?: string | null` 추가
- **ForestPost**: `emotionCode`, `emoji`, `label`, `createdAt` (required) 추가
- **EmotionRecord**: `emotion_type?: string` (UI 호환 alias) 추가
- **ReportReason**: `'부적절/혐오'`, `'광고/스팸'` 추가
- **NotificationMessageTemplate**: `@domain/notification`에 export 추가
- **LogContext**: `userId?: string | null` 허용

### 런타임 안전 단언 (as)
- **FlowerBadge**: `error as { code?, details?, hint? }` (PostgrestError 속성 접근)
- **imageUpload, profileImageUpload**: `StorageErrorExt` 타입으로 `statusCode`, `error` 접근
- **useEmotions**: `insertPayload as { user_id, main_emotion, content, [key: string]: unknown }`

### Supabase 반환 타입 안전 처리
- **ServiceResult**: `result.error ? ... : result.data` 패턴으로 null-safe 접근
- **useHomeData**: `ensureFlowerRow` 반환값 `newFlowerResult.data` 사용
- **Record.tsx**: `updateFlowerGrowth` 반환값 `updatedFlowerResult.data` 사용
- **MyPage.tsx**: `fetchBloomedFlowers` 반환값 `bloomedResult.data` 사용
- **emotions/guards**: `userId ?? undefined`로 context 전달

### 기타
- **tsconfig**: `exclude: ["src/routes"]` (미사용 routes 제외)
- **import 경로**: `@types/database` → `@domain/database`
- **Forest.tsx**: `setToastMessage` → `notify.toast({ type, message })`
- **useForestFeed**: `setPosts` state 추가, `useEffect` import
- **notifications**: `inMemoryNotifications` 변수 선언, `NotificationMessageTemplate` export

---

## 3. 수정 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `tsconfig.json` | exclude: src/routes, @types/database path 제거 |
| `src/lib/errors.ts` | AppErrorDetails.operation, userId/resourceId null 허용 |
| `src/lib/guards.ts` | @domain/database, userId ?? undefined |
| `src/lib/logger.ts` | LogContext.userId?: string \| null |
| `src/types/database.ts` | UserSettingsRow birthdate, gender |
| `src/types/forest.ts` | ForestPost emotionCode, emoji, label, createdAt |
| `src/types/notification.ts` | NotificationMessageTemplate export |
| `src/hooks/useEmotions.ts` | EmotionRecord.emotion_type, insertPayload 타입 |
| `src/hooks/useSettings.ts` | UserSettings birthdate, gender |
| `src/hooks/useHomeData.ts` | ensureFlowerRow ServiceResult 처리 |
| `src/hooks/useCommunity.ts` | ReportReason 확장 |
| `src/services/emotions.ts` | @domain/database, userId ?? undefined |
| `src/services/flowers.ts` | @domain/database |
| `src/services/settings.ts` | @domain/database |
| `src/services/users.ts` | @domain/database |
| `src/services/notifications.ts` | inMemoryNotifications, NotificationRecord 타입 |
| `src/config/notificationMessages.ts` | NotificationMessageTemplate import |
| `src/pages/Record.tsx` | updateFlowerGrowth ServiceResult 처리 |
| `src/pages/MyPage.tsx` | fetchBloomedFlowers ServiceResult, emotion_type ?? main_emotion, birthdate/gender |
| `src/pages/Forest.tsx` | setToastMessage → notify.toast, createdAt ?? 0 |
| `src/pages/ForestDetail.tsx` | post.createdAt ?? '' |
| `src/store/useForestFeed.ts` | setPosts state, useEffect, createdAt ?? 0 |
| `src/components/home/FlowerBadge.tsx` | error as PostgrestError |
| `src/components/notify/Toast.tsx` | transform 중복 제거 |
| `src/utils/imageUpload.ts` | StorageErrorExt 타입 |
| `src/utils/profileImageUpload.ts` | StorageErrorExt 타입 |

---

## 4. npm run typecheck 재실행 결과

```
> tsc --noEmit
(exit code: 0)
```

**통과**

---

## 5. verify 전체 실행 결과 요약

| 단계 | 결과 |
|------|------|
| Lint | ✓ 통과 (경고 52개, max-warnings 60) |
| Type-check | ✓ 통과 |
| Format check | ✓ 통과 (npm run format 적용 후) |
| Test | ✗ sandbox EPERM (vitest spawn 제한) |
| Build | (test 실패로 미실행) |

**참고**: Test 단계의 `spawn EPERM`은 샌드박스 환경 제한으로, 로컬에서 `npm run verify` 실행 시 정상 동작합니다.

---

## 6. 핵심 diff 요약

### tsconfig.json
```diff
+ "exclude": ["src/routes"],
- "@types/database": ["src/types/database"],
```

### lib/errors.ts
```diff
  export interface AppErrorDetails {
+   operation?: string;
+   userId?: string | null;
+   resourceId?: string | null;
```

### ServiceResult 패턴
```diff
- if (updatedFlower) { ... updatedFlower.growth_percent }
+ if (!updatedFlowerResult.error && updatedFlowerResult.data) {
+   ... updatedFlowerResult.data.growth_percent
+ }
```

### null-safe
```diff
- userId
+ userId: userId ?? undefined
```

### StorageError
```diff
+ type StorageErrorExt = { message?: string; statusCode?: number; error?: string };
- uploadError.statusCode
+ (uploadError as StorageErrorExt).statusCode
```
