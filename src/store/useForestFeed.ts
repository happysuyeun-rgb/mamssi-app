import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@hooks/useAuth';
import { useEmotions, type EmotionRecord } from '@hooks/useEmotions';
import { FOREST_CATEGORIES } from '@constants/forest';
import { resolveEmotionOption } from '@constants/emotions';
import { RECORD_CATEGORY_TO_FOREST } from '@constants/forest';
import type {
  ForestCategory,
  ForestPost,
  ForestReportReason,
  ForestSortType,
} from '@domain/forest';

const DEFAULT_CATEGORY: ForestCategory = 'BEST';

// EmotionRecord를 ForestPost로 변환
function emotionToForestPost(emotion: EmotionRecord, userId?: string): ForestPost {
  const emotionOpt = resolveEmotionOption(emotion.main_emotion);
  const forestCategory = emotion.category
    ? (RECORD_CATEGORY_TO_FOREST[emotion.category] as ForestCategory) || '일상'
    : '일상';

  return {
    id: emotion.id,
    userId: emotion.user_id,
    emotionCode: emotionOpt?.code || 'CALM',
    emoji: emotionOpt?.emoji || '🙂',
    label: emotionOpt?.label || emotion.main_emotion,
    content: emotion.content,
    imageUrl: emotion.image_url || undefined,
    category: forestCategory,
    likeCount: 0, // TODO: 추후 공감 기능 추가 시 업데이트
    isLikedByMe: false,
    isMine: userId === emotion.user_id,
    isReported: false,
    createdAt: emotion.created_at,
    updatedAt: emotion.updated_at,
  };
}

export function useForestFeed() {
  const { user } = useAuth();
  const {
    emotions: publicEmotions,
    loading: emotionsLoading,
    fetchEmotions,
  } = useEmotions({
    publicOnly: true,
  });

  const [selectedCategory, setSelectedCategory] = useState<ForestCategory>(DEFAULT_CATEGORY);
  const [sortType, setSortType] = useState<ForestSortType>('latest');
  const [error, setError] = useState<string | null>(null);

  // 공개 기록을 ForestPost로 변환 (로컬 상태로 관리하여 toggleLike 등 업데이트 가능)
  const basePosts = useMemo(
    () => publicEmotions.map((emotion) => emotionToForestPost(emotion, user?.id)),
    [publicEmotions, user?.id]
  );
  const [posts, setPosts] = useState<ForestPost[]>(basePosts);

  useEffect(() => {
    setPosts(basePosts);
  }, [basePosts]);

  const loadPosts = useCallback(async () => {
    setError(null);
    try {
      await fetchEmotions();
    } catch (err) {
      setError('공감숲을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
      console.error('공감숲 로드 실패:', err);
    }
  }, [fetchEmotions]);

  const toggleLike = useCallback((postId: string) => {
    setPosts((prev: ForestPost[]) =>
      prev.map((post: ForestPost) => {
        if (post.id !== postId) return post;
        if (post.isMine) return post;
        const isLikedByMe = !post.isLikedByMe;
        const likeCount = Math.max(0, post.likeCount + (isLikedByMe ? 1 : -1));
        return { ...post, isLikedByMe, likeCount };
      })
    );
    // TODO: API 요청 실패 시 롤백 처리
  }, []);

  const reportPost = useCallback(
    (postId: string, _reason: ForestReportReason, _details?: string) => {
      setPosts((prev: ForestPost[]) =>
        prev.map((post: ForestPost) => (post.id === postId ? { ...post, isReported: true } : post))
      );
      // TODO: 신고 API 연동
    },
    []
  );

  const deleteMyPost = useCallback((postId: string) => {
    setPosts((prev: ForestPost[]) => prev.filter((post: ForestPost) => post.id !== postId));
    // TODO: 삭제 API 연동 + growthStore 포인트 재계산 연결
  }, []);

  const setCategory = useCallback((category: ForestCategory) => {
    setSelectedCategory(category);
  }, []);

  const setSortTypeSafe = useCallback((next: ForestSortType) => {
    setSortType(next);
  }, []);

  const visiblePosts = useMemo(() => {
    if (selectedCategory === 'BEST') {
      return [...posts].sort((a, b) => {
        if (b.likeCount === a.likeCount) {
          return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
        }
        return b.likeCount - a.likeCount;
      });
    }

    const filtered =
      selectedCategory === DEFAULT_CATEGORY
        ? posts
        : posts.filter((post) => post.category === selectedCategory);

    const sorted = [...filtered].sort((a, b) => {
      if (sortType === 'best') {
        if (b.likeCount === a.likeCount) {
          return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
        }
        return b.likeCount - a.likeCount;
      }
      return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
    });

    return sorted;
  }, [posts, selectedCategory, sortType]);

  return {
    posts,
    selectedCategory,
    sortType,
    isLoading: emotionsLoading,
    error,
    loadPosts,
    setCategory,
    setSortType: setSortTypeSafe,
    toggleLike,
    reportPost,
    deleteMyPost,
    visiblePosts,
  };
}
