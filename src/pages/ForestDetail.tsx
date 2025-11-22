import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '@components/Layout';
import { getPostById, toggleLike, deletePost } from '@mocks/forest';
import type { ForestPost } from '@domain/forest';

export default function ForestDetail() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<ForestPost | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!postId) return;
    const p = getPostById(postId);
    if (!p) {
      setNotFound(true);
      return;
    }
    setPost(p);
  }, [postId]);

  const dateText = useMemo(() => {
    if (!post) return '';
    return post.createdAt.split('T')[0].replace(/-/g, '.');
  }, [post]);

  if (notFound) {
    return (
      <Layout>
        <div className="forest-detail" style={{ padding: '10px 2px 72px' }}>
          게시글을 찾을 수 없어요.
          {/* TODO: 자동으로 /forest로 이동하거나, 버튼 제공 */}
        </div>
      </Layout>
    );
  }
  if (!post) {
    return (
      <Layout>
        <div className="forest-detail" style={{ padding: '10px 2px 72px' }}>
          불러오는 중...
        </div>
      </Layout>
    );
  }

  const isMine = post.isMine;

  function onToggleLike() {
    if (!post) return;
    const updated = toggleLike(post.id);
    if (updated) setPost(updated);
    // TODO: 리스트 화면과 상태 동기화 필요 시 전역 상태/캐시 도입
  }

  function onMore() {
    if (!post) return;
    if (isMine) {
      if (confirm('정말 삭제할까요?')) {
        const ok = deletePost(post.id);
        if (ok) {
          // TODO: 리스트와 동기화, 성공 토스트 등
          navigate('/forest');
        }
      }
    } else {
      alert('신고가 접수되었어요. 마음씨 팀이 확인할게요.');
      // TODO: 실제 신고 API 연동
    }
  }

  return (
    <Layout>
      <div className="forest-detail" style={{ padding: '10px 2px 72px' }}>
        {/* 상단 뒤로가기 영역 */}
        <div className="forest-detail-header" style={{ margin: '0 0 10px 0' }}>
          <button onClick={() => navigate(-1)} style={{ border: '1px solid var(--ms-line)', background: '#fff', borderRadius: 10, fontSize: 12, padding: '6px 10px', cursor: 'pointer' }}>
            ← 공감숲으로 돌아가기
          </button>
        </div>

        {/* 작성자 정보 영역 */}
        <div className="forest-detail-author" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ fontSize: 20 }}>{post.emotionEmoji}</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{post.nickname}</div>
            <div style={{ fontSize: 12, color: 'var(--ms-ink-muted)' }}>{dateText}</div>
          </div>
          <button onClick={onMore} style={{ marginLeft: 'auto', border: '1px solid var(--ms-line)', borderRadius: 8, background: '#fff', padding: '2px 6px', cursor: 'pointer' }}>⋯</button>
        </div>

        {/* 감정 정보 영역 */}
        <div className="forest-detail-emotion" style={{ margin: '6px 0 10px 0' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '4px 8px', borderRadius: 999, background: '#E6FFF6', border: '1px solid #BBF7D0', color: '#166534' }}>
            <span>{post.emotionEmoji}</span>
            <span>{post.emotionLabel ?? '감정'}</span>
          </span>
        </div>

        {/* 본문 텍스트 영역 */}
        <div className="forest-detail-text" style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.7, color: 'var(--ms-ink-soft)' }}>
          {post.content}
        </div>

        {/* 이미지 영역 */}
        {post.imageUrl && (
          <div className="forest-detail-image" style={{ marginTop: 10 }}>
            <img src={post.imageUrl} alt="상세 이미지" style={{ width: '100%', maxHeight: 360, objectFit: 'cover', borderRadius: 14, border: '1px solid var(--ms-line)' }} />
          </div>
        )}

        {/* 하단 인터랙션 영역 */}
        <div className="forest-detail-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          {!isMine && (
            <button onClick={onToggleLike} className={`forest-like ${post.isLikedByMe ? 'active' : ''}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: 999,
              border: `1px solid ${post.isLikedByMe ? 'var(--ms-primary)' : 'var(--ms-line)'}`,
              background: post.isLikedByMe ? 'var(--ms-primary-soft)' : '#fff',
              color: post.isLikedByMe ? 'var(--ms-primary)' : 'var(--ms-ink-soft)', fontSize: 12, cursor: 'pointer'
            }}>
            <span>❤️</span>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{post.likeCount}</span>
            </button>
          )}
          <button onClick={onMore} style={{ border: '1px solid var(--ms-line)', borderRadius: 10, background: '#fff', padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>
            더보기
          </button>
        </div>
      </div>
    </Layout>
  );
}


