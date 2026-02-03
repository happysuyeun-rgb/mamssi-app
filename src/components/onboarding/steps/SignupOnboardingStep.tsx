import { useState } from 'react';
import '@styles/onboarding.css';
import './SignupOnboardingStep.css';

export type SocialProvider = 'google' | 'apple' | 'kakao' | 'facebook' | 'line';

type SignupOnboardingStepProps = {
  onBack: () => void;
  onSocialClick: (provider: SocialProvider) => void;
  onOpenLogin?: () => void;
  loading?: boolean;
};

export default function SignupOnboardingStep({
  onBack,
  onSocialClick,
  onOpenLogin,
  loading = false,
}: SignupOnboardingStepProps) {
  const [agreeRequired, setAgreeRequired] = useState(false);
  const [agreeOptional, setAgreeOptional] = useState(false);

  const handleAgreeRequiredChange = (checked: boolean) => {
    setAgreeRequired(checked);
  };

  const handleAgreeOptionalChange = (checked: boolean) => {
    setAgreeOptional(checked);
  };

  const handleSocialButtonClick = (provider: SocialProvider) => {
    if (!agreeRequired) return;
    onSocialClick(provider);
  };

  const socialButtons: {
    provider: SocialProvider;
    label: string;
    icon: string;
    className: string;
  }[] = [
    { provider: 'google', label: 'Google로 계속하기', icon: 'G', className: 'auth-btn-google' },
  ];

  return (
    <div className="signup-onboarding-step">
      <header className="auth-header">
        <button className="auth-back" onClick={onBack} aria-label="뒤로가기">
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
            onChange={(e) => handleAgreeRequiredChange(e.target.checked)}
          />
          <label htmlFor="policy-required">
            (필수) 서비스 이용약관 및 개인정보 처리방침에 동의합니다.
          </label>
        </div>
        <div className="policy-item">
          <input
            type="checkbox"
            id="policy-optional"
            checked={agreeOptional}
            onChange={(e) => handleAgreeOptionalChange(e.target.checked)}
          />
          <label htmlFor="policy-optional">(선택) 새로운 기능·소식 알림을 받아볼게요.</label>
        </div>
      </div>

      {/* 소셜 가입 버튼 */}
      <div className="auth-social-list">
        {socialButtons.map((btn) => (
          <button
            key={btn.provider}
            className={`auth-btn ${btn.className}`}
            onClick={() => handleSocialButtonClick(btn.provider)}
            disabled={!agreeRequired || loading}
          >
            <span className="icon">{btn.icon}</span>
            <span>{btn.label}</span>
          </button>
        ))}
      </div>

      <div className="auth-footer">
        이미 계정이 있나요?
        <button type="button" onClick={onOpenLogin || (() => {})}>
          로그인하기
        </button>
      </div>
    </div>
  );
}
