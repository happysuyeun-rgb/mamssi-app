import { createPortal } from 'react-dom';
import { TERMS_OF_SERVICE } from '@constants/termsOfService';
import { PRIVACY_POLICY } from '@constants/privacyPolicy';
import './TermsModal.css';

export type TermsModalVariant = 'terms' | 'privacy';

type TermsModalProps = {
  isOpen: boolean;
  /** 'terms': 서비스 이용약관, 'privacy': 개인정보 처리방침 */
  variant?: TermsModalVariant;
  /** @param confirmed - true: 확인 버튼 클릭(약관 동의), false/undefined: 오버레이 또는 ✕ 클릭 */
  onClose: (confirmed?: boolean) => void;
};

export default function TermsModal({ isOpen, variant = 'terms', onClose }: TermsModalProps) {
  if (!isOpen) return null;

  const isPrivacy = variant === 'privacy';
  const title = isPrivacy ? '개인정보 처리방침' : '서비스 이용약관';
  const content = isPrivacy ? PRIVACY_POLICY : TERMS_OF_SERVICE;

  const modalContent = (
    <div
      className="terms-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose(false)}
    >
      <div className="terms-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <header className="terms-modal-header">
          <h2 id="terms-modal-title">{title}</h2>
          <button type="button" className="terms-modal-close" onClick={() => onClose(false)} aria-label="닫기">
            ✕
          </button>
        </header>
        <div className="terms-modal-content">
          <pre className="terms-modal-text">{content}</pre>
        </div>
        <footer className="terms-modal-footer">
          <button type="button" className="terms-modal-confirm" onClick={() => onClose(true)}>
            확인
          </button>
        </footer>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
