import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotify } from '@providers/NotifyProvider';
import SocialLoginButtons from '@components/auth/SocialLoginButtons';
import TermsModal from '@components/TermsModal';
import './SignupPage.css';

export default function SignupPage() {
  const navigate = useNavigate();
  const notify = useNotify();
  const [agreeRequired, setAgreeRequired] = useState(false);
  const [agreeOptional, setAgreeOptional] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);

  const handleBack = () => {
    // 뒤로가기 시 항상 홈으로 이동 (replace로 진입한 경우 navigate(-1)이 동작하지 않을 수 있음)
    navigate('/home', { replace: true });
  };

  const handleGoToLogin = () => {
    navigate('/login', { replace: true });
  };

  const agreeAll = agreeRequired && agreeOptional;
  const handleAgreeAllChange = (checked: boolean) => {
    setAgreeRequired(checked);
    setAgreeOptional(checked);
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

        {/* 약관 동의 - 체크박스만 클릭 시 체크, 문구 클릭 시 약관 모달 */}
        <div className="policy-wrap">
          <div className="policy-item policy-item-all">
            <input
              type="checkbox"
              id="policy-all"
              checked={agreeAll}
              onChange={(e) => handleAgreeAllChange(e.target.checked)}
            />
            <label htmlFor="policy-all">전체동의</label>
          </div>
          <div className="policy-item policy-item-required">
            <input
              type="checkbox"
              id="policy-required"
              checked={agreeRequired}
              onChange={(e) => setAgreeRequired(e.target.checked)}
            />
            <div className="policy-label-wrap">
              <span>(필수) </span>
              <button
                type="button"
                className="policy-terms-link"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setTermsModalOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setTermsModalOpen(true);
                  }
                }}
              >
                서비스 이용약관 및 개인정보 처리방침에 동의합니다.
              </button>
            </div>
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

      <TermsModal
        isOpen={termsModalOpen}
        onClose={(confirmed) => {
          setTermsModalOpen(false);
          if (confirmed) setAgreeRequired(true);
        }}
      />
    </div>
  );
}
