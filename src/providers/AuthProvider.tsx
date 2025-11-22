import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@lib/supabaseClient';
import { notify } from '@lib/notify';
import { diag } from '@boot/diag';
import { safeStorage } from '@lib/safeStorage';
import type { User, Session, AuthError } from '@supabase/supabase-js';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  sessionInitialized: boolean; // 세션 초기화 완료 여부
  isGuest: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithKakao: () => Promise<void>;
  signOut: () => Promise<void>;
  setGuestMode: (isGuest: boolean) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// safeStorage 사용

const ONBOARDING_COMPLETE_KEY = 'onboardingComplete';
const GUEST_MODE_KEY = 'isGuest';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionInitialized, setSessionInitialized] = useState(false);
  const [isGuest, setIsGuest] = useState(() => {
    return safeStorage.getItem(GUEST_MODE_KEY) === 'true';
  });

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      diag.log('AuthProvider: getSession 완료', { hasSession: !!session, userId: session?.user?.id });
      setSession(session);
      setUser(session?.user ?? null);
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

      if (event === 'SIGNED_IN' && session?.user) {
        diag.log('AuthProvider: SIGNED_IN', { userId: session.user.id });
        // 로그인 성공 시 게스트 모드 해제
        safeStorage.removeItem(GUEST_MODE_KEY);
        setIsGuest(false);
        notify.success('반가워요! 마음,씨 정원으로 이동합니다 🌿');

        // 프로필 확인 및 생성
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (error && error.code === 'PGRST116') {
            // 프로필이 없으면 생성
            const onboardingComplete = safeStorage.getItem(ONBOARDING_COMPLETE_KEY) === 'true';
            diag.log('AuthProvider: 프로필 생성', { onboardingComplete });
            const { error: insertError } = await supabase.from('profiles').insert({
              id: session.user.id,
              onboarding_complete: onboardingComplete
            });

            if (insertError) {
              diag.err('프로필 생성 실패:', insertError);
            }
          } else if (profile && !profile.onboarding_complete) {
            // 온보딩 완료 상태 동기화
            const onboardingComplete = safeStorage.getItem(ONBOARDING_COMPLETE_KEY) === 'true';
            if (onboardingComplete) {
              diag.log('AuthProvider: 온보딩 완료 상태 동기화');
              await supabase
                .from('profiles')
                .update({ onboarding_complete: true })
                .eq('id', session.user.id);
            }
          }
        } catch (err) {
          diag.err('프로필 확인 중 오류:', err);
        }
      } else if (event === 'SIGNED_OUT') {
        diag.log('AuthProvider: SIGNED_OUT');
        setIsGuest(false);
        safeStorage.removeItem(GUEST_MODE_KEY);
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
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      safeRemoveItem(GUEST_MODE_KEY);
      setIsGuest(false);
      notify.info('로그아웃되었어요.', '👋');
    } catch (error) {
      const authError = error as AuthError;
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
        loading,
        sessionInitialized,
        isGuest,
        signInWithGoogle,
        signInWithApple,
        signInWithKakao,
        signOut,
        setGuestMode
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

