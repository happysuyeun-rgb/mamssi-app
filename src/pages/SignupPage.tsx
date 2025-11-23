import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { useNotify } from '@providers/NotifyProvider';
import { diag } from '@boot/diag';
import type { SocialProvider } from './LoginPage';
import './SignupPage.css';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signUp, loading: authLoading } = useAuth();
  const notify = useNotify();

  // 이메일 회원가입 폼 상태
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 약관 동의 상태
  const [agreeRequired, setAgreeRequired] = useState(false);
  const [agreeOptional, setAgreeOptional] = useState(false);

  const handleBack = () => {
    console.log('[SignupPage] 뒤로가기 클릭');
    diag.log('SignupPage: 뒤로가기 클릭');
    navigate(-1);
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 필수 약관 체크
    if (!agreeRequired) {
      setError('필수 약관에 동의해야 가입할 수 있어요.');
      notify.warning('필수 약관에 동의해야 가입할 수 있어요.', '⚠️');
      return;
    }

    // 입력값 검증
    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요');
      notify.warning('이메일과 비밀번호를 입력해주세요', '⚠️');
      return;
    }

    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 해요');
      notify.warning('비밀번호는 최소 6자 이상이어야 해요', '⚠️');
      return;
    }

    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않아요');
      notify.warning('비밀번호가 일치하지 않아요', '⚠️');
      return;
    }

    setIsLoading(true);
    diag.log('SignupPage: 이메일 회원가입 시도', { email });

    try {
      const { error: signUpError } = await signUp({
        email,
        password
      });

      if (signUpError) {
        let errorMessage = signUpError;

        if (
          signUpError.includes('already registered') ||
          signUpError.includes('already exists') ||
          signUpError.includes('already been registered')
        ) {
          errorMessage = '이미 가입된 이메일이에요. 로그인해주세요.';
        } else if (signUpError.includes('invalid email')) {
          errorMessage = '올바른 이메일 형식이 아니에요.';
        } else if (signUpError.includes('password')) {
          errorMessage = '비밀번호는 최소 6자 이상이어야 해요.';
        }

        setError(errorMessage);
        notify.error(errorMessage, '❌');
        diag.err('SignupPage: 회원가입 실패', signUpError);
        setIsLoading(false);
        return;
      }

      // 회원가입 성공
      diag.log('SignupPage: 회원가입 성공');
      localStorage.setItem('onboardingComplete', 'true');
      diag.log('SignupPage: 온보딩 완료 플래그 저장');

      notify.success('회원가입이 완료되었어요! 마음,씨 정원으로 이동합니다 🌿', '🌿');
      navigate('/home', { replace: true });
    } catch (error) {
      diag.err('SignupPage: 회원가입 예외', error);
      setError('회원가입에 실패했어요. 잠시 후 다시 시도해주세요.');
      notify.error('회원가입에 실패했어요. 잠시 후 다시 시도해주세요.', '❌');
      setIsLoading(false);
    }
  };

  const handleSocialSignup = async (provider: SocialProvider) => {
    // 필수 약관 체크
    if (!agreeRequired) {
      notify.warning('필수 약관에 동의해야 진행할 수 있어요', '⚠️');
      return;
    }

    // TODO: Supabase OAuth Provider 설정 후 연동 예정
    console.log(`TODO: 소셜 로그인 - ${provider}`);
    diag.log(`SignupPage: ${provider} 소셜 로그인 (TODO)`);
  };

  const handleGoToLogin = () => {
    console.log('[SignupPage] 로그인 페이지로 이동');
    diag.log('SignupPage: 로그인 페이지로 이동');
    navigate('/login', { replace: true });
  };

  // Google, Kakao, LINE 소셜 버튼만 유지 (Apple, Facebook 제거)
  const socialButtons: { provider: SocialProvider; label: string; icon: string; className: string }[] = [
    { provider: 'google', label: 'Google로 계속하기', icon: 'G', className: 'auth-btn-google' },
    { provider: 'kakao', label: '카카오 계정으로 계속하기', icon: '✉️', className: 'auth-btn-kakao' },
    { provider: 'line', label: 'LINE 계정으로 계속하기', icon: 'L', className: 'auth-btn-line' }
  ];

  return (
    <div className="auth-shell">
      <section className="auth-page signup">
        <header className="auth-header">
          <button className="auth-back" onClick={handleBack} aria-label="뒤로가기">
            ←
          </button>
          <h1 className="auth-title">가입하기</h1>
        </header>

        <div className="auth-hero">
          <div className="auth-mascot-wrap">
            <div className="auth-mascot">🌱</div>
          </div>
          <p className="auth-hero-title">마음,씨 계정을 만들면?</p>
          <p className="auth-hero-desc">
            실수로 앱을 삭제하거나 기기를 바꿔도{'\n'}
            모든 감정 기록이 안전하게 저장돼요.
          </p>
        </div>

        {/* 약관 동의 */}
        <div className="policy-wrap">
          <div className="policy-item">
            <input
              type="checkbox"
              id="policy-required"
              checked={agreeRequired}
              onChange={(e) => setAgreeRequired(e.target.checked)}
            />
            <label htmlFor="policy-required">(필수) 서비스 이용약관 및 개인정보 처리방침에 동의합니다.</label>
          </div>
          <div className="policy-item">
            <input
              type="checkbox"
              id="policy-optional"
              checked={agreeOptional}
              onChange={(e) => setAgreeOptional(e.target.checked)}
            />
            <label htmlFor="policy-optional">(선택) 새로운 기능·소식 알림을 받아볼게요.</label>
          </div>
        </div>

        {/* 이메일 회원가입 폼 */}
        <form onSubmit={handleEmailSignup} className="auth-form">
          <div className="auth-form-group">
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
              className={`auth-input ${error ? 'auth-input-error' : ''}`}
            />
            <input
              type="password"
              placeholder="비밀번호 (최소 6자)"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              disabled={isLoading}
              required
              minLength={6}
              className={`auth-input ${error ? 'auth-input-error' : ''}`}
            />
            <input
              type="password"
              placeholder="비밀번호 확인"
              value={passwordConfirm}
              onChange={(e) => {
                setPasswordConfirm(e.target.value);
                setError(null);
              }}
              disabled={isLoading}
              required
              className={`auth-input ${error ? 'auth-input-error' : ''}`}
            />
            {error && <div className="auth-error">{error}</div>}
            <button
              type="submit"
              disabled={isLoading || !agreeRequired || !email || !password || !passwordConfirm}
              className="auth-submit-btn"
            >
              {isLoading ? '가입 중...' : '이메일로 가입하기'}
            </button>
          </div>
        </form>

        {/* 구분선 */}
        <div className="auth-divider">
          <div className="auth-divider-line" />
          <span>또는</span>
          <div className="auth-divider-line" />
        </div>

        {/* 소셜 가입 버튼 */}
        <div className="auth-social-list">
          {socialButtons.map((btn) => (
            <button
              key={btn.provider}
              className={`auth-btn ${btn.className}`}
              onClick={() => handleSocialSignup(btn.provider)}
              disabled={isLoading || !agreeRequired}
            >
              <span className="icon">{btn.icon}</span>
              <span>{btn.label}</span>
            </button>
          ))}
        </div>

        <div className="auth-footer">
          이미 계정이 있나요?
          <button type="button" onClick={handleGoToLogin}>
            로그인하기
          </button>
        </div>
      </section>
    </div>
  );
}
