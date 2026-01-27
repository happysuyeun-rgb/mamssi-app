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
 * 유저의 진행 중 꽃(is_bloomed=false)이 존재하는지 확인하고, 없으면 생성
 * 설계상 유저당 진행 중 꽃은 1개만 존재해야 함
 * @param userId 유저 ID
 * @returns flowers row 데이터 (진행 중 꽃만 반환)
 */
export async function ensureFlowerRow(userId: string): Promise<FlowerRow | null> {
  try {
    // 진행 중 꽃만 조회 (is_bloomed=false 또는 null)
    // 설계상 유저당 진행 중 꽃은 1개만 존재해야 함
    const { data: existing, error: selectError } = await supabase
      .from('flowers')
      .select('*')
      .eq('user_id', userId)
      .eq('is_bloomed', false) // 진행 중 꽃만 조회
      .maybeSingle();

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('[ensureFlowerRow] 진행 중 꽃 조회 실패:', {
        code: selectError.code,
        message: selectError.message,
        details: selectError.details,
        hint: selectError.hint,
        userId
      });
      return null;
    }

    // 진행 중 꽃이 이미 존재하면 반환
    if (existing) {
      console.log('[ensureFlowerRow] 진행 중 꽃 존재:', {
        userId,
        flowerId: existing.id,
        growthPercent: existing.growth_percent,
        isBloomed: existing.is_bloomed
      });
      return existing as FlowerRow;
    }

    // 진행 중 꽃이 없으면 새로 생성
    // 단, DB 레벨에서 unique index로 중복 생성 방지됨
    console.log('[ensureFlowerRow] 진행 중 꽃 없음, 새 씨앗 생성 시도:', { userId });
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
      // unique constraint 위반 시 기존 row 재조회 시도
      if (insertError.code === '23505' || insertError.message?.includes('unique') || insertError.message?.includes('duplicate')) {
        console.warn('[ensureFlowerRow] 중복 생성 시도 감지, 기존 row 재조회:', {
          userId,
          error: insertError.message
        });
        
        // 재조회 (동시성 문제로 인한 중복 생성 방지)
        const { data: retryExisting, error: retryError } = await supabase
          .from('flowers')
          .select('*')
          .eq('user_id', userId)
          .eq('is_bloomed', false)
          .maybeSingle();
        
        if (retryError && retryError.code !== 'PGRST116') {
          console.error('[ensureFlowerRow] 재조회 실패:', {
            code: retryError.code,
            message: retryError.message,
            userId
          });
          return null;
        }
        
        if (retryExisting) {
          console.log('[ensureFlowerRow] 재조회 성공, 기존 row 반환:', {
            userId,
            flowerId: retryExisting.id
          });
          return retryExisting as FlowerRow;
        }
      }
      
      console.error('[ensureFlowerRow] 씨앗 생성 실패:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        userId
      });
      return null;
    }

    console.log('[ensureFlowerRow] 새 씨앗 생성 성공:', {
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
 * 연속 기록 일수 계산 (최근 N일)
 * 기준 날짜부터 역순으로 연속된 기록 일수를 계산합니다.
 * @param userId 유저 ID
 * @param endDate 기준 날짜 (YYYY-MM-DD)
 * @returns 연속 기록 일수
 */
export async function getConsecutiveDays(userId: string, endDate: string): Promise<number> {
  try {
    // 최근 30일간의 기록 조회
    const { data: records, error } = await supabase
      .from('emotions')
      .select('emotion_date')
      .eq('user_id', userId)
      .lte('emotion_date', endDate)
      .order('emotion_date', { ascending: false })
      .limit(30);

    if (error) {
      console.error('[getConsecutiveDays] 조회 실패:', {
        code: error.code,
        message: error.message,
        userId,
        endDate
      });
      return 0;
    }

    if (!records || records.length === 0) return 0;

    // 중복 제거 후 날짜만 추출 (내림차순 정렬)
    const uniqueDates = [...new Set(records.map(r => r.emotion_date))].sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );

    // 기준 날짜부터 역순으로 연속된 날짜 확인
    const endDateObj = new Date(endDate);
    endDateObj.setHours(0, 0, 0, 0);
    
    let consecutiveDays = 0;
    let checkDate = new Date(endDateObj);

    // 기준 날짜부터 역순으로 연속된 날짜가 있는지 확인
    for (let i = 0; i < 30; i++) {
      const checkDateStr = checkDate.toISOString().split('T')[0];
      
      // 해당 날짜에 기록이 있는지 확인
      if (uniqueDates.includes(checkDateStr)) {
        consecutiveDays++;
        // 하루 전으로 이동
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // 연속이 끊어지면 종료
        break;
      }
    }

    console.log('[getConsecutiveDays] 연속 기록 일수 계산 완료:', {
      userId,
      endDate,
      consecutiveDays,
      uniqueDatesCount: uniqueDates.length
    });

    return consecutiveDays;
  } catch (err) {
    console.error('[getConsecutiveDays] 예외 발생:', {
      error: err,
      errorMessage: err instanceof Error ? err.message : String(err),
      userId,
      endDate
    });
    return 0;
  }
}

/**
 * 감정 저장 성공 시 flowers 성장 업데이트 (포인트 기반)
 * - (개인) 감정 기록시: +5pt
 * - (공개) 감정 기록시: +10pt
 * - 중복 방지: 같은 날 INSERT만 증가, UPDATE는 증가 없음
 * - 개화 조건: 총 성장 포인트 100pt 이상 또는 20일 연속 기록
 * 
 * @param userId 유저 ID
 * @param emotionDate 감정 날짜 (YYYY-MM-DD)
 * @param isNewRecord 신규 기록인지 여부 (true: INSERT, false: UPDATE)
 * @param isPublic 공개 기록인지 여부 (true: +10pt, false: +5pt)
 * @returns 업데이트된 flowers row 또는 null
 */
export async function updateFlowerGrowth(
  userId: string,
  emotionDate: string,
  isNewRecord: boolean,
  isPublic: boolean = false
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
        currentGrowthPoints: flowerRow.growth_percent // growth_percent를 포인트로 사용
      });
      return flowerRow;
    }

    // INSERT인 경우: isNewRecord=true이므로 성장 증가 진행
    // (hasEmotionToday 체크는 제거: addEmotion 이후 호출되므로 항상 true)
    // 대신 isNewRecord 플래그를 신뢰하여 중복 방지

    // 포인트 계산: 공개 기록 +10pt, 개인 기록 +5pt
    const pointsToAdd = isPublic ? 10 : 5;
    const currentPoints = flowerRow.growth_percent; // growth_percent를 포인트로 사용
    const newGrowthPoints = Math.min(100, currentPoints + pointsToAdd);

    // 연속 기록 일수 확인 (20일 연속 기록시 개화)
    const consecutiveDays = await getConsecutiveDays(userId, emotionDate);
    const shouldBloomByConsecutive = consecutiveDays >= 20 && !flowerRow.is_bloomed;
    
    // 개화 조건: 100pt 이상 또는 20일 연속 기록
    const shouldBloom = (newGrowthPoints >= 100 || shouldBloomByConsecutive) && !flowerRow.is_bloomed;

    // 업데이트 payload 준비 (growth_percent를 포인트로 사용)
    const updatePayload: {
      growth_percent: number; // 실제로는 포인트 값 (0-100pt)
      is_bloomed?: boolean;
      bloomed_at?: string;
      updated_at: string;
    } = {
      growth_percent: newGrowthPoints, // 포인트 값 저장
      updated_at: new Date().toISOString()
    };

    // 개화 달성 시 처리
    if (shouldBloom) {
      updatePayload.is_bloomed = true;
      updatePayload.bloomed_at = new Date().toISOString();
      console.log('[updateFlowerGrowth] 개화 달성! 🌸:', {
        userId,
        growthPoints: newGrowthPoints,
        consecutiveDays,
        reason: newGrowthPoints >= 100 ? '100pt 달성' : '20일 연속 기록'
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
      oldPoints: currentPoints,
      newPoints: newGrowthPoints,
      pointsAdded: pointsToAdd,
      isPublic,
      consecutiveDays,
      isBloomed: updatedFlower.is_bloomed
    });

    // 성장 레벨별 알림 생성 (설계서 기준: 포인트 기반)
    try {
      const { createNotification } = await import('@services/notifications');
      
      // 성장 레벨별 알림 타입 결정 (설계서 기준)
      // Level 0 (씨앗): 0pt
      // Level 1 (새싹): 10pt ~ 29pt
      // Level 2 (줄기): 30pt ~ 49pt
      // Level 3 (꽃봉오리): 50pt ~ 69pt
      // Level 4 (반쯤 열린 꽃봉오리): 70pt ~ 99pt
      // Level 5 (개화): 100pt
      let growthLevelType: 'growth_level_1' | 'growth_level_2' | 'growth_level_3' | 'growth_level_4' | 'growth_level_5' | null = null;
      
      if (newGrowthPoints >= 100 && shouldBloom) {
        // 5단계 개화 (100pt): "축하합니다! 감정의 꽃이 환짝 피었어요."
        growthLevelType = 'growth_level_5';
      } else if (newGrowthPoints >= 70 && currentPoints < 70) {
        // 4단계 반쯤 열린 꽃봉오리 (70pt~99pt): "이제 곧 감정의 꽃이 피어납니다."
        growthLevelType = 'growth_level_4';
      } else if (newGrowthPoints >= 50 && currentPoints < 50) {
        // 3단계 꽃봉오리 (50pt~69pt): "감정이 피어나기 직전이에요. 봉오리가 맺혔어요."
        growthLevelType = 'growth_level_3';
      } else if (newGrowthPoints >= 30 && currentPoints < 30) {
        // 2단계 줄기 (30pt~49pt): "축하합니다, 줄기가 자라났어요."
        growthLevelType = 'growth_level_2';
      } else if (newGrowthPoints >= 10 && currentPoints < 10) {
        // 1단계 새싹 (10pt~29pt): "첫 감정의 씨앗이 자랐어요."
        growthLevelType = 'growth_level_1';
      }
      
      // 레벨 달성 시에만 알림 생성
      if (growthLevelType) {
        await createNotification(
          userId,
          growthLevelType,
          { growthPoints: newGrowthPoints, oldPoints: currentPoints, consecutiveDays }
        );
        console.log('[updateFlowerGrowth] 성장 레벨 알림 생성 성공:', { 
          userId, 
          growthLevelType,
          growthPoints: newGrowthPoints,
          oldPoints: currentPoints,
          consecutiveDays
        });
      }
    } catch (notifError) {
      console.error('[updateFlowerGrowth] 성장 알림 생성 실패:', {
        error: notifError,
        errorMessage: notifError instanceof Error ? notifError.message : String(notifError),
        userId
      });
    }

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

/**
 * 개화된 꽃 목록 조회 (앨범용)
 * @param userId 유저 ID
 * @returns 개화된 꽃 목록
 */
export async function fetchBloomedFlowers(userId: string): Promise<FlowerRow[]> {
  try {
    const { data, error } = await supabase
      .from('flowers')
      .select('*')
      .eq('user_id', userId)
      .eq('is_bloomed', true)
      .order('bloomed_at', { ascending: false });

    if (error) {
      console.error('[fetchBloomedFlowers] 조회 실패:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        userId
      });
      return [];
    }

    return (data || []) as FlowerRow[];
  } catch (err) {
    console.error('[fetchBloomedFlowers] 예외 발생:', {
      error: err,
      errorMessage: err instanceof Error ? err.message : String(err),
      userId
    });
    return [];
  }
}

