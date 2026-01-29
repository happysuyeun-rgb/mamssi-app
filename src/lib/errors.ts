/**
 * Application Error Types and Utilities
 * 모든 에러는 AppError를 사용하여 일관된 형태로 처리
 */

export type ErrorCode =
  | 'AUTH_REQUIRED'
  | 'AUTH_INVALID'
  | 'ONBOARDING_REQUIRED'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'NETWORK_ERROR'
  | 'STORAGE_ERROR'
  | 'DATABASE_ERROR'
  | 'UNKNOWN_ERROR';

export interface AppErrorDetails {
  code: ErrorCode;
  message: string;
  details?: string;
  hint?: string;
  cause?: Error | unknown;
  statusCode?: number;
  userId?: string;
  resourceId?: string;
}

/**
 * Application Error Class
 * 모든 에러는 이 클래스를 사용하여 일관된 형태로 처리
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: string;
  public readonly hint?: string;
  public readonly cause?: Error | unknown;
  public readonly statusCode?: number;
  public readonly userId?: string;
  public readonly resourceId?: string;

  constructor(params: AppErrorDetails) {
    super(params.message);
    this.name = 'AppError';
    this.code = params.code;
    this.details = params.details;
    this.hint = params.hint;
    this.cause = params.cause;
    this.statusCode = params.statusCode;
    this.userId = params.userId;
    this.resourceId = params.resourceId;

    // Error stack trace 유지
    if (params.cause instanceof Error) {
      this.stack = params.cause.stack;
    }
  }

  /**
   * Supabase 에러를 AppError로 변환
   */
  static fromSupabaseError(
    error: { code?: string; message?: string; details?: string; hint?: string; statusCode?: number },
    context?: { userId?: string; resourceId?: string; operation?: string }
  ): AppError {
    const code = error.code || 'UNKNOWN_ERROR';
    const statusCode = error.statusCode;

    // Supabase 에러 코드를 AppError 코드로 매핑
    let errorCode: ErrorCode = 'DATABASE_ERROR';
    if (code === 'PGRST301' || statusCode === 401) {
      errorCode = 'AUTH_REQUIRED';
    } else if (code === 'PGRST301' || statusCode === 403) {
      errorCode = 'PERMISSION_DENIED';
    } else if (code === 'PGRST116' || statusCode === 404) {
      errorCode = 'NOT_FOUND';
    } else if (code === '23505') {
      errorCode = 'VALIDATION_ERROR'; // Unique constraint violation
    } else if (code === '23503') {
      errorCode = 'VALIDATION_ERROR'; // Foreign key violation
    } else if (code === '23502') {
      errorCode = 'VALIDATION_ERROR'; // Not null violation
    }

    return new AppError({
      code: errorCode,
      message: error.message || '데이터베이스 작업 중 오류가 발생했어요.',
      details: error.details,
      hint: error.hint,
      statusCode,
      userId: context?.userId,
      resourceId: context?.resourceId
    });
  }

  /**
   * 네트워크 에러를 AppError로 변환
   */
  static fromNetworkError(error: unknown, context?: { userId?: string; operation?: string }): AppError {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return new AppError({
        code: 'NETWORK_ERROR',
        message: '네트워크 연결을 확인해주세요.',
        details: error.message,
        cause: error,
        userId: context?.userId
      });
    }

    return new AppError({
      code: 'NETWORK_ERROR',
      message: '네트워크 오류가 발생했어요.',
      details: error instanceof Error ? error.message : String(error),
      cause: error,
      userId: context?.userId
    });
  }

  /**
   * Storage 에러를 AppError로 변환
   */
  static fromStorageError(
    error: { message?: string; statusCode?: number },
    context?: { userId?: string; bucket?: string; filePath?: string }
  ): AppError {
    let errorCode: ErrorCode = 'STORAGE_ERROR';
    let message = error.message || '파일 업로드에 실패했어요.';

    if (error.statusCode === 404) {
      errorCode = 'STORAGE_ERROR';
      message = `Storage 버킷 '${context?.bucket}'이 존재하지 않거나 접근할 수 없어요. Supabase Dashboard에서 버킷을 생성해주세요.`;
    } else if (error.statusCode === 403) {
      errorCode = 'PERMISSION_DENIED';
      message = '파일 업로드 권한이 없어요. 로그인 상태를 확인해주세요.';
    }

    return new AppError({
      code: errorCode,
      message,
      statusCode: error.statusCode,
      userId: context?.userId,
      resourceId: context?.filePath
    });
  }
}

/**
 * Service Result Type
 * 모든 서비스 함수는 { data, error } 형태로 반환
 */
export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: AppError };

/**
 * Service Result Helper Functions
 */
export function success<T>(data: T): ServiceResult<T> {
  return { data, error: null };
}

export function failure(error: AppError): ServiceResult<never> {
  return { data: null, error };
}

/**
 * Async Service Result Helper
 * Promise를 ServiceResult로 변환
 */
export async function toServiceResult<T>(
  promise: Promise<T>,
  context?: { userId?: string; operation?: string }
): Promise<ServiceResult<T>> {
  try {
    const data = await promise;
    return success(data);
  } catch (error) {
    if (error instanceof AppError) {
      return failure(error);
    }
    if (error instanceof Error) {
      return failure(
        new AppError({
          code: 'UNKNOWN_ERROR',
          message: error.message || '알 수 없는 오류가 발생했어요.',
          cause: error,
          userId: context?.userId
        })
      );
    }
    return failure(
      new AppError({
        code: 'UNKNOWN_ERROR',
        message: '알 수 없는 오류가 발생했어요.',
        cause: error,
        userId: context?.userId
      })
    );
  }
}
