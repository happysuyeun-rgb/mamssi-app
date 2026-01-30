/**
 * Database Row Types
 * Supabase 테이블의 실제 row 타입 정의
 * 모든 DB 접근은 이 타입을 사용해야 함
 */

// ============================================
// users 테이블
// ============================================
export type UserRow = {
  id: string;
  email: string | null;
  onboarding_completed: boolean;
  delete_reason: string | null;
  created_at: string;
  updated_at: string;
};

// ============================================
// user_settings 테이블
// ============================================
export type UserSettingsRow = {
  user_id: string;
  nickname: string | null;
  mbti: string | null;
  profile_url: string | null;
  seed_name: string | null; // 씨앗 이름 (10자 이내)
  lock_type: 'pattern' | 'pin' | null;
  lock_value: string | null;
  birthdate?: string | null; // 선택적 (UI 표시용)
  gender?: string | null; // 선택적 (UI 표시용)
  updated_at: string;
  created_at: string;
};

// ============================================
// emotions 테이블
// ============================================
export type EmotionRow = {
  id: string;
  user_id: string;
  emotion_date: string; // YYYY-MM-DD
  main_emotion: string; // DB 스키마: main_emotion
  intensity: number | null;
  note: string | null;
  content: string;
  is_public: boolean | null;
  category: string | null; // 영문키: daily/worry/love/work/humor/growth/selfcare
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

// ============================================
// flowers 테이블
// ============================================
export type FlowerRow = {
  id: string;
  user_id: string;
  flower_type: string;
  growth_percent: number; // 실제로는 포인트 값 (0-100pt)
  is_bloomed: boolean | null;
  bloomed_at: string | null;
  created_at: string;
  updated_at: string;
};

// ============================================
// community_posts 테이블
// ============================================
export type CommunityPostRow = {
  id: string;
  emotion_id: string | null;
  user_id: string;
  content: string;
  emotion_type: string | null;
  image_url: string | null;
  category: string | null;
  like_count: number;
  is_public: boolean;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
};

// ============================================
// community_likes 테이블
// ============================================
export type CommunityLikeRow = {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
};

// ============================================
// reports 테이블
// ============================================
export type ReportRow = {
  id: string;
  post_id: string;
  reporter_id: string;
  reason: string;
  memo: string | null;
  status: string;
  created_at: string;
};

// ============================================
// notifications 테이블
// ============================================
export type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  meta: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
};

// ============================================
// profiles 테이블 (join 결과)
// ============================================
export type ProfileRow = {
  id: string;
  nickname: string | null;
  seed_name: string | null;
  mbti: string | null;
};
