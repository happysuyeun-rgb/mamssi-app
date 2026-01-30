# 단언(as/!) 및 타입 강제 점검

TS 오류 해결 과정에서 추가된 `as`/`!` 단언의 목록과 런타임 안전 근거.

## 1. 이번 수정에서 새로 추가된 as/! 위치

### A. Supabase/Storage 에러 타입 (TYPECHECK_ERROR_SUMMARY F항목)

| 파일 | 라인 | 단언 | 런타임 안전 근거 |
|------|------|------|------------------|
| `src/utils/imageUpload.ts` | 52 | `uploadError as StorageErrorExt` | Supabase Storage 에러는 런타임에 `statusCode`, `error` 속성을 포함함(404/403 등). `StorageError` 타입에 미선언되어 있어 확장 타입으로 단언. |
| `src/utils/profileImageUpload.ts` | 103 | `uploadError as StorageErrorExt` | 동일. imageUpload와 같은 Storage API 사용. |
| `src/components/home/FlowerBadge.tsx` | 133 | `error as { code?, message?, details?, hint? }` | `updateSettings`는 Supabase `user_settings` upsert를 사용하며, 에러 시 `PostgrestError` 반환. PostgrestError는 `code`, `details`, `hint`를 보유. 옵셔널 접근으로 부재 시 `undefined`(안전). |

### B. insertPayload 타입 추론 (TYPECHECK_ERROR_SUMMARY G항목)

| 파일 | 라인 | 단언 | 런타임 안전 근거 |
|------|------|------|------------------|
| `src/hooks/useEmotions.ts` | 180 | `} as { user_id: string; main_emotion: string; content: string; [key: string]: unknown }` | `insertPayload`는 `user_id` + `cleanPayload` 스프레드로 직전에 구성됨. 183행에서 `main_emotion`, `content` 필수 검증. TS의 spread `Record<string, unknown>` 추론 한계를 보완. |

### C. any 제거 대상 (ForestDetail)

| 파일 | 라인 | 변경 전 | 변경 후 | 런타임 안전 근거 |
|------|------|---------|---------|------------------|
| `src/pages/ForestDetail.tsx` | 163 | `reason as any` | `reason as ReportReason` | `prompt()` 반환값은 `string \| null`. 백엔드 `reports` 테이블은 문자열 수용. `ReportReason`은 UI 제약용. 단언으로 TS 만족, 런타임 동작 동일. |

---

## 2. 기존 코드의 as/! (참고용, 이번 수정 범위 아님)

- **테스트 파일** (`*.test.ts`, `*.test.tsx`): mock 객체에 `as any` 사용 — 테스트 전용, 프로덕션 미포함.
- **서비스 레이어** (`success(data as X)`): Supabase `.single()`/`.select()` 반환 타입과 `ServiceResult` 제네릭 정합을 위한 단언.
- **window 확장** (`(window as any).__refreshHomeData` 등): 전역 콜백 등록 패턴, 런타임에 명시적으로 할당됨.
- **이벤트 타입** (`event.target as HTMLElement`, `event.data as ToastNotification`): DOM/커스텀 이벤트 타입 좁히기.
- **notify.ts** (`this.toastQueue.shift()!`): `length > 0` 체크 직후 호출로 non-null 보장.

---

## 3. 안전 근거가 약한 경우 → 수정

| 위치 | 판단 | 조치 |
|------|------|------|
| `ForestDetail.tsx` L163 `reason as any` | any 사용 금지 위반 | `reason as ReportReason`로 변경 (완료) |
| `FlowerBadge.tsx` L133 | PostgrestError와 구조 호환, 옵셔널 접근 | 유지 |
| `imageUpload.ts` L52, `profileImageUpload.ts` L103 | Storage API 문서/관찰 기반 | 유지 |
| `useEmotions.ts` L180 | 직전 구성 + 직후 검증 | 유지 |

---

## 4. 수정 파일 목록 (이번 세션)

- `src/pages/ForestDetail.tsx`: `reason as any` → `reason as ReportReason` (ReportReason import 추가)
- `docs/ASSERTION_REVIEW.md`: 신규 작성
