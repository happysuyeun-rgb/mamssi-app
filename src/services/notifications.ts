import { NOTIFICATION_MESSAGES } from '@config/notificationMessages';
import type {
  NotificationMessageTemplate,
  NotificationRecord,
  NotificationType,
} from '@domain/notification';

const NOTIFICATION_RETENTION_DAYS = 14;

let inMemoryNotifications: NotificationRecord[] = [];

const generateId = () =>
  (globalThis as any)?.crypto?.randomUUID?.() ??
  `notif-${inMemoryNotifications.length + 1}-${Date.now()}`;

const nowIso = () => new Date().toISOString();

const isExpired = (createdAt: string) =>
  Date.now() - new Date(createdAt).getTime() >
  NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000;

function templateFor(type: NotificationType): NotificationMessageTemplate {
  const template = NOTIFICATION_MESSAGES[type];
  if (!template) {
    throw new Error(`Notification template for type "${type}" is missing.`);
  }
  return template;
}

export async function createNotification(
  userId: string,
  type: NotificationType,
  meta: Record<string, unknown> = {},
  overrides?: Partial<Pick<NotificationRecord, 'title' | 'message' | 'icon'>>
): Promise<NotificationRecord> {
  const template = templateFor(type);
  const record: NotificationRecord = {
    id: generateId(),
    userId,
    type,
    icon: overrides?.icon ?? template.icon,
    title: overrides?.title ?? template.title,
    message: overrides?.message ?? template.message,
    category: template.category,
    isRead: false,
    createdAt: nowIso(),
    meta,
  };

  inMemoryNotifications = [...inMemoryNotifications, record];
  await deleteOldNotifications(userId);
  return record;
}

export async function fetchNotifications(
  userId: string
): Promise<NotificationRecord[]> {
  await deleteOldNotifications(userId);
  return inMemoryNotifications
    .filter((notif) => notif.userId === userId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function markNotificationRead(id: string): Promise<void> {
  inMemoryNotifications = inMemoryNotifications.map((notif) =>
    notif.id === id ? { ...notif, isRead: true } : notif
  );
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  inMemoryNotifications = inMemoryNotifications.map((notif) =>
    notif.userId === userId ? { ...notif, isRead: true } : notif
  );
}

export async function deleteOldNotifications(userId: string): Promise<void> {
  inMemoryNotifications = inMemoryNotifications.filter(
    (notif) => notif.userId !== userId || !isExpired(notif.createdAt)
  );
}

export async function removeNotification(id: string): Promise<void> {
  inMemoryNotifications = inMemoryNotifications.filter(
    (notif) => notif.id !== id
  );
}








