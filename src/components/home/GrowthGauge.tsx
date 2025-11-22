import { useMemo } from 'react';
import '@styles/home.css';

type GrowthGaugeProps = {
  growthPct: number; // 0-100
  growthLevelImage?: string; // 선택적: 꽃 이미지 경로
  stageLabel?: string; // 선택적: 단계 레이블
};

const growthImages: Record<number, string> = {
  0: '/assets/garden/level-0-seed.svg',
  1: '/assets/garden/level-1-sprout.svg',
  2: '/assets/garden/level-2-stem.svg',
  3: '/assets/garden/level-3-bud.svg',
  4: '/assets/garden/level-4-half-bloom.svg',
  5: '/assets/garden/level-5-bloom.svg'
};

const growthLevelLabels: Record<number, string> = {
  0: '씨앗',
  1: '새싹',
  2: '줄기',
  3: '봉오리',
  4: '반개화',
  5: '만개'
};

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getGrowthLevel(percent: number): number {
  if (percent >= 100) return 5;
  return Math.min(5, Math.floor(percent / 20));
}

function getGaugeMetrics(percent: number) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - percent / 100);
  return { radius, circumference, dashOffset };
}

export default function GrowthGauge({ growthPct, growthLevelImage, stageLabel: propStageLabel }: GrowthGaugeProps) {
  const progress = clampPercent(growthPct);
  const growthLevel = useMemo(() => getGrowthLevel(progress), [progress]);
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

