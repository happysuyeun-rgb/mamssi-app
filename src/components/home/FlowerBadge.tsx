import { useState, useEffect, type MouseEvent } from 'react';
import { useAuth } from '@hooks/useAuth';
import { useNotify } from '@providers/NotifyProvider';
import { useSettings } from '@hooks/useSettings';
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

const growthLevelLabels: Record<number, string> = {
  0: '씨앗',
  1: '새싹',
  2: '줄기',
  3: '봉오리',
  4: '반개화',
  5: '만개',
};

const growthLevelImages: Record<number, string> = {
  0: '/assets/garden/level-0-seed.svg',
  1: '/assets/garden/level-1-sprout.svg',
  2: '/assets/garden/level-2-stem.svg',
  3: '/assets/garden/level-3-bud.svg',
  4: '/assets/garden/level-4-half-bloom.svg',
  5: '/assets/garden/level-5-bloom.svg',
};

// 성장 단계 계산 (설계서 기준: 포인트 기반)
// Level 0 (씨앗): 0pt
// Level 1 (새싹): 10pt ~ 29pt
// Level 2 (줄기): 30pt ~ 49pt
// Level 3 (꽃봉오리): 50pt ~ 69pt
// Level 4 (반쯤 열린 꽃봉오리): 70pt ~ 99pt
// Level 5 (개화): 100pt
function getGrowthLevel(percent: number, bloomLevel?: number): number {
  // bloomLevel이 전달되면 우선 사용 (Home.tsx에서 계산된 값)
  if (bloomLevel !== undefined) return bloomLevel;

  // 설계서 기준으로 계산
  if (percent >= 100) return 5; // Level 5: 개화 (100pt)
  if (percent >= 70) return 4; // Level 4: 반쯤 열린 꽃봉오리 (70pt~99pt)
  if (percent >= 50) return 3; // Level 3: 꽃봉오리 (50pt~69pt)
  if (percent >= 30) return 2; // Level 2: 줄기 (30pt~49pt)
  if (percent >= 10) return 1; // Level 1: 새싹 (10pt~29pt)
  return 0; // Level 0: 씨앗 (0pt~9pt)
}

export default function FlowerBadge({
  growthPct,
  bloomLevel,
  seedName = '봄비',
  totalDays = 30,
  recordedDays = 15,
  todayMessage = '오늘의 정원 소식: 오늘 내 씨앗이 작은 공감들을 모으고 있어요 🌱',
}: FlowerBadgeProps) {
  const { user } = useAuth();
  const notify = useNotify();
  const { updateSettings, fetchSettings } = useSettings(user?.id || null);
  const [seedModalOpen, setSeedModalOpen] = useState(false);
  const [seedEditedThisMonth, setSeedEditedThisMonth] = useState(false);
  const [seedInput, setSeedInput] = useState(seedName);
  const [currentSeedName, setCurrentSeedName] = useState(seedName);

  // seedName prop이 변경되면 currentSeedName과 seedInput도 업데이트
  useEffect(() => {
    console.log('[FlowerBadge] seedName prop 변경 감지:', {
      oldSeedName: currentSeedName,
      newSeedName: seedName,
    });
    setCurrentSeedName(seedName);
    // 모달이 열려있지 않을 때만 seedInput 업데이트 (사용자가 입력 중일 때 덮어쓰지 않도록)
    if (!seedModalOpen) {
      setSeedInput(seedName);
    }
  }, [seedName, seedModalOpen]);

  const growthLevel = getGrowthLevel(growthPct, bloomLevel);
  const stageLabel = growthLevelLabels[growthLevel];
  const growthLevelImage = growthLevelImages[growthLevel] || growthLevelImages[0];

  function openSeedEdit() {
    if (seedEditedThisMonth) {
      notify.warning('이번 달에는 씨앗 이름을 이미 수정했어요.', '⚠️');
      return;
    }
    // 모달 열 때 현재 seedName prop 값으로 초기화 (최신 값 사용)
    console.log('[FlowerBadge] 씨앗 이름 수정 모달 열기:', { seedName, currentSeedName });
    setSeedInput(seedName || currentSeedName);
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
        console.log('[FlowerBadge] 씨앗 이름 저장 시작:', {
          userId: user.id,
          seedName: value,
          currentSeedName,
          seedNameProp: seedName,
        });

        // user_settings 테이블에 seed_name upsert (user_id 기준)
        const { data, error } = await updateSettings({ seed_name: value });

        if (error) {
          const err = error as { code?: string; message?: string; details?: string; hint?: string };
          console.error('[FlowerBadge] 씨앗 이름 저장 실패:', {
            userId: user.id,
            seedName: value,
            error,
            errorCode: err.code,
            errorMessage: err.message,
            errorDetails: err.details,
            errorHint: err.hint,
          });
          notify.error(`씨앗 이름 저장에 실패했어요: ${error.message}`, '❌');
          return;
        }

        if (!data) {
          console.error('[FlowerBadge] 씨앗 이름 저장 실패: data가 null', {
            userId: user.id,
            seedName: value,
          });
          notify.error('씨앗 이름 저장에 실패했어요. (데이터 없음)', '❌');
          return;
        }

        console.log('[FlowerBadge] 씨앗 이름 저장 성공:', {
          userId: user.id,
          seedName: value,
          savedData: data,
          savedSeedName: data.seed_name,
        });

        // 저장된 데이터 확인
        if (data.seed_name !== value) {
          console.warn('[FlowerBadge] 저장된 seed_name이 입력값과 다름:', {
            input: value,
            saved: data.seed_name,
          });
        }

        // 설정을 다시 불러와서 최신 상태로 동기화
        console.log('[FlowerBadge] fetchSettings 호출 시작');
        await fetchSettings();
        console.log('[FlowerBadge] fetchSettings 호출 완료');

        // 홈 데이터 새로고침을 위해 전역 함수 호출 (비동기로 대기)
        if ((window as any).__refreshHomeData) {
          console.log('[FlowerBadge] 홈 데이터 새로고침 시작');
          try {
            await (window as any).__refreshHomeData();
            console.log('[FlowerBadge] 홈 데이터 새로고침 완료');
          } catch (refreshError) {
            console.error('[FlowerBadge] 홈 데이터 새로고침 실패:', refreshError);
            // 새로고침 실패해도 저장은 성공했으므로 계속 진행
          }
        } else {
          console.warn('[FlowerBadge] __refreshHomeData 함수가 없음');
        }

        // 홈 데이터 새로고침 후 seedName prop이 업데이트되면 useEffect가 currentSeedName을 업데이트함
        // 하지만 즉시 UI에 반영하기 위해 로컬 state도 업데이트
        setCurrentSeedName(value);
        setSeedEditedThisMonth(true);
        setSeedModalOpen(false);
        notify.success(`씨앗 이름이 "${value}"로 변경되었어요.`, '✨');
      } catch (err) {
        console.error('[FlowerBadge] 씨앗 이름 저장 중 예외 발생:', {
          userId: user.id,
          error: err,
          errorMessage: err instanceof Error ? err.message : String(err),
          errorStack: err instanceof Error ? err.stack : undefined,
        });
        notify.error(
          `씨앗 이름 저장에 실패했어요: ${err instanceof Error ? err.message : String(err)}`,
          '❌'
        );
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
        {/* 1. 상단 텍스트 영역 (좌측 정렬) */}
        <div className="home-garden-header">
          <div className="home-garden-title">나의 정원</div>
          <p className="home-garden-caption">
            최근 {totalDays}일 중 {recordedDays}일을 기록했어요.
            <br />
            감정꽃이 자라고 있어요.
          </p>
        </div>

        {/* 2. 게이지 영역 (중앙 정렬) */}
        <div className="home-garden-gauge-wrapper">
          <GrowthGauge
            growthPct={growthPct}
            growthLevelImage={growthLevelImage}
            stageLabel={stageLabel}
            bloomLevel={growthLevel}
          />
        </div>

        {/* 3. 현재 성장 단계 섹션 (중앙 정렬, 연한 민트 배경) */}
        <div className="home-garden-stage-box">
          <div className="home-garden-stage-label">현재 성장 단계</div>
          <div className="home-garden-stage-value">{stageLabel} 단계예요</div>
        </div>

        {/* 4. 씨앗 이름 섹션 (중앙 정렬) */}
        <div className="home-garden-seed-section">
          <span className="home-garden-seed-label">씨앗 이름</span>
          <span className="home-garden-seed-value">{currentSeedName}</span>
          <button
            type="button"
            className="home-seed-edit"
            onClick={openSeedEdit}
            aria-label="씨앗 이름 수정"
          >
            ✏️
          </button>
        </div>

        {/* 5. 오늘의 정원 소식 (하단, 좌측 정렬) */}
        <div className="home-garden-message-wrapper">
          <span className="home-garden-message-icon">🌱</span>
          <p className="home-garden-message">{todayMessage}</p>
        </div>
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
            zIndex: 30,
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
              padding: '18px 18px 14px',
            }}
          >
            <div
              className="ms-modal-title"
              style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}
            >
              씨앗 이름 수정
            </div>
            <div
              className="ms-modal-date"
              style={{ fontSize: 11, color: 'var(--ms-ink-muted)', marginBottom: 12 }}
            >
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
                marginBottom: 8,
              }}
            />
            <div
              className="ms-input-help"
              style={{ fontSize: 11, color: 'var(--ms-ink-muted)', marginBottom: 12 }}
            >
              · 10자 이내 / 공백만 입력 불가
              <br />· 예시: 봄비, 달빛산책, 조용한숲…
            </div>
            <div className="seed-modal-actions">
              <button
                type="button"
                className="seed-modal-btn"
                onClick={() => setSeedModalOpen(false)}
              >
                취소
              </button>
              <button type="button" className="seed-modal-btn" onClick={saveSeedName}>
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
