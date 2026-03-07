# 고객문의 자동 발송 설정 가이드

## 1. Supabase 테이블 생성

Supabase SQL Editor에서 아래 파일 내용을 실행하세요.

- **파일**: `supabase_support_inquiries.sql`

실행 후 `support_inquiries` 테이블과 RLS 정책이 생성됩니다.

## 2. 환경변수 설정

### 로컬 개발 (선택)

- `.env`: 프론트용은 기존대로 `VITE_SUPABASE_*`, `VITE_MIXPANEL_TOKEN` 등만 있어도 됨.
- 로컬에서 API를 쓰려면 `vercel dev`로 실행하거나, 배포된 API 주소를 쓸 때만 `VITE_API_URL` 설정.

### Vercel 배포 (필수)

고객문의 API(`/api/support-inquiry`)는 **서버에서 동작**하므로, Vercel 전용 환경변수가 필요합니다.  
프론트엔드용 `VITE_SUPABASE_*`와는 별도입니다.

**설정 경로:** Vercel 프로젝트 → **Settings** → **Environment Variables**

| 이름 | 값 | 비고 |
|------|-----|------|
| `SUPABASE_URL` | Supabase 프로젝트 URL | `.env`의 `VITE_SUPABASE_URL`과 동일 값 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase **service_role** key | **권장** - RLS 우회, API 서버 전용. Supabase → Settings → API → service_role |
| `SUPABASE_ANON_KEY` | Supabase anon key | service_role 없을 때 사용 (RLS 적용됨) |
| `GMAIL_USER` | mamssi.official@gmail.com | 발신 Gmail 주소 |
| `GMAIL_PASS` | Gmail 앱 비밀번호 | 일반 비밀번호 아님, [앱 비밀번호 발급](https://myaccount.google.com/apppasswords) |

- Environment: **Production**, **Preview**, **Development** 중 필요한 것 선택 (보통 Production 이상 선택)
- 저장 후 **재배포(Redeploy)**가 필요합니다.

Gmail 앱 비밀번호: Google 계정 → 보안 → 2단계 인증 사용 후 "앱 비밀번호"에서 생성.

### "SUPABASE_URL, SUPABASE_ANON_KEY가 설정되지 않았습니다" 오류 시

1. **Environment(적용 환경) 확인**  
   변수가 **Preview**에만 있으면 **Production 배포에는 적용되지 않습니다.**  
   - Vercel → Settings → Environment Variables → 각 변수 옆 **⋯** → Edit  
   - **Environments**에서 **Production** 체크(또는 **All Environments** 선택) 후 저장  

2. 변수 4개(`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GMAIL_USER`, `GMAIL_PASS`)가 모두 있는지 확인  

3. **재배포**  
   - Deployments → 최신 배포 → **⋯** → **Redeploy**  
   - 환경변수는 배포 시점에만 반영되므로, 수정 후 반드시 재배포해야 합니다.  

4. API는 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`도 읽습니다.  
   이미 Vercel에 이 이름으로만 넣어 두었다면 Production 적용 여부만 확인하면 됩니다.

## 3. 동작 흐름

1. 사용자가 마이페이지에서 "고객 문의" 모달에 이메일·유형·제목·내용 입력 후 보내기.
2. 프론트에서 `POST /api/support-inquiry` 호출.
3. API에서:
   - `support_inquiries` 테이블에 행 삽입
   - `mamssi.official@gmail.com`으로 위 내용 정해진 포맷으로 이메일 발송 (Gmail SMTP 465).
4. 성공 시 프론트에서 "문의가 접수되었습니다." 토스트 표시.

### "문의 저장 권한이 없습니다" (RLS) 오류 시

**가장 쉬운 해결:** `SUPABASE_SERVICE_ROLE_KEY` 추가 (RLS 우회)

1. Supabase 대시보드 → **Settings** → **API** → **Project API keys**  
2. **service_role** (secret) 복사  
3. Vercel → Settings → Environment Variables → **Add**  
   - Key: `SUPABASE_SERVICE_ROLE_KEY`  
   - Value: 복사한 service_role 값  
   - Sensitive: 켜기  
4. **Redeploy** 실행  

> service_role은 **서버 전용**으로만 사용하고, 절대 클라이언트(프론트)에 노출하지 마세요.

### "문의 저장에 실패했습니다" 오류 시

1. **테이블 생성 여부**  
   Supabase 대시보드 → **SQL Editor** → `supabase_support_inquiries.sql` 내용 전체 복사 후 **Run** 실행.  
   `support_inquiries` 테이블과 RLS 정책이 생성됩니다.

2. **Vercel Function 로그로 원인 확인**  
   Vercel → Deployments → 최신 배포 → **Functions** 또는 **Runtime Logs**에서  
   `[support-inquiry] DB insert error:` 로그를 열어 Supabase가 반환한 메시지 확인.

3. **자주 나오는 원인**
   - 테이블 미생성 → 위 SQL 실행
   - `uuid_generate_v4()` 오류 → Supabase SQL Editor에서 `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";` 실행 후 다시 시도
   - RLS로 차단 → 정책 `support_inquiries insert all` (INSERT with check (true)) 존재 여부 확인

## 4. 관련 파일

- **SQL**: `supabase_support_inquiries.sql`
- **API**: `api/support-inquiry.ts` (Vercel Serverless)
- **프론트**: `src/services/supportInquiry.ts`, `src/pages/MyPage.tsx` (고객 문의 모달)
