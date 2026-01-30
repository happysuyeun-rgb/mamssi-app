import { useNavigate } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import SocialLoginButtons from '@components/auth/SocialLoginButtons';
import './LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { isGuest } = useAuth();

  const handleBack = () => {
    // 게스트 상태에서 진입했을 때는 홈으로 이동
    if (isGuest) {
      navigate('/home', { replace: true });
    } else {
      navigate(-1);
    }
  };

  const handleGoToSignup = () => {
    navigate('/signup', { replace: true });
  };

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

        <SocialLoginButtons mode="login" />

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
