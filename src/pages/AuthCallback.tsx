import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@lib/supabaseClient';
import { diag } from '@boot/diag';
import { safeStorage } from '@lib/safeStorage';

// 로그인/가입 상태를 저장하는 키
const AUTH_FLOW_KEY = 'authFlowType'; // 'LOGIN' | 'SIGNUP'

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    diag.log('AuthCallback: OAuth 콜백 처리 시작');

    const handleAuthCallback = async () => {
      try {
        // 세션 확인
        diag.log('AuthCallback: getSession 호출');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          diag.err('AuthCallback: 세션 확인 실패:', sessionError);
          navigate('/login', { replace: true });
          return;
        }

        if (!session?.user) {
          diag.log('AuthCallback: 세션 없음, 로그인 페이지로 이동');
          navigate('/login', { replace: true });
          return;
        }

        const userId = session.user.id;
        const userEmail = session.user.email;
        const userProvider = session.user.app_metadata?.provider || 'unknown';
        
        diag.log('AuthCallback: 세션 확인 완료', { 
          userId, 
          email: userEmail,
          provider: userProvider
        });

        // public.users 테이블에서 해당 user.id row 찾기
        diag.log('AuthCallback: users 테이블 조회 시작');
        const { data: existingUser, error: userError } = await supabase
          .from('users')
          .select('id, onboarding_completed, is_deleted, deleted_at')
          .eq('id', userId)
          .single();

        if (userError && userError.code !== 'PGRST116') {
          // PGRST116은 "row not found" 에러 코드
          diag.err('AuthCallback: users 테이블 조회 실패:', userError);
          navigate('/login', { replace: true });
          return;
        }

        if (existingUser) {
          // 기존 유저 존재
          const isDeleted = existingUser.is_deleted === true;
          const onboardingCompleted = existingUser.onboarding_completed === true;

          if (isDeleted) {
            // 탈퇴 후 재가입 사용자: 계정 재활성화
            diag.log('AuthCallback: 탈퇴 후 재가입 사용자 확인, 계정 재활성화', { 
              userId,
              deletedAt: existingUser.deleted_at
            });
            
            safeStorage.setItem(AUTH_FLOW_KEY, 'SIGNUP');
            
            // 계정 재활성화: is_deleted=false, deleted_at=null, onboarding_completed=false
            const { error: updateError } = await supabase
              .from('users')
              .update({
                is_deleted: false,
                deleted_at: null,
                onboarding_completed: false,
                updated_at: new Date().toISOString()
              })
              .eq('id', userId);

            if (updateError) {
              diag.err('AuthCallback: 계정 재활성화 실패:', updateError);
              navigate('/login', { replace: true });
              return;
            }

            diag.log('AuthCallback: 계정 재활성화 완료, 온보딩 페이지로 이동');
            navigate('/onboarding?step=5', { replace: true });
            return;
          }

          // 일반 기존 유저: 로그인으로 판단
          diag.log('AuthCallback: 기존 유저 확인 (LOGIN)', { 
            userId, 
            onboardingCompleted
          });
          
          safeStorage.setItem(AUTH_FLOW_KEY, 'LOGIN');
          
          // 온보딩 상태에 따라 라우팅
          if (onboardingCompleted) {
            diag.log('AuthCallback: 온보딩 완료 유저, /home으로 이동');
            navigate('/home', { replace: true });
          } else {
            diag.log('AuthCallback: 온보딩 미완료 유저, 온보딩 페이지로 이동');
            navigate('/onboarding?step=5', { replace: true });
          }
        } else {
          // 신규 유저: 가입으로 판단
          diag.log('AuthCallback: 신규 유저 확인 (SIGNUP)', { userId });
          
          safeStorage.setItem(AUTH_FLOW_KEY, 'SIGNUP');
          
          // users 테이블에 row 생성 (upsert 보장)
          diag.log('AuthCallback: users 테이블에 row 생성 시작');
          const { error: upsertError } = await supabase
            .from('users')
            .upsert({
              id: userId,
              email: userEmail,
              onboarding_completed: false,
              is_deleted: false,
              deleted_at: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'id'
            });

          if (upsertError) {
            diag.err('AuthCallback: users 테이블 upsert 실패:', upsertError);
            navigate('/login', { replace: true });
            return;
          }

          diag.log('AuthCallback: 신규 유저 생성 완료, 온보딩/씨앗 받기 페이지로 이동');
          navigate('/onboarding?step=5', { replace: true });
        }
      } catch (error) {
        diag.err('AuthCallback: 인증 콜백 처리 실패:', error);
        navigate('/login', { replace: true });
      }
    };

    handleAuthCallback();
  }, [navigate]);

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

