# Supabase Auth URL 설정 가이드

모바일에서 Google 로그인 후 `ERR_CONNECTION_REFUSED`(localhost 리다이렉트)가 발생하지 않도록 Supabase 대시보드 설정을 확인하세요.

## 1. Auth > URL Configuration

Supabase Dashboard → **Authentication** → **URL Configuration**에서 다음을 설정합니다.

### Site URL (필수)

배포 환경의 실제 도메인을 사용합니다.

| 환경 | Site URL |
|------|----------|
| **프로덕션 (Vercel)** | `https://<vercel-domain>` (예: `https://mamssi.vercel.app`) |
| **로컬 개발** | `http://localhost:5173` |

⚠️ **중요**: 프로덕션 배포 시 Site URL을 Vercel 도메인으로 변경해야 합니다. localhost로 남아 있으면 모바일에서 OAuth 후 localhost로 리다이렉트되어 `ERR_CONNECTION_REFUSED`가 발생합니다.

### Redirect URLs (화이트리스트)

OAuth 콜백으로 허용할 URL을 등록합니다. **등록되지 않은 URL로는 리다이렉트되지 않습니다.**

| 환경 | Redirect URLs |
|------|---------------|
| **프로덕션** | `https://<vercel-domain>/*`<br>`https://<vercel-domain>/auth/callback` |
| **로컬 개발** | `http://localhost:5173/*`<br>`http://localhost:5173/auth/callback` |

예시 (Vercel 도메인이 `mamssi.vercel.app`인 경우):

```
https://mamssi.vercel.app/*
https://mamssi.vercel.app/auth/callback
http://localhost:5173/*
http://localhost:5173/auth/callback
```

## 2. 앱 코드 동작

- `redirectTo`는 `window.location.origin + '/auth/callback'`로 **동적 생성**됩니다.
- localhost 하드코딩이 없으므로, 사용자가 접속한 도메인(로컬/배포)에 맞게 자동으로 설정됩니다.
- Supabase 대시보드의 **Redirect URLs**에 해당 도메인이 등록되어 있어야 합니다.

## 3. /auth/callback 라우트

- OAuth 콜백은 path 기반 URL `/auth/callback`로 처리됩니다.
- Vercel SPA rewrites로 `/auth/callback` 요청 시 `index.html`이 반환됩니다.
- 콜백 처리 후 홈(`/home`) 또는 온보딩(`/onboarding`)으로 정상 이동합니다.

## 4. 체크리스트

배포 전 확인:

- [ ] Site URL = `https://<vercel-domain>`
- [ ] Redirect URLs에 `https://<vercel-domain>/*` 및 `/auth/callback` 포함
- [ ] 로컬 개발용 `http://localhost:5173/*` 유지 (선택)
