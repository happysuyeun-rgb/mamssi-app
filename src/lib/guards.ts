/**
 * Guard Utilities
 * 권한/게스트/온보딩 체크를 단일 유틸로 통합
 */

import { AppError } from './errors';
import { logger } from './logger';
import type { UserRow } from '@types/database';

export type GuardContext = {
  userId: string | null;
  session: { user: { id: string } } | null;
  userProfile: { onboarding_completed: boolean; is_deleted: boolean } | null;
  isGuest: boolean;
};

export type GuardResult = {
  allowed: boolean;
  error?: AppError;
  redirectTo?: string;
};

/**
 * 인증 필수 가드
 * 로그인한 사용자만 허용
 */
export function requireAuth(context: GuardContext): GuardResult {
  const { userId, session, isGuest } = context;

  if (isGuest) {
    logger.warn('게스트 모드 - 인증 필요', { userId });
    return {
      allowed: false,
      error: new AppError({
        code: 'AUTH_REQUIRED',
        message: '로그인이 필요해요.',
        userId: userId || undefined
      }),
      redirectTo: '/onboarding'
    };
  }

  if (!session || !userId) {
    logger.warn('세션 없음 - 인증 필요', { userId });
    return {
      allowed: false,
      error: new AppError({
        code: 'AUTH_REQUIRED',
        message: '로그인이 필요해요.',
        userId: userId || undefined
      }),
      redirectTo: '/onboarding'
    };
  }

  if (session.user.id !== userId) {
    logger.error('사용자 ID 불일치', {
      userId,
      sessionUserId: session.user.id
    });
    return {
      allowed: false,
      error: new AppError({
        code: 'AUTH_INVALID',
        message: '인증 정보가 일치하지 않아요.',
        userId: userId || undefined
      }),
      redirectTo: '/onboarding'
    };
  }

  return { allowed: true };
}

/**
 * 온보딩 완료 필수 가드
 * 온보딩을 완료한 사용자만 허용
 */
export function requireOnboardingComplete(context: GuardContext): GuardResult {
  const authResult = requireAuth(context);
  if (!authResult.allowed) {
    return authResult;
  }

  const { userProfile } = context;

  if (!userProfile) {
    logger.warn('userProfile 없음 - 온보딩 필요', {
      userId: context.userId || undefined
    });
    return {
      allowed: false,
      error: new AppError({
        code: 'ONBOARDING_REQUIRED',
        message: '온보딩을 완료해주세요.',
        userId: context.userId || undefined
      }),
      redirectTo: '/onboarding'
    };
  }

  if (userProfile.is_deleted) {
    logger.warn('삭제된 계정', {
      userId: context.userId || undefined
    });
    return {
      allowed: false,
      error: new AppError({
        code: 'AUTH_INVALID',
        message: '삭제된 계정이에요.',
        userId: context.userId || undefined
      }),
      redirectTo: '/onboarding'
    };
  }

  if (!userProfile.onboarding_completed) {
    logger.warn('온보딩 미완료', {
      userId: context.userId || undefined
    });
    return {
      allowed: false,
      error: new AppError({
        code: 'ONBOARDING_REQUIRED',
        message: '온보딩을 완료해주세요.',
        userId: context.userId || undefined
      }),
      redirectTo: '/onboarding'
    };
  }

  return { allowed: true };
}

/**
 * 게스트 전용 가드
 * 게스트만 허용 (로그인한 사용자는 차단)
 */
export function requireGuest(context: GuardContext): GuardResult {
  const { isGuest, session, userId } = context;

  if (!isGuest || session || userId) {
    logger.warn('게스트 전용 페이지 - 로그인 사용자 접근 시도', {
      userId: userId || undefined,
      isGuest,
      hasSession: !!session
    });
    return {
      allowed: false,
      error: new AppError({
        code: 'PERMISSION_DENIED',
        message: '게스트 전용 페이지예요.',
        userId: userId || undefined
      }),
      redirectTo: '/home'
    };
  }

  return { allowed: true };
}

/**
 * 온보딩 미완료 필수 가드
 * 온보딩을 완료하지 않은 사용자만 허용
 */
export function requireOnboardingIncomplete(context: GuardContext): GuardResult {
  const authResult = requireAuth(context);
  if (!authResult.allowed) {
    // 인증이 안 되어 있으면 온보딩 화면으로 리다이렉트
    return {
      allowed: true, // 온보딩 화면은 접근 허용
      redirectTo: '/onboarding'
    };
  }

  const { userProfile } = context;

  // userProfile이 없으면 신규 사용자로 간주 (온보딩 필요)
  if (!userProfile) {
    return { allowed: true };
  }

  // 이미 온보딩을 완료한 경우 홈으로 리다이렉트
  if (userProfile.onboarding_completed) {
    logger.warn('온보딩 완료 사용자 - 온보딩 화면 접근 시도', {
      userId: context.userId || undefined
    });
    return {
      allowed: false,
      error: new AppError({
        code: 'ONBOARDING_REQUIRED',
        message: '이미 온보딩을 완료했어요.',
        userId: context.userId || undefined
      }),
      redirectTo: '/home'
    };
  }

  return { allowed: true };
}

/**
 * 쓰기 액션 가드
 * 로그인한 사용자만 쓰기 액션 허용
 * 게스트는 로그인 유도
 */
export function requireWriteAction(context: GuardContext): GuardResult {
  return requireAuth(context);
}

/**
 * 복합 가드
 * 여러 조건을 동시에 체크
 */
export function requireAll(
  context: GuardContext,
  ...guards: Array<(ctx: GuardContext) => GuardResult>
): GuardResult {
  for (const guard of guards) {
    const result = guard(context);
    if (!result.allowed) {
      return result;
    }
  }
  return { allowed: true };
}

/**
 * 복합 가드 (OR 조건)
 * 하나라도 통과하면 허용
 */
export function requireAny(
  context: GuardContext,
  ...guards: Array<(ctx: GuardContext) => GuardResult>
): GuardResult {
  for (const guard of guards) {
    const result = guard(context);
    if (result.allowed) {
      return result;
    }
  }
  // 모두 실패한 경우 첫 번째 가드의 에러 반환
  const firstResult = guards[0](context);
  return {
    allowed: false,
    error: firstResult.error || new AppError({
      code: 'PERMISSION_DENIED',
      message: '권한이 없어요.'
    })
  };
}
