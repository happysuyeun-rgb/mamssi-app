import { useEffect, useRef } from 'react';
import type { ModalNotification } from '@lib/notify';
import '@styles/notify.css';

type ModalProps = {
  notification: ModalNotification;
  onClose: (id: string, confirmed: boolean) => void;
};

export default function Modal({ notification, onClose }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  const lastFocusableRef = useRef<HTMLButtonElement>(null);

  // Focus trap
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (firstElement) {
      firstElement.focus();
    }

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose(notification.id, false);
      }
    };

    document.addEventListener('keydown', handleTab);
    document.addEventListener('keydown', handleEscape);

    // Body scroll lock
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleTab);
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [notification.id, onClose]);

  return (
    <div
      className="notify-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: 16
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose(notification.id, false);
        }
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
        className="notify-modal"
        style={{
          background: '#fff',
          borderRadius: 24,
          padding: 24,
          maxWidth: 400,
          width: '100%',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
          animation: 'modalFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="modal-title"
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--ink, #0F172A)',
            marginBottom: 12,
            letterSpacing: '-0.02em'
          }}
        >
          {notification.title}
        </h2>
        <p
          id="modal-description"
          style={{
            fontSize: 14,
            color: 'var(--ms-ink-soft)',
            lineHeight: 1.6,
            marginBottom: 24
          }}
        >
          {notification.message}
        </p>
        <div
          style={{
            display: 'flex',
            gap: 10,
            justifyContent: 'flex-end'
          }}
        >
          {notification.cancelLabel && (
            <button
              ref={firstFocusableRef}
              type="button"
              onClick={() => onClose(notification.id, false)}
              style={{
                padding: '10px 20px',
                borderRadius: 18,
                border: '1px solid var(--ms-line)',
                background: '#fff',
                color: 'var(--ms-ink)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--ms-bg-soft)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fff';
              }}
            >
              {notification.cancelLabel}
            </button>
          )}
          <button
            ref={lastFocusableRef}
            type="button"
            onClick={() => onClose(notification.id, true)}
            style={{
              padding: '10px 20px',
              borderRadius: 18,
              border: 'none',
              background: 'var(--mint-500, #39C6A5)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: 'var(--ms-shadow-soft)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--mint-600, #24B89D)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--mint-500, #39C6A5)';
            }}
          >
            {notification.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

