import { createPortal } from 'react-dom';
import { TERMS_OF_SERVICE } from '@constants/termsOfService';
import './TermsModal.css';

type TermsModalProps = {
  isOpen: boolean;
  /** @param confirmed - true: 확인 버튼 클릭(약관 동의), false/undefined: 오버레이 또는 ✕ 클릭 */
  onClose: (confirmed?: boolean) => void;
};

export default function TermsModal({ isOpen, onClose }: TermsModalProps) {
  if (!isOpen) return null;

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
          <h2 id="terms-modal-title">서비스 이용약관</h2>
          <button type="button" className="terms-modal-close" onClick={() => onClose(false)} aria-label="닫기">
            ✕
          </button>
        </header>
        <div className="terms-modal-content">
          <pre className="terms-modal-text">{TERMS_OF_SERVICE}</pre>
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
