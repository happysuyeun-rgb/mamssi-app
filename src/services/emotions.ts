/**
 * Emotions Service
 * emotions 테이블에 대한 모든 CRUD 작업을 담당
 * Supabase 직접 호출을 이 레이어로 완전 분리
 */

import { supabase } from '@lib/supabaseClient';
import { AppError, type ServiceResult, success, failure } from '@lib/errors';
import { logger } from '@lib/logger';
import type { EmotionRow } from '@domain/database';

export type EmotionCreatePayload = {
  user_id: string;
  emotion_date: string; // YYYY-MM-DD
  main_emotion: string;
  intensity?: number | null;
  note?: string | null;
  content: string;
  is_public?: boolean | null;
  category?: string | null;
  image_url?: string | null;
};

export type EmotionUpdatePayload = Partial<Omit<EmotionRow, 'id' | 'user_id' | 'created_at'>>;

/**
 * 감정 기록 목록 조회
 */
export async function fetchEmotions(options: {
  userId?: string | null;
  publicOnly?: boolean;
  limit?: number;
  emotionDate?: string;
}): Promise<ServiceResult<EmotionRow[]>> {
  const { userId, publicOnly = false, limit, emotionDate } = options;

  try {
    let query = supabase.from('emotions').select('*');

    if (publicOnly) {
      query = query.eq('is_public', true);
    } else if (userId) {
      query = query.eq('user_id', userId);
    }

    if (emotionDate) {
      query = query.eq('emotion_date', emotionDate);
    }

    query = query.order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('감정 기록 조회 실패', {
        userId,
        operation: 'fetchEmotions',
        error: AppError.fromSupabaseError(error, { userId }),
      });
      return failure(
        AppError.fromSupabaseError(error, {
          userId: userId ?? undefined,
          operation: 'fetchEmotions',
        })
      );
    }

    return success((data || []) as EmotionRow[]);
  } catch (error) {
    logger.error('감정 기록 조회 중 예외 발생', {
      userId,
      operation: 'fetchEmotions',
      error,
    });
    return failure(
      AppError.fromNetworkError(error, { userId: userId ?? undefined, operation: 'fetchEmotions' })
    );
  }
}

/**
 * 감정 기록 단일 조회
 */
export async function fetchEmotionById(
  emotionId: string,
  userId?: string | null
): Promise<ServiceResult<EmotionRow | null>> {
  try {
    let query = supabase.from('emotions').select('*').eq('id', emotionId);

    // userId가 제공되면 RLS 정책에 의해 본인 기록만 조회됨
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.maybeSingle();

    if (error && error.code !== 'PGRST116') {
      logger.error('감정 기록 조회 실패', {
        userId,
        operation: 'fetchEmotionById',
        resourceId: emotionId,
        error: AppError.fromSupabaseError(error, { userId, resourceId: emotionId }),
      });
      return failure(
        AppError.fromSupabaseError(error, {
          userId: userId ?? undefined,
          resourceId: emotionId,
          operation: 'fetchEmotionById',
        })
      );
    }

    return success((data || null) as EmotionRow | null);
  } catch (error) {
    logger.error('감정 기록 조회 중 예외 발생', {
      userId,
      operation: 'fetchEmotionById',
      resourceId: emotionId,
      error,
    });
    return failure(
      AppError.fromNetworkError(error, {
        userId: userId ?? undefined,
        operation: 'fetchEmotionById',
      })
    );
  }
}

/**
 * 감정 기록 생성
 */
export async function createEmotion(
  payload: EmotionCreatePayload
): Promise<ServiceResult<EmotionRow>> {
  const { user_id } = payload;

  try {
    // auth.uid() 확인
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      logger.error('인증 확인 실패', {
        userId: user_id,
        operation: 'createEmotion',
        error: authError,
      });
      return failure(
        new AppError({
          code: 'AUTH_REQUIRED',
          message: '로그인이 필요해요.',
          userId: user_id,
          operation: 'createEmotion',
        })
      );
    }

    if (authUser.id !== user_id) {
      logger.error('사용자 ID 불일치', {
        userId: user_id,
        authUserId: authUser.id,
        operation: 'createEmotion',
      });
      return failure(
        new AppError({
          code: 'PERMISSION_DENIED',
          message: '권한이 없어요.',
          userId: user_id,
          operation: 'createEmotion',
        })
      );
    }

    const { data, error } = await supabase.from('emotions').insert(payload).select().single();

    if (error) {
      logger.error('감정 기록 생성 실패', {
        userId: user_id,
        operation: 'createEmotion',
        error: AppError.fromSupabaseError(error, { userId: user_id, operation: 'createEmotion' }),
      });
      return failure(
        AppError.fromSupabaseError(error, { userId: user_id, operation: 'createEmotion' })
      );
    }

    logger.log('감정 기록 생성 성공', {
      userId: user_id,
      operation: 'createEmotion',
      resourceId: data.id,
    });

    return success(data as EmotionRow);
  } catch (error) {
    logger.error('감정 기록 생성 중 예외 발생', {
      userId: user_id,
      operation: 'createEmotion',
      error,
    });
    return failure(
      AppError.fromNetworkError(error, { userId: user_id, operation: 'createEmotion' })
    );
  }
}

/**
 * 감정 기록 수정
 */
export async function updateEmotion(
  emotionId: string,
  payload: EmotionUpdatePayload,
  userId: string
): Promise<ServiceResult<EmotionRow>> {
  try {
    // auth.uid() 확인
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser || authUser.id !== userId) {
      logger.error('인증 확인 실패', {
        userId,
        operation: 'updateEmotion',
        resourceId: emotionId,
        error: authError,
      });
      return failure(
        new AppError({
          code: 'AUTH_REQUIRED',
          message: '로그인이 필요해요.',
          userId,
          resourceId: emotionId,
          operation: 'updateEmotion',
        })
      );
    }

    const { data, error } = await supabase
      .from('emotions')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', emotionId)
      .eq('user_id', userId) // RLS 정책과 함께 이중 체크
      .select()
      .single();

    if (error) {
      logger.error('감정 기록 수정 실패', {
        userId,
        operation: 'updateEmotion',
        resourceId: emotionId,
        error: AppError.fromSupabaseError(error, {
          userId,
          resourceId: emotionId,
          operation: 'updateEmotion',
        }),
      });
      return failure(
        AppError.fromSupabaseError(error, {
          userId,
          resourceId: emotionId,
          operation: 'updateEmotion',
        })
      );
    }

    logger.log('감정 기록 수정 성공', {
      userId,
      operation: 'updateEmotion',
      resourceId: emotionId,
    });

    return success(data as EmotionRow);
  } catch (error) {
    logger.error('감정 기록 수정 중 예외 발생', {
      userId,
      operation: 'updateEmotion',
      resourceId: emotionId,
      error,
    });
    return failure(AppError.fromNetworkError(error, { userId, operation: 'updateEmotion' }));
  }
}

/**
 * 감정 기록 삭제
 */
export async function deleteEmotion(
  emotionId: string,
  userId: string
): Promise<ServiceResult<void>> {
  try {
    // auth.uid() 확인
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser || authUser.id !== userId) {
      logger.error('인증 확인 실패', {
        userId,
        operation: 'deleteEmotion',
        resourceId: emotionId,
        error: authError,
      });
      return failure(
        new AppError({
          code: 'AUTH_REQUIRED',
          message: '로그인이 필요해요.',
          userId,
          resourceId: emotionId,
          operation: 'deleteEmotion',
        })
      );
    }

    const { error } = await supabase
      .from('emotions')
      .delete()
      .eq('id', emotionId)
      .eq('user_id', userId); // RLS 정책과 함께 이중 체크

    if (error) {
      logger.error('감정 기록 삭제 실패', {
        userId,
        operation: 'deleteEmotion',
        resourceId: emotionId,
        error: AppError.fromSupabaseError(error, {
          userId,
          resourceId: emotionId,
          operation: 'deleteEmotion',
        }),
      });
      return failure(
        AppError.fromSupabaseError(error, {
          userId,
          resourceId: emotionId,
          operation: 'deleteEmotion',
        })
      );
    }

    logger.log('감정 기록 삭제 성공', {
      userId,
      operation: 'deleteEmotion',
      resourceId: emotionId,
    });

    return success(undefined);
  } catch (error) {
    logger.error('감정 기록 삭제 중 예외 발생', {
      userId,
      operation: 'deleteEmotion',
      resourceId: emotionId,
      error,
    });
    return failure(AppError.fromNetworkError(error, { userId, operation: 'deleteEmotion' }));
  }
}

/**
 * 특정 날짜에 감정 기록이 있는지 확인
 */
export async function hasEmotionOnDate(
  userId: string,
  emotionDate: string
): Promise<ServiceResult<boolean>> {
  try {
    const { data, error } = await supabase
      .from('emotions')
      .select('id')
      .eq('user_id', userId)
      .eq('emotion_date', emotionDate)
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      logger.error('감정 기록 존재 확인 실패', {
        userId,
        operation: 'hasEmotionOnDate',
        error: AppError.fromSupabaseError(error, { userId, operation: 'hasEmotionOnDate' }),
      });
      return failure(AppError.fromSupabaseError(error, { userId, operation: 'hasEmotionOnDate' }));
    }

    return success(!!data);
  } catch (error) {
    logger.error('감정 기록 존재 확인 중 예외 발생', {
      userId,
      operation: 'hasEmotionOnDate',
      error,
    });
    return failure(AppError.fromNetworkError(error, { userId, operation: 'hasEmotionOnDate' }));
  }
}
