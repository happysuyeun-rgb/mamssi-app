import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@lib/supabaseClient';
import { notify } from '@lib/notify';
import { safeStorage } from '@lib/safeStorage';
import { diag } from '@boot/diag';

const ONBOARDING_COMPLETE_KEY = 'onboardingComplete';

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    diag.log('AuthCallback: OAuth 콜백 처리 시작', { search: location.search });

    const handleAuthCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          diag.err('AuthCallback: 세션 확인 실패:', error);
          navigate('/onboarding', { replace: true });
          return;
        }

        if (session?.user) {
          diag.log('AuthCallback: 로그인 성공', { userId: session.user.id });
          
          // 온보딩 완료 상태 저장 (safeStorage 사용)
          safeStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
          diag.log('AuthCallback: 온보딩 완료 플래그 저장', {
            onboardingComplete: safeStorage.getItem(ONBOARDING_COMPLETE_KEY)
          });
          
          // 프로필 확인 및 온보딩 완료 상태 업데이트
          try {
            const { error: profileError } = await supabase
              .from('profiles')
              .update({ onboarding_complete: true })
              .eq('id', session.user.id);

            if (profileError && profileError.code !== 'PGRST116') {
              diag.err('AuthCallback: 프로필 업데이트 실패:', profileError);
            } else {
              diag.log('AuthCallback: 프로필 업데이트 완료');
            }
          } catch (err) {
            diag.err('AuthCallback: 프로필 처리 중 오류:', err);
          }

          notify.success('반가워요! 마음,씨 정원으로 이동합니다 🌿', '🌿');
          
          // 쿼리스트링 제거 후 홈으로 이동 (OAuth 복귀 루프 방지)
          diag.log('AuthCallback: 홈으로 리다이렉트 (쿼리스트링 제거)');
          navigate('/home', { replace: true });
        } else {
          diag.log('AuthCallback: 세션 없음, 온보딩으로 이동');
          navigate('/onboarding', { replace: true });
        }
      } catch (error) {
        diag.err('AuthCallback: 인증 콜백 처리 실패:', error);
        navigate('/onboarding', { replace: true });
      }
    };

    handleAuthCallback();
  }, [navigate, location.search]);

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      fontSize: 14,
      color: 'var(--ms-ink-soft)'
    }}>
      로그인 처리 중...
    </div>
  );
}

