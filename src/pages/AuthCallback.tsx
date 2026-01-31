import { useEffect } from 'react';
import { supabase } from '@lib/supabaseClient';
import { diag } from '@boot/diag';
import { safeStorage } from '@lib/safeStorage';

// 로그인/가입 상태를 저장하는 키
const AUTH_FLOW_KEY = 'authFlowType'; // 'LOGIN' | 'SIGNUP'

/** HashRouter 사용 시 pathname 변경 필요 - window.location으로 전체 이동 */
function goTo(path: string) {
  const hashPath = path.startsWith('/') ? path : `/${path}`;
  window.location.replace(`${window.location.origin}/#${hashPath}`);
}

export default function AuthCallback() {

  useEffect(() => {
    diag.log('AuthCallback: OAuth 콜백 처리 시작');

    const AUTH_CALLBACK_TIMEOUT_MS = 15000; // 15초 후 타임아웃

    const handleAuthCallback = async () => {
      try {
        // OAuth 콜백 URL 처리: initialize()로 URL의 code/hash를 먼저 처리
        // (AuthProvider와의 경쟁 조건 방지, PKCE/implicit flow 모두 지원)
        diag.log('AuthCallback: auth.initialize 호출 (URL 파싱)');
        const initResult = await supabase.auth.initialize();
        let session = initResult?.data?.session ?? null;
        let sessionError = initResult?.error ?? null;

        // PKCE flow: initialize()에서 세션 없고 URL에 ?code= 있으면 명시적으로 교환
        if (!session?.user) {
          const params = new URLSearchParams(window.location.search);
          const code = params.get('code');
          if (code) {
            diag.log('AuthCallback: PKCE code 발견, exchangeCodeForSession 호출');
            const { data: exchangeData, error: exchangeError } =
              await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) {
              diag.err('AuthCallback: code 교환 실패:', exchangeError);
              goTo('/login');
              return;
            }
            session = exchangeData?.session ?? null;
            sessionError = exchangeError ?? null;
          }
        }

        // 세션 확인 (URL hash 파싱 지연 시 1회 재시도)
        if (!session?.user) {
          diag.log('AuthCallback: getSession 호출');
          let getResult = await supabase.auth.getSession();
          session = getResult.data.session;
          sessionError = getResult.error;
          if (!session?.user && !sessionError) {
            await new Promise((r) => setTimeout(r, 500));
            getResult = await supabase.auth.getSession();
            session = getResult.data.session;
            sessionError = getResult.error;
          }
        }

        if (sessionError) {
          diag.err('AuthCallback: 세션 확인 실패:', sessionError);
          goTo('/login');
          return;
        }

        if (!session?.user) {
          diag.log('AuthCallback: 세션 없음, 로그인 페이지로 이동');
          goTo('/login');
          return;
        }

        const userId = session.user.id;
        const userEmail = session.user.email;
        const userProvider = session.user.app_metadata?.provider || 'unknown';

        diag.log('AuthCallback: 세션 확인 완료', {
          userId,
          email: userEmail,
          provider: userProvider,
        });

        // public.users 테이블에서 해당 user.id row 찾기
        console.log('[AuthCallback] users 테이블 조회 시작', { userId });
        diag.log('AuthCallback: users 테이블 조회 시작');

        const { data: existingUser, error: userError } = await supabase
          .from('users')
          .select('id, onboarding_completed, is_deleted, deleted_at')
          .eq('id', userId)
          .single();

        if (userError) {
          console.error('[AuthCallback] users 테이블 조회 에러:', {
            code: userError.code,
            message: userError.message,
            details: userError.details,
            hint: userError.hint,
            userId,
          });

          if (userError.code === 'PGRST116') {
            // row not found - 신규 사용자 (정상 케이스)
            console.log('[AuthCallback] users 테이블에 row 없음 (신규 사용자)');
            diag.log('AuthCallback: users 테이블에 row 없음 (신규 사용자)');
          } else if (
            userError.code === '42501' ||
            userError.message?.includes('permission denied') ||
            userError.message?.includes('RLS')
          ) {
            // RLS 정책 에러
            console.error('[AuthCallback] RLS 정책 에러 - users 테이블 조회 권한 없음');
            diag.err('AuthCallback: RLS 정책 에러 - users 테이블 조회 권한 없음:', userError);
            // RLS 에러는 무시하고 계속 진행 (신규 사용자로 처리)
          } else {
            // 기타 에러
            diag.err('AuthCallback: users 테이블 조회 실패:', userError);
            goTo('/login');
            return;
          }
        }

        if (existingUser) {
          // 기존 유저 존재
          const isDeleted = existingUser.is_deleted === true;
          const onboardingCompleted = existingUser.onboarding_completed === true;

          if (isDeleted) {
            // 탈퇴 후 재가입 사용자: 계정 재활성화
            diag.log('AuthCallback: 탈퇴 후 재가입 사용자 확인, 계정 재활성화', {
              userId,
              deletedAt: existingUser.deleted_at,
            });

            safeStorage.setItem(AUTH_FLOW_KEY, 'SIGNUP');

            // 계정 재활성화: is_deleted=false, deleted_at=null, onboarding_completed=false
            const { error: updateError } = await supabase
              .from('users')
              .update({
                is_deleted: false,
                deleted_at: null,
                onboarding_completed: false,
                updated_at: new Date().toISOString(),
              })
              .eq('id', userId);

            if (updateError) {
              diag.err('AuthCallback: 계정 재활성화 실패:', updateError);
              goTo('/login');
              return;
            }

            diag.log('AuthCallback: 계정 재활성화 완료, 온보딩 페이지로 이동');
            goTo('/onboarding?step=5');
            return;
          }

          // 일반 기존 유저: 로그인으로 판단
          diag.log('AuthCallback: 기존 유저 확인 (LOGIN)', {
            userId,
            onboardingCompleted,
          });

          safeStorage.setItem(AUTH_FLOW_KEY, 'LOGIN');

          // 온보딩 상태에 따라 라우팅
          if (onboardingCompleted) {
            diag.log('AuthCallback: 온보딩 완료 유저, /home으로 이동');
            goTo('/home');
          } else {
            diag.log('AuthCallback: 온보딩 미완료 유저, 온보딩 페이지로 이동');
            goTo('/onboarding?step=5');
          }
        } else {
          // 신규 유저: 가입으로 판단
          diag.log('AuthCallback: 신규 유저 확인 (SIGNUP)', { userId });

          safeStorage.setItem(AUTH_FLOW_KEY, 'SIGNUP');

          // users + user_settings 병렬 생성 (지연 시간 단축)
          diag.log('AuthCallback: users, user_settings 병렬 생성 시작');
          const now = new Date().toISOString();
          const [usersResult, settingsResult] = await Promise.all([
            supabase.from('users').upsert(
              {
                id: userId,
                email: userEmail,
                onboarding_completed: false,
                is_deleted: false,
                deleted_at: null,
                created_at: now,
                updated_at: now,
              },
              { onConflict: 'id' }
            ),
            supabase.from('user_settings').upsert(
              {
                user_id: userId,
                nickname: '마음씨',
                updated_at: now,
              },
              { onConflict: 'user_id' }
            ),
          ]);

          if (usersResult.error) {
            diag.err('AuthCallback: users 테이블 upsert 실패:', usersResult.error);
            goTo('/login');
            return;
          }
          if (settingsResult.error) {
            diag.err('AuthCallback: user_settings 초기 생성 실패 (무시하고 진행):', settingsResult.error);
          } else {
            diag.log('AuthCallback: user_settings 초기 생성 완료 (nickname: 마음씨)');
          }

          diag.log('AuthCallback: 신규 유저 생성 완료, 온보딩/씨앗 받기 페이지로 이동');
          goTo('/onboarding?step=5');
        }
      } catch (error) {
        diag.err('AuthCallback: 인증 콜백 처리 실패:', error);
        goTo('/login');
      }
    };

    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => {
        reject(new Error('AuthCallback 타임아웃'));
      }, AUTH_CALLBACK_TIMEOUT_MS);
    });

    Promise.race([handleAuthCallback(), timeoutPromise]).catch((err) => {
      diag.err('AuthCallback: 타임아웃 또는 오류', err);
      goTo('/login');
    });
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontSize: 14,
        color: 'var(--ms-ink-soft)',
      }}
    >
      로그인 처리 중...
    </div>
  );
}
