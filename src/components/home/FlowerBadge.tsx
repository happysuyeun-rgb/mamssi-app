import { useState, useEffect, type MouseEvent, type CSSProperties } from 'react';
import { useAuth } from '@hooks/useAuth';
import { useNotify } from '@providers/NotifyProvider';
import { supabase } from '@lib/supabaseClient';
import GrowthGauge from './GrowthGauge';
import '@styles/home.css';

type FlowerBadgeProps = {
  growthPct: number;
  bloomLevel?: number;
  seedName?: string;
  totalDays?: number;
  recordedDays?: number;
  todayMessage?: string;
};

const ghostBtn: CSSProperties = {
  background: 'transparent',
  color: 'var(--ms-ink-soft)',
  borderRadius: 999,
  border: '1px solid var(--ms-line)',
  padding: '4px 10px',
  fontSize: 11,
  cursor: 'pointer'
};

const growthLevelLabels: Record<number, string> = {
  0: '씨앗',
  1: '새싹',
  2: '줄기',
  3: '봉오리',
  4: '반개화',
  5: '만개'
};

const growthLevelImages: Record<number, string> = {
  0: '/assets/garden/level-0-seed.svg',
  1: '/assets/garden/level-1-sprout.svg',
  2: '/assets/garden/level-2-stem.svg',
  3: '/assets/garden/level-3-bud.svg',
  4: '/assets/garden/level-4-half-bloom.svg',
  5: '/assets/garden/level-5-bloom.svg'
};

function getGrowthLevel(percent: number, bloomLevel?: number): number {
  if (bloomLevel !== undefined) return bloomLevel;
  if (percent >= 100) return 5;
  return Math.min(5, Math.floor(percent / 20));
}

export default function FlowerBadge({
  growthPct,
  bloomLevel,
  seedName = '봄비',
  totalDays = 30,
  recordedDays = 15,
  todayMessage = '오늘의 정원 소식: 오늘 내 씨앗이 작은 공감들을 모으고 있어요 🌱'
}: FlowerBadgeProps) {
  const { user } = useAuth();
  const notify = useNotify();
  const [seedModalOpen, setSeedModalOpen] = useState(false);
  const [seedEditedThisMonth, setSeedEditedThisMonth] = useState(false);
  const [seedInput, setSeedInput] = useState(seedName);
  const [currentSeedName, setCurrentSeedName] = useState(seedName);

  const growthLevel = getGrowthLevel(growthPct, bloomLevel);
  const stageLabel = growthLevelLabels[growthLevel];
  const growthLevelImage = growthLevelImages[growthLevel] || growthLevelImages[0];

  function openSeedEdit() {
    if (seedEditedThisMonth) {
      toast('이번 달에는 씨앗 이름을 이미 수정했어요.');
      return;
    }
    setSeedInput(seedName);
    setSeedModalOpen(true);
  }

  async function saveSeedName() {
    const value = seedInput.trim();
    if (!value) {
      notify.warning('씨앗 이름을 입력해주세요.', '⚠️');
      return;
    }
    if (value.length > 10) {
      notify.warning('씨앗 이름은 10자 이내로 입력해주세요.', '⚠️');
      return;
    }

    if (user) {
      try {
        // profiles 테이블에 seed_name 업데이트
        const { error } = await supabase
          .from('profiles')
          .update({ seed_name: value })
          .eq('id', user.id);

        if (error) throw error;

        setCurrentSeedName(value);
        setSeedEditedThisMonth(true);
        setSeedModalOpen(false);
        notify.success(`씨앗 이름이 "${value}"로 변경되었어요.`, '✨');
      } catch (err) {
        console.error('씨앗 이름 저장 실패:', err);
        notify.error('씨앗 이름 저장에 실패했어요.', '❌');
      }
    } else {
      // 게스트 모드는 로컬 상태만 업데이트
      setCurrentSeedName(value);
      setSeedEditedThisMonth(true);
      setSeedModalOpen(false);
      notify.success(`씨앗 이름이 "${value}"로 변경되었어요.`, '✨');
    }
  }

  return (
    <>
      <section className="home-garden-card">
        <div>
          <div className="home-garden-title">나의 정원</div>
          <p className="home-garden-caption">
            최근 {totalDays}일 중 {recordedDays}일을 기록했어요. 감정꽃이 자라고 있어요.
          </p>
        </div>
        <div className="home-garden-content">
          <div className="home-garden-left">
            <GrowthGauge growthPct={growthPct} growthLevelImage={growthLevelImage} stageLabel={stageLabel} />
          </div>
          <div className="home-garden-right">
            <p className="home-garden-stage">현재 성장 단계: {stageLabel} 단계예요.</p>
            <div className="home-garden-seed-row">
              <span style={{ color: 'var(--ms-ink-soft)' }}>씨앗 이름</span>
              <span style={{ fontWeight: 600 }}>{currentSeedName}</span>
              <button type="button" className="home-seed-edit" onClick={openSeedEdit} aria-label="씨앗 이름 수정">
                ✏️
              </button>
            </div>
          </div>
        </div>
        <p className="home-garden-message">{todayMessage}</p>
      </section>

      {/* 씨앗 이름 수정 모달 */}
      {seedModalOpen && (
        <div
          className="ms-modal-backdrop show"
          onClick={(e: MouseEvent<HTMLDivElement>) => {
            if (e.target === e.currentTarget) setSeedModalOpen(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 30
          }}
        >
          <div
            className="ms-modal"
            style={{
              width: 'calc(100% - 48px)',
              maxWidth: 360,
              background: 'var(--ms-surface)',
              borderRadius: 24,
              boxShadow: '0 8px 30px rgba(15,23,42,0.16)',
              padding: '18px 18px 14px'
            }}
          >
            <div className="ms-modal-title" style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>
              씨앗 이름 수정
            </div>
            <div className="ms-modal-date" style={{ fontSize: 11, color: 'var(--ms-ink-muted)', marginBottom: 12 }}>
              씨앗에게 어떤 이름을 붙이고 싶나요?
            </div>
            <input
              type="text"
              value={seedInput}
              onChange={(e) => setSeedInput(e.target.value)}
              maxLength={10}
              style={{
                width: '100%',
                padding: '8px 10px',
                fontSize: 13,
                borderRadius: 18,
                border: '1px solid var(--ms-line)',
                marginBottom: 8
              }}
            />
            <div className="ms-input-help" style={{ fontSize: 11, color: 'var(--ms-ink-muted)', marginBottom: 12 }}>
              · 10자 이내 / 공백만 입력 불가
              <br />· 예시: 봄비, 달빛산책, 조용한숲…
            </div>
            <div className="ms-modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="ms-btn-ghost-sm" onClick={() => setSeedModalOpen(false)} style={ghostBtn}>
                취소
              </button>
              <button type="button" className="ms-btn-ghost-sm" onClick={saveSeedName} style={ghostBtn}>
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

