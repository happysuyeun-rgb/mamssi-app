import type { NotificationRecord } from '@domain/notification';
import { useMemo, useState } from 'react';
import '@styles/notifications.css';

type Props = {
  isOpen: boolean;
  notifications: NotificationRecord[];
  onClose: () => void;
  onMarkAllRead: () => void;
  onMarkRead?: (id: string) => void;
};

export default function NotificationSheet({
  isOpen,
  notifications,
  onClose,
  onMarkAllRead,
  onMarkRead,
}: Props) {
  if (!isOpen) return null;

  const DEFAULT_VISIBLE_COUNT = 7;
  const [showAll, setShowAll] = useState(false);
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );
  const visibleNotifications = useMemo(
    () =>
      showAll ? notifications : notifications.slice(0, Math.min(DEFAULT_VISIBLE_COUNT, notifications.length)),
    [showAll, notifications]
  );
  const grouped = groupByDate(visibleNotifications);

  return (
    <div className="notif-sheet-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <section className="notif-sheet">
        <header className="notif-sheet-header">
          <div>
            <h2>알림</h2>
            <p>
              최근 알림 {Math.min(DEFAULT_VISIBLE_COUNT, notifications.length)}개를 먼저 보여줘요.
              {unreadCount > 0 ? ` 안 읽은 알림 ${unreadCount}개` : ''}
            </p>
          </div>
          <button type="button" onClick={onMarkAllRead}>
            모두 읽음
          </button>
        </header>

        <div className="notif-sheet-content">
          {notifications.length === 0 && <div className="notif-empty">새로운 알림이 없습니다.</div>}
          {Object.entries(grouped).map(([dateLabel, items]) => (
            <div key={dateLabel} className="notif-group">
              <div className="notif-group-title">{dateLabel}</div>
              <div className="notif-group-list">
                {items.map((notif) => (
                  <article
                    key={notif.id}
                    className={`notif-item ${notif.isRead ? 'read' : ''}`}
                    onClick={() => {
                      if (!notif.isRead && onMarkRead) {
                        onMarkRead(notif.id);
                      }
                    }}
                    style={{ cursor: notif.isRead ? 'default' : 'pointer' }}
                  >
                    <div className="notif-icon" aria-hidden="true">
                      {notif.icon}
                    </div>
                    <div className="notif-body">
                      <div className="notif-title">{notif.title}</div>
                      <div className="notif-message">{notif.message}</div>
                    </div>
                    <div className="notif-time">{formatTime(notif.createdAt)}</div>
                  </article>
                ))}
              </div>
            </div>
          ))}
          {notifications.length > DEFAULT_VISIBLE_COUNT && (
            <div className="notif-more-wrap">
              <button
                type="button"
                className="notif-more-btn"
                onClick={() => setShowAll((prev) => !prev)}
              >
                {showAll ? '최근 알림만 보기' : `전체 알림 보기 (${notifications.length}개)`}
              </button>
            </div>
          )}
        </div>

        <footer className="notif-sheet-footer">
          <button type="button" onClick={onClose}>
            닫기
          </button>
        </footer>
      </section>
    </div>
  );
}

function groupByDate(notifications: NotificationRecord[]) {
  return notifications.reduce<Record<string, NotificationRecord[]>>((acc, notif) => {
    const key = getDateGroupLabel(notif.createdAt);
    if (!acc[key]) acc[key] = [];
    acc[key].push(notif);
    return acc;
  }, {});
}

function getDateGroupLabel(dateIso: string) {
  const date = new Date(dateIso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(date, today)) return '오늘';
  if (isSameDay(date, yesterday)) return '어제';
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTime(dateIso: string) {
  const date = new Date(dateIso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
