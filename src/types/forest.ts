export type ForestPost = {
  id: string;
  recordId?: string;
  userId: string;
  nickname?: string;
  mbti?: string;
  category: string;
  emotionEmoji?: string;
  emoji?: string;
  emotionLabel?: string;
  label?: string;
  emotionCode?: string;
  content: string;
  createdAt: string; // ISO date string
  updatedAt?: string;
  likeCount: number;
  isLikedByMe: boolean;
  isMine: boolean;
  isReported?: boolean;
  imageUrl?: string | null;
};

export type ForestCategory =
  | 'BEST'
  | '일상'
  | '고민'
  | '연애'
  | '회사'
  | '유머'
  | '성장'
  | '자기돌봄';

export type ForestSortType = 'latest' | 'best';

export type ForestReportReason =
  | '스팸/광고'
  | '욕설/혐오 표현'
  | '자해/위험 행동'
  | '개인정보 노출'
  | '기타';
export type Post = {
  id: number;
  emo: string;
  cat: string;
  text: string;
  time: string;
  likes: number;
  writer: string;
  mbti: string;
  isMine?: boolean;
  photo?: string | null;
  _liked?: boolean;
  _reported?: boolean;
};
