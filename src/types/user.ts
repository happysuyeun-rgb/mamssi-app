export type UserProfile = {
  id: string;
  nickname: string;
  avatarEmoji: string; // temporary emoji avatar
  bio: string; // short introduction
  mbti?: string;
  joinedAt: string; // ISO date
};

export type UserStats = {
  totalRecords: number;
  totalLikesReceived: number;
  totalFlowersBloomed: number;
  streakDays: number;
};













