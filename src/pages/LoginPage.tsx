import { useNavigate } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { useNotify } from '@providers/NotifyProvider';
import { diag } from '@boot/diag';
import './LoginPage.css';

export type SocialProvider = 'google' | 'apple' | 'kakao' | 'facebook' | 'line';

export default function LoginPage() {
  const navigate = useNavigate();
  const { signInWithGoogle, signInWithApple, signInWithKakao } = useAuth();
  const notify = useNotify();

  const handleBack = () => {
    console.log('[LoginPage] 뒤로가기 클릭');
    diag.log('LoginPage: 뒤로가기 클릭');
    navigate(-1);
  };

  const handleSocialLogin = async (provider: SocialProvider) => {
    console.log(`[LoginPage] ${provider} 로그인 시도`);
    diag.log(`LoginPage: ${provider} 로그인 시도`);

    try {
      if (provider === 'google') {
        await signInWithGoogle();
      } else if (provider === 'apple') {
        await signInWithApple();
      } else if (provider === 'kakao') {
        await signInWithKakao();
      } else if (provider === 'facebook' || provider === 'line') {
        notify.info(`${provider === 'facebook' ? 'Facebook' : 'LINE'} 로그인은 준비 중이에요.`, 'ℹ️');
        return;
      }
      // OAuth는 리다이렉트되므로 여기서는 처리하지 않음
      // AuthCallback에서 온보딩 완료 플래그 설정 후 /home으로 리다이렉트됨
    } catch (error) {
      diag.err('LoginPage: 로그인 실패:', error);
      notify.error('로그인에 실패했어요. 잠시 후 다시 시도해주세요.', '❌');
    }
  };

  const handleGoToSignup = () => {
    console.log('[LoginPage] 회원가입 페이지로 이동');
    diag.log('LoginPage: 회원가입 페이지로 이동');
    navigate('/onboarding?step=4', { replace: true });
  };

  const socialButtons: { provider: SocialProvider; label: string; icon: string; className: string }[] = [
    { provider: 'google', label: 'Google로 로그인하기', icon: 'G', className: 'auth-btn-google' },
    { provider: 'apple', label: 'Apple로 로그인하기', icon: '', className: 'auth-btn-apple' },
    { provider: 'facebook', label: 'Facebook으로 로그인하기', icon: 'f', className: 'auth-btn-facebook' },
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

        <div className="auth-social-list">
          {socialButtons.map((btn) => (
            <button
              key={btn.provider}
              className={`auth-btn ${btn.className}`}
              onClick={() => handleSocialLogin(btn.provider)}
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


