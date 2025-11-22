import type { NotificationCategory, NotificationType } from '@domain/notification';

export type NotificationMessageTemplate = {
  icon: string;
  title: string;
  message: string;
  category: NotificationCategory;
};

export const NOTIFICATION_MESSAGES: Record<NotificationType, NotificationMessageTemplate> = {
  signup_welcome: {
    icon: '🤝',
    title: '가입을 환영해요',
    message: '마음씨에 온 걸 환영해요! 첫 씨앗을 받아보세요.',
    category: 'onboarding'
  },
  seed_received: {
    icon: '🌱',
    title: '씨앗을 받았어요',
    message: '새로운 감정꽃 여정이 시작됐어요.',
    category: 'onboarding'
  },
  routine_streak_active: {
    icon: '🔄',
    title: '연속 기록 중이에요',
    message: '하루씩 쌓여가고 있어요. 기대돼요!',
    category: 'routine'
  },
  routine_streak_broken: {
    icon: '💭',
    title: '기록이 끊어졌어요',
    message: '기록이 하루 쉬어졌어요. 조금씩 다시 시작해볼까요?',
    category: 'routine'
  },
  record_saved: {
    icon: '📝',
    title: '감정 기록을 저장했어요',
    message: '오늘의 마음이 기록으로 남았어요.',
    category: 'record'
  },
  record_with_image: {
    icon: '📷',
    title: '사진과 함께 기록했어요',
    message: '감정과 함께 따뜻한 순간이 저장됐어요.',
    category: 'record'
  },
  first_record: {
    icon: '✨',
    title: '첫 기록을 남겼어요',
    message: '당신의 마음씨앗이 자라기 시작했어요.',
    category: 'record'
  },
  record_updated: {
    icon: '🖊️',
    title: '기록이 수정됐어요',
    message: '오늘의 기록이 새롭게 업데이트됐어요.',
    category: 'record'
  },
  record_deleted: {
    icon: '🗑️',
    title: '기록을 삭제했어요',
    message: '이 감정 기록이 삭제됐어요.',
    category: 'record'
  },
  record_visibility_changed: {
    icon: '🌐',
    title: '공개 설정이 바뀌었어요',
    message: '기록의 공개 범위가 변경됐어요.',
    category: 'record'
  },
  report_received: {
    icon: '🚨',
    title: '신고 내용을 접수했어요',
    message: '더 안전한 공간을 위해 조치할게요.',
    category: 'forest'
  },
  like_received: {
    icon: '💧',
    title: '새로운 공감',
    message: '누군가가 내 감정에 공감해줬어요.',
    category: 'forest'
  },
  like_three: {
    icon: '💧',
    title: '3개의 공감이 도착했어요',
    message: '따뜻한 마음들이 모이고 있어요.',
    category: 'forest'
  },
  like_five: {
    icon: '💧',
    title: '5개의 공감이 모였어요',
    message: '당신의 감정이 많은 위로가 되었어요.',
    category: 'forest'
  },
  likes_total: {
    icon: '💧',
    title: '공감이 쌓이고 있어요',
    message: '지금까지 총 N개의 공감을 받았어요.',
    category: 'forest'
  },
  post_selected_best: {
    icon: '🏅',
    title: '인기 글로 선정됐어요',
    message: '많은 공감이 모이면서 BEST 글이 되었어요.',
    category: 'forest'
  },
  report_resolved: {
    icon: '🛡️',
    title: '안전센터 처리 완료',
    message: '신고 내용이 처리되었어요.',
    category: 'forest'
  },
  report_rejected: {
    icon: '🛡️',
    title: '신고가 반려되었어요',
    message: '정책 기준에 따라 해당 내용은 유지돼요.',
    category: 'forest'
  },
  growth_level_1: {
    icon: '🌱',
    title: '새싹이 자라기 시작했어요',
    message: '성장 게이지가 20%에 도달했어요.',
    category: 'growth'
  },
  growth_level_2: {
    icon: '🌿',
    title: '성장이 느껴져요',
    message: '성장 게이지가 40%가 되었어요.',
    category: 'growth'
  },
  growth_level_3: {
    icon: '🌿',
    title: '곧 꽃이 피겠어요',
    message: '성장 게이지가 60%에 도달했어요.',
    category: 'growth'
  },
  growth_level_4: {
    icon: '🌸',
    title: '꽃이 피려고 해요',
    message: '성장 게이지가 80%가 되었어요.',
    category: 'growth'
  },
  growth_level_5: {
    icon: '🌸',
    title: '꽃이 피었어요!',
    message: '축하해요, 감정꽃이 개화됐어요.',
    category: 'growth'
  },
  bloom_caption_saved: {
    icon: '✏️',
    title: '꽃 한 줄 기록 완료',
    message: '감정꽃 앨범에 문구가 저장됐어요.',
    category: 'flower'
  },
  bloom_exported: {
    icon: '📤',
    title: '꽃을 내보냈어요',
    message: '감정꽃을 이미지로 저장했어요.',
    category: 'flower'
  },
  routine_7days: {
    icon: '🔄',
    title: '7일 연속 기록했어요',
    message: '꾸준함이 당신을 더 단단하게 만들고 있어요.',
    category: 'routine'
  },
  routine_30days: {
    icon: '🔄',
    title: '30일 연속 기록 달성!',
    message: '멋진 루틴이에요. 마음을 잘 돌보고 있어요.',
    category: 'routine'
  },
  backup_required: {
    icon: '💾',
    title: '백업이 필요해요',
    message: '데이터 백업을 추천드려요.',
    category: 'system'
  },
  backup_completed: {
    icon: '💾',
    title: '백업이 완료됐어요',
    message: '데이터가 안전하게 저장됐어요.',
    category: 'system'
  },
  logged_out: {
    icon: '🚪',
    title: '로그아웃됐어요',
    message: '다시 로그인해 주세요.',
    category: 'account'
  },
  profile_photo_updated: {
    icon: '🖼️',
    title: '프로필이 바뀌었어요',
    message: '새로운 프로필 이미지가 저장됐어요.',
    category: 'profile'
  },
  nickname_updated: {
    icon: '📝',
    title: '닉네임이 바뀌었어요',
    message: '내 정보가 업데이트됐어요.',
    category: 'profile'
  },
  mbti_updated: {
    icon: '🔤',
    title: 'MBTI가 변경됐어요',
    message: '내 성향 정보가 업데이트됐어요.',
    category: 'profile'
  },
  pin_enabled: {
    icon: '🔐',
    title: 'PIN 잠금이 설정됐어요',
    message: '더 안전한 마음씨가 되었습니다.',
    category: 'profile'
  },
  pin_disabled: {
    icon: '🔓',
    title: 'PIN 잠금이 해제됐어요',
    message: '기기 잠금이 해제됐어요.',
    category: 'profile'
  },
  pin_reset: {
    icon: '🔒',
    title: 'PIN이 재설정됐어요',
    message: '새로운 잠금 번호가 설정됐어요.',
    category: 'profile'
  },
  flower_saved: {
    icon: '🌸',
    title: '개화 기록이 저장됐어요',
    message: '감정꽃 앨범에서 확인할 수 있어요.',
    category: 'flower'
  },
  flower_deleted: {
    icon: '🗑️',
    title: '앨범 기록 삭제됨',
    message: '해당 개화 기록이 삭제되었어요.',
    category: 'flower'
  },
  support_request_created: {
    icon: '📮',
    title: '문의가 등록됐어요',
    message: '최대한 빠르게 답변드릴게요.',
    category: 'support'
  },
  support_request_answered: {
    icon: '📮',
    title: '답변이 도착했어요',
    message: '문의하신 내용이 처리되었어요.',
    category: 'support'
  },
  account_deleted: {
    icon: '❗',
    title: '회원탈퇴가 진행됐어요',
    message: '모든 데이터가 삭제되었어요.',
    category: 'account'
  },
  account_rejoined: {
    icon: '🔄',
    title: '재가입됐어요',
    message: '다시 돌아와줘서 고마워요.',
    category: 'account'
  },
  ops_notice: {
    icon: '📢',
    title: '새로운 공지사항',
    message: '새로운 업데이트 내용을 확인해 주세요.',
    category: 'operations'
  },
  event_started: {
    icon: '🎉',
    title: '이벤트가 시작됐어요',
    message: '참여하고 보상을 받아보세요.',
    category: 'operations'
  },
  event_awarded: {
    icon: '🎉',
    title: '이벤트에 당첨됐어요',
    message: '축하해요! 선물이 도착했어요.',
    category: 'operations'
  },
  maintenance_notice: {
    icon: '⚠️',
    title: '시스템 점검 안내',
    message: '점검 중에는 일부 기능이 제한될 수 있어요.',
    category: 'system'
  },
  app_update_required: {
    icon: '⬆️',
    title: '업데이트가 필요해요',
    message: '최신 버전으로 업데이트해주세요.',
    category: 'system'
  }
};

