import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { getSupabaseAuthStorageKey, supabase } from '@lib/supabaseClient';
import { getAuthCallbackUrl } from '@lib/authCallbackUrl';
import { notify } from '@lib/notify';
import { identifyUser, resetUser } from '@lib/analytics';
import { diag } from '@boot/diag';
import { safeStorage } from '@lib/safeStorage';
import { clearLockOnSignOut } from '@utils/lock';
import type { User, Session, AuthError } from '@supabase/supabase-js';

type UserProfile = {
  onboarding_completed: boolean;
  is_deleted: boolean;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null; // public.users 테이블 정보
  loading: boolean;
  sessionInitialized: boolean; // 세션 초기화 완료 여부
  isGuest: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithKakao: () => Promise<void>;
  signOut: () => Promise<void>;
  setGuestMode: (isGuest: boolean) => void;
  refreshUserProfile: () => Promise<void>; // userProfile 갱신 함수
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// safeStorage 사용

const ONBOARDING_COMPLETE_KEY = 'onboardingComplete';
const GUEST_MODE_KEY = 'isGuest';

// 로딩 완료 시 배너 제거 헬퍼 함수
const removeLoadingBanner = () => {
  if (typeof (window as any).__removeLoadingBanner === 'function') {
    (window as any).__removeLoadingBanner();
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionInitialized, setSessionInitialized] = useState(false);
  const [isGuest, setIsGuest] = useState(() => {
    return safeStorage.getItem(GUEST_MODE_KEY) === 'true';
  });

  // public.users 테이블에서 userProfile 조회
  const fetchUserProfile = async (
    userId: string,
    skipOnboarding?: boolean
  ): Promise<UserProfile | null> => {
    const isOnboardingRoute = location.pathname.startsWith('/onboarding');
    console.log('[AuthProvider] fetchUserProfile 시작', {
      userId,
      skipOnboarding,
      isOnboardingRoute,
      pathname: location.pathname,
    });
    diag.log('AuthProvider: fetchUserProfile 시작', { userId, skipOnboarding, isOnboardingRoute });

    // 온보딩 라우트에서도 userProfile 조회는 수행 (Guard에서 온보딩 완료 여부 확인 필요)
    // 단, 타임아웃을 짧게 설정하여 빠른 응답 보장

    try {
      // 타임아웃 설정 (온보딩 라우트는 5초, 그 외는 20초 - 느린 네트워크/ Supabase 대응)
      const timeoutMs = isOnboardingRoute ? 5000 : 20000;

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error(`fetchUserProfile 타임아웃 (${timeoutMs}ms)`)),
          timeoutMs
        );
      });

      const queryPromise = supabase
        .from('users')
        .select('onboarding_completed, is_deleted')
        .eq('id', userId)
        .single();

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      if (error) {
        console.error('[AuthProvider] fetchUserProfile 에러:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          userId,
        });

        if (error.code === 'PGRST116') {
          // row not found - 신규 사용자
          console.log('[AuthProvider] users 테이블에 row 없음 (신규 사용자)');
          diag.log('AuthProvider: users 테이블에 row 없음 (신규 사용자)');
          return null;
        }

        // RLS 정책 에러 체크
        if (
          error.code === '42501' ||
          error.message?.includes('permission denied') ||
          error.message?.includes('RLS')
        ) {
          console.error('[AuthProvider] RLS 정책 에러 - users 테이블 조회 권한 없음:', error);
          diag.err('AuthProvider: RLS 정책 에러 - users 테이블 조회 권한 없음:', error);
        }

        diag.err('AuthProvider: userProfile 조회 실패:', error);
        return null;
      }

      if (!data) {
        console.warn('[AuthProvider] fetchUserProfile: data가 null');
        diag.log('AuthProvider: fetchUserProfile data가 null');
        return null;
      }

      const profile = {
        onboarding_completed: data.onboarding_completed ?? false,
        is_deleted: data.is_deleted ?? false,
      };

      console.log('[AuthProvider] fetchUserProfile 성공:', profile);
      diag.log('AuthProvider: fetchUserProfile 성공', profile);
      return profile;
    } catch (err) {
      console.error('[AuthProvider] fetchUserProfile 예외:', {
        error: err,
        userId,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      diag.err('AuthProvider: userProfile 조회 중 오류:', err);
      return null;
    }
  };

  // userProfile 갱신 함수
  const refreshUserProfile = async () => {
    if (user?.id) {
      console.log('[AuthProvider] refreshUserProfile 시작', {
        userId: user.id,
        pathname: location.pathname,
      });

      // 온보딩 라우트에서도 userProfile 조회 수행 (Guard에서 온보딩 완료 여부 확인 필요)
      const profile = await fetchUserProfile(user.id, false);
      console.log('[AuthProvider] refreshUserProfile 완료', {
        profile,
        onboarding_completed: profile?.onboarding_completed,
      });
      setUserProfile(profile);

      // profile이 조회되면 로컬 스토리지와 동기화
      if (profile) {
        if (profile.onboarding_completed === true) {
          safeStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
          console.log('[AuthProvider] 로컬 스토리지 onboarding_completed 동기화: true');
        } else {
          safeStorage.removeItem(ONBOARDING_COMPLETE_KEY);
          console.log('[AuthProvider] 로컬 스토리지 onboarding_completed 동기화: false (제거)');
        }
      } else {
        // profile이 null이면 로컬 스토리지 확인 (fallback)
        const localOnboarding = safeStorage.getItem(ONBOARDING_COMPLETE_KEY) === 'true';
        if (localOnboarding) {
          console.log(
            '[AuthProvider] refreshUserProfile: profile이 null이지만 로컬 스토리지에 onboarding_completed=true 있음'
          );
        }
      }
    }
  };

  useEffect(() => {
    console.log('[AuthProvider] useEffect 진입');
    diag.log('AuthProvider: useEffect 진입');

    // ENV 검증
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    console.log('[AuthProvider] ENV 검증', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      url: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'undefined',
    });

    if (!supabaseUrl || !supabaseAnonKey) {
      diag.err('ENV missing:', { hasUrl: !!supabaseUrl, hasKey: !!supabaseAnonKey });
      // ENV가 없어도 앱은 계속 진행 (가드가 redirect 하지 않도록)
    } else {
      diag.log('AuthProvider: ENV 검증 완료');
    }

    // Storage 접근성 테스트
    const storageTest = safeStorage.test();
    diag.log('AuthProvider: Storage 접근성:', storageTest);

    // 무한 로딩 방지: 최대 20초 후 강제 해제 (fetchUserProfile 타임아웃과 맞춤)
    const timeoutId = setTimeout(() => {
      console.warn('[AuthProvider] 로딩 타임아웃 - 강제 해제 (네트워크/서버가 느릴 수 있음)');
      setSessionInitialized(true);
      setLoading(false);
      removeLoadingBanner(); // 로딩 완료 시 배너 제거
      setUserProfile(null);
    }, 20000);

    // 초기 세션 확인
    console.log('[AuthProvider] init start', { pathname: location.pathname });
    diag.log('AuthProvider: getSession 호출 전', { loading: true });

    supabase.auth
      .getSession()
      .then(async ({ data: { session }, error: sessionError }) => {
        clearTimeout(timeoutId); // 성공 시 타임아웃 해제

        console.log('[AuthProvider] getSession 완료', {
          hasSession: !!session,
          userId: session?.user?.id,
          error: sessionError,
          pathname: location.pathname,
        });
        diag.log('AuthProvider: getSession 완료', {
          hasSession: !!session,
          userId: session?.user?.id,
        });

        if (sessionError) {
          console.error('[AuthProvider] getSession 에러:', sessionError);
          diag.err('AuthProvider: getSession 에러:', sessionError);
        }

        setSession(session);
        setUser(session?.user ?? null);

        // 로딩을 먼저 해제해 화면을 빨리 보여줌 (fetchUserProfile은 백그라운드에서 진행)
        setSessionInitialized(true);
        setLoading(false);
        removeLoadingBanner();
        diag.log('AuthProvider: 초기화 완료 (getSession 기준)', { sessionInitialized: true, loading: false });

        // 세션이 있으면 userProfile은 백그라운드에서 조회 (블로킹 없음)
        const isOnboardingRoute = location.pathname.startsWith('/onboarding');
        if (session?.user?.id && !isOnboardingRoute) {
          fetchUserProfile(session.user.id, false)
            .then((profile) => {
              setUserProfile(profile);
              if (profile?.onboarding_completed === true) {
                safeStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
              } else if (profile) {
                safeStorage.removeItem(ONBOARDING_COMPLETE_KEY);
              }
            })
            .catch(() => setUserProfile(null));
        } else {
          setUserProfile(null);
        }
      })
      .catch((err) => {
        clearTimeout(timeoutId); // 에러 시에도 타임아웃 해제

        console.error('[AuthProvider] getSession catch:', err);
        diag.err('AuthProvider: getSession 실패:', err);
        // 에러가 나도 loading을 false로 설정하여 앱이 멈추지 않도록
        console.log('[AuthProvider] setLoading(false) 호출 - getSession catch 경로');
        setSessionInitialized(true);
        setLoading(false);
        removeLoadingBanner(); // 로딩 완료 시 배너 제거
        setUserProfile(null);
      });

    // 인증 상태 변경 리스너
    console.log('[AuthProvider] onAuthStateChange 리스너 등록 시작');
    diag.log('AuthProvider: onAuthStateChange 리스너 등록 전');

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthProvider] onAuthStateChange 진입', {
        event,
        hasSession: !!session,
        userId: session?.user?.id,
      });
      diag.log('AuthProvider: onAuthStateChange 진입', {
        event,
        hasSession: !!session,
        userId: session?.user?.id,
      });

      try {
        setSession(session);
        setUser(session?.user ?? null);

        // 로그인 사용자 식별 (Mixpanel 등)
        if (session?.user?.id) {
          identifyUser(session.user.id);
        }

        // userProfile은 백그라운드에서 조회 (블로킹 없이 화면 먼저 표시)
        const isOnboardingRoute = location.pathname.startsWith('/onboarding');
        if (session?.user?.id && !isOnboardingRoute) {
          fetchUserProfile(session.user.id, false)
            .then((profile) => {
              setUserProfile(profile);
              if (profile?.onboarding_completed === true) {
                safeStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
              } else if (profile) {
                safeStorage.removeItem(ONBOARDING_COMPLETE_KEY);
              }
            })
            .catch(() => setUserProfile(null));
        } else {
          setUserProfile(null);
        }

        if (event === 'SIGNED_IN' && session?.user) {
          identifyUser(session.user.id);
          console.log('[AuthProvider] SIGNED_IN 이벤트', { userId: session.user.id });
          diag.log('AuthProvider: SIGNED_IN', { userId: session.user.id });
          // 로그인 성공 시 게스트 모드 해제
          safeStorage.removeItem(GUEST_MODE_KEY);
          setIsGuest(false);
          notify.success('반가워요! 마음,씨 정원으로 이동합니다 🌿');
        } else if (event === 'SIGNED_OUT') {
          resetUser();
          console.log('[AuthProvider] SIGNED_OUT 이벤트');
          diag.log('AuthProvider: SIGNED_OUT');
          setIsGuest(false);
          safeStorage.removeItem(GUEST_MODE_KEY);
          setUserProfile(null);
        }

        // onAuthStateChange에서도 loading=false 보장
        console.log('[AuthProvider] setLoading(false) 호출 - onAuthStateChange 경로');
        setSessionInitialized(true);
        setLoading(false);
        removeLoadingBanner(); // 로딩 완료 시 배너 제거
        diag.log('AuthProvider: onAuthStateChange 완료', { event, loading: false });
      } catch (err) {
        console.error('[AuthProvider] onAuthStateChange 예외:', err);
        diag.err('AuthProvider: onAuthStateChange 예외:', err);
        // 어떤 에러가 나도 loading을 false로 설정
        console.log('[AuthProvider] setLoading(false) 호출 - onAuthStateChange catch 경로');
        setSessionInitialized(true);
        setLoading(false);
        removeLoadingBanner(); // 로딩 완료 시 배너 제거
        setUserProfile(null);
      }
    });

    console.log('[AuthProvider] onAuthStateChange 리스너 등록 완료');
    diag.log('AuthProvider: onAuthStateChange 리스너 등록 완료');

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getAuthCallbackUrl(),
        },
      });

      if (error) throw error;
    } catch (error) {
      const authError = error as AuthError;
      console.error('Google 로그인 실패:', authError);
      notify.error('로그인에 실패했어요. 잠시 후 다시 시도해주세요.', '❌');
    }
  };

  const signInWithApple = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: getAuthCallbackUrl(),
        },
      });

      if (error) throw error;
    } catch (error) {
      const authError = error as AuthError;
      console.error('Apple 로그인 실패:', authError);
      notify.error('로그인에 실패했어요. 잠시 후 다시 시도해주세요.', '❌');
    }
  };

  const signInWithKakao = async () => {
    // TODO: Supabase 기본 OAuth에는 Kakao가 기본 제공되지 않습니다.
    // 추후 커스텀 OAuth 프록시 또는 SSO 연동이 필요합니다.
    notify.info('카카오 로그인은 준비 중이에요. 곧 만나요!', 'ℹ️');
  };

  const signOut = async () => {
    try {
      diag.log('AuthProvider: signOut 호출');

      // Supabase signOut은 내부적으로 현재 세션이 필요합니다.
      // 로컬에서 OAuth 직후/라우팅 전환 중에 세션이 아직 없으면 AuthSessionMissingError가 발생하고,
      // 이 경우에도 "로그아웃"이 완료된 상태로 정리되도록 로컬 토큰을 강제로 제거합니다.
      const { data: sessionData, error: sessionCheckError } = await supabase.auth.getSession();
      if (sessionCheckError) {
        diag.err('AuthProvider: signOut 전 getSession 에러', sessionCheckError);
      }

      const hasSession = !!sessionData?.session?.user;
      if (!hasSession) {
        const storageKey = getSupabaseAuthStorageKey();
        safeStorage.removeItem(storageKey);
        safeStorage.removeItem(`${storageKey}-code-verifier`);
        safeStorage.removeItem(`${storageKey}-user`);

        clearLockOnSignOut();
        safeStorage.removeItem(GUEST_MODE_KEY);
        setIsGuest(false);
        setUser(null);
        setSession(null);
        setUserProfile(null);
        notify.info('로그아웃되었어요.', '👋');
        diag.log('AuthProvider: signOut - 세션 없음, 로컬 토큰 강제 정리 완료');
        return;
      }

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // 로그아웃 시 잠금 설정 초기화
      clearLockOnSignOut();

      safeStorage.removeItem(GUEST_MODE_KEY);
      setIsGuest(false);
      setUser(null);
      setSession(null);
      setUserProfile(null);
      diag.log('AuthProvider: 로그아웃 완료');
      notify.info('로그아웃되었어요.', '👋');
    } catch (error) {
      const authError = error as AuthError & { name?: string };
      const message = String((authError as any)?.message ?? '');
      const isSessionMissing =
        authError?.name === 'AuthSessionMissingError' || message.includes('Auth session missing');

      if (isSessionMissing) {
        // getSession/signOut 동시 타이밍 이슈로 signOut만 실패하는 케이스 대응
        const storageKey = getSupabaseAuthStorageKey();
        safeStorage.removeItem(storageKey);
        safeStorage.removeItem(`${storageKey}-code-verifier`);
        safeStorage.removeItem(`${storageKey}-user`);

        clearLockOnSignOut();
        safeStorage.removeItem(GUEST_MODE_KEY);
        setIsGuest(false);
        setUser(null);
        setSession(null);
        setUserProfile(null);
        notify.info('로그아웃되었어요.', '👋');
        diag.log('AuthProvider: 로그아웃 실패(AuthSessionMissingError) - 로컬 토큰 강제 정리 완료');
        return;
      }

      diag.err('AuthProvider: 로그아웃 실패', authError);
      console.error('로그아웃 실패:', authError);
      notify.error('로그아웃에 실패했어요. 잠시 후 다시 시도해주세요.', '❌');
    }
  };

  const setGuestMode = (guest: boolean) => {
    diag.log('AuthProvider: setGuestMode', { guest });
    if (guest) {
      safeStorage.setItem(GUEST_MODE_KEY, 'true');
      safeStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
      diag.log('AuthProvider: 게스트 모드 플래그 저장 완료');
    } else {
      safeStorage.removeItem(GUEST_MODE_KEY);
    }
    setIsGuest(guest);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userProfile,
        loading,
        sessionInitialized,
        isGuest,
        signInWithGoogle,
        signInWithApple,
        signInWithKakao,
        signOut,
        setGuestMode,
        refreshUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
