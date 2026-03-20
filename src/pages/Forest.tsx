import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@components/Layout';
import FabMenu from '@components/FabMenu';
import PageHeader from '@components/PageHeader';
import { useAuth } from '@hooks/useAuth';
import { useNotify } from '@providers/NotifyProvider';
import { useActionGuard } from '@hooks/useActionGuard';
import {
  useCommunity,
  type CommunityPost,
  type ReportReason,
  type SortType,
} from '@hooks/useCommunity';
import { SUPPORT_EMAIL } from '@constants/app';
import { FOREST_CATEGORIES } from '@constants/forest';
import { EMOTION_OPTIONS } from '@constants/emotions';
import type { ForestCategory, ForestPost, ForestReportReason } from '@domain/forest';
import '@styles/forest.css';

const SORT_OPTIONS: { label: string; value: SortType }[] = [
  { label: '최신순', value: 'latest' },
  { label: '공감순', value: 'best' },
];

const REPORT_REASONS: ReportReason[] = ['부적절/혐오', '광고/스팸', '개인정보 노출', '기타'];

// CommunityPost를 ForestPost로 변환
function communityPostToForestPost(post: CommunityPost): ForestPost {
  // emotion_type이 비어 있으면 조인된 emotions.main_emotion 사용 (DB 트리거가 emotion_type 미채움 대비)
  const emotionLabel = post.emotion_type ?? post.emotions?.main_emotion ?? null;
  const emotionOpt = EMOTION_OPTIONS.find((opt) => opt.label === emotionLabel);
  // category는 이미 TEXT 값으로 저장되어 있음
  const forestCategory = (post.category as ForestCategory) || '일상';

  return {
    id: post.id,
    userId: post.user_id,
    emotionCode: emotionOpt?.code || 'CALM',
    emoji: emotionOpt?.emoji || '🙂',
    label: emotionOpt?.label || emotionLabel || '차분',
    content: post.content,
    imageUrl: post.image_url || undefined,
    category: forestCategory,
    likeCount: post.like_count ?? 0,
    isLikedByMe: post.is_liked_by_me === true,
    isMine: post.is_mine || false,
    isReported: false,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
    nickname: post.profiles?.nickname || post.profiles?.seed_name || '익명',
    mbti: post.profiles?.mbti ?? undefined,
    recordId: post.emotion_id || undefined,
    emotionEmoji: emotionOpt?.emoji || '🙂',
  };
}

const BEST_LIKE_THRESHOLD = 20;

type ForestProps = {
  mode?: 'all' | 'mine';
};

export default function Forest({ mode = 'all' }: ForestProps) {
  const isMyPostsView = mode === 'mine';
  const navigate = useNavigate();
  const { user } = useAuth();
  const notify = useNotify();
  const { requireAuthForAction } = useActionGuard();
  const {
    posts: communityPosts,
    loading,
    error,
    status,
    errorMessage,
    sortType,
    selectedCategory,
    setSortType,
    setSelectedCategory,
    fetchPosts,
    toggleLike: toggleLikeCommunity,
    reportPost: reportPostCommunity,
    deletePost: deletePostCommunity,
  } = useCommunity(user?.id || null);

  const [detailPostId, setDetailPostId] = useState<string | null>(null);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [reportDetails, setReportDetails] = useState<string>('');

  // CommunityPost를 ForestPost로 변환
  const posts = useMemo(() => {
    return communityPosts.map(communityPostToForestPost);
  }, [communityPosts]);

  // 카테고리 필터링
  const visiblePosts = useMemo(() => {
    let filtered = posts;

    // BEST 탭: category 필터 금지 (selectedCategory가 null일 때)
    // 나머지 탭: category 값으로 필터
    if (selectedCategory) {
      filtered = filtered.filter((post) => post.category === selectedCategory);
    }
    // BEST 탭일 때는 필터 없이 전체 게시글 표시

    // 정렬
    if (sortType === 'best') {
      filtered = [...filtered].sort((a, b) => {
        if (b.likeCount === a.likeCount) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return b.likeCount - a.likeCount;
      });
    } else {
      filtered = [...filtered].sort(
        (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
      );
    }

    // 내 게시글만 보기
    if (isMyPostsView) {
      filtered = filtered.filter((post) => post.isMine);
    }

    return filtered;
  }, [posts, selectedCategory, sortType, isMyPostsView]);

  const detailPost = useMemo(
    () => (detailPostId ? (posts.find((post) => post.id === detailPostId) ?? null) : null),
    [detailPostId, posts]
  );

  const displayPosts = useMemo(
    () => (isMyPostsView ? visiblePosts.filter((post) => post.isMine) : visiblePosts),
    [visiblePosts, isMyPostsView]
  );

  const onSelectCategory = (category: ForestCategory) => {
    if (category === 'BEST') {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(category);
    }
  };

  const onSelectSort = (value: SortType) => setSortType(value);

  const handleToggleLike = async (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const wasLiked = post.isLikedByMe;

    requireAuthForAction(
      'like_post',
      async () => {
        await toggleLikeCommunity(postId, wasLiked);

        if (wasLiked) {
          notify.info('공감을 취소했어요', '💧');
        } else {
          // 가이드: "공감 한방울이 전해졌어요."
          notify.success('공감 한방울이 전해졌어요.', '💧');
        }
      },
      {
        customMessage: '공감을 주고받으려면 로그인 또는 가입이 필요해요.',
      }
    );
  };

  const handleReport = async (reason: ReportReason, memo?: string) => {
    if (!reportTargetId) return;

    requireAuthForAction(
      'report_post',
      async () => {
        await reportPostCommunity(reportTargetId, reason, memo);
        // 신고내역을 mamssi.official@gmail.com으로 메일 발송
        const subj = encodeURIComponent('[마음,씨] 공감숲 게시글 신고');
        const bodyLines = [
          `게시글 ID: ${reportTargetId}`,
          `신고 사유: ${reason}`,
          `추가 내용: ${memo?.trim() || '(없음)'}`,
        ];
        const body = encodeURIComponent(bodyLines.join('\n'));
        location.href = `mailto:${SUPPORT_EMAIL}?subject=${subj}&body=${body}`;
        notify.success('신고 접수가 되었어요. 이메일 앱에서 보내기를 눌러 주세요.', '✅');
        setReportTargetId(null);
        setReportDetails('');
      },
      {
        customMessage: '신고를 하려면 로그인 또는 가입이 필요해요.',
      }
    );
  };

  const handleDelete = async (postId: string) => {
    requireAuthForAction(
      'delete_post',
      () => {
        notify.modal({
          title: '게시글 삭제',
          message: '정말 이 글을 삭제할까요?',
          confirmLabel: '삭제',
          cancelLabel: '취소',
          onConfirm: async () => {
            await deletePostCommunity(postId);
            notify.success('게시글이 삭제되었어요.', '✅');
            if (detailPostId === postId) {
              setDetailPostId(null);
            }
          },
        });
      },
      {
        customMessage: '게시글을 삭제하려면 로그인 또는 가입이 필요해요.',
      }
    );
  };

  const handleShare = async (post: ForestPost) => {
    const shareUrl = `${window.location.origin}/forest/${post.id}`;
    const shareData = {
      title: '마음씨 공감숲',
      text: post.content,
      url: shareUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
      notify.toast({ type: 'success', message: '공감 링크를 공유했어요.' });
    } catch (error) {
      console.error(error);
      notify.toast({ type: 'error', message: '공유 중 문제가 발생했어요.' });
    }
  };

  const handleEdit = (post: ForestPost) => {
    if (!post.isMine) return;
    if (post.recordId) {
      setDetailPostId(null);
      navigate(`/record?id=${post.recordId}`);
      return;
    }
    notify.toast({ type: 'warning', message: '원본 기록을 찾을 수 없어 수정할 수 없어요.' });
  };

  const heroTitle = isMyPostsView ? '내가 쓴 공감 기록' : '공감숲';
  const heroDesc = isMyPostsView
    ? '공개로 남긴 나의 기록들을 한곳에서 볼 수 있어요.'
    : '서로의 감정을 가볍게 나누는 정원이에요.';

  return (
    <Layout hideHeader>
      <section className="forest-root">
        <PageHeader title={heroTitle} subtitle={heroDesc} />

        {/* 카테고리 탭 */}
        <div className="forest-tabs">
          {FOREST_CATEGORIES.map((category) => {
            const active = category === 'BEST' ? !selectedCategory : selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                className={`forest-tab ${active ? 'active' : ''}`}
                onClick={() => onSelectCategory(category)}
              >
                {category === 'BEST' ? 'BEST' : category}
              </button>
            );
          })}
        </div>

        {/* 정렬 토글 */}
        <div className="forest-sort">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`forest-sort-btn ${option.value === sortType ? 'active' : ''}`}
              onClick={() => onSelectSort(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* 상태 영역 */}
        {status === 'loading' && <div className="forest-state">공감숲을 준비하고 있어요…</div>}

        {status === 'error' && (
          <div className="forest-state error">
            <div style={{ marginBottom: 8, whiteSpace: 'pre-line', textAlign: 'left' }}>
              {errorMessage || '공감숲을 불러오는데 실패했어요.'}
            </div>
            {import.meta.env.DEV && errorMessage && (
              <div
                style={{
                  marginTop: 8,
                  marginBottom: 12,
                  padding: 12,
                  background: '#f5f5f5',
                  borderRadius: 8,
                  fontSize: 11,
                  color: '#666',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  textAlign: 'left',
                }}
              >
                {errorMessage}
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                fetchPosts();
              }}
              className="forest-retry"
            >
              다시 시도하기
            </button>
          </div>
        )}

        {status === 'empty' && (
          <div className="forest-empty">
            {isMyPostsView
              ? '아직 공개로 남긴 기록이 없어요. 공감숲에 마음을 띄워보세요.'
              : '아직 이 정원에는 글이 없어요. 첫 번째 이야기를 남겨볼까요?'}
          </div>
        )}

        {status === 'success' && (
          <div className="forest-list">
            {displayPosts.length > 0 ? (
              displayPosts.map((post) => (
                <ForestCard
                  key={post.id}
                  post={post}
                  onLike={handleToggleLike}
                  onReport={(id) => setReportTargetId(id)}
                  onOpen={(id) => setDetailPostId(id)}
                  onShare={handleShare}
                  onDelete={handleDelete}
                />
              ))
            ) : (
              <div className="forest-empty">
                {isMyPostsView
                  ? '아직 공개로 남긴 기록이 없어요. 공감숲에 마음을 띄워보세요.'
                  : '아직 이 정원에는 글이 없어요. 첫 번째 이야기를 남겨볼까요?'}
              </div>
            )}
          </div>
        )}
      </section>

      <ForestPostSheet
        post={detailPost}
        onClose={() => setDetailPostId(null)}
        onLike={handleToggleLike}
        onReport={() => detailPost && setReportTargetId(detailPost.id)}
        onDelete={handleDelete}
        onShare={handleShare}
        onEdit={handleEdit}
      />

      <ReportModal
        open={Boolean(reportTargetId)}
        onClose={() => {
          setReportTargetId(null);
          setReportDetails('');
        }}
        onSubmit={handleReport}
        details={reportDetails}
        onDetailsChange={setReportDetails}
      />
      {!isMyPostsView && !detailPostId && <FabMenu />}
    </Layout>
  );
}

function ForestCard({
  post,
  onLike,
  onReport,
  onOpen,
  onShare,
  onDelete,
}: {
  post: ForestPost;
  onLike: (postId: string) => void;
  onReport: (postId: string) => void;
  onOpen: (postId: string) => void;
  onShare: (post: ForestPost) => void;
  onDelete?: (postId: string) => void;
}) {
  const navigate = useNavigate();
  const handleCardClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('button')) return;
    onOpen(post.id);
  };
  const isBest = isBestPost(post);

  return (
    <article className="forest-card" role="button" tabIndex={0} onClick={handleCardClick}>
      <div className="forest-card-top">
        <div className="forest-card-meta-group">
          <span className="forest-card-emoji" aria-hidden="true">
            {post.emotionEmoji}
          </span>
          <span className="forest-category-pill">{post.category}</span>
        </div>
        {isBest && (
          <span className="forest-best-badge" aria-label="best post">
            best
          </span>
        )}
      </div>

      <p className="forest-card-content">{post.content}</p>

      {post.imageUrl && (
        <div className="forest-card-image">
          <img src={post.imageUrl} alt="감정 기록 이미지" />
        </div>
      )}

      <div className="forest-card-footer">
        <div className="forest-card-footer-left">
          {/* 목록에서는 신고하기 버튼을 숨김 (상세보기에서만 제공) */}
          <div className="forest-card-author-line">
            <span className="forest-card-author">{post.nickname}</span>
            <span className="forest-card-dot">·</span>
            <span className="forest-card-time">
              {formatRelativeTime(post.createdAt ?? '')}
            </span>
          </div>
        </div>

        {!post.isMine && (
          <button
            type="button"
            className={`forest-like-chip ${post.isLikedByMe ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onLike(post.id);
            }}
          >
            <span role="img" aria-label="like drop">
              💧
            </span>
            <span className="forest-like-count">{post.likeCount}</span>
          </button>
        )}
      </div>
    </article>
  );
}

function ForestPostSheet({
  post,
  onClose,
  onLike,
  onReport,
  onDelete,
  onShare: _onShare,
  onEdit,
}: {
  post: ForestPost | null;
  onClose: () => void;
  onLike: (postId: string) => void;
  onReport: () => void;
  onDelete: (postId: string) => void;
  onShare: (post: ForestPost) => void;
  onEdit: (post: ForestPost) => void;
}) {
  if (!post) return null;
  const isMine = post.isMine;
  const mbtiLabel = post.mbti ?? 'INFJ';

  return (
    <div
      className="forest-sheet-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className="forest-sheet">
        <div className="forest-sheet-top">
          <div>
            <p className="forest-sheet-label">마음 기록 보기</p>
            <p className="forest-sheet-meta">
              {mbtiLabel} · {formatRelativeTime(post.createdAt ?? '')}
            </p>
          </div>
          <button type="button" className="forest-sheet-close" onClick={onClose}>
            닫기
          </button>
        </div>

        <div className="forest-sheet-emotion-row">
          <span className="forest-sheet-emotion">{post.emotionEmoji}</span>
          <span className="forest-category-pill">{post.category}</span>
        </div>

        <div className="forest-sheet-body">
          <p>{post.content}</p>
          {post.imageUrl && (
            <div className="forest-sheet-image">
              <img src={post.imageUrl} alt="감정 기록 이미지" />
            </div>
          )}
          {post.isReported && <div className="forest-sheet-flag">신고가 접수된 게시글입니다.</div>}
        </div>

        <div className="forest-sheet-actions">
          <div className="forest-sheet-actions-left">
            {!isMine && (
              <button type="button" className="forest-report-pill" onClick={onReport}>
              <span role="img" aria-label="report">🚨</span> 신고하기
              </button>
            )}

            {isMine && (
              <>
                <button
                  type="button"
                  className="forest-sheet-owner-btn forest-mine-action-btn forest-mine-action-edit"
                  onClick={() => onEdit(post)}
                >
                  수정
                </button>
                <button
                  type="button"
                  className="forest-sheet-owner-btn forest-mine-action-btn forest-mine-action-delete"
                  onClick={() => onDelete(post.id)}
                >
                  삭제
                </button>
              </>
            )}
          </div>

          {!isMine && (
            <button
              type="button"
              className={`forest-like-chip ${post.isLikedByMe ? 'active' : ''}`}
              onClick={() => onLike(post.id)}
            >
              <span role="img" aria-label="like drop">
                💧
              </span>
              <span className="forest-like-count">{post.likeCount}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportModal({
  open,
  onClose,
  onSubmit,
  details,
  onDetailsChange,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: ReportReason, memo?: string) => void;
  details?: string;
  onDetailsChange?: (value: string) => void;
}) {
  const [reason, setReason] = useState<ReportReason>(REPORT_REASONS[0]);
  const [memo, setMemo] = useState(details || '');

  useEffect(() => {
    if (open) {
      setReason(REPORT_REASONS[0]);
      setMemo(details || '');
    }
  }, [open, details]);

  const handleMemoChange = (value: string) => {
    setMemo(value);
    if (onDetailsChange) {
      onDetailsChange(value);
    }
  };

  if (!open) return null;

  return (
    <div className="forest-report-modal" role="dialog" aria-modal="true">
      <div className="forest-report-panel">
        <div className="forest-report-header">
          <h3>이 글을 신고할까요?</h3>
          <button type="button" className="forest-report-close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>
        <p className="forest-report-desc">신고 사유를 선택해 주세요. (필수)</p>

        <div className="forest-report-reasons">
          {REPORT_REASONS.map((item) => (
            <label key={item} className="forest-report-option">
              <input
                type="radio"
                name="report-reason"
                value={item}
                checked={reason === item}
                onChange={() => setReason(item)}
              />
              <span>{item}</span>
            </label>
          ))}
        </div>

        <textarea
          value={memo}
          onChange={(event) => handleMemoChange(event.target.value)}
          placeholder="추가로 남기고 싶은 내용이 있다면 적어주세요. (선택)"
          style={{
            width: '100%',
            minHeight: 80,
            padding: '12px',
            borderRadius: 12,
            border: '1px solid var(--ms-line)',
            fontSize: 14,
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
        />

        <div className="forest-report-actions">
          <button type="button" onClick={onClose} className="ghost">
            취소
          </button>
          <button
            type="button"
            onClick={() => {
              onSubmit(reason, memo.trim() ? memo : undefined);
            }}
          >
            신고하기
          </button>
        </div>
      </div>
    </div>
  );
}

function formatRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '어제';
  if (days < 7) return `${days}일 전`;
  return iso.split('T')[0].replace(/-/g, '.');
}

function isBestPost(post: ForestPost) {
  return post.likeCount >= BEST_LIKE_THRESHOLD;
}
