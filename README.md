# 마음씨 (Mamssi) 앱

감정 기록 및 공감 커뮤니티 앱

## 실행 방법

### 개발 서버

```bash
npm install
npm run dev
```

### 배포 전 검증 (verify)

**전제 조건**: `npm install`(또는 `npm ci`) 완료 후 실행.

```bash
npm run verify
```

`verify`는 다음을 **순서대로** 실행합니다: `lint` → `type-check` → `format:check` → `test:ci` → `build`. 실패 시 해당 단계의 에러가 출력되며, `[VERIFY FAILED] Step "..."` 메시지로 실패 원인을 확인할 수 있습니다.

### 개별 스크립트

| 스크립트 | 설명 |
|----------|------|
| `npm run lint` | ESLint 검사 |
| `npm run lint:fix` | ESLint 자동 수정 |
| `npm run typecheck` | TypeScript 타입 검사 |
| `npm run format` | Prettier 포맷 적용 |
| `npm run format:check` | Prettier 검사 (수정 없음) |
| `npm run test` | Vitest (watch 모드) |
| `npm run test:ci` | Vitest 단일 실행 (CI용) |
| `npm run build` | Vite 프로덕션 빌드 |

## RLS/Storage 권한 회귀 테스트

배포 전 Supabase RLS 및 Storage 정책 검증:

- [docs/RLS_STORAGE_REGRESSION_CHECKLIST.md](docs/RLS_STORAGE_REGRESSION_CHECKLIST.md)

최소 5개 시나리오:

1. 신규 로그인 후 user_settings 보장 / seed_name 저장
2. 프로필 업로드 / 삭제
3. 비공개 기록 저장
4. 공개 기록 저장 및 공감숲 노출
5. 권한: 타인 글 수정/삭제 불가, 게스트 작성 불가, Storage 타인 경로 접근 불가

## CI (GitHub Actions)

`main`, `develop` 브랜치에 push/PR 시 `npm run verify`가 자동 실행됩니다.

- 워크플로우: [.github/workflows/verify.yml](.github/workflows/verify.yml)

**CI vs 로컬 차이**: CI는 `npm ci` 후 `verify`를 실행하며, Ubuntu 환경에서 esbuild/Vite가 정상 동작합니다. 로컬(특히 Windows 샌드박스)에서는 `spawn EPERM` 등으로 `test:ci`/`build`가 실패할 수 있으므로, **로컬 검증 시 터미널에서 직접 `npm run verify` 실행**을 권장합니다.

## 환경 설정

`.env` 파일에 Supabase URL 및 anon key 설정:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Mixpanel (선택):

```
VITE_MIXPANEL_TOKEN=your_project_token
```

## Mixpanel 이벤트 검증

1. `.env`에 `VITE_MIXPANEL_TOKEN` 설정
2. `npm install` 후 `npm run dev`로 로컬 실행
3. Mixpanel 대시보드 → **Live View** 접속
4. 앱 새로고침 시 `app_open` 이벤트 확인
5. 감정 기록 저장 성공 시 `emotion_created` 이벤트 확인

## 상세 문서

- [배포 게이트 요약](docs/DEPLOY_GATE_SUMMARY.md)
- [단언(as/!) 점검](docs/ASSERTION_REVIEW.md)
- [Vercel 빌드 수정 가이드](docs/VERCEL_BUILD_FIX.md)
- [아키텍처 결정](docs/ARCHITECTURE_DECISIONS.md)
- [품질 도구](docs/QUALITY_TOOLS.md)
