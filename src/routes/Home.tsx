export default function Home() {
  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <div style={{
        background: 'var(--ms-surface)', borderRadius: '20px', padding: '18px 16px',
        border: '1px solid rgba(148,163,184,0.16)', boxShadow: 'var(--ms-shadow-soft)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600 }}>나의 정원</div>
            <div style={{ fontSize: 11, color: 'var(--ms-ink-muted)', marginTop: 4 }}>
              감정 기록과 공감이 쌓일수록 씨앗이 자라요
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{
            position: 'relative', width: 90, height: 90, borderRadius: '50%',
            background: 'conic-gradient(var(--ms-accent-mint) 0deg 180deg, #E5E7EB 180deg 360deg)',
            display: 'grid', placeItems: 'center'
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', background: '#fff',
              display: 'grid', placeItems: 'center', color: 'var(--ms-ink-soft)'
            }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>50%</div>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'var(--ms-ink-soft)' }}>
              현재 성장 단계: 봉오리 단계예요.
            </div>
            <div style={{ marginTop: 8, fontSize: 13 }}>
              <span style={{ color: 'var(--ms-ink-soft)' }}>씨앗 이름 </span>
              <b>봄비</b>
            </div>
          </div>
        </div>
      </div>

      <div style={{
        background: 'var(--ms-surface)', borderRadius: '20px', padding: '14px 16px',
        border: '1px solid rgba(148,163,184,0.16)', boxShadow: 'var(--ms-shadow-soft)'
      }}>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>이번 주 감정 달력</div>
        <div style={{ fontSize: 12, color: 'var(--ms-ink-muted)' }}>
          하루씩 떠올리며 내 마음의 흐름을 살펴봐요
        </div>
      </div>
    </section>
  );
}

import MainGardenCard from '@components/cards/MainGardenCard';
import EmotionWeek from '@components/home/EmotionWeek';
import AlertsSheet from '@components/home/AlertsSheet';
import { useState } from 'react';

export default function Home() {
  const [openAlerts, setOpenAlerts] = useState(false);
  return (
    <>
      <MainGardenCard onOpenAlerts={() => setOpenAlerts(true)} />
      <EmotionWeek />
      <AlertsSheet open={openAlerts} onClose={() => setOpenAlerts(false)} />
    </>
  );
}


