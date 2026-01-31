import { useEffect, useState } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import AuthCallback from '@pages/AuthCallback';
import Home from '@pages/Home';
import Record from '@pages/Record';
import Forest from '@pages/Forest';
import MyPage from '@pages/MyPage';
import ForestDetail from '@pages/ForestDetail';
import Debug from '@pages/Debug';
import LoginPage from '@pages/LoginPage';
import SignupPage from '@pages/SignupPage';
import DeleteAccountPage from '@pages/DeleteAccountPage';
import LockScreen from '@components/LockScreen';
import ToastHost from '@components/feedback/ToastHost';
import OnboardingGuest from '@components/onboarding/OnboardingGuest';
import Guard from '@components/Guard';
import { loadLockSettings } from '@utils/lock';
import { LOCK_SESSION_KEY, LOCK_STORAGE_KEY } from './types/lock';
import { diag } from '@boot/diag';
import './app.css';

function AppRoutes() {
  // OAuth 콜백: pathname이 /auth/callback이면 AuthCallback 렌더 (HashRouter 무시)
  // Supabase OAuth는 path 기반 URL로 리다이렉트 → pathname 체크 필요
  const isAuthCallbackPath =
    typeof window !== 'undefined' &&
    (window.location.pathname === '/auth/callback' ||
      window.location.pathname.endsWith('/auth/callback'));
  if (isAuthCallbackPath) {
    return <AuthCallback />;
  }

  const [isLocked, setIsLocked] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    diag.log('AppRoutes: 잠금 체크 마운트');

    const checkLock = () => {
      const settings = loadLockSettings();
      const sessionUnlocked = sessionStorage.getItem(LOCK_SESSION_KEY) === 'true';

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
      <ToastHost />
    </Guard>
  );
}

export default function App() {
  return <AppRoutes />;
}
