# Supabase 네트워크 연결 오류 해결 가이드

공감숲 등 화면에서 "네트워크 연결에 실패했어요" 오류가 발생할 때 확인할 사항입니다.

## 1. 환경변수 설정 확인

프로젝트 루트에 `.env` 파일이 있고, 다음 값이 올바르게 설정되었는지 확인하세요.

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

- Supabase Dashboard → **Settings** → **API** 에서 URL과 anon key 확인
- `.env` 수정 후 **개발 서버를 재시작**해야 반영됩니다 (`npm run dev` 종료 후 재실행)

## 2. Supabase 프로젝트 일시중지 (Free tier)

Free tier 프로젝트는 **7일간 비활성** 시 자동으로 일시중지됩니다.

**해결**: [Supabase Dashboard](https://supabase.com/dashboard) 접속 → 프로젝트 선택 → **Restore project** 클릭

## 3. 인터넷 연결

- Wi-Fi 또는 모바일 데이터 연결 상태 확인
- VPN 사용 시 Supabase 도메인 차단 여부 확인 (일시적으로 VPN 해제 후 테스트)

## 4. CORS 설정

Supabase는 기본적으로 모든 origin에서 API 요청을 허용합니다. 별도 CORS 설정이 필요한 경우:

- Supabase Dashboard → **Settings** → **API** → CORS 관련 설정 확인
- 로컬 개발: `http://localhost:5173` 등에서 접근 가능해야 함

## 5. 브라우저/개발자 도구 확인

1. 브라우저 개발자 도구(F12) → **Network** 탭
2. 공감숲 화면 새로고침
3. `supabase.co` 또는 `realtime` 관련 요청 중 실패(빨간색) 항목 확인
4. 실패한 요청 클릭 → **Headers** 또는 **Response** 탭에서 에러 상세 확인

## 6. 빠른 체크리스트

| 항목 | 확인 |
|------|------|
| `.env` 파일 존재 | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 설정 |
| 개발 서버 재시작 | `.env` 수정 후 `npm run dev` 재실행 |
| Supabase 프로젝트 상태 | Dashboard에서 일시중지 여부 확인 → Restore |
| 인터넷 연결 | 다른 사이트 접속 가능한지 확인 |

## 7. 관련 파일

- `src/lib/supabaseClient.ts` - Supabase 클라이언트 초기화
- `src/hooks/useCommunity.ts` - 공감숲 데이터 조회 (네트워크 에러 처리)
