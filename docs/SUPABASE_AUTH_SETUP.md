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

> 현재 앱은 **path 기반** `/auth/callback`을 사용합니다. vercel.json rewrite로 404를 방지합니다.

| 환경 | Redirect URLs |
|------|---------------|
| **프로덕션** | `https://<vercel-domain>/*`<br>`https://<vercel-domain>/auth/callback` |
| **로컬 개발** | `http://localhost:5173/*`<br>`http://localhost:5173/auth/callback` |

예시 (Vercel 도메인이 `mamssi-app.vercel.app`인 경우):

```
https://mamssi-app.vercel.app
https://mamssi-app.vercel.app/auth/callback
http://localhost:5173/auth/callback
```

## 2. 앱 코드 동작

- `redirectTo`는 `window.location.origin + '/auth/callback'`로 **동적 생성**됩니다.
- path 기반 URL 사용 (모바일 OAuth에서 hash 제거 이슈 방지).
- vercel.json rewrite로 `/auth/callback` 요청 시 `index.html` 반환 → 404 방지.

## 3. /auth/callback 라우트

- OAuth 콜백은 path 기반 URL `/auth/callback`로 처리됩니다.
- vercel.json에서 `/auth/callback` → `/index.html` rewrite 적용.
- App.tsx에서 pathname이 `/auth/callback`이면 AuthCallback 렌더.
- 콜백 처리 후 홈(`/home`) 또는 온보딩(`/onboarding`)으로 정상 이동합니다.

## 4. 체크리스트

배포 전 확인:

- [ ] Site URL = `https://<vercel-domain>`
- [ ] Redirect URLs에 `https://<vercel-domain>/auth/callback` 포함
- [ ] 로컬 개발용 `http://localhost:5173/auth/callback` 유지 (선택)

---

## 5. vercel.json (SPA rewrite)

`vercel.json`에 다음 rewrite가 있어야 `/auth/callback` 요청 시 404가 발생하지 않습니다.

```json
{
  "rewrites": [
    { "source": "/auth/callback", "destination": "/index.html" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
