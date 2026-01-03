import { type ForestPost } from '@domain/forest';
import type { EmotionRecord } from '@domain/emotion';
import { RECORD_CATEGORY_TO_FOREST } from '@constants/forest';
import { getCurrentUserProfile } from '@mocks/user';

// In-memory mock posts
const forestPosts: ForestPost[] = [
  {
    id: 'p1',
    userId: 'u1',
    nickname: '익명 씨앗',
    mbti: 'INFJ',
    category: '일상',
    emotionEmoji: '🙂',
    emotionLabel: '괜찮음',
    content: '조용한 오후, 커피 향이 마음을 조금 가볍게 해줬다.\n내일은 더 편안해졌으면.',
    createdAt: '2025-11-14T09:00:00+09:00',
    likeCount: 12,
    isLikedByMe: false,
    isMine: false
  },
  {
    id: 'p2',
    userId: 'me',
    nickname: '나의 씨앗',
    mbti: 'ENFP',
    category: '고민',
    emotionEmoji: '😟',
    emotionLabel: '불안',
    content: '작은 일에도 마음이 잔잔하게 흔들리는 하루였다.\n그래도 잘 지나갈 거야.',
    createdAt: '2025-11-15T11:30:00+09:00',
    likeCount: 23,
    isLikedByMe: true,
    isMine: true,
    imageUrl: 'https://images.pexels.com/photos/450326/pexels-photo-450326.jpeg?auto=compress&cs=tinysrgb&w=800'
  },
  {
    id: 'p3',
    userId: 'u2',
    nickname: '익명',
    mbti: 'ISFP',
    category: '자기돌봄',
    emotionEmoji: '😔',
    emotionLabel: '우울',
    content: '아무것도 하지 못하고 하루가 저물었다.\n괜찮아, 오늘은 그냥 여기까지.',
    createdAt: '2025-11-16T20:10:00+09:00',
    likeCount: 5,
    isLikedByMe: false,
    isMine: false
  },
  {
    id: 'p4',
    userId: 'u3',
    nickname: '씨앗',
    mbti: 'INTJ',
    category: '고민',
    emotionEmoji: '😠',
    emotionLabel: '분노',
    content: '말로는 다 설명할 수 없는 답답함이 가슴에 남았다.',
    createdAt: '2025-11-16T07:40:00+09:00',
    likeCount: 8,
    isLikedByMe: false,
    isMine: false
  },
  {
    id: 'p5',
    userId: 'u4',
    nickname: '봄비',
    mbti: 'ENFJ',
    category: '연애',
    emotionEmoji: '😍',
    emotionLabel: '사랑',
    content: '따뜻한 메시지 하나에 하루가 환해졌다.',
    createdAt: '2025-11-13T19:20:00+09:00',
    likeCount: 30,
    isLikedByMe: false,
    isMine: false
  }
];

export function getPosts(): ForestPost[] {
  return forestPosts.map(post => ({ ...post }));
}

export function getPostById(postId: string): ForestPost | null {
  const found = forestPosts.find(p => p.id === postId);
  return found ? { ...found } : null;
}

export function toggleLike(postId: string): ForestPost | null {
  const idx = forestPosts.findIndex(p => p.id === postId);
  if (idx < 0) return null;
  const target = forestPosts[idx];
  if (target.isMine) return target;
  const isLikedByMe = !target.isLikedByMe;
  const likeCount = Math.max(0, target.likeCount + (isLikedByMe ? 1 : -1));
  const updated: ForestPost = { ...target, isLikedByMe, likeCount };
  forestPosts[idx] = updated;
  return { ...updated };
}

export function deletePost(postId: string): boolean {
  const idx = forestPosts.findIndex(p => p.id === postId);
  if (idx < 0) return false;
  if (!forestPosts[idx].isMine) return false;
  forestPosts.splice(idx, 1);
  return true;
}

function generatePostId(): string {
  return `fp-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
}

export function removeForestPostByRecord(recordId: string): void {
  const idx = forestPosts.findIndex(post => post.recordId === recordId);
  if (idx >= 0) {
    forestPosts.splice(idx, 1);
  }
}

export function syncForestPostFromRecord(record: EmotionRecord): ForestPost | null {
  if (!record.category) return null;
  const category = RECORD_CATEGORY_TO_FOREST[record.category];
  if (!category) return null;

  const profile = getCurrentUserProfile();
  const existingIdx = forestPosts.findIndex(post => post.recordId === record.id);
  const base: ForestPost = {
    id: existingIdx >= 0 ? forestPosts[existingIdx].id : generatePostId(),
    recordId: record.id,
    userId: record.userId,
    nickname: profile.nickname,
    mbti: profile.mbti,
    category,
    emotionEmoji: record.emoji,
    emotionLabel: record.label,
    content: record.text,
    createdAt: record.createdAt,
    likeCount: existingIdx >= 0 ? forestPosts[existingIdx].likeCount : 0,
    isLikedByMe: existingIdx >= 0 ? forestPosts[existingIdx].isLikedByMe : false,
    isMine: record.userId === profile.id,
    imageUrl: record.imageUrl
  };

  if (existingIdx >= 0) {
    forestPosts[existingIdx] = { ...forestPosts[existingIdx], ...base };
    return { ...forestPosts[existingIdx] };
  }

  forestPosts.unshift(base);
  return { ...base };
}

// TODO: Replace with Supabase-backed implementation later.
export const __dev = { forestPosts };


