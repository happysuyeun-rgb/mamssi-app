import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { safeStorage } from '@lib/safeStorage';
import { diag } from '@boot/diag';
import LoadingSplash from './LoadingSplash';

const ONBOARDING_COMPLETE_KEY = 'onboardingComplete';
const GUEST_MODE_KEY = 'isGuest';

/**
 * 라우팅 가드 컴포넌트
 * - session 로딩 완료 전에는 가드 비활성화
 * - 무한 리다이렉트 방지
 */
export default function Guard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading, sessionInitialized, isGuest, userProfile } = useAuth();
  const redirectedRef = useRef<string | null>(null);
  const loadingStartTimeRef = useRef<number | null>(null);

  // 무한 로딩 방지: 로딩 시작 시간 추적
  useEffect(() => {
    if (loading) {
      if (!loadingStartTimeRef.current) {
        loadingStartTimeRef.current = Date.now();
      }
    } else {
      loadingStartTimeRef.current = null;
    }
  }, [loading]);

  // 무한 로딩 방지: 10초 후 경고
  useEffect(() => {
    if (loading && loadingStartTimeRef.current) {
      const timeout = setTimeout(() => {
        const elapsed = Date.now() - loadingStartTimeRef.current!;
        console.error('[Guard] 로딩이 10초 이상 지속됨:', {
          elapsed,
          path: location.pathname,
          sessionInitialized,
          hasSession: !!session
        });
      }, 10000);
      return () => clearTimeout(timeout);
    }
  }, [loading, location.pathname, sessionInitialized, session]);

  useEffect(() => {
    console.log('[Guard] useEffect 진입', {
      path: location.pathname,
      loading,
      sessionInitialized,
      hasSession: !!session,
      userId: session?.user?.id,
      isGuest,
      userProfile,
      redirected: redirectedRef.current
    });
    
    diag.log('Guard: useEffect 진입', {
      path: location.pathname,
      loading,
      sessionInitialized,
      hasSession: !!session,
      isGuest,
      redirected: redirectedRef.current
    });

    // loading=true일 때는 절대 라우팅 금지
    if (loading) {
      console.log('[Guard] loading=true, 가드 비활성화 (라우팅 금지)');
      diag.log('Guard: loading=true, 가드 비활성화 (라우팅 금지)');
      return;
    }

    // 세션 초기화가 완료되기 전에는 가드 비활성화
    if (!sessionInitialized) {
      console.log('[Guard] sessionInitialized=false, 가드 비활성화');
      diag.log('Guard: sessionInitialized=false, 가드 비활성화');
      return;
    }

    // 로그인 사용자의 경우 DB의 onboarding_completed 사용 (우선순위 1)
    // 게스트 모드의 경우 localStorage 사용
    const guestMode = safeStorage.getItem(GUEST_MODE_KEY) === 'true';
    
    // userProfile이 null인 경우 처리
    // - session이 있지만 userProfile이 null이면 아직 조회 중이거나 실패한 상태
    // - 이 경우 로컬 스토리지를 fallback으로 사용하되, DB와 동기화 필요
    let onboardingComplete = false;
    if (session && userProfile !== null) {
      // userProfile이 명시적으로 조회된 경우 (null이 아님) - DB 값 사용 (가장 신뢰할 수 있음)
      onboardingComplete = userProfile.onboarding_completed === true; // 명시적으로 true인지 확인
      console.log('[Guard] userProfile에서 onboarding_completed 확인:', {
        onboarding_completed: userProfile.onboarding_completed,
        is_deleted: userProfile.is_deleted,
        onboardingComplete
      });
      
      // DB 값과 로컬 스토리지 동기화 (DB 값이 우선)
      if (userProfile.onboarding_completed === true) {
        safeStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
      } else {
        safeStorage.removeItem(ONBOARDING_COMPLETE_KEY);
      }
    } else if (session && userProfile === null) {
      // session은 있지만 userProfile이 null인 경우
      // - fetchUserProfile이 실패했거나 아직 조회 중
      // - 이 경우 로컬 스토리지를 fallback으로 사용하되, DB 재조회 시도
      const localOnboarding = safeStorage.getItem(ONBOARDING_COMPLETE_KEY) === 'true';
      onboardingComplete = localOnboarding;
      
      console.warn('[Guard] userProfile이 null입니다. 로컬 스토리지 fallback 사용:', {
        localOnboarding,
        note: 'DB에서 userProfile을 다시 조회해야 합니다. AuthProvider에서 재시도 중...'
      });
      
      // userProfile이 null이면 AuthProvider에서 재조회를 시도해야 함
      // 하지만 Guard에서는 로컬 스토리지 값을 사용하여 무한 리다이렉트 방지
      // 단, 로컬 스토리지 값이 true여도 DB 값이 false면 온보딩으로 보내야 함
      // 이 경우는 AuthProvider에서 userProfile을 재조회한 후 다시 Guard가 실행되면 해결됨
    } else if (guestMode) {
      onboardingComplete = safeStorage.getItem(ONBOARDING_COMPLETE_KEY) === 'true';
    }

    // is_deleted 체크
    const isDeleted = userProfile?.is_deleted === true;

    console.log('[Guard] 상태 확인', {
      path: location.pathname,
      hasSession: !!session,
      isGuest,
      guestMode,
      onboardingComplete,
      isDeleted,
      userProfile,
      userProfileIsNull: userProfile === null
    });
    
    diag.log('Guard: 상태 확인', {
      path: location.pathname,
      hasSession: !!session,
      isGuest,
      guestMode,
      onboardingComplete,
      isDeleted,
      userProfile
    });

    // /debug, /auth/callback, /login, /signup는 항상 허용 (가드 우회)
    if (atDebug || atAuthCallback || atLogin || atSignup) {
      diag.log('Guard: 특수 경로, 가드 우회', { path: location.pathname });
      redirectedRef.current = null;
      return;
    }

    // 온보딩 라우트에서는 userProfile null이어도 통과
    // 온보딩 중에는 DB 조회 실패와 무관하게 진행 가능해야 함
    if (atOnboarding) {
      console.log('[Guard] 온보딩 라우트 - userProfile 체크 완화', {
        path: location.pathname,
        hasSession: !!session,
        userProfileIsNull: userProfile === null
      });
      diag.log('Guard: 온보딩 라우트, 가드 완화', { path: location.pathname });
      redirectedRef.current = null;
      return; // children 렌더링 허용 (온보딩 진행 가능)
    }

    // is_deleted=true인 경우: 기능 접근 막고 복구/온보딩으로 유도
    // (AuthCallback에서 이미 복구 처리하지만, 추가 안전장치)
    if (session && isDeleted && !atOnboarding) {
      if (redirectedRef.current !== '/onboarding') {
        diag.log('GUARD -> to /onboarding', { 
          reason: '탈퇴된 계정, 온보딩으로 이동' 
        });
        redirectedRef.current = '/onboarding';
        navigate('/onboarding?step=5', { replace: true });
      }
      return;
    }

    // 결정표 기반 리다이렉트
    diag.log('Guard: 결정표 검사 시작', {
      atOnboarding,
      hasSession: !!session,
      isGuest,
      guestMode,
      onboardingComplete
    });

    // 로그인 상태인데 onboarding_completed=false면 /home이 아니라 /onboarding으로 리다이렉트
    // 단, userProfile이 null이고 로컬 스토리지에 onboarding_completed=true가 있으면 온보딩 완료로 간주
    // 하지만 userProfile이 명시적으로 조회된 경우 (null이 아님) DB 값을 우선 사용
    if (session && !onboardingComplete && !atOnboarding) {
      // userProfile이 명시적으로 조회된 경우 (null이 아님) DB 값이 false면 무조건 온보딩으로
      if (userProfile !== null && userProfile.onboarding_completed === false) {
        console.log('[Guard] DB 값이 false, 온보딩으로 리다이렉트:', {
          userProfileOnboardingCompleted: userProfile.onboarding_completed
        });
        if (redirectedRef.current !== '/onboarding') {
          diag.log('GUARD -> to /onboarding', { 
            reason: 'DB 값이 false (명시적 조회 완료)' 
          });
          redirectedRef.current = '/onboarding';
          navigate('/onboarding?step=5', { replace: true });
        }
        return;
      }
      
      // userProfile이 null이지만 로컬 스토리지에 onboarding_completed=true가 있으면 온보딩 완료로 간주
      const localOnboardingCheck = safeStorage.getItem(ONBOARDING_COMPLETE_KEY) === 'true';
      if (userProfile === null && localOnboardingCheck) {
        console.log('[Guard] userProfile이 null이지만 로컬 스토리지에 onboarding_completed=true 있음. 온보딩 완료로 간주 (임시)');
        // 온보딩 완료로 간주하고 리다이렉트하지 않음
        // 단, AuthProvider에서 userProfile을 재조회한 후 다시 Guard가 실행되면 DB 값으로 재확인됨
        redirectedRef.current = null;
        return;
      }
      
      // userProfile이 null이고 이미 리다이렉트를 시도했다면 무한 루프 방지
      if (userProfile === null && redirectedRef.current === '/onboarding') {
        console.warn('[Guard] userProfile이 null이고 이미 /onboarding으로 리다이렉트했음. 무한 루프 방지');
        return;
      }
      
      if (redirectedRef.current !== '/onboarding') {
        console.log('[Guard] -> to /onboarding', { 
          reason: '로그인 상태 + 온보딩 미완료',
          userProfileIsNull: userProfile === null,
          localOnboarding: localOnboardingCheck
        });
        diag.log('GUARD -> to /onboarding', { 
          reason: '로그인 상태 + 온보딩 미완료' 
        });
        redirectedRef.current = '/onboarding';
        navigate('/onboarding?step=5', { replace: true });
      }
      return;
    }

    // 온보딩 미완료 + 로그인 안됨 + 게스트 아님 → 온보딩으로
    if (!session && !guestMode && !atOnboarding && !onboardingComplete) {
      if (redirectedRef.current !== '/onboarding') {
        diag.log('GUARD -> to /onboarding', { 
          reason: '온보딩 미완료 + 로그인 없음 + 게스트 아님' 
        });
        redirectedRef.current = '/onboarding';
        navigate('/onboarding', { replace: true });
      }
      return;
    }

    // onboarding_completed=true면 /home으로 이동
    // 로그인/게스트 + 온보딩 완료 + 온보딩 화면 → 홈으로
    // 단, step 파라미터가 있으면 회원가입을 위해 온보딩 페이지 접근 허용
    const hasStepParam = new URLSearchParams(location.search).get('step') !== null;
    if ((session || guestMode) && onboardingComplete && atOnboarding && !hasStepParam) {
      if (redirectedRef.current !== '/home') {
        diag.log('GUARD -> to /home', { 
          reason: `${session ? '로그인' : '게스트'} + 온보딩 완료 + 온보딩 화면 (step 파라미터 없음)` 
        });
        redirectedRef.current = '/home';
        navigate('/home', { replace: true });
      }
      return;
    }
    
    // step 파라미터가 있으면 회원가입을 위해 온보딩 페이지 접근 허용
    if (atOnboarding && hasStepParam) {
      diag.log('Guard: step 파라미터 감지, 온보딩 페이지 접근 허용', { 
        step: new URLSearchParams(location.search).get('step'),
        path: location.pathname
      });
      redirectedRef.current = null;
      return;
    }

    // 온보딩 완료한 사용자(게스트/로그인)는 주요 화면 진입 허용
    // 주요 화면: /home, /record, /forest, /mypage 등
    const allowedPaths = ['/home', '/', '/record', '/forest', '/mypage'];
    const isAllowedPath = allowedPaths.some(path => 
      location.pathname === path || location.pathname.startsWith(path + '/')
    );

    if (onboardingComplete && isAllowedPath) {
      diag.log('Guard: 온보딩 완료 사용자, 주요 화면 진입 허용', { 
        path: location.pathname,
        isGuest: guestMode,
        hasSession: !!session
      });
      redirectedRef.current = null;
      return; // children 렌더링 허용
    }

    // 그 외는 허용
    diag.log('Guard: 경로 허용', { path: location.pathname });
    redirectedRef.current = null;
  }, [location.pathname, navigate, session, sessionInitialized, loading, isGuest, userProfile]);

  // 온보딩 라우트에서는 loading/userProfile 체크 완화
  const atOnboarding = location.pathname.startsWith('/onboarding');
  const atDebug = location.pathname === '/debug';
  const atAuthCallback = location.pathname.startsWith('/auth/callback');
  const atLogin = location.pathname === '/login';
  const atSignup = location.pathname === '/signup';
  const isSpecialRoute = atOnboarding || atDebug || atAuthCallback || atLogin || atSignup;

  // 특수 라우트(온보딩 포함)에서는 loading 체크 완화
  // 온보딩 중에는 DB 조회 실패와 무관하게 진행 가능해야 함
  // 온보딩 라우트에서는 loading을 강제로 false로 간주
  const effectiveLoading = atOnboarding ? false : loading;
  const effectiveSessionInitialized = atOnboarding ? true : sessionInitialized;

  if (effectiveLoading && !isSpecialRoute) {
    console.log('[Guard] loading=true, 스플래시 표시');
    diag.log('Guard: loading=true, 스플래시 표시 (라우팅 금지)');
    return <LoadingSplash message="인증 상태를 확인하는 중..." />;
  }

  // 세션 초기화 완료 전에는 로딩 표시 (단, 온보딩은 예외)
  if (!effectiveSessionInitialized && !isSpecialRoute) {
    console.log('[Guard] sessionInitialized=false, 스플래시 표시');
    diag.log('Guard: sessionInitialized=false, 스플래시 표시');
    return <LoadingSplash message="인증 상태를 확인하는 중..." />;
  }

  diag.log('Guard: children 렌더링', { path: location.pathname });
  return <>{children}</>;
}

