/**
 * User Settings Service
 * user_settings 테이블에 대한 모든 CRUD 작업을 담당
 * Supabase 직접 호출을 이 레이어로 완전 분리
 */

import { supabase } from '@lib/supabaseClient';
import { AppError, type ServiceResult, success, failure } from '@lib/errors';
import { logger } from '@lib/logger';
import type { UserSettingsRow } from '@types/database';

export type SettingsUpdatePayload = Partial<Omit<UserSettingsRow, 'user_id' | 'created_at' | 'updated_at'>>;

/**
 * 사용자 설정 조회
 */
export async function fetchUserSettings(userId: string): Promise<ServiceResult<UserSettingsRow | null>> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      logger.error('사용자 설정 조회 실패', {
        userId,
        operation: 'fetchUserSettings',
        error: AppError.fromSupabaseError(error, { userId, operation: 'fetchUserSettings' })
      });
      return failure(AppError.fromSupabaseError(error, { userId, operation: 'fetchUserSettings' }));
    }

    return success((data || null) as UserSettingsRow | null);
  } catch (error) {
    logger.error('사용자 설정 조회 중 예외 발생', {
      userId,
      operation: 'fetchUserSettings',
      error
    });
    return failure(
      AppError.fromNetworkError(error, { userId, operation: 'fetchUserSettings' })
    );
  }
}

/**
 * 사용자 설정 생성/수정 (upsert)
 */
export async function upsertUserSettings(
  userId: string,
  payload: SettingsUpdatePayload
): Promise<ServiceResult<UserSettingsRow>> {
  try {
    // auth.uid() 확인
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser || authUser.id !== userId) {
      logger.error('인증 확인 실패', {
        userId,
        operation: 'upsertUserSettings',
        error: authError
      });
      return failure(
        new AppError({
          code: 'AUTH_REQUIRED',
          message: '로그인이 필요해요.',
          userId,
          operation: 'upsertUserSettings'
        })
      );
    }

    const upsertPayload = {
      user_id: userId,
      ...payload,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('user_settings')
      .upsert(upsertPayload, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      logger.error('사용자 설정 저장 실패', {
        userId,
        operation: 'upsertUserSettings',
        error: AppError.fromSupabaseError(error, { userId, operation: 'upsertUserSettings' })
      });
      return failure(AppError.fromSupabaseError(error, { userId, operation: 'upsertUserSettings' }));
    }

    logger.log('사용자 설정 저장 성공', {
      userId,
      operation: 'upsertUserSettings'
    });

    return success(data as UserSettingsRow);
  } catch (error) {
    logger.error('사용자 설정 저장 중 예외 발생', {
      userId,
      operation: 'upsertUserSettings',
      error
    });
    return failure(
      AppError.fromNetworkError(error, { userId, operation: 'upsertUserSettings' })
    );
  }
}
