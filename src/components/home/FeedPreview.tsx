import { useNavigate } from 'react-router-dom';
import '@styles/home.css';

type FeedPreviewProps = {
  feedCount?: number; // 공감숲 게시물 수
  likeSum?: number; // 총 공감수
};

export default function FeedPreview({ feedCount = 0, likeSum = 0 }: FeedPreviewProps) {
  const navigate = useNavigate();

  return (
    <section
      className="home-week-card"
      style={{
        marginTop: 24,
        cursor: 'pointer',
      }}
      onClick={() => navigate('/forest')}
    >
      <div className="home-week-header">
        <div>
          <div className="home-week-title">공감숲</div>
          <div className="home-week-desc">서로의 감정을 가볍게 나누는 정원이에요</div>
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ms-primary)' }}>
          {feedCount > 0 ? `${feedCount}개의 글` : '둘러보기 →'}
        </div>
      </div>
      <div style={{ marginTop: 12, fontSize: 13, color: 'var(--ms-ink-soft)' }}>
        {feedCount > 0
          ? `최근 ${feedCount}개의 공감 글이 올라왔어요.${likeSum > 0 ? ` 총 ${likeSum}개의 공감을 받았어요 💧` : ''} 함께 읽어볼까요?`
          : '아직 공감숲에 글이 없어요. 첫 번째 글을 남겨볼까요?'}
      </div>
    </section>
  );
}
