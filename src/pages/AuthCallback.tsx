import { useEffect } from 'react';
import { supabase } from '@lib/supabaseClient';
import { diag } from '@boot/diag';
import { safeStorage } from '@lib/safeStorage';

// 로그인/가입 상태를 저장하는 키
const AUTH_FLOW_KEY = 'authFlowType'; // 'LOGIN' | 'SIGNUP'
const ONBOARDING_COMPLETE_KEY = 'onboardingComplete';

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
        let session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'] = null;
        let sessionError: Awaited<ReturnType<typeof supabase.auth.getSession>>['error'] = null;

        // PKCE flow: URL에 ?code= 있으면 먼저 교환 (가장 빠른 경로)
        // search 우선, 일부 환경에서 hash에 code가 올 수 있음
        const params = new URLSearchParams(window.location.search);
        let code = params.get('code');
        if (!code && window.location.hash) {
          const hashPart = window.location.hash.split('?')[1];
          if (hashPart) {
            code = new URLSearchParams(hashPart).get('code');
          }
        }
        if (code) {
          diag.log('AuthCallback: PKCE code 발견, exchangeCodeForSession 호출');
          const { data: exchangeData, error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            diag.err('AuthCallback: code 교환 실패:', exchangeError);
            console.error('[AuthCallback] exchangeCodeForSession 실패:', {
              message: exchangeError.message,
              code: exchangeError.code,
              status: exchangeError.status,
              hint: 'detectSessionInUrl이 true면 Supabase가 이미 교환했을 수 있음. supabaseClient에서 false로 설정했는지 확인',
            });
            goTo('/login');
            return;
          }
          session = exchangeData?.session ?? null;
          sessionError = exchangeError ?? null;
        }

        // code 없으면 initialize() + getSession
        if (!session?.user) {
          diag.log('AuthCallback: auth.initialize 호출');
          const initResult = await supabase.auth.initialize();
          session = initResult?.data?.session ?? null;
          sessionError = initResult?.error ?? null;
        }
        if (!session?.user) {
          const getResult = await supabase.auth.getSession();
          session = getResult.data.session;
          sessionError = getResult.error;
          if (!session?.user && !sessionError) {
            await new Promise((r) => setTimeout(r, 150));
            const retry = await supabase.auth.getSession();
            session = retry.data.session;
            sessionError = retry.error;
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

        // public.users 테이블에서 해당 user.id row 찾기 (3초 타임아웃)
        diag.log('AuthCallback: users 테이블 조회 시작');
        const usersQuery = supabase
          .from('users')
          .select('id, onboarding_completed, is_deleted, deleted_at')
          .eq('id', userId)
          .single();
        const usersTimeout = new Promise<{ data: null; error: { code: string; message: string } }>(
          (resolve) =>
            setTimeout(
              () => resolve({ data: null, error: { code: 'TIMEOUT', message: 'users 조회 타임아웃' } }),
              3000
            )
        );
        const { data: existingUser, error: userError } = await Promise.race([
          usersQuery,
          usersTimeout,
        ]);

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
            userError.code === 'TIMEOUT' ||
            userError.message?.includes('permission denied') ||
            userError.message?.includes('RLS')
          ) {
            // RLS/타임아웃: 조회 실패 - 기존 회원일 수 있음. 홈으로 이동 후 AuthProvider가 재조회
            diag.err('AuthCallback: users 조회 실패 - 홈으로 이동:', userError);
            safeStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
            goTo('/home');
            return;
          } else {
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

          // 온보딩 상태에 따라 라우팅 (회원가입 완료 사용자는 바로 홈)
          if (onboardingCompleted) {
            diag.log('AuthCallback: 온보딩 완료 유저, /home으로 이동');
            safeStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
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
