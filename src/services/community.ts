import { supabase } from '@lib/supabaseClient';

export type CommunityPost = {
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
  profiles?: {
    nickname: string | null;
    seed_name: string | null;
    mbti: string | null;
  } | null;
  is_liked_by_me?: boolean;
  is_mine?: boolean;
};

export type CommunityLike = {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
};

export type Report = {
  id: string;
  post_id: string;
  reporter_id: string;
  reason: string;
  memo: string | null;
  status: string;
  created_at: string;
};

export type ReportReason = '부적절/혐오' | '광고/스팸' | '개인정보 노출' | '기타';

/**
 * 공감숲 게시글 목록 조회 (페이지네이션 지원)
 */
export async function fetchCommunityPosts(options: {
  category?: string | null; // 'best' 또는 카테고리 ID
  sortBy?: 'latest' | 'best'; // latest: created_at DESC, best: like_count DESC
  page?: number;
  pageSize?: number;
  userId?: string | null; // 로그인 사용자 ID (is_liked_by_me, is_mine 계산용)
}): Promise<{ data: CommunityPost[]; hasMore: boolean }> {
  const { category, sortBy = 'latest', page = 1, pageSize = 20, userId } = options;

  try {
    let query = supabase
      .from('community_posts')
      .select(
        `
        *,
        profiles:user_id (
          nickname,
          seed_name,
          mbti
        )
      `
      )
      .eq('is_public', true)
      .eq('is_hidden', false); // 숨김글 제외

    // 카테고리 필터 (BEST는 제외)
    if (category && category !== 'best' && category !== 'BEST') {
      query = query.eq('category', category);
    }

    // 정렬
    if (sortBy === 'best') {
      query = query.order('like_count', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // 페이지네이션
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error } = await query;

    if (error) {
      console.error('[fetchCommunityPosts] 조회 실패:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        options,
      });
      throw error;
    }

    const posts = (data || []) as CommunityPost[];

    // profiles 정보가 없는 경우 기본값 설정 (방어 로직)
    const postsWithProfiles = posts.map((post) => ({
      ...post,
      profiles: post.profiles || {
        nickname: '익명',
        seed_name: null,
        mbti: null,
      },
    }));

    // 로그인 사용자의 공감 여부 확인
    if (userId && postsWithProfiles.length > 0) {
      const postIds = posts.map((p) => p.id);
      const { data: likesData, error: likesError } = await supabase
        .from('community_likes')
        .select('post_id')
        .eq('user_id', userId)
        .in('post_id', postIds);

      if (likesError) {
        console.error('[fetchCommunityPosts] likes 조회 실패:', {
          code: likesError.code,
          message: likesError.message,
          details: likesError.details,
          hint: likesError.hint,
        });
      }

      const likedPostIds = new Set(likesData?.map((like) => like.post_id) || []);

      const postsWithLikes = postsWithProfiles.map((post) => ({
        ...post,
        is_liked_by_me: likedPostIds.has(post.id),
        is_mine: post.user_id === userId,
      }));

      return {
        data: postsWithLikes,
        hasMore: posts.length === pageSize, // 다음 페이지 존재 여부
      };
    }

    return {
      data: posts,
      hasMore: posts.length === pageSize,
    };
  } catch (err) {
    console.error('[fetchCommunityPosts] 예외 발생:', {
      error: err,
      errorMessage: err instanceof Error ? err.message : String(err),
      options,
    });
    throw err;
  }
}

/**
 * 공감숲 게시글 단일 조회
 */
export async function fetchCommunityPost(
  postId: string,
  userId?: string | null
): Promise<CommunityPost | null> {
  try {
    const { data, error } = await supabase
      .from('community_posts')
      .select(
        `
        *,
        profiles:user_id (
          nickname,
          seed_name,
          mbti
        )
      `
      )
      .eq('id', postId)
      .eq('is_public', true)
      .maybeSingle();

    if (error) {
      console.error('[fetchCommunityPost] 조회 실패:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        postId,
      });
      return null;
    }

    if (!data) return null;

    const post = data as CommunityPost;

    // profiles 정보가 없는 경우 기본값 설정 (방어 로직)
    if (!post.profiles) {
      post.profiles = {
        nickname: '익명',
        seed_name: null,
        mbti: null,
      };
    }

    // 로그인 사용자의 공감 여부 확인
    if (userId) {
      const { data: likeData } = await supabase
        .from('community_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle();

      post.is_liked_by_me = !!likeData;
      post.is_mine = post.user_id === userId;
    }

    return post;
  } catch (err) {
    console.error('[fetchCommunityPost] 예외 발생:', {
      error: err,
      errorMessage: err instanceof Error ? err.message : String(err),
      postId,
    });
    return null;
  }
}

/**
 * 공감숲 게시글 작성
 */
export async function createCommunityPost(payload: {
  user_id: string;
  content: string;
  category: string;
  emotion_type?: string | null;
  image_url?: string | null;
  emotion_id?: string | null;
}): Promise<CommunityPost | null> {
  try {
    const { data, error } = await supabase
      .from('community_posts')
      .insert({
        user_id: payload.user_id,
        content: payload.content,
        category: payload.category,
        emotion_type: payload.emotion_type,
        image_url: payload.image_url,
        emotion_id: payload.emotion_id,
        is_public: true,
        is_hidden: false,
      })
      .select(
        `
        *,
        profiles:user_id (
          nickname,
          seed_name,
          mbti
        )
      `
      )
      .single();

    if (error) {
      console.error('[createCommunityPost] 생성 실패:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        payload,
      });
      throw error;
    }

    return data as CommunityPost;
  } catch (err) {
    console.error('[createCommunityPost] 예외 발생:', {
      error: err,
      errorMessage: err instanceof Error ? err.message : String(err),
      payload,
    });
    throw err;
  }
}

/**
 * 공감숲 게시글 수정
 */
export async function updateCommunityPost(
  postId: string,
  userId: string,
  payload: {
    content?: string;
    category?: string;
    emotion_type?: string | null;
    image_url?: string | null;
  }
): Promise<CommunityPost | null> {
  try {
    const { data, error } = await supabase
      .from('community_posts')
      .update(payload)
      .eq('id', postId)
      .eq('user_id', userId) // RLS와 함께 이중 체크
      .select(
        `
        *,
        profiles:user_id (
          nickname,
          seed_name,
          mbti
        )
      `
      )
      .single();

    if (error) {
      console.error('[updateCommunityPost] 수정 실패:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        postId,
        userId,
        payload,
      });
      throw error;
    }

    const post = data as CommunityPost;

    // profiles 정보가 없는 경우 기본값 설정 (방어 로직)
    if (!post.profiles) {
      post.profiles = {
        nickname: '익명',
        seed_name: null,
        mbti: null,
      };
    }

    return post;
  } catch (err) {
    console.error('[updateCommunityPost] 예외 발생:', {
      error: err,
      errorMessage: err instanceof Error ? err.message : String(err),
      postId,
      userId,
      payload,
    });
    throw err;
  }
}

/**
 * 공감숲 게시글 삭제
 */
export async function deleteCommunityPost(postId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('community_posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', userId); // RLS와 함께 이중 체크

    if (error) {
      console.error('[deleteCommunityPost] 삭제 실패:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        postId,
        userId,
      });
      throw error;
    }

    return true;
  } catch (err) {
    console.error('[deleteCommunityPost] 예외 발생:', {
      error: err,
      errorMessage: err instanceof Error ? err.message : String(err),
      postId,
      userId,
    });
    throw err;
  }
}

/**
 * 공감 토글 (추가/취소)
 */
export async function toggleLike(
  postId: string,
  userId: string,
  isLiked: boolean
): Promise<boolean> {
  try {
    if (isLiked) {
      // 공감 취소
      const { error } = await supabase
        .from('community_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);

      if (error) {
        console.error('[toggleLike] 공감 취소 실패:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          postId,
          userId,
        });
        throw error;
      }
    } else {
      // 공감 추가
      const { error } = await supabase.from('community_likes').insert({
        post_id: postId,
        user_id: userId,
      });

      if (error) {
        // 중복 공감 시도는 무시 (unique 제약 조건)
        if (error.code === '23505') {
          console.log('[toggleLike] 이미 공감한 게시글:', { postId, userId });
          return true;
        }
        console.error('[toggleLike] 공감 추가 실패:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          postId,
          userId,
        });
        throw error;
      }
    }

    return true;
  } catch (err) {
    console.error('[toggleLike] 예외 발생:', {
      error: err,
      errorMessage: err instanceof Error ? err.message : String(err),
      postId,
      userId,
      isLiked,
    });
    throw err;
  }
}

/**
 * 게시글 신고
 */
export async function reportPost(
  postId: string,
  reporterId: string,
  reason: ReportReason,
  memo?: string
): Promise<Report | null> {
  try {
    const { data, error } = await supabase
      .from('reports')
      .insert({
        post_id: postId,
        reporter_id: reporterId,
        reason,
        memo: memo || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('[reportPost] 신고 실패:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        postId,
        reporterId,
        reason,
      });
      throw error;
    }

    // 신고 성공 시 트리거가 자동으로 is_hidden=true 처리

    return data as Report;
  } catch (err) {
    console.error('[reportPost] 예외 발생:', {
      error: err,
      errorMessage: err instanceof Error ? err.message : String(err),
      postId,
      reporterId,
      reason,
    });
    throw err;
  }
}

/**
 * 내 게시글 목록 조회
 */
export async function fetchMyPosts(
  userId: string,
  page: number = 1,
  pageSize: number = 20
): Promise<{ data: CommunityPost[]; hasMore: boolean }> {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('community_posts')
      .select(
        `
        *,
        profiles:user_id (
          nickname,
          seed_name,
          mbti
        )
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('[fetchMyPosts] 조회 실패:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        userId,
      });
      throw error;
    }

    const posts = (data || []) as CommunityPost[];
    posts.forEach((post) => {
      post.is_mine = true;
      post.is_liked_by_me = false; // 내 게시글은 공감 여부 불필요
    });

    return {
      data: posts,
      hasMore: posts.length === pageSize,
    };
  } catch (err) {
    console.error('[fetchMyPosts] 예외 발생:', {
      error: err,
      errorMessage: err instanceof Error ? err.message : String(err),
      userId,
    });
    throw err;
  }
}
