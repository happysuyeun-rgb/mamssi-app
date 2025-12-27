import { supabase } from '@lib/supabaseClient';

export type FlowerRow = {
  id: string;
  user_id: string;
  flower_type: string;
  growth_percent: number;
  is_bloomed: boolean | null;
  bloomed_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * 유저의 flowers row가 존재하는지 확인하고, 없으면 생성
 * @param userId 유저 ID
 * @returns flowers row 데이터
 */
export async function ensureFlowerRow(userId: string): Promise<FlowerRow | null> {
  try {
    // 기존 row 조회
    const { data: existing, error: selectError } = await supabase
      .from('flowers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('[ensureFlowerRow] flowers 조회 실패:', {
        code: selectError.code,
        message: selectError.message,
        details: selectError.details,
        hint: selectError.hint,
        userId
      });
      return null;
    }

    // 이미 존재하면 반환
    if (existing) {
      console.log('[ensureFlowerRow] flowers row 존재:', {
        userId,
        flowerId: existing.id,
        growthPercent: existing.growth_percent
      });
      return existing as FlowerRow;
    }

    // 없으면 생성
    console.log('[ensureFlowerRow] flowers row 생성 시도:', { userId });
    const { data: newFlower, error: insertError } = await supabase
      .from('flowers')
      .insert({
        user_id: userId,
        flower_type: 'seed', // 기본값: 씨앗
        growth_percent: 0,
        is_bloomed: false
      })
      .select()
      .single();

    if (insertError) {
      console.error('[ensureFlowerRow] flowers 생성 실패:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        userId
      });
      return null;
    }

    console.log('[ensureFlowerRow] flowers row 생성 성공:', {
      userId,
      flowerId: newFlower.id,
      growthPercent: newFlower.growth_percent
    });

    return newFlower as FlowerRow;
  } catch (err) {
    console.error('[ensureFlowerRow] 예외 발생:', {
      error: err,
      errorMessage: err instanceof Error ? err.message : String(err),
      userId
    });
    return null;
  }
}

/**
 * 오늘 날짜에 감정 기록이 이미 있는지 확인 (중복 방지용)
 * @param userId 유저 ID
 * @param emotionDate 감정 날짜 (YYYY-MM-DD)
 * @returns 오늘 기록 존재 여부
 */
export async function hasEmotionToday(userId: string, emotionDate: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('emotions')
      .select('id')
      .eq('user_id', userId)
      .eq('emotion_date', emotionDate)
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('[hasEmotionToday] 조회 실패:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        userId,
        emotionDate
      });
      return false;
    }

    return !!data;
  } catch (err) {
    console.error('[hasEmotionToday] 예외 발생:', {
      error: err,
      errorMessage: err instanceof Error ? err.message : String(err),
      userId,
      emotionDate
    });
    return false;
  }
}

/**
 * 감정 저장 성공 시 flowers 성장 업데이트
 * - 하루 1회 기록 시 +1% 증가
 * - 중복 방지: 같은 날 INSERT만 증가, UPDATE는 증가 없음
 * - growth_percent >= 100이면 is_bloomed=true, bloomed_at=now()
 * 
 * @param userId 유저 ID
 * @param emotionDate 감정 날짜 (YYYY-MM-DD)
 * @param isNewRecord 신규 기록인지 여부 (true: INSERT, false: UPDATE)
 * @returns 업데이트된 flowers row 또는 null
 */
export async function updateFlowerGrowth(
  userId: string,
  emotionDate: string,
  isNewRecord: boolean
): Promise<FlowerRow | null> {
  try {
    // flowers row 보장
    const flowerRow = await ensureFlowerRow(userId);
    if (!flowerRow) {
      console.error('[updateFlowerGrowth] flowers row 생성/조회 실패:', { userId });
      return null;
    }

    // UPDATE인 경우 성장 증가 없음 (중복 방지)
    if (!isNewRecord) {
      console.log('[updateFlowerGrowth] UPDATE 모드 - 성장 증가 없음:', {
        userId,
        emotionDate,
        currentGrowth: flowerRow.growth_percent
      });
      return flowerRow;
    }

    // INSERT인 경우에도 오늘 이미 기록이 있으면 증가 없음 (중복 방지)
    const hasToday = await hasEmotionToday(userId, emotionDate);
    if (hasToday) {
      console.log('[updateFlowerGrowth] 오늘 이미 기록 존재 - 성장 증가 없음:', {
        userId,
        emotionDate,
        currentGrowth: flowerRow.growth_percent
      });
      return flowerRow;
    }

    // 성장 계산: +1% (하루 1회 기록 시)
    const newGrowthPercent = Math.min(100, flowerRow.growth_percent + 1);
    const shouldBloom = newGrowthPercent >= 100 && !flowerRow.is_bloomed;

    // 업데이트 payload 준비
    const updatePayload: {
      growth_percent: number;
      is_bloomed?: boolean;
      bloomed_at?: string;
      updated_at: string;
    } = {
      growth_percent: newGrowthPercent,
      updated_at: new Date().toISOString()
    };

    // 100% 달성 시 개화 처리
    if (shouldBloom) {
      updatePayload.is_bloomed = true;
      updatePayload.bloomed_at = new Date().toISOString();
      console.log('[updateFlowerGrowth] 개화 달성! 🌸:', {
        userId,
        growthPercent: newGrowthPercent
      });
    }

    // flowers 업데이트
    const { data: updatedFlower, error: updateError } = await supabase
      .from('flowers')
      .update(updatePayload)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('[updateFlowerGrowth] flowers 업데이트 실패:', {
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        userId,
        emotionDate,
        updatePayload
      });
      return null;
    }

    console.log('[updateFlowerGrowth] 성장 업데이트 성공:', {
      userId,
      emotionDate,
      oldGrowth: flowerRow.growth_percent,
      newGrowth: newGrowthPercent,
      isBloomed: updatedFlower.is_bloomed
    });

    return updatedFlower as FlowerRow;
  } catch (err) {
    console.error('[updateFlowerGrowth] 예외 발생:', {
      error: err,
      errorMessage: err instanceof Error ? err.message : String(err),
      userId,
      emotionDate,
      isNewRecord
    });
    return null;
  }
}

