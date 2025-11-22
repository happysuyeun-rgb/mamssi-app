export default function MyPage() {
  return (
    <section style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', margin: '4px 0 8px' }}>
        <div style={{
          width: 84, height: 84, borderRadius: '50%', background: 'radial-gradient(125% 130% at 50% 0%,#ffffff,#e3edf0)',
          border: '1px solid var(--ms-line)', display: 'grid', placeItems: 'center', boxShadow: 'var(--ms-shadow-soft)'
        }}>
          <div style={{ fontSize: 46 }}>🙂</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.03em' }}>수연</div>
            <button style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 16, color: 'var(--ms-ink-muted)' }}>✏️</button>
          </div>
          <div style={{ color: 'var(--ms-ink-soft)', fontSize: 13 }}>MBTI ENFJ</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 9, flexWrap: 'wrap' }}>
            {[
              { label: '기록', value: 8, emoji: '📝' },
              { label: '공감', value: 4, emoji: '💧' },
              { label: '개화', value: 2, emoji: '🌸' }
            ].map((b) => (
              <div key={b.label} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px',
                borderRadius: 999, background: '#fff', boxShadow: 'var(--ms-shadow-soft)',
                border: '1px solid var(--ms-line)', color: 'var(--ms-ink-soft)', fontWeight: 600, fontSize: 12
              }}>
                <span style={{ fontSize: 14 }}>{b.emoji}</span>{b.label} <b>{b.value}</b>
              </div>
            ))}
          </div>
        </div>
      </div>

      {[
        { title: '프로필 설정', sub: '닉네임, MBTI, 프로필 사진 · 기본 이모티콘 설정' },
        { title: '알림 설정' },
        { title: '감정꽃 앨범' },
        { title: '감정기록 모아보기' },
        { title: '화면 잠금' },
        { title: '고객 문의' }
      ].map((c) => (
        <div key={c.title} style={{
          background: '#fff', border: '1px solid var(--ms-line)', borderRadius: 16,
          padding: '14px 16px', boxShadow: 'var(--ms-shadow-soft)', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer'
        }}>
          <div>
            <div style={{ fontWeight: 700, letterSpacing: '-0.01em' }}>{c.title}</div>
            {c.sub && <div style={{ color: 'var(--ms-ink-muted)', marginTop: 5, fontSize: 12 }}>{c.sub}</div>}
          </div>
          <div style={{
            width: 20, height: 20, borderRadius: 7, background: '#f4f6f8', display: 'grid', placeItems: 'center',
            border: '1px solid var(--ms-line)', fontSize: 12
          }}>›</div>
        </div>
      ))}

      <div style={{
        background: '#fff', border: '1px solid var(--ms-line)', borderRadius: 16,
        padding: '14px 16px', boxShadow: 'var(--ms-shadow-soft)', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer'
      }}>
        <div style={{ color: '#ef4444', fontWeight: 700 }}>회원탈퇴</div>
        <div style={{
          width: 20, height: 20, borderRadius: 7, background: '#fff5f5', display: 'grid', placeItems: 'center',
          border: '1px solid #fecaca', fontSize: 12
        }}>✖</div>
      </div>
      <div style={{
        background: '#fff', border: '1px solid var(--ms-line)', borderRadius: 16,
        padding: '14px 16px', boxShadow: 'var(--ms-shadow-soft)', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer'
      }}>
        <div style={{ fontWeight: 700 }}>로그아웃</div>
        <div style={{
          width: 20, height: 20, borderRadius: 7, background: '#f4f6f8', display: 'grid', placeItems: 'center',
          border: '1px solid var(--ms-line)', fontSize: 12
        }}>↪</div>
      </div>
    </section>
  );
}

import SimpleCard from '@components/cards/SimpleCard';
import ProfileEditor from '@components/mypage/ProfileEditor';
import AlertSettings from '@components/mypage/AlertSettings';
import LockSettings from '@components/mypage/LockSettings';
import AlbumGrid from '@components/mypage/AlbumGrid';
import FlowerDetail from '@components/mypage/FlowerDetail';
import ExportPanel from '@components/mypage/ExportPanel';
import { useState } from 'react';
import toast from '@utils/toast';

export default function MyPage() {
  const [open, setOpen] = useState<null | 'profile' | 'alert' | 'lock' | 'album' | 'flower' | 'export'>(null);

  return (
    <>
      <div className="ms-header-title">마이프로필</div>
      <div className="ms-header-sub">프로필과 설정을 관리해요</div>

      <SimpleCard title="프로필 설정" onClick={() => setOpen('profile')} />
      <SimpleCard title="알림 설정" onClick={() => setOpen('alert')} />
      <SimpleCard title="감정꽃 앨범" onClick={() => setOpen('album')} />
      <SimpleCard title="감정기록 모아보기" onClick={() => setOpen('export')} />
      <SimpleCard title="화면 잠금" onClick={() => setOpen('lock')} />
      <SimpleCard title="로그아웃" onClick={() => toast('로그아웃 되었습니다')} />

      <ProfileEditor open={open === 'profile'} onClose={() => setOpen(null)} />
      <AlertSettings open={open === 'alert'} onClose={() => setOpen(null)} />
      <LockSettings open={open === 'lock'} onClose={() => setOpen(null)} />
      <AlbumGrid open={open === 'album'} onClose={() => setOpen(null)} onOpenFlower={() => setOpen('flower')} />
      <FlowerDetail open={open === 'flower'} onClose={() => setOpen(null)} />
      <ExportPanel open={open === 'export'} onClose={() => setOpen(null)} />
    </>
  );
}


