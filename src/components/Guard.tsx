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
  const { session, loading, sessionInitialized, isGuest } = useAuth();
  const redirectedRef = useRef<string | null>(null);

  useEffect(() => {
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
      diag.log('Guard: loading=true, 가드 비활성화 (라우팅 금지)');
      return;
    }

    // 세션 초기화가 완료되기 전에는 가드 비활성화
    if (!sessionInitialized) {
      diag.log('Guard: sessionInitialized=false, 가드 비활성화');
      return;
    }

    const onboardingComplete = safeStorage.getItem(ONBOARDING_COMPLETE_KEY) === 'true';
    const guestMode = safeStorage.getItem(GUEST_MODE_KEY) === 'true';

    diag.log('Guard: 상태 확인', {
      path: location.pathname,
      hasSession: !!session,
      isGuest,
      guestMode,
      onboardingComplete
    });

    const atRoot = location.pathname === '/';
    const atOnboarding = location.pathname.startsWith('/onboarding');
    const atDebug = location.pathname === '/debug';
    const atAuthCallback = location.pathname.startsWith('/auth/callback');
    const atLogin = location.pathname === '/login';
    const atSignup = location.pathname === '/signup';

    // "/" 경로는 RootRedirect가 처리하므로 Guard에서 예외 처리
    if (atRoot) {
      diag.log('Guard: 루트 경로, RootRedirect가 처리하도록 가드 우회', { path: location.pathname });
      redirectedRef.current = null;
      return;
    }

    // /debug, /auth/callback, /login, /signup는 항상 허용 (가드 우회)
    if (atDebug || atAuthCallback || atLogin || atSignup) {
      diag.log('Guard: 특수 경로, 가드 우회', { path: location.pathname });
      redirectedRef.current = null;
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

    // [핵심 로직] 최초 진입 시 온보딩 체크
    // 로그인하지 않은 상태 AND 온보딩 미완료 → 온보딩으로
    // 단, "/" 경로는 RootRedirect가 처리하므로 제외
    if (!session && !onboardingComplete && !atOnboarding && !atRoot) {
      if (redirectedRef.current !== '/onboarding') {
        diag.log('GUARD -> to /onboarding', { 
          reason: '최초 사용자: 로그인 없음 + 온보딩 미완료' 
        });
        redirectedRef.current = '/onboarding';
        navigate('/onboarding', { replace: true });
      }
      return;
    }

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
  }, [location.pathname, navigate, session, sessionInitialized, loading, isGuest]);

  // loading=true일 때는 절대 라우팅 금지, 스플래시 표시
  if (loading) {
    diag.log('Guard: loading=true, 스플래시 표시 (라우팅 금지)');
    return <LoadingSplash message="인증 상태를 확인하는 중..." />;
  }

  // 세션 초기화 완료 전에는 로딩 표시
  if (!sessionInitialized) {
    diag.log('Guard: sessionInitialized=false, 스플래시 표시');
    return <LoadingSplash message="인증 상태를 확인하는 중..." />;
  }

  diag.log('Guard: children 렌더링', { path: location.pathname });
  return <>{children}</>;
}

