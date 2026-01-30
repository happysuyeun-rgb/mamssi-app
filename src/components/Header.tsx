import { Link } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { useNotificationCenter } from '@hooks/useNotificationCenter';
import NotificationSheet from '@components/notifications/NotificationSheet';
import '@styles/notifications.css';

export default function Header() {
  const { user } = useAuth();
  const { notifications, badgeCount, isSheetOpen, openSheet, closeSheet, markAll, markRead } =
    useNotificationCenter(user?.id || '');

  return (
    <>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'rgba(246,249,248,0.95)',
          backdropFilter: 'blur(8px)',
          borderBottom: '0px solid var(--ms-line)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0px 16px 4px',
            maxWidth: 720,
            margin: '0 auto',
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 12,
              background: 'var(--ms-primary-soft)',
              display: 'grid',
              placeItems: 'center',
              fontSize: 18,
            }}
          >
            🌱
          </div>
          <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>
            <div style={{ fontWeight: 700, letterSpacing: '-0.02em', fontSize: 16 }}>마음씨</div>
            <div style={{ fontSize: 12, color: 'var(--ms-ink-muted)', marginTop: 2 }}>
              공감으로 서로를 가볍게
            </div>
          </Link>
          <button type="button" className="notif-bell" onClick={openSheet} aria-label="알림">
            🔔
            {badgeCount > 0 && (
              <span className="notif-badge">{badgeCount > 99 ? '99+' : badgeCount}</span>
            )}
          </button>
        </div>
      </header>

      <NotificationSheet
        isOpen={isSheetOpen}
        notifications={notifications}
        onClose={closeSheet}
        onMarkAllRead={markAll}
        onMarkRead={markRead}
      />
    </>
  );
}
