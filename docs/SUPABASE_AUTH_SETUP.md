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

### detectSessionInUrl 설정 (중요)

- `supabaseClient.ts`에서 `detectSessionInUrl: false`로 설정해야 합니다.
- `true`인 경우 Supabase가 URL의 code를 자동 교환하고, AuthCallback에서도 `exchangeCodeForSession`을 호출하면 **동일 코드 2회 사용**으로 실패합니다.
- 코드는 1회만 사용 가능하므로, AuthCallback에서 수동 교환을 사용할 때는 `detectSessionInUrl: false`가 필수입니다.

## 4. 네트워크 연결 오류 시

공감숲 등에서 "네트워크 연결에 실패했어요"가 표시되면 → [SUPABASE_NETWORK_TROUBLESHOOTING.md](./SUPABASE_NETWORK_TROUBLESHOOTING.md) 참고

## 5. 체크리스트

배포 전 확인:

- [ ] Site URL = `https://<vercel-domain>`
- [ ] Redirect URLs에 `https://<vercel-domain>/auth/callback` 포함
- [ ] 로컬 개발용 `http://localhost:5173/auth/callback` 유지 (선택)

---

## 6. vercel.json (SPA rewrite)

`vercel.json`에 다음 설정이 있어야 `/auth/callback` 요청 시 404가 발생하지 않습니다.

- **cleanUrls: false** 필수: Vercel 기본값(cleanUrls: true)이 rewrite를 무시할 수 있음
- **rewrites**: `/auth/callback` 및 모든 경로 → `/index.html`

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": null,
  "cleanUrls": false,
  "trailingSlash": false,
  "rewrites": [
    { "source": "/auth/callback", "destination": "/index.html" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
