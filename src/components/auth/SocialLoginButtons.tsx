import { supabase, hasValidSupabaseConfig } from '@lib/supabaseClient';
import { getAuthCallbackUrl } from '@lib/authCallbackUrl';
import { diag } from '@boot/diag';
import { notify } from '@lib/notify';

type SocialLoginButtonsProps = {
  mode: 'login' | 'signup';
  disabled?: boolean;
};

export default function SocialLoginButtons({ mode, disabled = false }: SocialLoginButtonsProps) {
  const handleGoogleLogin = async () => {
    if (disabled) return;

    diag.log('SocialLoginButtons: Google 로그인 버튼 클릭', { mode });

    // 환경 변수 검증
    if (!hasValidSupabaseConfig()) {
      const errorMsg =
        '환경변수가 없어 소셜 로그인을 사용할 수 없습니다. VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 .env 파일에 설정해주세요.';
      diag.err('SocialLoginButtons: Supabase 설정 오류', { hasConfig: false });
      console.error('Supabase 설정 오류:', errorMsg);
      notify.error('구글 로그인에 실패했어요. 환경 설정을 확인해주세요.', '❌');
      return;
    }

    try {
      const redirectUrl = getAuthCallbackUrl();

      diag.log('SocialLoginButtons: signInWithOAuth 호출 전', {
        provider: 'google',
        redirectTo: redirectUrl,
        currentOrigin: window.location.origin,
        currentHref: window.location.href,
        currentPathname: window.location.pathname,
        currentHash: window.location.hash,
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      });
      console.log('[OAuth Debug] 호출 전:', {
        provider: 'google',
        redirectTo: redirectUrl,
        origin: window.location.origin,
        pathname: window.location.pathname,
        hash: window.location.hash,
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account', // 계정 선택 화면 표시
          },
        },
      });

      diag.log('SocialLoginButtons: signInWithOAuth 호출 후', {
        hasData: !!data,
        hasError: !!error,
        dataKeys: data ? Object.keys(data) : [],
        dataUrl: data?.url ? data.url.substring(0, 100) + '...' : null,
        errorMessage: error?.message,
        errorCode: error?.status,
      });
      console.log('[OAuth Debug] 호출 후:', {
        hasData: !!data,
        hasError: !!error,
        data: data,
        error: error,
        dataUrl: data?.url,
      });

      if (error) {
        diag.err('SocialLoginButtons: Google 로그인 실패', error);
        console.error('[OAuth Debug] Google 로그인 실패:', error);
        notify.error(
          `구글 로그인에 실패했어요. ${error.message || '잠시 후 다시 시도해 주세요.'}`,
          '❌'
        );
        return;
      }

      // 수동 리다이렉트 (브라우저 자동 리다이렉트가 되지 않는 경우 대비)
      if (data?.url) {
        const oauthUrl = data.url;
        diag.log('SocialLoginButtons: OAuth URL로 수동 리다이렉트', {
          url: oauthUrl.substring(0, 100) + '...',
          fullUrl: oauthUrl,
        });
        console.log('[OAuth Debug] OAuth URL로 리다이렉트:', oauthUrl);
        console.log('[OAuth Debug] 리다이렉트 전 현재 URL:', window.location.href);

        // 즉시 리다이렉트
        window.location.href = oauthUrl;
      } else {
        diag.err('SocialLoginButtons: data.url이 없음', { data });
        console.error('[OAuth Debug] data.url이 없습니다:', { data, error });
        console.error('[OAuth Debug] Supabase 설정 확인 필요:', {
          supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
          hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
          redirectUrl: redirectUrl,
        });
        notify.error(
          '구글 로그인 URL을 가져오지 못했어요.\n\n' +
            '확인 사항:\n' +
            '1. Supabase 대시보드 > Authentication > URL Configuration에서\n' +
            `   "${redirectUrl}" 리다이렉트 URL이 등록되어 있는지 확인해주세요.\n` +
            '2. Google OAuth Provider가 활성화되어 있는지 확인해주세요.',
          '❌'
        );
      }
    } catch (error) {
      diag.err('SocialLoginButtons: Google 로그인 오류', error);
      console.error('[OAuth Debug] Google 로그인 예외:', error);
      notify.error('구글 로그인에 실패했어요. 잠시 후 다시 시도해 주세요.', '❌');
    }
  };

  const handleAppleLogin = async () => {
    if (disabled) return;

    diag.log('SocialLoginButtons: Apple 로그인 버튼 클릭', { mode });

    // 환경 변수 검증
    if (!hasValidSupabaseConfig()) {
      const errorMsg =
        '환경변수가 없어 소셜 로그인을 사용할 수 없습니다. VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 .env 파일에 설정해주세요.';
      diag.err('SocialLoginButtons: Supabase 설정 오류', { hasConfig: false });
      console.error('Supabase 설정 오류:', errorMsg);
      notify.error('Apple 로그인에 실패했어요. 환경 설정을 확인해주세요.', '❌');
      return;
    }

    try {
      diag.log('SocialLoginButtons: signInWithOAuth 호출 전', {
        provider: 'apple',
        redirectTo: getAuthCallbackUrl(),
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: getAuthCallbackUrl(),
        },
      });

      diag.log('SocialLoginButtons: signInWithOAuth 호출 후', {
        hasData: !!data,
        hasError: !!error,
        dataUrl: data?.url ? data.url.substring(0, 100) + '...' : null,
      });

      if (error) {
        diag.err('SocialLoginButtons: Apple 로그인 실패', error);
        console.error('Apple 로그인 실패:', error);
        notify.error('Apple 로그인에 실패했어요. 잠시 후 다시 시도해 주세요.', '❌');
        return;
      }

      // 수동 리다이렉트
      if (data?.url) {
        diag.log('SocialLoginButtons: OAuth URL로 수동 리다이렉트', {
          url: data.url.substring(0, 100) + '...',
        });
        console.log('OAuth 요청 URL:', data.url);
        window.location.href = data.url;
      } else {
        diag.log('SocialLoginButtons: 자동 리다이렉트 대기 중...');
      }
    } catch (error) {
      diag.err('SocialLoginButtons: Apple 로그인 오류', error);
      console.error('Apple 로그인 오류:', error);
      notify.error('Apple 로그인에 실패했어요. 잠시 후 다시 시도해 주세요.', '❌');
    }
  };

  const handleKakaoLogin = async () => {
    if (disabled) return;

    try {
      // TODO: Supabase 기본 OAuth에는 Kakao가 기본 제공되지 않습니다.
      // 추후 커스텀 OAuth 프록시 또는 SSO 연동이 필요합니다.
      console.warn('Kakao 로그인은 아직 구현되지 않았습니다.');
      // TODO: 토스트 메시지 추가
      // notify.info('카카오 로그인은 준비 중이에요. 곧 만나요!', 'ℹ️');
    } catch (error) {
      console.error('Kakao 로그인 오류:', error);
      // TODO: 토스트 메시지 추가
      // notify.error('로그인에 실패했어요. 잠시 후 다시 시도해주세요.', '❌');
    }
  };

  return (
    <div className="auth-social-list">
      <button
        className="auth-btn auth-btn-google"
        onClick={handleGoogleLogin}
        type="button"
        disabled={disabled}
      >
        <span className="icon">G</span>
        <span>{mode === 'login' ? 'Google로 로그인하기' : 'Google로 계속하기'}</span>
      </button>
      {/* Apple, Kakao 버튼 숨김 */}
    </div>
  );
}
