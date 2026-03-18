import type { SupabaseClient } from '@supabase/supabase-js';
import type { EmotionCode } from '@domain/emotion';
import { EMOTION_PRIORITY, EMOTION_TO_FLOWER_TYPE, type FlowerType } from '@constants/flowerMap';

export type EmotionDistribution = Record<string, number>;

export type EmotionDistributionRange = 'all' | 'current_cycle';

type FlowersRow = {
  cycle_start_at?: string | null;
};

type EmotionsRow = {
  main_emotion: string | null;
  created_at: string;
};

type MaybeSingleResult<T> = {
  data: T | null;
};

/**
 * 감정 분포를 조회한다.
 *
 * - public.emotions 테이블에서 user_id = userId 인 레코드를 조회한다.
 * - main_emotion 컬럼 기준으로 감정별 카운트를 집계한다.
 * - range === 'current_cycle' 인 경우 flowers.cycle_start_at 이후만 집계한다.
 *
 * @param userId 감정 분포를 조회할 사용자 ID
 * @param supabase Supabase 클라이언트 인스턴스
 * @param range 조회 범위 ('all' | 'current_cycle')
 * @returns 감정 코드 → 카운트 매핑 객체 (예: { JOY: 3, CALM: 1, ... })
 */
export async function getEmotionDistribution(
  userId: string,
  supabase: SupabaseClient,
  range: EmotionDistributionRange = 'all'
): Promise<EmotionDistribution> {
  if (!userId) {
    return {};
  }

  let fromDate: string | null = null;

  if (range === 'current_cycle') {
    const { data: flowersRow } = (await supabase
      .from('flowers')
      .select('cycle_start_at')
      .eq('user_id', userId)
      .maybeSingle()) as MaybeSingleResult<FlowersRow>;

    if (flowersRow?.cycle_start_at) {
      fromDate = flowersRow.cycle_start_at;
    }
  }

  let query = supabase.from('emotions').select('main_emotion, created_at').eq('user_id', userId);

  if (fromDate) {
    query = query.gte('created_at', fromDate);
  }

  const { data, error } = (await query) as { data: EmotionsRow[] | null; error: unknown | null };

  if (error || !data) {
    // 에러가 발생한 경우 빈 분포를 반환한다.
    return {};
  }

  const distribution: EmotionDistribution = {};

  for (const row of data) {
    const code = row.main_emotion as EmotionCode | null;
    if (!code) continue;

    distribution[code] = (distribution[code] ?? 0) + 1;
  }

  return distribution;
}

/**
 * 감정 분포에서 대표 감정을 선택한다.
 *
 * - 카운트가 가장 높은 감정을 선택한다.
 * - 동률인 경우 EMOTION_PRIORITY 순서에 따라 하나를 고른다.
 * - 감정 기록이 없거나 분포가 비어 있으면 'JOY' 를 기본값으로 반환한다.
 *
 * @param distribution 감정 코드 → 카운트 매핑 객체
 * @returns 대표 감정 코드 (예: 'JOY')
 */
export function pickDominantEmotion(distribution: EmotionDistribution): EmotionCode {
  const entries = Object.entries(distribution).filter(([, count]) => count > 0);

  if (entries.length === 0) {
    return 'JOY';
  }

  let maxCount = 0;
  const candidates: string[] = [];

  for (const [code, count] of entries) {
    if (count > maxCount) {
      maxCount = count;
      candidates.length = 0;
      candidates.push(code);
    } else if (count === maxCount) {
      candidates.push(code);
    }
  }

  if (candidates.length === 1) {
    return candidates[0] as EmotionCode;
  }

  const prioritized = candidates.sort((a, b) => {
    const ai = EMOTION_PRIORITY.indexOf(a as EmotionCode);
    const bi = EMOTION_PRIORITY.indexOf(b as EmotionCode);
    const aIndex = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
    const bIndex = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
    return aIndex - bIndex;
  });

  return prioritized[0] as EmotionCode;
}

/**
 * 대표 감정을 꽃 타입으로 변환한다.
 *
 * - 감정 코드 → 꽃 타입 매핑 상수를 참조한다.
 * - 매핑에 없는 값이면 'WILD_FLOWER' 를 기본값으로 반환한다.
 *
 * @param dominantEmotion 대표 감정 코드 (예: 'JOY')
 * @returns 꽃 타입 문자열 (예: 'SUNFLOWER')
 */
export function mapEmotionToFlowerType(dominantEmotion: EmotionCode): FlowerType {
  return EMOTION_TO_FLOWER_TYPE[dominantEmotion] ?? 'WILD_FLOWER';
}

