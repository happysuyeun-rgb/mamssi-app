import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@lib/supabaseClient';
import { notify } from '@lib/notify';
import { diag } from '@boot/diag';
import { safeStorage } from '@lib/safeStorage';
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionInitialized, setSessionInitialized] = useState(false);
  const [isGuest, setIsGuest] = useState(() => {
    return safeStorage.getItem(GUEST_MODE_KEY) === 'true';
  });

  // public.users 테이블에서 userProfile 조회
  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('onboarding_completed, is_deleted')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // row not found - 신규 사용자
          diag.log('AuthProvider: users 테이블에 row 없음 (신규 사용자)');
          return null;
        }
        diag.err('AuthProvider: userProfile 조회 실패:', error);
        return null;
      }

      return {
        onboarding_completed: data.onboarding_completed ?? false,
        is_deleted: data.is_deleted ?? false
      };
    } catch (err) {
      diag.err('AuthProvider: userProfile 조회 중 오류:', err);
      return null;
    }
  };

  // userProfile 갱신 함수
  const refreshUserProfile = async () => {
    if (user?.id) {
      const profile = await fetchUserProfile(user.id);
      setUserProfile(profile);
    }
  };

  useEffect(() => {
    diag.log('AuthProvider: useEffect 진입');

    // ENV 검증
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      diag.err('ENV missing:', { hasUrl: !!supabaseUrl, hasKey: !!supabaseAnonKey });
      // ENV가 없어도 앱은 계속 진행 (가드가 redirect 하지 않도록)
    } else {
      diag.log('AuthProvider: ENV 검증 완료');
    }

    // Storage 접근성 테스트
    const storageTest = safeStorage.test();
    diag.log('AuthProvider: Storage 접근성:', storageTest);

    // 초기 세션 확인
    diag.log('AuthProvider: getSession 호출 전', { loading: true });
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      diag.log('AuthProvider: getSession 완료', { hasSession: !!session, userId: session?.user?.id });
      setSession(session);
      setUser(session?.user ?? null);
      
      // 세션이 있으면 userProfile 조회
      if (session?.user?.id) {
        const profile = await fetchUserProfile(session.user.id);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
      
      setSessionInitialized(true);
      setLoading(false);
      diag.log('AuthProvider: 초기화 완료', { sessionInitialized: true, loading: false });
    }).catch((err) => {
      diag.err('AuthProvider: getSession 실패:', err);
      // 에러가 나도 loading을 false로 설정하여 앱이 멈추지 않도록
      setSessionInitialized(true);
      setLoading(false);
    });

    // 인증 상태 변경 리스너
    diag.log('AuthProvider: onAuthStateChange 리스너 등록 전');
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      diag.log('AuthProvider: onAuthStateChange 진입', { event, hasSession: !!session, userId: session?.user?.id });
      setSession(session);
      setUser(session?.user ?? null);

      // 세션이 있으면 userProfile 조회
      if (session?.user?.id) {
        const profile = await fetchUserProfile(session.user.id);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }

      if (event === 'SIGNED_IN' && session?.user) {
        diag.log('AuthProvider: SIGNED_IN', { userId: session.user.id });
        // 로그인 성공 시 게스트 모드 해제
        safeStorage.removeItem(GUEST_MODE_KEY);
        setIsGuest(false);
        notify.success('반가워요! 마음,씨 정원으로 이동합니다 🌿');
      } else if (event === 'SIGNED_OUT') {
        diag.log('AuthProvider: SIGNED_OUT');
        setIsGuest(false);
        safeStorage.removeItem(GUEST_MODE_KEY);
        setUserProfile(null);
      }

      // onAuthStateChange에서도 loading=false 보장
      setSessionInitialized(true);
      setLoading(false);
      diag.log('AuthProvider: onAuthStateChange 완료', { event, loading: false });
    });
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
          redirectTo: `${window.location.origin}/auth/callback`
        }
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
          redirectTo: `${window.location.origin}/auth/callback`
        }
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
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      safeStorage.removeItem(GUEST_MODE_KEY);
      setIsGuest(false);
      setUser(null);
      setSession(null);
      diag.log('AuthProvider: 로그아웃 완료');
      notify.info('로그아웃되었어요.', '👋');
    } catch (error) {
      const authError = error as AuthError;
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
        refreshUserProfile
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

