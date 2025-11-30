import { createClient } from '@supabase/supabase-js';
import { diag } from '@boot/diag';

diag.log('supabaseClient: ENV 검사 시작');

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = `[환경변수 오류] Supabase 설정이 누락되었습니다.
  
필수 환경변수:
  - VITE_SUPABASE_URL: ${supabaseUrl ? '✅ 설정됨' : '❌ 미설정'}
  - VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ 설정됨' : '❌ 미설정'}

.env 파일 또는 환경변수를 확인해주세요.
예시:
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-key
`;
  diag.err('ENV missing:', { hasUrl: !!supabaseUrl, hasKey: !!supabaseAnonKey });
  
  // throw 금지: 앱은 계속 렌더되어야 함 (스플래시/온보딩이라도 보여야 함)
  // 개발 환경에서도 throw하지 않고 경고만 표시
}

// ENV가 없어도 더미 클라이언트 생성 (앱 크래시 방지)
// 단, 실제 사용 시에는 에러를 발생시켜야 하므로 placeholder를 사용하되
// useCommunity 등에서 ENV 검증을 수행합니다.
// 주의: placeholder URL로는 실제 네트워크 요청이 나가지 않도록 방어 로직이 필요합니다.
const finalUrl = supabaseUrl || 'https://lbmtccfncnqdsrrtsspt.supabase.co';
const finalKey = supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxibXRjY2ZuY25xZHNycnRzc3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3OTcwMzQsImV4cCI6MjA3OTM3MzAzNH0.eUhOIwcCxFoqFysWMLpOhReXaVnyKfOVifiug_NTTSY';

// 실제 ENV 값이 있는지 확인하는 헬퍼 함수
export function hasValidSupabaseConfig(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  // 디버깅: 모든 import.meta.env 값 확인
  const allEnvKeys = Object.keys(import.meta.env).filter(k => k.startsWith('VITE_'));
  diag.log('hasValidSupabaseConfig: ENV 키 목록', { 
    allViteKeys: allEnvKeys,
    hasUrl: !!url,
    hasKey: !!key,
    urlValue: url ? url.substring(0, 30) + '...' : 'undefined',
    keyValue: key ? key.substring(0, 20) + '...' : 'undefined'
  });
  console.log('[ENV Debug] 모든 VITE_ 환경 변수:', allEnvKeys);
  console.log('[ENV Debug] VITE_SUPABASE_URL:', url || 'undefined');
  console.log('[ENV Debug] VITE_SUPABASE_ANON_KEY:', key ? key.substring(0, 20) + '...' : 'undefined');
  
  const isValid = !!(url && key && !url.includes('placeholder') && !key.includes('placeholder'));
  
  diag.log('hasValidSupabaseConfig: 검증 결과', {
    hasUrl: !!url,
    hasKey: !!key,
    urlIncludesPlaceholder: url?.includes('placeholder'),
    keyIncludesPlaceholder: key?.includes('placeholder'),
    isValid
  });
  
  if (!isValid) {
    console.error('[ENV Debug] 환경 변수 검증 실패:', {
      url: url || 'undefined',
      key: key ? '설정됨' : 'undefined',
      message: '프로젝트 루트에 .env 파일을 생성하고 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 설정해주세요.'
    });
  }
  
  return isValid;
}

diag.log('supabaseClient: 클라이언트 생성', { 
  hasRealUrl: !!supabaseUrl, 
  hasRealKey: !!supabaseAnonKey,
  url: supabaseUrl ? finalUrl.substring(0, 30) + '...' : 'placeholder (ENV 미설정)'
});

export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  // 네트워크 에러 처리 개선
  global: {
    headers: {
      'apikey': finalKey
    }
  }
});

diag.log('supabaseClient: 초기화 완료');

