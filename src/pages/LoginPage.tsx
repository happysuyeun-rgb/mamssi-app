import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { useNotify } from '@providers/NotifyProvider';
import { diag } from '@boot/diag';
import './LoginPage.css';

export type SocialProvider = 'google' | 'apple' | 'kakao' | 'facebook' | 'line';

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signInWithGoogle, signInWithApple, signInWithKakao } = useAuth();
  const notify = useNotify();
  
  // 이메일 로그인 폼 상태
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBack = () => {
    console.log('[LoginPage] 뒤로가기 클릭');
    diag.log('LoginPage: 뒤로가기 클릭');
    navigate('/home', { replace: true });
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요');
      notify.warning('이메일과 비밀번호를 입력해주세요', '⚠️');
      return;
    }

    setIsLoading(true);
    diag.log('LoginPage: 이메일 로그인 시도', { email });

    try {
      const { error: signInError } = await signIn({ email, password });

      if (signInError) {
        let errorMessage = signInError;
        
        if (signInError.includes('Invalid login credentials') || signInError.includes('invalid')) {
          errorMessage = '이메일 또는 비밀번호가 올바르지 않아요.';
        } else if (signInError.includes('Email not confirmed')) {
          errorMessage = '이메일 인증이 완료되지 않았어요. 이메일을 확인해주세요.';
        }

        setError(errorMessage);
        notify.error(errorMessage, '❌');
        diag.err('LoginPage: 로그인 실패', signInError);
        setIsLoading(false);
        return;
      }

      // 로그인 성공
      diag.log('LoginPage: 로그인 성공');
      notify.success('로그인되었어요! 마음,씨 정원으로 이동합니다 🌿', '🌿');
      
      // /home으로 이동 (AuthProvider의 onAuthStateChange에서 처리되지만, 명시적으로 이동)
      navigate('/home', { replace: true });
    } catch (error) {
      diag.err('LoginPage: 로그인 예외', error);
      setError('로그인에 실패했어요. 잠시 후 다시 시도해주세요.');
      notify.error('로그인에 실패했어요. 잠시 후 다시 시도해주세요.', '❌');
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: SocialProvider) => {
    // TODO: Supabase OAuth Provider 설정 후 연동 예정
    console.log(`TODO: 소셜 로그인 - ${provider}`);
    diag.log(`LoginPage: ${provider} 소셜 로그인 (TODO)`);
    
    // 추후 Supabase OAuth 연동 시 아래 코드 활성화
    // try {
    //   if (provider === 'google') {
    //     await signInWithGoogle();
    //   } else if (provider === 'kakao') {
    //     await signInWithKakao();
    //   } else if (provider === 'line') {
    //     // LINE OAuth 연동
    //   }
    // } catch (error) {
    //   diag.err('LoginPage: 소셜 로그인 실패:', error);
    //   notify.error('소셜 로그인에 실패했어요. 잠시 후 다시 시도해주세요.', '❌');
    // }
  };

  const handleGoToSignup = () => {
    console.log('[LoginPage] 회원가입 페이지로 이동');
    diag.log('LoginPage: 회원가입 페이지로 이동');
    navigate('/signup', { replace: true });
  };

  // Apple, Facebook 버튼 제거 (Google, Kakao, LINE만 유지)
  const socialButtons: { provider: SocialProvider; label: string; icon: string; className: string }[] = [
    { provider: 'google', label: 'Google로 로그인하기', icon: 'G', className: 'auth-btn-google' },
    { provider: 'kakao', label: '카카오 계정으로 로그인하기', icon: '✉️', className: 'auth-btn-kakao' },
    { provider: 'line', label: 'LINE 계정으로 로그인하기', icon: 'L', className: 'auth-btn-line' }
  ];

  return (
    <div className="auth-shell">
      <section className="auth-page login">
        <header className="auth-header">
          <button className="auth-back" onClick={handleBack} aria-label="뒤로가기">
            ←
          </button>
          <h1 className="auth-title">로그인하기</h1>
        </header>

        <div className="auth-hero">
          <div className="auth-mascot-wrap">
            <div className="auth-mascot">🌱</div>
          </div>
          <p className="auth-hero-title">다시 돌아오셨군요, 마음 정원사님</p>
          <p className="auth-hero-desc">
            어제 심어둔 감정 씨앗부터{'\n'}
            오늘 새로 피울 감정꽃까지 이어서 돌볼 수 있어요.
          </p>
        </div>

        {/* 이메일 로그인 폼 */}
        <form onSubmit={handleEmailLogin} style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              disabled={isLoading}
              required
              style={{
                padding: '11px 14px',
                borderRadius: '999px',
                border: `1px solid ${error ? '#ef4444' : 'var(--ms-border-soft, #dde8e3)'}`,
                fontSize: 14,
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            />
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              disabled={isLoading}
              required
              style={{
                padding: '11px 14px',
                borderRadius: '999px',
                border: `1px solid ${error ? '#ef4444' : 'var(--ms-border-soft, #dde8e3)'}`,
                fontSize: 14,
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            />
            {error && (
              <div style={{
                fontSize: 12,
                color: '#ef4444',
                padding: '0 4px',
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              style={{
                padding: '11px 14px',
                borderRadius: '999px',
                border: 'none',
                fontSize: 14,
                fontWeight: 500,
                background: 'var(--ms-primary, #2f6f63)',
                color: '#ffffff',
                cursor: isLoading || !email || !password ? 'not-allowed' : 'pointer',
                opacity: isLoading || !email || !password ? 0.5 : 1,
                transition: 'opacity 0.2s'
              }}
            >
              {isLoading ? '로그인 중...' : '이메일로 로그인하기'}
            </button>
          </div>
        </form>

        {/* 구분선 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          margin: '18px 0',
          color: 'var(--ms-text-sub, #6b7d78)',
          fontSize: 12
        }}>
          <div style={{ flex: 1, height: 1, background: 'var(--ms-border-soft, #dde8e3)' }} />
          <span>또는</span>
          <div style={{ flex: 1, height: 1, background: 'var(--ms-border-soft, #dde8e3)' }} />
        </div>

        <div className="auth-social-list">
          {socialButtons.map((btn) => (
            <button
              key={btn.provider}
              className={`auth-btn ${btn.className}`}
              onClick={() => handleSocialLogin(btn.provider)}
              disabled={isLoading}
            >
              <span className="icon">{btn.icon}</span>
              <span>{btn.label}</span>
            </button>
          ))}
        </div>

        <div className="auth-footer">
          마음,씨가 처음이신가요?
          <button type="button" onClick={handleGoToSignup}>
            새 계정 만들기
          </button>
        </div>
      </section>
    </div>
  );
}


