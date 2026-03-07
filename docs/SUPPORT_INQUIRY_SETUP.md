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

Vercel 프로젝트 → Settings → Environment Variables에 추가:

| 이름 | 값 | 비고 |
|------|-----|------|
| `SUPABASE_URL` | Supabase 프로젝트 URL | `VITE_SUPABASE_URL`과 동일 |
| `SUPABASE_ANON_KEY` | Supabase anon key | `VITE_SUPABASE_ANON_KEY`와 동일 |
| `GMAIL_USER` | mamssi.official@gmail.com | 발신 Gmail 주소 |
| `GMAIL_PASS` | Gmail 앱 비밀번호 | 일반 비밀번호 아님, [앱 비밀번호 발급](https://myaccount.google.com/apppasswords) |

Gmail 앱 비밀번호: Google 계정 → 보안 → 2단계 인증 사용 후 "앱 비밀번호"에서 생성.

## 3. 동작 흐름

1. 사용자가 마이페이지에서 "고객 문의" 모달에 이메일·유형·제목·내용 입력 후 보내기.
2. 프론트에서 `POST /api/support-inquiry` 호출.
3. API에서:
   - `support_inquiries` 테이블에 행 삽입
   - `mamssi.official@gmail.com`으로 위 내용 정해진 포맷으로 이메일 발송 (Gmail SMTP 465).
4. 성공 시 프론트에서 "문의가 접수되었습니다." 토스트 표시.

## 4. 관련 파일

- **SQL**: `supabase_support_inquiries.sql`
- **API**: `api/support-inquiry.ts` (Vercel Serverless)
- **프론트**: `src/services/supportInquiry.ts`, `src/pages/MyPage.tsx` (고객 문의 모달)
