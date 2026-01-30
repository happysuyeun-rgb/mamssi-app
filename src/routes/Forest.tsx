import { useMemo, useState } from 'react';

type Post = {
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

const initialPosts: Post[] = [
  {
    id: 1,
    emo: '😄',
    cat: '유머',
    text: '고양이가 내 키보드 위에서 회의했어요.\n결론: 간식 추가 🐾',
    time: '1시간 전',
    likes: 32,
    writer: '익명 씨앗',
    mbti: 'INFJ',
  },
  {
    id: 2,
    emo: '😌',
    cat: '연애',
    text: '괜찮을 줄 알았는데 마음이 조금 울렁였어요.\n그래도 내일은 더 나을 거예요.',
    time: '어제 21:10',
    likes: 28,
    writer: '익명 씨앗',
    mbti: 'INFP',
  },
  {
    id: 3,
    emo: '🌱',
    cat: '성장',
    text: '작은 루틴을 7일 채웠어요.\n꾸준함이 나를 바꾼대요.',
    time: '방금',
    likes: 22,
    writer: '나의 씨앗',
    mbti: 'INFJ',
    isMine: true,
    photo:
      'https://images.pexels.com/photos/450326/pexels-photo-450326.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    id: 4,
    emo: '🧘‍♀️',
    cat: '자기돌봄',
    text: '오늘은 나를 칭찬하기.\n여기까지 잘 왔어.',
    time: '어제',
    likes: 17,
    writer: '익명 씨앗',
    mbti: 'ISFJ',
  },
  {
    id: 5,
    emo: '💼',
    cat: '회사',
    text: '회의가 길어도 동료가 있어 버텼어요.\n함께라서 다행.',
    time: '어제 10:20',
    likes: 14,
    writer: '익명 씨앗',
    mbti: 'ENTJ',
  },
  {
    id: 6,
    emo: '🙂',
    cat: '일상',
    text: '오늘은 커피 향이 참 따뜻하게 느껴졌어요.\n혼자 있는 시간도 나쁘지 않네요.',
    time: '오늘 12:45',
    likes: 12,
    writer: '익명 씨앗',
    mbti: 'ESFP',
  },
  {
    id: 7,
    emo: '🤔',
    cat: '고민',
    text: '아침 공기가 맑았어요.\n마음이 잠시 고요해졌어요.',
    time: '3시간 전',
    likes: 9,
    writer: '익명 씨앗',
    mbti: 'INTP',
  },
];

const TABS = ['best', '일상', '고민', '연애', '회사', '유머', '성장', '자기돌봄'] as const;

export default function Forest() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('best');
  const [posts, setPosts] = useState<Post[]>(initialPosts);

  const data = useMemo(() => {
    if (tab === 'best') {
      const byCat: Record<string, Post> = {};
      posts.forEach((p) => {
        if (!byCat[p.cat] || byCat[p.cat].likes < p.likes) {
          byCat[p.cat] = p;
        }
      });
      return Object.values(byCat).sort((a, b) => b.likes - a.likes);
    }
    return posts.filter((p) => p.cat === tab).sort((a, b) => b.id - a.id);
  }, [tab, posts]);

  function toggleLike(id: number) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, _liked: !p._liked, likes: p.likes + (p._liked ? -1 : 1) } : p
      )
    );
    alert('💧 공감 한 방울이 전해졌어요');
  }

  function sharePost(id: number) {
    const p = posts.find((x) => x.id === id);
    if (!p) return;
    const text = `마음숲 ${p.cat} ${p.emo}\n\n${p.text}\n\n#마음씨 #마음숲`;
    navigator.clipboard?.writeText(text);
    alert('🔗 글이 복사되었어요. 원하는 곳에 붙여넣기 해보세요');
  }

  function reportPost(id: number) {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, _reported: true } : p)));
    alert('🚩 신고가 접수되었어요. 안전하게 살펴볼게요');
  }

  return (
    <section>
      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          padding: '8px 4px 10px',
          background: 'var(--ms-surface)',
          borderTop: '1px solid #ffffff',
          borderBottom: '1px solid var(--ms-line)',
          margin: '0 -16px 8px',
        }}
      >
        {TABS.map((t) => {
          const active = t === tab;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                whiteSpace: 'nowrap',
                fontSize: 13,
                padding: '7px 14px',
                borderRadius: 999,
                border: `1px solid ${active ? 'var(--ms-primary)' : 'var(--ms-line)'}`,
                background: active ? 'var(--ms-primary-soft)' : '#fff',
                color: active ? 'var(--ms-primary)' : 'var(--ms-ink-soft)',
                fontWeight: active ? 600 : 400,
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      <div>
        {data.map((p) => (
          <article
            key={p.id}
            style={{
              background: 'var(--ms-surface)',
              borderRadius: 16,
              border: '1px solid var(--ms-line)',
              padding: '12px 13px 10px',
              margin: '8px 2px',
              boxShadow: '0 3px 12px rgba(15,23,42,0.04)',
              opacity: p._reported ? 0.55 : 1,
              filter: p._reported ? ('grayscale(18%)' as any) : 'none',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 8,
                fontSize: 12,
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '5px 9px',
                  borderRadius: 999,
                  background: '#EEF8F4',
                  border: '1px dashed var(--ms-primary)',
                  color: 'var(--ms-primary)',
                }}
              >
                <span style={{ fontSize: 14 }}>{p.emo}</span>
                {p.cat}
              </span>
              {tab === 'best' && (
                <span
                  style={{
                    fontSize: 11,
                    color: '#B17A00',
                    background: '#FFF3D6',
                    border: '1px solid #FFE0A3',
                    borderRadius: 999,
                    padding: '4px 8px',
                  }}
                >
                  best
                </span>
              )}
              <div
                style={{
                  marginLeft: 'auto',
                  color: 'var(--ms-ink-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span>{p.writer}</span>
                <span>· {p.mbti}</span>
              </div>
            </div>
            <div
              style={{
                marginTop: 4,
                fontSize: 14,
                lineHeight: 1.6,
                color: 'var(--ms-ink-soft)',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden' as any,
              }}
            >
              {p.text}
            </div>
            <div style={{ color: 'var(--ms-ink-muted)', fontSize: 11, marginTop: 6 }}>{p.time}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <button
                onClick={() => toggleLike(p.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 11px',
                  borderRadius: 999,
                  border: `1px solid ${p._liked ? 'var(--ms-primary)' : 'var(--ms-line)'}`,
                  background: p._liked ? 'var(--ms-primary-soft)' : '#fff',
                  color: p._liked ? 'var(--ms-primary)' : 'var(--ms-ink-soft)',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                <span>💧</span>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{p.likes}</span>
              </button>
              <button
                onClick={() => sharePost(p.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 11px',
                  borderRadius: 999,
                  border: '1px solid var(--ms-line)',
                  background: '#fff',
                  color: 'var(--ms-ink-soft)',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                공유하기
              </button>
              <button
                onClick={() => reportPost(p.id)}
                style={{
                  marginLeft: 'auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 11px',
                  borderRadius: 999,
                  border: '1px solid #F3D0D0',
                  background: '#FFF6F6',
                  color: '#B35151',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                신고
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

import FeedPostCard from '@components/cards/FeedPostCard';
import PostDetail from '@components/forest/PostDetail';
import ReportDialog from '@components/forest/ReportDialog';
import { useForestStore } from '@store/forest.store';
import { useState } from 'react';

export default function Forest() {
  const { tabs, currentTab, setTab, filteredPosts } = useForestStore();
  const [detailId, setDetailId] = useState<number | null>(null);
  const [reportId, setReportId] = useState<number | null>(null);

  return (
    <>
      <div
        className="tabs"
        style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '8px 0 12px' }}
      >
        {tabs.map((t) => (
          <button
            key={t}
            className={`tab ${currentTab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
            style={{ whiteSpace: 'nowrap' }}
          >
            {t}
          </button>
        ))}
      </div>

      <main>
        {filteredPosts().map((p) => (
          <FeedPostCard
            key={p.id}
            post={p}
            onOpenDetail={() => setDetailId(p.id)}
            onReport={() => setReportId(p.id)}
          />
        ))}
      </main>

      <PostDetail id={detailId} onClose={() => setDetailId(null)} />
      <ReportDialog id={reportId} onClose={() => setReportId(null)} />
    </>
  );
}
