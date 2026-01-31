import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '@components/Layout';
import { useAuth } from '@hooks/useAuth';
import { useNotify } from '@providers/NotifyProvider';
import {
  fetchCommunityPost,
  toggleLike as toggleLikeAPI,
  deleteCommunityPost,
  reportPost,
  type ReportReason,
} from '@services/community';
import { EMOTION_OPTIONS } from '@constants/emotions';
import type { ForestPost } from '@domain/forest';
import type { CommunityPost } from '@services/community';

function communityPostToForestPost(post: CommunityPost): ForestPost {
  const emotionOpt = EMOTION_OPTIONS.find((opt) => opt.label === post.emotion_type);
  return {
    id: post.id,
    userId: post.user_id,
    emotionCode: emotionOpt?.code || 'CALM',
    emoji: emotionOpt?.emoji || '🙂',
    label: emotionOpt?.label || post.emotion_type || '차분',
    content: post.content,
    imageUrl: post.image_url || undefined,
    category: post.category || '일상',
    likeCount: post.like_count,
    isLikedByMe: post.is_liked_by_me || false,
    isMine: post.is_mine || false,
    isReported: false,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
    nickname: post.profiles?.nickname || post.profiles?.seed_name || '익명',
    mbti: post.profiles?.mbti || undefined,
    recordId: post.emotion_id || undefined,
    emotionEmoji: emotionOpt?.emoji || '🙂',
  };
}

export default function ForestDetail() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const notify = useNotify();
  const [post, setPost] = useState<ForestPost | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!postId) return;

    const loadPost = async () => {
      setLoading(true);
      try {
        const communityPost = await fetchCommunityPost(postId, user?.id || null);
        if (!communityPost) {
          setNotFound(true);
          return;
        }
        setPost(communityPostToForestPost(communityPost));
      } catch (error) {
        console.error('게시글 로드 실패:', error);
        notify.error('게시글을 불러오는데 실패했어요', '❌');
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [postId, user?.id, notify]);

  const dateText = useMemo(() => {
    if (!post) return '';
    return (post.createdAt ?? '').split('T')[0].replace(/-/g, '.');
  }, [post]);

  if (notFound) {
    return (
      <Layout>
        <div className="forest-detail" style={{ padding: '10px 2px 80px' }}>
          <div style={{ textAlign: 'center', padding: '40px 16px' }}>
            <div style={{ fontSize: 16, marginBottom: 8 }}>게시글을 찾을 수 없어요</div>
            <button
              onClick={() => navigate('/forest')}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid var(--ms-line)',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              공감숲으로 돌아가기
            </button>
          </div>
        </div>
      </Layout>
    );
  }
  if (loading || !post) {
    return (
      <Layout>
        <div className="forest-detail" style={{ padding: '10px 2px 80px' }}>
          <div style={{ textAlign: 'center', padding: '40px 16px' }}>불러오는 중...</div>
        </div>
      </Layout>
    );
  }

  const isMine = post.isMine;

  async function onToggleLike() {
    if (!post || !user) {
      notify.warning('로그인이 필요해요', '⚠️');
      return;
    }

    try {
      const isLiked = post.isLikedByMe;
      await toggleLikeAPI(post.id, user.id, isLiked);

      // 로컬 상태 업데이트
      setPost((prev) =>
        prev
          ? {
              ...prev,
              isLikedByMe: !isLiked,
              likeCount: isLiked ? prev.likeCount - 1 : prev.likeCount + 1,
            }
          : null
      );
    } catch (error) {
      console.error('공감 토글 실패:', error);
      notify.error('공감 처리에 실패했어요', '❌');
    }
  }

  async function onDelete() {
    if (!post || !user) return;

    if (!confirm('정말 삭제할까요?')) return;

    try {
      await deleteCommunityPost(post.id, user.id);
      notify.success('게시글이 삭제되었어요', '✅');
      navigate('/forest');
    } catch (error) {
      console.error('게시글 삭제 실패:', error);
      notify.error('게시글 삭제에 실패했어요', '❌');
    }
  }

  async function onReport() {
    if (!post || !user) return;

    const reason = prompt(
      '신고 사유를 입력해주세요:\n1. 부적절/혐오\n2. 광고/스팸\n3. 개인정보 노출\n4. 기타'
    );
    if (!reason) return;

    try {
      await reportPost(post.id, user.id, reason as ReportReason, '');
      notify.success('신고가 접수되었어요. 마음씨 팀이 확인할게요.', '✅');
    } catch (error) {
      console.error('신고 실패:', error);
      notify.error('신고 처리에 실패했어요', '❌');
    }
  }

  function onMore() {
    if (!post) return;
    if (isMine) {
      onDelete();
    } else {
      onReport();
    }
  }

  return (
    <Layout>
      <div className="forest-detail" style={{ padding: '10px 2px 80px' }}>
        {/* 상단 뒤로가기 영역 */}
        <div className="forest-detail-header" style={{ margin: '0 0 10px 0' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              border: '1px solid var(--ms-line)',
              background: '#fff',
              borderRadius: 10,
              fontSize: 12,
              padding: '6px 10px',
              cursor: 'pointer',
            }}
          >
            ← 공감숲으로 돌아가기
          </button>
        </div>

        {/* 작성자 정보 영역 */}
        <div
          className="forest-detail-author"
          style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}
        >
          <div style={{ fontSize: 20 }}>{post.emotionEmoji}</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{post.nickname}</div>
            <div style={{ fontSize: 12, color: 'var(--ms-ink-muted)' }}>{dateText}</div>
          </div>
          <button
            onClick={onMore}
            style={{
              marginLeft: 'auto',
              border: '1px solid var(--ms-line)',
              borderRadius: 8,
              background: '#fff',
              padding: '2px 6px',
              cursor: 'pointer',
            }}
          >
            ⋯
          </button>
        </div>

        {/* 감정 정보 영역 */}
        <div className="forest-detail-emotion" style={{ margin: '6px 0 10px 0' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              padding: '4px 8px',
              borderRadius: 999,
              background: '#E6FFF6',
              border: '1px solid #BBF7D0',
              color: '#166534',
            }}
          >
            <span>{post.emotionEmoji}</span>
            <span>{post.emotionLabel ?? '감정'}</span>
          </span>
        </div>

        {/* 본문 텍스트 영역 */}
        <div
          className="forest-detail-text"
          style={{
            whiteSpace: 'pre-wrap',
            fontSize: 14,
            lineHeight: 1.7,
            color: 'var(--ms-ink-soft)',
          }}
        >
          {post.content}
        </div>

        {/* 이미지 영역 */}
        {post.imageUrl && (
          <div className="forest-detail-image" style={{ marginTop: 10 }}>
            <img
              src={post.imageUrl}
              alt="상세 이미지"
              style={{
                width: '100%',
                maxHeight: 360,
                objectFit: 'cover',
                borderRadius: 14,
                border: '1px solid var(--ms-line)',
              }}
            />
          </div>
        )}

        {/* 하단 인터랙션 영역 */}
        <div
          className="forest-detail-actions"
          style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}
        >
          {!isMine && (
            <button
              onClick={onToggleLike}
              className={`forest-like ${post.isLikedByMe ? 'active' : ''}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 11px',
                borderRadius: 999,
                border: `1px solid ${post.isLikedByMe ? 'var(--ms-primary)' : 'var(--ms-line)'}`,
                background: post.isLikedByMe ? 'var(--ms-primary-soft)' : '#fff',
                color: post.isLikedByMe ? 'var(--ms-primary)' : 'var(--ms-ink-soft)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              <span>❤️</span>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{post.likeCount}</span>
            </button>
          )}
          <button
            onClick={onMore}
            style={{
              border: '1px solid var(--ms-line)',
              borderRadius: 10,
              background: '#fff',
              padding: '6px 10px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            더보기
          </button>
        </div>
      </div>
    </Layout>
  );
}
