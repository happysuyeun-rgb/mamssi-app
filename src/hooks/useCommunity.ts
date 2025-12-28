import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@lib/supabaseClient';
import { diag } from '@boot/diag';
import type { User } from '@supabase/supabase-js';

export type CommunityPost = {
  id: string;
  emotion_id: string | null;
  user_id: string;
  content: string;
  emotion_type: string | null;
  image_url: string | null;
  category: string | null;
  like_count: number;
  created_at: string;
  updated_at: string;
  profiles?: {
    nickname: string | null;
    seed_name: string | null;
  } | null;
  is_liked_by_me?: boolean;
  is_mine?: boolean;
};

export type ReportReason = '스팸/광고' | '욕설/혐오 표현' | '자해/위험 행동' | '개인정보 노출' | '기타';

export type SortType = 'latest' | 'best';

export type ForestStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';

type ForestState = {
  status: ForestStatus;
  posts: CommunityPost[];
  errorMessage: string | null;
};

export function useCommunity(userId?: string | null) {
  const [state, setState] = useState<ForestState>({
    status: 'loading',
    posts: [],
    errorMessage: null
  });
  const [sortType, setSortType] = useState<SortType>('latest');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setState(prev => ({ ...prev, status: 'loading', errorMessage: null }));

    try {
      // Supabase 클라이언트 검증
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
        const envError = 'Supabase 환경변수가 설정되지 않았습니다. VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 확인해주세요.';
        console.error('[useCommunity] fetchPosts error - ENV 미설정', { 
          hasUrl: !!supabaseUrl, 
          hasKey: !!supabaseAnonKey,
          url: supabaseUrl 
        });
        diag.err('useCommunity: Supabase ENV 미설정', { hasUrl: !!supabaseUrl, hasKey: !!supabaseAnonKey });
        setState({
          status: 'error',
          posts: [],
          errorMessage: envError
        });
        return;
      }

      // 공감숲은 공개된 게시글만 조회 (게스트/로그인 모두 접근 가능)
      // RLS 정책: community_posts SELECT는 is_public=true인 게시글만 조회 가능해야 함
      // 
      // ⚠️ RLS 정책 필수:
      // community_posts 테이블에 다음 정책이 필요합니다:
      //   CREATE POLICY "Allow public read for public posts" ON community_posts
      //   FOR SELECT USING (is_public = true);
      //
      // 게스트는 profiles 테이블에 접근 권한이 없으므로,
      // profiles JOIN 없이 조회합니다.
      
      diag.log('useCommunity: fetchPosts 시작', { 
        userId: userId || 'guest',
        sortType,
        selectedCategory 
      });
      
      // 게스트 호환: profiles JOIN 없이 조회
      let query = supabase
        .from('community_posts')
        .select('*')
        .eq('is_public', true); // 공개 게시글만 조회

      // 삭제된 게시글 제외 (is_deleted 컬럼이 있다면)
      // query = query.eq('is_deleted', false); // 필요시 주석 해제

      // 카테고리 필터 (BEST 탭은 필터 금지)
      if (selectedCategory && selectedCategory !== 'BEST') {
        query = query.eq('category', selectedCategory);
      }

      // 정렬
      if (sortType === 'best') {
        query = query.order('like_count', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      diag.log('useCommunity: Supabase 쿼리 실행', { 
        table: 'community_posts',
        filters: { is_public: true, category: selectedCategory },
        sort: sortType
      });

      let { data, error: fetchError } = await query;

      // Supabase에서 error가 내려오는 경우 처리
      if (fetchError) {
        console.error('[useCommunity] fetchPosts error - Supabase 에러', fetchError);
        diag.err('useCommunity: Supabase 조회 실패', {
          code: fetchError.code,
          message: fetchError.message,
          details: fetchError.details,
          hint: fetchError.hint
        });
        
        // RLS 정책 관련 에러인 경우 안내 메시지 추가
        const isRLSError = fetchError.code === 'PGRST301' || 
                          fetchError.code === '42501' ||
                          fetchError.message?.includes('permission') ||
                          fetchError.message?.includes('policy') ||
                          fetchError.message?.includes('RLS');
        
        // 네트워크 에러인 경우
        const isNetworkError = fetchError.message?.includes('Failed to fetch') ||
                               fetchError.message?.includes('NetworkError') ||
                               fetchError.message?.includes('fetch');
        
        let errorMessage = '공감숲을 불러오는데 실패했어요.';
        
        if (isNetworkError) {
          errorMessage = `네트워크 연결에 실패했어요.\n\n` +
            `확인사항:\n` +
            `- 인터넷 연결 상태를 확인해주세요\n` +
            `- Supabase URL이 올바른지 확인해주세요\n` +
            `- CORS 설정을 확인해주세요`;
          if (import.meta.env.DEV) {
            errorMessage += `\n\n[개발자] Supabase URL: ${supabaseUrl?.substring(0, 30)}...`;
          }
        } else if (isRLSError) {
          errorMessage = `데이터 조회 권한이 없어요.\n\n` +
            `[개발자 안내] RLS 정책이 필요합니다:\n` +
            `CREATE POLICY "Allow public read for public posts" ON community_posts\n` +
            `FOR SELECT USING (is_public = true);`;
        } else {
          errorMessage = fetchError.message || errorMessage;
          if (import.meta.env.DEV && fetchError.details) {
            errorMessage += `\n\n[상세] ${fetchError.details}`;
          }
        }
        
        setState({
          status: 'error',
          posts: [],
          errorMessage
        });
        return;
      }

      // data가 0건이면 status = 'empty'
      const postsData = data || [];
      if (postsData.length === 0) {
        setState({
          status: 'empty',
          posts: [],
          errorMessage: null
        });
        return;
      }

      // profiles 정보가 없는 경우 (게스트 모드) 기본값 설정
      const postsWithProfiles = postsData.map((post: any) => ({
        ...post,
        profiles: post.profiles || {
          nickname: '익명',
          seed_name: null
        }
      }));

      // 사용자가 공감한 게시글 확인 (로그인 사용자만)
      if (userId && postsWithProfiles.length > 0) {
        const postIds = postsData.map((post) => post.id);
        const { data: likesData, error: likesError } = await supabase
          .from('community_likes')
          .select('post_id')
          .eq('user_id', userId)
          .in('post_id', postIds);

        if (likesError) {
          console.error('[FOREST_SUPABASE_ERROR] likes 조회 실패:', likesError);
          // likes 조회 실패해도 게시글은 표시
        }

        const likedPostIds = new Set(likesData?.map((like) => like.post_id) || []);

        const postsWithLikes = postsWithProfiles.map((post: any) => ({
          ...post,
          is_liked_by_me: likedPostIds.has(post.id),
          is_mine: post.user_id === userId
        }));

        setState({
          status: 'success',
          posts: postsWithLikes as CommunityPost[],
          errorMessage: null
        });
      } else {
        // 게스트 모드
        setState({
          status: 'success',
          posts: postsWithProfiles as CommunityPost[],
          errorMessage: null
        });
      }
    } catch (err) {
      // 예외(catch)도 status = 'error'
      console.error('[useCommunity] fetchPosts error - 예외 발생', err);
      diag.err('useCommunity: 예외 발생', err);
      
      let errorMessage = '알 수 없는 오류가 발생했어요.';
      
      if (err instanceof Error) {
        errorMessage = err.message;
        
        // TypeError: Failed to fetch 등 네트워크 에러
        if (err.name === 'TypeError' && err.message.includes('fetch')) {
          errorMessage = `네트워크 연결에 실패했어요.\n\n` +
            `확인사항:\n` +
            `- 인터넷 연결 상태를 확인해주세요\n` +
            `- Supabase 서버가 정상 작동하는지 확인해주세요\n` +
            `- 브라우저 콘솔의 네트워크 탭을 확인해주세요`;
          
          if (import.meta.env.DEV) {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            errorMessage += `\n\n[개발자] Supabase URL: ${supabaseUrl || '미설정'}`;
          }
        }
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      setState({
        status: 'error',
        posts: [],
        errorMessage
      });
    }
  }, [userId, sortType, selectedCategory]);

  const toggleLike = useCallback(
    async (postId: string, isLiked: boolean) => {
      if (!userId) {
        // useActionGuard에서 처리하므로 여기서는 에러만 로깅
        console.warn('[FOREST] toggleLike: userId가 없습니다. useActionGuard에서 처리해야 합니다.');
        return;
      }

      try {
        if (isLiked) {
          // 공감 취소
          const { error: deleteError } = await supabase
            .from('community_likes')
            .delete()
            .eq('post_id', postId)
            .eq('user_id', userId);

          if (deleteError) throw deleteError;

          setState(prev => ({
            ...prev,
            posts: prev.posts.map((post) =>
              post.id === postId
                ? { ...post, is_liked_by_me: false, like_count: Math.max(0, post.like_count - 1) }
                : post
            )
          }));
        } else {
          // 공감 추가
          const { error: insertError } = await supabase
            .from('community_likes')
            .insert({ post_id: postId, user_id: userId });

          if (insertError) throw insertError;

          setState(prev => ({
            ...prev,
            posts: prev.posts.map((post) =>
              post.id === postId
                ? { ...post, is_liked_by_me: true, like_count: post.like_count + 1 }
                : post
            )
          }));
        }
      } catch (err) {
        console.error('[FOREST_SUPABASE_ERROR] 공감 처리 실패:', err);
      }
    },
    [userId]
  );

  const reportPost = useCallback(
    async (postId: string, reason: ReportReason, details?: string) => {
      if (!userId) {
        // useActionGuard에서 처리하므로 여기서는 에러만 로깅
        console.warn('[FOREST] reportPost: userId가 없습니다. useActionGuard에서 처리해야 합니다.');
        return;
      }

      try {
        const { error: reportError } = await supabase.from('reports').insert({
          post_id: postId,
          user_id: userId,
          reason,
          details
        });

        if (reportError) throw reportError;

        // 신고 성공은 Forest.tsx에서 notify로 처리
      } catch (err) {
        console.error('신고 처리 실패:', err);
      }
    },
    [userId]
  );

  const deletePost = useCallback(
    async (postId: string) => {
      if (!userId) {
        // useActionGuard에서 처리하므로 여기서는 에러만 로깅
        console.warn('[FOREST] deletePost: userId가 없습니다. useActionGuard에서 처리해야 합니다.');
        return;
      }

      try {
        const { error: deleteError } = await supabase
          .from('community_posts')
          .delete()
          .eq('id', postId)
          .eq('user_id', userId);

        if (deleteError) throw deleteError;

        setState(prev => ({
          ...prev,
          posts: prev.posts.filter((post) => post.id !== postId)
        }));
      } catch (err) {
        console.error('[FOREST_SUPABASE_ERROR] 게시글 삭제 실패:', err);
        throw err; // Forest.tsx에서 에러 처리
      }
    },
    [userId]
  );

  // 실시간 업데이트 구독
  useEffect(() => {
    if (!userId) {
      fetchPosts();
      return;
    }

    fetchPosts();

    // Realtime 구독: community_likes 변경 시 자동 갱신
    const channel = supabase
      .channel('community_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_likes'
        },
        () => {
          // like_count는 트리거로 자동 업데이트되므로, posts만 다시 불러오기
          fetchPosts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_posts'
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPosts, userId]);

  // 하위 호환성을 위한 computed 값들
  const loading = state.status === 'loading';
  const error = state.status === 'error' ? state.errorMessage : null;
  const posts = state.posts;

  return {
    posts,
    loading,
    error,
    status: state.status,
    errorMessage: state.errorMessage,
    sortType,
    selectedCategory,
    setSortType,
    setSelectedCategory,
    fetchPosts,
    toggleLike,
    reportPost,
    deletePost
  };
}

