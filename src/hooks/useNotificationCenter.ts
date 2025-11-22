import { useCallback, useEffect, useState } from 'react';
import {
  createNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from '@services/notifications';
import type { NotificationRecord, NotificationType } from '@domain/notification';

export function useNotificationCenter(userId: string) {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const badgeCount = notifications.filter((notif) => !notif.isRead).length;

  const load = useCallback(async () => {
    const list = await fetchNotifications(userId);
    setNotifications(list);
  }, [userId]);

  useEffect(() => {
    load();
    const interval = window.setInterval(load, 60_000);
    return () => window.clearInterval(interval);
  }, [load]);

  const openSheet = () => setSheetOpen(true);
  const closeSheet = () => setSheetOpen(false);

  const markAll = async () => {
    await markAllNotificationsRead(userId);
    await load();
  };

  const markRead = async (id: string) => {
    await markNotificationRead(id);
    await load();
  };

  const pushNotification = async (type: NotificationType, meta?: Record<string, unknown>) => {
    await createNotification(userId, type, meta);
    await load();
  };

  return {
    notifications,
    badgeCount,
    isSheetOpen,
    openSheet,
    closeSheet,
    markAll,
    markRead,
    refresh: load,
    pushNotification
  };
}



