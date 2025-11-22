import type { UserProfile, UserStats } from '@domain/user';

export function getCurrentUserProfile(): UserProfile {
  return {
    id: 'me',
    nickname: '수연',
    avatarEmoji: '🙂',
    bio: '오늘의 마음씨를 가볍게 돌보는 중',
    mbti: 'ENFJ',
    joinedAt: '2025-01-03'
  };
}

export function getCurrentUserStats(): UserStats {
  return {
    totalRecords: 42,
    totalLikesReceived: 128,
    totalFlowersBloomed: 5,
    streakDays: 7
  };
}

// TODO: Replace with Supabase tables (user/profile/stats) and real queries.


