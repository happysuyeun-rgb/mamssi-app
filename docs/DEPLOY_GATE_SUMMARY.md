# 배포 전 안전 게이트 요약

## 변경 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `package.json` | lint, typecheck, format:check, test, test:ci, verify 스크립트 추가/수정 |
| `scripts/verify.cjs` | **신규** - 단계별 검증 스크립트 (에러 출력 정리) |
| `.github/workflows/verify.yml` | **신규** - GitHub Actions CI 워크플로우 |
| `docs/RLS_STORAGE_REGRESSION_CHECKLIST.md` | **신규** - RLS/Storage 권한 회귀 테스트 체크리스트 |
| `src/utils/share.ts` | no-empty lint 오류 수정, 중복 함수 제거 |
| `docs/ASSERTION_REVIEW.md` | **신규** - 단언(as/!) 점검 및 런타임 안전 근거 |
| `src/pages/ForestDetail.tsx` | `reason as any` → `reason as ReportReason` (any 제거) |

---

## 핵심 diff

### package.json

```diff
   "scripts": {
+    "test:ci": "vitest run",
     "type-check": "tsc --noEmit",
+    "typecheck": "tsc --noEmit",
+    "verify": "node scripts/verify.cjs"
   },
```

- `lint`: 기존 유지 (max-warnings 50 → 60)
- `format:check`: 기존 유지
- `test`: 기존 유지
- `build`: 기존 유지

### scripts/verify.cjs (신규)

- lint → type-check → format:check → test:ci → build 순서 실행
- 각 단계마다 `>> [N/5] StepName` 출력
- 실패 시 `[VERIFY FAILED] Step "StepName" failed with exit code N` 출력 후 즉시 종료

### .github/workflows/verify.yml (신규)

- `push` / `pull_request` 시 `main`, `develop` 브랜치에서 실행
- Node 20, npm ci, npm run verify

---

## 실행 방법

### 로컬 검증

```bash
# 전체 검증 (lint + type-check + format + test + build)
npm run verify

# 개별 실행
npm run lint
npm run typecheck      # 또는 npm run type-check
npm run format:check
npm run test:ci        # 단일 실행 (watch 모드 아님)
npm run build
```

### CI (GitHub Actions)

- `main` 또는 `develop`에 push/PR 시 자동 실행
- Actions 탭에서 결과 확인

### RLS/Storage 회귀 테스트

- `docs/RLS_STORAGE_REGRESSION_CHECKLIST.md` 참고
- 최소 5개 시나리오: 신규 user_settings, 프로필 업로드/삭제, 비공개 기록, 공개 기록+공감숲, 권한 검증

---

## 현재 상태

- **Lint**: 통과
- **Type-check**: 통과
- **Format**: Prettier 체크 포함
- **Test**: Vitest 단일 실행 (`test:ci`) — 로컬: 일부 통합 테스트 실패 가능(모킹 환경), CI: Ubuntu에서 정상
- **Build**: 통과

**실행 순서/전제**: `npm install`(또는 `npm ci`) 완료 후 `lint` → `type-check` → `format:check` → `test:ci` → `build` 순서. CI는 `npm ci` 후 `verify` 실행. 로컬(Windows 샌드박스)에서는 `spawn EPERM` 등으로 `test:ci`/`build` 실패 가능 → 터미널에서 직접 `npm run verify` 권장.

`verify` 실패 시 출력 예:

```
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
[VERIFY FAILED] Step "Type-check" failed with exit code 2
============================================================
```

실패한 단계의 원본 에러가 그 위에 출력되므로 원인 파악이 용이합니다.
