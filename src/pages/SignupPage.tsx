import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { useNotify } from '@providers/NotifyProvider';
import SocialLoginButtons from '@components/auth/SocialLoginButtons';
import './SignupPage.css';

export default function SignupPage() {
  const navigate = useNavigate();
  const { isGuest } = useAuth();
  const notify = useNotify();
  const [agreeRequired, setAgreeRequired] = useState(false);
  const [agreeOptional, setAgreeOptional] = useState(false);

  const handleBack = () => {
    // 게스트 상태에서 진입했을 때는 홈으로 이동
    if (isGuest) {
      navigate('/home', { replace: true });
    } else {
      navigate(-1);
    }
  };

  const handleGoToLogin = () => {
    navigate('/login', { replace: true });
  };

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

        {/* 소셜 가입 버튼 */}
        <SocialLoginButtons mode="signup" disabled={!agreeRequired} />

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

