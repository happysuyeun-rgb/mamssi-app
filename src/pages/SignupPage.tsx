import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { useNotify } from '@providers/NotifyProvider';
import { diag } from '@boot/diag';
import { safeStorage } from '@utils/storage';
import type { SocialProvider } from './LoginPage';
import './SignupPage.css';

const GUEST_MODE_KEY = 'isGuest';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signInWithGoogle, signInWithApple, signInWithKakao, isGuest } = useAuth();
  const notify = useNotify();
  const [agreeRequired, setAgreeRequired] = useState(false);
  const [agreeOptional, setAgreeOptional] = useState(false);

  const handleBack = () => {
    console.log('[SignupPage] 뒤로가기 클릭');
    diag.log('SignupPage: 뒤로가기 클릭', { isGuest });
    
    // 게스트 상태 확인 및 유지
    const currentGuestMode = safeStorage.getItem(GUEST_MODE_KEY) === 'true';
    if (currentGuestMode || isGuest) {
      // 게스트 모드가 활성화되어 있으면 게스트 상태 유지
      safeStorage.setItem(GUEST_MODE_KEY, 'true');
      diag.log('SignupPage: 게스트 상태 유지 후 홈으로 이동');
    }
    
    // 항상 홈으로 이동 (히스토리 기반 navigate(-1) 대신)
    navigate('/home', { replace: true });
  };

  const handleSocialSignup = async (provider: SocialProvider) => {
    if (!agreeRequired) {
      notify.warning('필수 약관에 동의해야 진행할 수 있어요', '⚠️');
      return;
    }

    console.log(`[SignupPage] ${provider} 회원가입 시도`);
    diag.log(`SignupPage: ${provider} 회원가입 시도`);

    try {
      if (provider === 'google') {
        await signInWithGoogle();
      } else if (provider === 'apple') {
        await signInWithApple();
      } else if (provider === 'kakao') {
        await signInWithKakao();
      } else if (provider === 'facebook' || provider === 'line') {
        notify.info(`${provider === 'facebook' ? 'Facebook' : 'LINE'} 회원가입은 준비 중이에요.`, 'ℹ️');
        return;
      }
      // OAuth는 리다이렉트되므로 여기서는 처리하지 않음
      // AuthCallback에서 온보딩 완료 플래그 설정 후 /home으로 리다이렉트됨
    } catch (error) {
      diag.err('SignupPage: 회원가입 실패:', error);
      notify.error('회원가입에 실패했어요. 잠시 후 다시 시도해주세요.', '❌');
    }
  };

  const handleGoToLogin = () => {
    console.log('[SignupPage] 로그인 페이지로 이동');
    diag.log('SignupPage: 로그인 페이지로 이동');
    navigate('/login', { replace: true });
  };

  const socialButtons: { provider: SocialProvider; label: string; icon: string; className: string }[] = [
    { provider: 'google', label: 'Google로 계속하기', icon: 'G', className: 'auth-btn-google' },
    { provider: 'apple', label: 'Apple로 계속하기', icon: '', className: 'auth-btn-apple' },
    { provider: 'kakao', label: '카카오 계정으로 계속하기', icon: '✉️', className: 'auth-btn-kakao' },
    { provider: 'facebook', label: 'Facebook으로 계속하기', icon: 'f', className: 'auth-btn-facebook' },
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

        {/* 소셜 가입 버튼 */}
        <div className="auth-social-list">
          {socialButtons.map((btn) => (
            <button
              key={btn.provider}
              className={`auth-btn ${btn.className}`}
              onClick={() => handleSocialSignup(btn.provider)}
              disabled={!agreeRequired}
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


