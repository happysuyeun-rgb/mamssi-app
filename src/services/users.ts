/**
 * Users Service
 * users 테이블에 대한 모든 CRUD 작업을 담당
 * Supabase 직접 호출을 이 레이어로 완전 분리
 */

import { supabase } from '@lib/supabaseClient';
import { AppError, type ServiceResult, success, failure } from '@lib/errors';
import { logger } from '@lib/logger';
import type { UserRow } from '@domain/database';

/**
 * 사용자 프로필 조회
 */
export async function fetchUserProfile(userId: string): Promise<ServiceResult<UserRow | null>> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, onboarding_completed, delete_reason, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      logger.error('사용자 프로필 조회 실패', {
        userId,
        operation: 'fetchUserProfile',
        error: AppError.fromSupabaseError(error, { userId, operation: 'fetchUserProfile' }),
      });
      return failure(AppError.fromSupabaseError(error, { userId, operation: 'fetchUserProfile' }));
    }

    return success((data || null) as UserRow | null);
  } catch (error) {
    logger.error('사용자 프로필 조회 중 예외 발생', {
      userId,
      operation: 'fetchUserProfile',
      error,
    });
    return failure(AppError.fromNetworkError(error, { userId, operation: 'fetchUserProfile' }));
  }
}

/**
 * 사용자 생성 (신규 가입 시)
 */
export async function createUser(
  userId: string,
  email?: string | null
): Promise<ServiceResult<UserRow>> {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: email || null,
        onboarding_completed: false,
        is_deleted: false,
      })
      .select()
      .single();

    if (error) {
      // 중복 생성 시도 (이미 존재하는 경우)
      if (error.code === '23505') {
        logger.warn('사용자 이미 존재, 기존 사용자 조회', {
          userId,
          operation: 'createUser',
        });
        const existingResult = await fetchUserProfile(userId);
        if (existingResult.error) {
          return failure(existingResult.error);
        }
        if (existingResult.data) {
          return success(existingResult.data);
        }
      }

      logger.error('사용자 생성 실패', {
        userId,
        operation: 'createUser',
        error: AppError.fromSupabaseError(error, { userId, operation: 'createUser' }),
      });
      return failure(AppError.fromSupabaseError(error, { userId, operation: 'createUser' }));
    }

    logger.log('사용자 생성 성공', {
      userId,
      operation: 'createUser',
    });

    return success(data as UserRow);
  } catch (error) {
    logger.error('사용자 생성 중 예외 발생', {
      userId,
      operation: 'createUser',
      error,
    });
    return failure(AppError.fromNetworkError(error, { userId, operation: 'createUser' }));
  }
}

/**
 * 온보딩 완료 처리
 */
export async function completeOnboarding(userId: string): Promise<ServiceResult<UserRow>> {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      logger.error('온보딩 완료 처리 실패', {
        userId,
        operation: 'completeOnboarding',
        error: AppError.fromSupabaseError(error, { userId, operation: 'completeOnboarding' }),
      });
      return failure(
        AppError.fromSupabaseError(error, { userId, operation: 'completeOnboarding' })
      );
    }

    logger.log('온보딩 완료 처리 성공', {
      userId,
      operation: 'completeOnboarding',
    });

    return success(data as UserRow);
  } catch (error) {
    logger.error('온보딩 완료 처리 중 예외 발생', {
      userId,
      operation: 'completeOnboarding',
      error,
    });
    return failure(AppError.fromNetworkError(error, { userId, operation: 'completeOnboarding' }));
  }
}

/**
 * 계정 삭제 처리
 */
export async function deleteUser(userId: string, reason?: string): Promise<ServiceResult<void>> {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        is_deleted: true,
        delete_reason: reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      logger.error('계정 삭제 처리 실패', {
        userId,
        operation: 'deleteUser',
        error: AppError.fromSupabaseError(error, { userId, operation: 'deleteUser' }),
      });
      return failure(AppError.fromSupabaseError(error, { userId, operation: 'deleteUser' }));
    }

    logger.log('계정 삭제 처리 성공', {
      userId,
      operation: 'deleteUser',
    });

    return success(undefined);
  } catch (error) {
    logger.error('계정 삭제 처리 중 예외 발생', {
      userId,
      operation: 'deleteUser',
      error,
    });
    return failure(AppError.fromNetworkError(error, { userId, operation: 'deleteUser' }));
  }
}
