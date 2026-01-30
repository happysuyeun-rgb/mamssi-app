// Emotion code set for basic emotions
export type EmotionCode =
  | 'JOY'
  | 'CALM'
  | 'ANXIOUS'
  | 'BLUE'
  | 'ANGER'
  | 'TIRED'
  | 'EXCITED'
  | 'GROWTH'
  | 'PROUD'
  | 'COMPLEX';

// Per-day emotion snapshot
export type DailyEmotion = {
  date: string; // ISO date string: YYYY-MM-DD
  emoji: string; // e.g., '😌'
  label: string; // e.g., '조금 안심됨'
  hasRecord: boolean;
};

// Garden / Emotional flower growth status
export type GardenStatus = {
  totalDays: number;
  recordedDays: number;
  progressPercent: number; // 0 ~ 100
};

// Full emotion record entity
export type EmotionRecord = {
  userId: string;
  id: string;
  date: string; // YYYY-MM-DD
  emotionCode: EmotionCode;
  emoji: string;
  label: string;
  text: string;
  note?: string;
  imageUrl?: string;
  isPrivate: boolean;
  category?: string; // 영문키: daily/worry/love/work/humor/growth/selfcare
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

// Weekly emotion calendar entry
export type CalendarEmotionRecord = {
  recordId: string;
  date: string;
  emoji: string;
  label: string;
  note: string;
  isMine: boolean;
  isPublic: boolean;
  createdAt: string;
};

export type WeekEmotions = {
  weekStart: string; // Monday ISO date
  days: (CalendarEmotionRecord | null)[]; // length 7
};
