import { useMemo } from 'react';
import '@styles/home.css';

type GrowthGaugeProps = {
  growthPct: number; // 0-100
  growthLevelImage?: string; // 선택적: 꽃 이미지 경로
  stageLabel?: string; // 선택적: 단계 레이블
  bloomLevel?: number; // 선택적: 성장 단계 (0-5)
};

const growthImages: Record<number, string> = {
  0: '/assets/garden/level-0-seed.svg',
  1: '/assets/garden/level-1-sprout.svg',
  2: '/assets/garden/level-2-stem.svg',
  3: '/assets/garden/level-3-bud.svg',
  4: '/assets/garden/level-4-half-bloom.svg',
  5: '/assets/garden/level-5-bloom.svg',
};

const growthLevelLabels: Record<number, string> = {
  0: '씨앗',
  1: '새싹',
  2: '줄기',
  3: '봉오리',
  4: '반개화',
  5: '만개',
};

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

// 성장 단계 계산 (설계서 기준: 포인트 기반)
// Level 0 (씨앗): 0pt
// Level 1 (새싹): 10pt ~ 29pt
// Level 2 (줄기): 30pt ~ 49pt
// Level 3 (꽃봉오리): 50pt ~ 69pt
// Level 4 (반쯤 열린 꽃봉오리): 70pt ~ 99pt
// Level 5 (개화): 100pt
function getGrowthLevel(percent: number, bloomLevel?: number): number {
  // bloomLevel이 전달되면 우선 사용
  if (bloomLevel !== undefined) return bloomLevel;

  // 설계서 기준으로 계산
  if (percent >= 100) return 5; // Level 5: 개화 (100pt)
  if (percent >= 70) return 4; // Level 4: 반쯤 열린 꽃봉오리 (70pt~99pt)
  if (percent >= 50) return 3; // Level 3: 꽃봉오리 (50pt~69pt)
  if (percent >= 30) return 2; // Level 2: 줄기 (30pt~49pt)
  if (percent >= 10) return 1; // Level 1: 새싹 (10pt~29pt)
  return 0; // Level 0: 씨앗 (0pt~9pt)
}

function getGaugeMetrics(percent: number) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - percent / 100);
  return { radius, circumference, dashOffset };
}

export default function GrowthGauge({
  growthPct,
  growthLevelImage,
  stageLabel: propStageLabel,
  bloomLevel,
}: GrowthGaugeProps) {
  const progress = clampPercent(growthPct);
  const growthLevel = useMemo(() => getGrowthLevel(progress, bloomLevel), [progress, bloomLevel]);
  const stageLabel = propStageLabel || growthLevelLabels[growthLevel];
  const imagePath = growthLevelImage || growthImages[growthLevel];
  const gaugeMetrics = useMemo(() => getGaugeMetrics(progress), [progress]);

  return (
    <div className="home-garden-gauge">
      <svg viewBox="0 0 160 160">
        <circle className="home-garden-ring-bg" cx="80" cy="80" r={gaugeMetrics.radius} />
        <circle
          className="home-garden-ring-progress"
          cx="80"
          cy="80"
          r={gaugeMetrics.radius}
          strokeDasharray={`${gaugeMetrics.circumference} ${gaugeMetrics.circumference}`}
          strokeDashoffset={gaugeMetrics.dashOffset}
        />
      </svg>
      <div className="home-garden-gauge-center">
        {imagePath ? (
          <div className="home-garden-gauge-icon">
            <img src={imagePath} alt={`${stageLabel} 단계`} />
          </div>
        ) : (
          <div className="home-garden-gauge-icon" style={{ fontSize: 48 }}>
            🌱
          </div>
        )}
        <p className="home-garden-gauge-percent">{progress}%</p>
      </div>
    </div>
  );
}
