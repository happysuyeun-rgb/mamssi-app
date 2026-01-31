# 모바일 크롬 Google 로그인 검증 체크리스트

변경 후 모바일에서 로그인을 재검증할 때 사용하는 체크리스트입니다.

## 사전 준비

- [ ] Vercel에 최신 코드 배포 완료
- [ ] Supabase Dashboard > Auth > URL Configuration 설정 완료
  - [ ] Site URL = `https://<vercel-domain>`
  - [ ] Redirect URLs에 `https://<vercel-domain>/*`, `/auth/callback` 포함

## 모바일 크롬 검증 절차

### 1. 접속

- [ ] 모바일 크롬에서 **배포 URL**(예: `https://mamssi.vercel.app`) 직접 입력하여 접속
- [ ] 로컬(localhost)이 아닌 **실제 배포 도메인**으로 접속했는지 확인

### 2. Google 로그인 시도

- [ ] 로그인/회원가입 화면에서 **Google로 로그인하기** 버튼 탭
- [ ] Google 계정 선택 화면이 정상 표시되는지 확인
- [ ] 계정 선택 후 인증 완료

### 3. 리다이렉트 확인

- [ ] OAuth 완료 후 **localhost로 리다이렉트되지 않는지** 확인
- [ ] `ERR_CONNECTION_REFUSED` 또는 "연결할 수 없음" 오류가 발생하지 않는지 확인
- [ ] **배포 도메인**(예: `https://mamssi.vercel.app/auth/callback`)으로 돌아오는지 확인

### 4. 콜백 처리 및 홈 이동

- [ ] "로그인 처리 중..." 메시지가 잠시 표시되는지 확인
- [ ] 이후 **홈** 또는 **온보딩** 화면으로 정상 이동하는지 확인
- [ ] 로그인 상태(프로필, 메뉴 등)가 올바르게 반영되는지 확인

### 5. 추가 시나리오

- [ ] **신규 가입**: 온보딩 플로우가 정상 진행되는지 확인
- [ ] **기존 유저**: 홈으로 바로 이동하는지 확인
- [ ] **로그아웃 후 재로그인**: 동일하게 정상 동작하는지 확인

## 실패 시 점검 사항

| 증상 | 점검 항목 |
|------|-----------|
| localhost로 리다이렉트 | Supabase Site URL, Redirect URLs 확인 |
| ERR_CONNECTION_REFUSED | Site URL이 localhost로 설정되어 있는지 확인 |
| 콜백 후 빈 화면 | `/auth/callback` 라우트, Vercel rewrites 확인 |
| 무한 로딩 | 네트워크 탭에서 리다이렉트 URL 확인 |

## 참고

- [SUPABASE_AUTH_SETUP.md](./SUPABASE_AUTH_SETUP.md) - Supabase Auth URL 설정 가이드
