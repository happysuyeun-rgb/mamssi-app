import { useEffect, useState } from 'react';
import type { ToastNotification } from '@lib/notify';
import '@styles/notify.css';

type ToastProps = {
  notification: ToastNotification;
  onDismiss: (id: string) => void;
};

export default function Toast({ notification, onDismiss }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 애니메이션을 위한 지연
    const showTimer = setTimeout(() => setIsVisible(true), 10);

    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onDismiss(notification.id), 300); // 애니메이션 완료 후 제거
    }, notification.duration);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [notification.id, notification.duration, onDismiss]);

  const typeColors = {
    success: { bg: 'var(--mint-500, #39C6A5)', text: '#fff' },
    info: { bg: 'var(--mint-600, #24B89D)', text: '#fff' },
    warning: { bg: '#F59E0B', text: '#fff' },
    error: { bg: '#EF4444', text: '#fff' },
  };

  const colors = typeColors[notification.type];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`notify-toast ${isVisible ? 'show' : ''} ${notification.type}`}
      style={{
        position: 'fixed',
        bottom: 'calc(16px + var(--tabbar-height, 72px))',
        left: '50%',
        transform: isVisible
          ? 'translateX(-50%) translateY(0)'
          : 'translateX(-50%) translateY(20px)',
        zIndex: 1000,
        maxWidth: 'calc(100vw - 32px)',
        width: 'max-content',
        minWidth: 280,
        background: colors.bg,
        color: colors.text,
        padding: '12px 16px',
        borderRadius: 18,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontSize: 14,
        fontWeight: 500,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: isVisible ? 1 : 0,
      }}
    >
      {notification.icon && (
        <span style={{ fontSize: 18, lineHeight: 1 }} aria-hidden="true">
          {notification.icon}
        </span>
      )}
      <span style={{ flex: 1 }}>{notification.message}</span>
      {notification.action && (
        <button
          type="button"
          onClick={notification.action.onClick}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: 'inherit',
            padding: '4px 12px',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
          }}
        >
          {notification.action.label}
        </button>
      )}
    </div>
  );
}
