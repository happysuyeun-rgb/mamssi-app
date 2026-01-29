# 아키텍처 설계 결정 문서

## 1. 에러 처리 규약

### 결정
모든 서비스 함수는 `ServiceResult<T>` 형태로 반환하며, throw를 사용하지 않습니다.

### 형태
```typescript
type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: AppError };
```

### 이유
1. **일관성**: 모든 함수가 동일한 형태로 에러를 반환
2. **타입 안정성**: TypeScript가 에러 케이스를 강제로 처리하도록 함
3. **명확성**: 에러가 반환값의 일부로 명시적으로 표현됨
4. **테스트 용이성**: 에러 케이스를 쉽게 테스트 가능

### 사용 예시
```typescript
const result = await fetchEmotions({ userId });
if (result.error) {
  // 에러 처리
  logger.error('감정 기록 조회 실패', { error: result.error });
  return;
}
const emotions = result.data; // 타입 안전
```

## 2. Storage URL 방식

### 결정
Public URL을 사용합니다.

### 경로 규칙
```
{bucket}/{userId}/{filename}
```

예시:
- 프로필 이미지: `profile-images/{userId}/{filename}`
- 감정 기록 이미지: `emotion-images/{userId}/{filename}`

### 이유
1. **단순성**: Signed URL 관리 복잡도 감소
2. **성능**: Public URL은 CDN 캐싱 가능
3. **보안**: RLS 정책으로 접근 제어 가능
4. **일관성**: 모든 이미지가 동일한 방식으로 처리

### 보안
- RLS 정책으로 사용자별 접근 제어
- 버킷 레벨에서 public=true 설정
- 파일 경로에 userId 포함으로 자동 권한 체크

## 3. 서비스 레이어 분리

### 결정
UI/컴포넌트에서 `supabase.from(...)` 직접 호출을 금지하고, 모든 DB 접근은 서비스 레이어를 통해야 합니다.

### 구조
```
src/
  services/
    emotions.ts      # emotions 테이블 CRUD
    settings.ts      # user_settings 테이블 CRUD
    flowers.ts       # flowers 테이블 CRUD
    community.ts     # community_posts 테이블 CRUD
    notifications.ts # notifications 테이블 CRUD
  hooks/
    useEmotions.ts   # emotions 서비스 호출
    useSettings.ts   # settings 서비스 호출
    ...
```

### 이유
1. **관심사 분리**: UI 로직과 데이터 접근 로직 분리
2. **재사용성**: 서비스 함수를 여러 곳에서 재사용 가능
3. **테스트 용이성**: 서비스 레이어만 모킹하면 됨
4. **유지보수성**: DB 스키마 변경 시 서비스 레이어만 수정

## 4. 타입 정의 통합

### 결정
모든 DB row 타입을 `src/types/database.ts`에 정의합니다.

### 구조
```typescript
// src/types/database.ts
export type UserRow = { ... };
export type EmotionRow = { ... };
export type UserSettingsRow = { ... };
// ...
```

### 이유
1. **일관성**: 모든 곳에서 동일한 타입 사용
2. **유지보수성**: 타입 변경 시 한 곳만 수정
3. **타입 안정성**: DB 스키마와 타입이 항상 일치

## 5. 로깅 규약

### 결정
모든 로그는 `logger` 유틸을 통해 출력하며, 개발 환경에서만 출력됩니다.

### 사용
```typescript
import { logger } from '@lib/logger';

logger.log('작업 시작', { userId, operation: 'createEmotion' });
logger.error('작업 실패', { userId, operation: 'createEmotion', error });
```

### 이유
1. **일관성**: 모든 로그가 동일한 포맷
2. **성능**: 프로덕션에서 로그 출력 비활성화
3. **디버깅**: 구조화된 로그로 디버깅 용이

## 6. 가드 정책 (예정)

### 결정
권한/게스트/온보딩 체크를 단일 가드 유틸로 통합합니다.

### 구조 (예정)
```typescript
// src/lib/guards.ts
export function requireAuth(userId: string | null): asserts userId is string;
export function requireOnboardingComplete(user: UserRow | null): asserts user is UserRow;
export function requireGuest(userId: string | null): void;
```

### 이유
1. **중복 제거**: 분산된 권한 체크 로직 통합
2. **일관성**: 모든 곳에서 동일한 방식으로 권한 체크
3. **테스트 용이성**: 가드 함수만 테스트하면 됨
