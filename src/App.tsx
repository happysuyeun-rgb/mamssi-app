import { useEffect, useState, lazy, Suspense } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import AuthCallback from '@pages/AuthCallback';
import LockScreen from '@components/LockScreen';
import ToastHost from '@components/feedback/ToastHost';
import OnboardingGuest from '@components/onboarding/OnboardingGuest';
import Guard from '@components/Guard';
import LoadingSplash from '@components/LoadingSplash';
import { loadLockSettings } from '@utils/lock';
import { LOCK_SESSION_KEY, LOCK_STORAGE_KEY } from './types/lock';
import { diag } from '@boot/diag';
import './app.css';

// 라우트별 코드 스플리팅 — 첫 화면 로딩 속도 개선
const Home = lazy(() => import('@pages/Home'));
const Record = lazy(() => import('@pages/Record'));
const Forest = lazy(() => import('@pages/Forest'));
const MyPage = lazy(() => import('@pages/MyPage'));
const ForestDetail = lazy(() => import('@pages/ForestDetail'));
const Debug = lazy(() => import('@pages/Debug'));
const LoginPage = lazy(() => import('@pages/LoginPage'));
const SignupPage = lazy(() => import('@pages/SignupPage'));
const DeleteAccountPage = lazy(() => import('@pages/DeleteAccountPage'));

function AppRoutes() {
  const [isLocked, setIsLocked] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    diag.log('AppRoutes: 잠금 체크 마운트');

    const checkLock = () => {
      const settings = loadLockSettings();
      const sessionUnlocked = sessionStorage.getItem(LOCK_SESSION_KEY) === 'true';

      // 개발 환경에서는 잠금 화면 건너뛰기 (HMR/탭 전환 시 매번 PIN 입력 방지)
      if (import.meta.env.DEV) {
        setIsLocked(false);
        setIsChecking(false);
        diag.log('AppRoutes: 잠금 체크 완료 (DEV: 잠금 건너뜀)');
        return;
      }

      if (settings.enabled) {
        if (sessionUnlocked) {
          setIsLocked(false);
        } else {
          setIsLocked(true);
        }
      } else {
        sessionStorage.removeItem(LOCK_SESSION_KEY);
        setIsLocked(false);
      }
      setIsChecking(false);
      diag.log('AppRoutes: 잠금 체크 완료', { isLocked: settings.enabled && !sessionUnlocked });
    };

    checkLock();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LOCK_STORAGE_KEY) {
        checkLock();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
    // pathname 제거: 탭 네비게이션 시마다 재실행되면 잠금 해제 후에도 LockScreen이 다시 표시되는 버그 발생
  }, []);

  // OAuth 콜백: pathname이 /auth/callback이면 AuthCallback 렌더 (HashRouter 무시)
  const isAuthCallbackPath =
    typeof window !== 'undefined' &&
    (window.location.pathname === '/auth/callback' ||
      window.location.pathname.endsWith('/auth/callback'));
  if (isAuthCallbackPath) {
    return <AuthCallback />;
  }

  const handleUnlock = () => {
    sessionStorage.setItem(LOCK_SESSION_KEY, 'true');
    setIsLocked(false);
  };

  if (isChecking) {
    return null; // 초기 체크 중
  }

  if (isLocked) {
    return (
      <>
        <LockScreen onUnlock={handleUnlock} />
        <ToastHost />
      </>
    );
  }

  return (
    <Guard>
      <Suspense fallback={<LoadingSplash />}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/debug" element={<Debug />} />
          <Route path="/onboarding" element={<OnboardingGuest />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/delete-account" element={<DeleteAccountPage />} />
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/record" element={<Record />} />
          <Route path="/forest" element={<Forest />} />
          <Route path="/forest/my-posts" element={<Forest mode="mine" />} />
          <Route path="/forest/:postId" element={<ForestDetail />} />
          <Route path="/mypage" element={<MyPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <ToastHost />
    </Guard>
  );
}

export default function App() {
  return <AppRoutes />;
}
