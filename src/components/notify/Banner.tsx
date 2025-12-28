import { useEffect, useState } from 'react';
import type { BannerNotification } from '@lib/notify';
import '@styles/notify.css';

type BannerProps = {
  notification: BannerNotification;
  onDismiss: (id: string) => void;
};

export default function Banner({ notification, onDismiss }: BannerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(showTimer);
  }, []);

  const levelStyles = {
    info: {
      bg: 'linear-gradient(180deg, #F0FFFA, #E5FAF4)',
      border: '1px solid #CDEAE1',
      text: '#144E43',
      icon: 'ℹ️'
    },
    warn: {
      bg: 'linear-gradient(180deg, #FFFBEB, #FEF3C7)',
      border: '1px solid #FCD34D',
      text: '#92400E',
      icon: '⚠️'
    },
    critical: {
      bg: 'linear-gradient(180deg, #FEE2E2, #FECACA)',
      border: '1px solid #F87171',
      text: '#991B1B',
      icon: '🚨'
    }
  };

  const styles = levelStyles[notification.level];

  return (
    <div
      role="region"
      aria-label="알림"
      className={`notify-banner ${isVisible ? 'show' : ''} ${notification.level}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 999,
        background: styles.bg,
        borderBottom: styles.border,
        color: styles.text,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontSize: 13,
        fontWeight: 500,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(-100%)'
      }}
    >
      <span style={{ fontSize: 16, lineHeight: 1 }} aria-hidden="true">
        {styles.icon}
      </span>
      <span style={{ flex: 1 }}>{notification.message}</span>
      {notification.dismissible && (
        <button
          type="button"
          onClick={() => onDismiss(notification.id)}
          aria-label="알림 닫기"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            fontSize: 18,
            lineHeight: 1,
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}









