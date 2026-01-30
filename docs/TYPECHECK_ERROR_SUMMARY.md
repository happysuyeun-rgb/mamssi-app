# TypeScript 에러 요약 및 수정 전략

## 1. 파일별 / 에러 유형별 그룹화

### A. 모듈 경로 오류 (TS2307, TS6137)
| 파일 | 에러 | 원인 |
|------|------|------|
| lib/guards.ts | Cannot find module '@types/database' | tsconfig paths에 @types/database 미등록 |
| services/emotions.ts | Cannot find module '@types/database' | 동일 |
| services/flowers.ts | Cannot find module '@types/database' | 동일 |
| services/settings.ts | Cannot find module '@types/database' | 동일 |
| services/users.ts | Cannot find module '@types/database' | 동일 |

**수정 전략**: tsconfig.json paths에 `"@types/database": ["src/types/database"]` 추가

### B. routes/ 폴더 - 미사용 코드 (TS2300, TS2307, TS2323, TS2393)
- App.tsx는 @pages/만 사용, routes/는 미참조
- routes/Forest.tsx, Home.tsx, Record.tsx, MyPage.tsx: 존재하지 않는 컴포넌트 import, Duplicate default export

**수정 전략**: tsconfig exclude에 `src/routes` 추가 (타입 검사 제외, 동작 변경 없음)

### C. ServiceResult 접근 오류 (TS2339)
| 파일 | 위치 | 원인 |
|------|------|------|
| useHomeData.ts | 162-175 | ensureFlowerRow() 반환 ServiceResult, .data 접근 필요 |
| Record.tsx | 365, 491-492 | updateFlowerGrowth() 반환 ServiceResult |
| MyPage.tsx | 122 | fetchBloomedFlowers() 반환 ServiceResult |

**수정 전략**: `result.error ? ... : result.data` 패턴으로 null-safe 접근

### D. 타입 정의 누락/불일치 (TS2322, TS2339, TS2353)
| 파일 | 에러 | 수정 |
|------|------|------|
| lib/errors.ts | AppErrorDetails에 'operation' 없음 | operation?: string 추가 |
| types (UserSettings) | birthdate, gender 없음 | UserSettingsRow에 optional 추가 |
| EmotionRecord | emotion_type 없음 (main_emotion만) | emotion_type alias 추가 |
| ForestPost | emotionCode 없음 | emotionCode?: string 추가 |
| Forest.tsx | ReportReason "부적절/혐오" 등 불일치 | ReportReason 타입 확장 또는 매핑 |
| useForestFeed | emotionCode, setPosts | ForestPost 확장, setPosts state 추가 |

### E. null vs undefined (TS2322)
| 파일 | 원인 |
|------|------|
| services/emotions.ts | string \| null → string \| undefined |
| lib/guards.ts | string \| null → string \| undefined |

**수정 전략**: `?? undefined` 또는 타입을 `string | null | undefined`로 확장

### F. Supabase/Storage 에러 타입 (TS2339)
| 파일 | 에러 | 원인 |
|------|------|------|
| imageUpload.ts | statusCode, error 없음 | StorageError 타입 확장 |
| profileImageUpload.ts | 동일 | 동일 |
| FlowerBadge.tsx | code, details, hint 없음 | PostgrestError 타입 단언 |

**수정 전략**: Supabase 에러는 런타임에 해당 속성 보유 → `as` 단언 또는 확장 인터페이스

### G. 기타
| 파일 | 에러 | 수정 |
|------|------|------|
| Toast.tsx | transform 중복 | 중복 제거 |
| Forest.tsx | setToastMessage 없음 | useNotify().notify 사용 |
| useEmotions.ts | insertPayload 타입 추론 | 명시적 타입 지정 |
| notifications.ts | NotificationMessageTemplate, inMemoryNotifications | 타입 export, 변수 선언 |

---

## 2. 수정 우선순위

1. tsconfig (paths, exclude)
2. lib/errors (AppErrorDetails.operation)
3. types (UserSettings, ForestPost, EmotionRecord)
4. services (import 경로, null 처리)
5. hooks (ServiceResult, useForestFeed)
6. pages (Record, MyPage, Forest)
7. utils (StorageError)
8. components (FlowerBadge, Toast)
