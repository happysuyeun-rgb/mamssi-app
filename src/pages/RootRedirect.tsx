import { Navigate } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { safeStorage } from '@lib/safeStorage';
import { diag } from '@boot/diag';
import LoadingSplash from '@components/LoadingSplash';

const ONBOARDING_COMPLETE_KEY = 'onboardingComplete';

/**
 * 루트 경로("/") 리다이렉트 컴포넌트
 * - 로그인 상태와 온보딩 완료 여부에 따라 적절한 경로로 리다이렉트
 */
export default function RootRedirect() {
  console.log('[RootRedirect] 렌더링됨');
  
  const { session, loading, sessionInitialized } = useAuth();
  const hasCompletedOnboarding = safeStorage.getItem(ONBOARDING_COMPLETE_KEY) === 'true';
  const isLoggedIn = !!session;

  console.log('[RootRedirect] 상태 확인', {
    isLoggedIn,
    hasCompletedOnboarding,
    loading,
    sessionInitialized,
    path: window.location.hash
  });

  diag.log('RootRedirect: 리다이렉트 결정', {
    isLoggedIn,
    hasCompletedOnboarding,
    loading,
    sessionInitialized
  });

  // 세션 초기화 전에는 로딩 표시 (하지만 리다이렉트는 즉시 결정)
  // 로딩 중이어도 localStorage는 읽을 수 있으므로, 온보딩 완료 여부는 즉시 확인 가능
  if (!sessionInitialized) {
    // sessionInitialized가 false일 때는 아직 세션 상태를 모르므로,
    // 온보딩 완료 여부만 확인하여 안전하게 리다이렉트
    if (hasCompletedOnboarding) {
      // 온보딩 완료했으면 홈으로 (세션이 있든 없든)
      diag.log('RootRedirect -> /home (세션 초기화 전, 온보딩 완료)', { reason: '온보딩 완료, 세션 확인 대기 중' });
      return <Navigate to="/home" replace />;
    } else {
      // 온보딩 미완료면 온보딩으로
      diag.log('RootRedirect -> /onboarding (세션 초기화 전, 온보딩 미완료)', { reason: '온보딩 미완료, 세션 확인 대기 중' });
      return <Navigate to="/onboarding" replace />;
    }
  }

  // 세션 초기화 완료 후 정확한 판단
  // 로그인한 사용자 → 홈으로
  if (isLoggedIn) {
    diag.log('RootRedirect -> /home', { reason: '로그인한 사용자' });
    return <Navigate to="/home" replace />;
  }

  // 로그인하지 않았고 온보딩 미완료 → 온보딩으로
  if (!hasCompletedOnboarding) {
    diag.log('RootRedirect -> /onboarding', { reason: '최초 사용자: 로그인 없음 + 온보딩 미완료' });
    return <Navigate to="/onboarding" replace />;
  }

  // 로그인하지 않았지만 온보딩 완료한 게스트 → 홈으로
  diag.log('RootRedirect -> /home', { reason: '온보딩 완료한 게스트' });
  return <Navigate to="/home" replace />;
}

