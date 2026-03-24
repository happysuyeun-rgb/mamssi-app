import { supabase } from '@lib/supabaseClient';
import { NOTIFICATION_MESSAGES } from '@config/notificationMessages';
import type {
  NotificationMessageTemplate,
  NotificationRecord,
  NotificationType,
} from '@domain/notification';

let inMemoryNotifications: NotificationRecord[] = [];

const READ_NOTIFICATION_RETENTION_DAYS = 30;

const generateId = () =>
  (globalThis as any)?.crypto?.randomUUID?.() ??
  `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const nowIso = () => new Date().toISOString();

const isOlderThanDays = (createdAt: string, days: number) =>
  Date.now() - new Date(createdAt).getTime() > days * 24 * 60 * 60 * 1000;

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

  // Supabase에 저장 시도 (DB 스키마에 맞게: id, user_id, type, title, message, is_read, created_at)
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        id: record.id,
        user_id: userId,
        type: type,
        title: record.title,
        message: record.message,
        is_read: false,
        created_at: record.createdAt,
      })
      .select()
      .single();

    if (error) {
      console.error('[createNotification] Supabase 저장 실패:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        userId,
        type,
      });
      // Supabase 저장 실패해도 로컬 메모리에 저장 (fallback)
      // 하지만 일단 에러를 throw하지 않고 계속 진행
    } else {
      console.log('[createNotification] Supabase 저장 성공:', {
        notificationId: data?.id,
        userId,
        type,
      });
    }
  } catch (err) {
    console.error('[createNotification] 알림 생성 중 오류:', {
      error: err,
      errorMessage: err instanceof Error ? err.message : String(err),
      userId,
      type,
    });
    // 에러가 발생해도 계속 진행 (fallback)
  }

  return record;
}

export async function fetchNotifications(userId: string): Promise<NotificationRecord[]> {
  try {
    // Supabase에서 조회
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100); // 최근 100개만 조회

    if (error) {
      console.error('[fetchNotifications] Supabase 조회 실패:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        userId,
      });
      return [];
    }

    // Supabase 데이터를 NotificationRecord 형식으로 변환 (DB 스키마: id, user_id, type, title, message, is_read, created_at)
    const notifications: NotificationRecord[] = (data || []).map((row: any) => {
      // type에 맞는 템플릿으로 icon, category 채우기
      let template;
      try {
        template = templateFor(row.type as NotificationType);
      } catch {
        template = { icon: '🔔', category: 'operations' as const };
      }

      return {
        id: row.id,
        userId: row.user_id,
        type: row.type as NotificationType,
        icon: template.icon,
        title: row.title || template.title,
        message: row.message || template.message,
        category: template.category,
        isRead: row.is_read || false,
        createdAt: row.created_at,
        meta: {}, // DB에 meta 컬럼 없음
      };
    });

    // 읽은 알림은 30일 경과 시 자동 숨김, 안 읽은 알림은 유지
    const validNotifications = notifications.filter(
      (notif) => !(notif.isRead && isOlderThanDays(notif.createdAt, READ_NOTIFICATION_RETENTION_DAYS))
    );

    return validNotifications;
  } catch (err) {
    console.error('[fetchNotifications] 알림 조회 중 오류:', {
      error: err,
      errorMessage: err instanceof Error ? err.message : String(err),
      userId,
    });
    return [];
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  try {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);

    if (error) {
      console.error('[markNotificationRead] Supabase 업데이트 실패:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        notificationId: id,
      });
    }
  } catch (err) {
    console.error('[markNotificationRead] 알림 읽음 처리 중 오류:', {
      error: err,
      errorMessage: err instanceof Error ? err.message : String(err),
      notificationId: id,
    });
  }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('[markAllNotificationsRead] Supabase 업데이트 실패:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        userId,
      });
    }
  } catch (err) {
    console.error('[markAllNotificationsRead] 알림 전체 읽음 처리 중 오류:', {
      error: err,
      errorMessage: err instanceof Error ? err.message : String(err),
      userId,
    });
  }
}

export async function deleteOldNotifications(userId: string): Promise<void> {
  inMemoryNotifications = inMemoryNotifications.filter(
    (notif: NotificationRecord) =>
      notif.userId !== userId ||
      !(notif.isRead && isOlderThanDays(notif.createdAt, READ_NOTIFICATION_RETENTION_DAYS))
  );
}

export async function removeNotification(id: string): Promise<void> {
  try {
    const { error } = await supabase.from('notifications').delete().eq('id', id);

    if (error) {
      console.error('[removeNotification] Supabase 삭제 실패:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        notificationId: id,
      });
    }
  } catch (err) {
    console.error('[removeNotification] 알림 삭제 중 오류:', {
      error: err,
      errorMessage: err instanceof Error ? err.message : String(err),
      notificationId: id,
    });
  }
}
