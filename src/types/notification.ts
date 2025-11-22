export type NotificationCategory =
  | 'onboarding'
  | 'routine'
  | 'record'
  | 'forest'
  | 'growth'
  | 'system'
  | 'profile'
  | 'flower'
  | 'support'
  | 'account'
  | 'operations';

export type NotificationType =
  | 'signup_welcome'
  | 'seed_received'
  | 'routine_streak_active'
  | 'routine_streak_broken'
  | 'record_saved'
  | 'record_with_image'
  | 'first_record'
  | 'record_updated'
  | 'record_deleted'
  | 'record_visibility_changed'
  | 'report_received'
  | 'like_received'
  | 'like_three'
  | 'like_five'
  | 'likes_total'
  | 'post_selected_best'
  | 'report_resolved'
  | 'report_rejected'
  | 'growth_level_1'
  | 'growth_level_2'
  | 'growth_level_3'
  | 'growth_level_4'
  | 'growth_level_5'
  | 'bloom_caption_saved'
  | 'bloom_exported'
  | 'routine_7days'
  | 'routine_30days'
  | 'backup_required'
  | 'backup_completed'
  | 'logged_out'
  | 'profile_photo_updated'
  | 'nickname_updated'
  | 'mbti_updated'
  | 'pin_enabled'
  | 'pin_disabled'
  | 'pin_reset'
  | 'flower_saved'
  | 'flower_deleted'
  | 'support_request_created'
  | 'support_request_answered'
  | 'account_deleted'
  | 'account_rejoined'
  | 'ops_notice'
  | 'event_started'
  | 'event_awarded'
  | 'maintenance_notice'
  | 'app_update_required';

export interface NotificationRecord {
  id: string;
  userId: string;
  type: NotificationType;
  icon: string;
  title: string;
  message: string;
  category: NotificationCategory;
  isRead: boolean;
  createdAt: string;
  meta?: Record<string, unknown>;
}

