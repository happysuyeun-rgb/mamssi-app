/**
 * Storage Service
 * Supabase Storage에 대한 모든 작업을 담당
 * 경로 규칙: {bucket}/{userId}/{filename}
 * Public URL 사용
 */

import { supabase } from '@lib/supabaseClient';
import { AppError, type ServiceResult, success, failure } from '@lib/errors';
import { logger } from '@lib/logger';

export type StorageUploadOptions = {
  bucket: string;
  userId: string;
  file: File;
  maxSize?: number; // bytes
  allowedTypes?: string[]; // MIME types
};

export type StorageDeleteOptions = {
  bucket: string;
  filePath: string; // {userId}/{filename}
};

/**
 * 파일 업로드
 * 경로 규칙: {bucket}/{userId}/{filename}
 */
export async function uploadFile(options: StorageUploadOptions): Promise<ServiceResult<string>> {
  const { bucket, userId, file, maxSize, allowedTypes } = options;

  // 파일 크기 검증
  if (maxSize && file.size > maxSize) {
    return failure(
      new AppError({
        code: 'VALIDATION_ERROR',
        message: `${Math.round(maxSize / 1024 / 1024)}MB 이하의 파일만 업로드할 수 있어요.`,
        userId,
      })
    );
  }

  // 파일 타입 검증
  if (allowedTypes && !allowedTypes.some((type) => file.type.startsWith(type))) {
    return failure(
      new AppError({
        code: 'VALIDATION_ERROR',
        message: '지원하지 않는 파일 형식이에요.',
        userId,
      })
    );
  }

  try {
    // 파일명 생성: {userId}/{timestamp}-{uuid}.{extension}
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const timestamp = Date.now();
    const uuid = crypto.randomUUID();
    const fileName = `${timestamp}-${uuid}.${fileExt}`;

    // 경로 규칙: {bucket}/{userId}/{filename}
    const filePath = `${userId}/${fileName}`;

    logger.log('파일 업로드 시작', {
      userId,
      operation: 'uploadFile',
      bucket,
      filePath,
      fileSize: file.size,
      fileType: file.type,
    });

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      logger.error('파일 업로드 실패', {
        userId,
        operation: 'uploadFile',
        bucket,
        filePath,
        error: AppError.fromStorageError(uploadError, { userId, bucket, filePath }),
      });
      return failure(AppError.fromStorageError(uploadError, { userId, bucket, filePath }));
    }

    // Public URL 가져오기
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(filePath);

    logger.log('파일 업로드 성공', {
      userId,
      operation: 'uploadFile',
      bucket,
      filePath,
      publicUrl,
    });

    return success(publicUrl);
  } catch (error) {
    logger.error('파일 업로드 중 예외 발생', {
      userId,
      operation: 'uploadFile',
      bucket,
      error,
    });
    return failure(AppError.fromNetworkError(error, { userId, operation: 'uploadFile' }));
  }
}

/**
 * 파일 삭제
 */
export async function deleteFile(options: StorageDeleteOptions): Promise<ServiceResult<void>> {
  const { bucket, filePath } = options;

  try {
    logger.log('파일 삭제 시작', {
      operation: 'deleteFile',
      bucket,
      filePath,
    });

    const { error } = await supabase.storage.from(bucket).remove([filePath]);

    if (error) {
      logger.error('파일 삭제 실패', {
        operation: 'deleteFile',
        bucket,
        filePath,
        error: AppError.fromStorageError(error, { bucket, filePath }),
      });
      return failure(AppError.fromStorageError(error, { bucket, filePath }));
    }

    logger.log('파일 삭제 성공', {
      operation: 'deleteFile',
      bucket,
      filePath,
    });

    return success(undefined);
  } catch (error) {
    logger.error('파일 삭제 중 예외 발생', {
      operation: 'deleteFile',
      bucket,
      filePath,
      error,
    });
    return failure(AppError.fromNetworkError(error, { operation: 'deleteFile' }));
  }
}

/**
 * 사용자 폴더의 모든 파일 삭제
 * 경로 규칙: {bucket}/{userId}/*
 */
export async function deleteUserFiles(
  bucket: string,
  userId: string
): Promise<ServiceResult<void>> {
  try {
    logger.log('사용자 파일 목록 조회 시작', {
      userId,
      operation: 'deleteUserFiles',
      bucket,
    });

    const { data: files, error: listError } = await supabase.storage.from(bucket).list(userId, {
      limit: 100,
      offset: 0,
      sortBy: { column: 'created_at', order: 'desc' },
    });

    if (listError) {
      logger.error('파일 목록 조회 실패', {
        userId,
        operation: 'deleteUserFiles',
        bucket,
        error: AppError.fromStorageError(listError, { userId, bucket }),
      });
      return failure(AppError.fromStorageError(listError, { userId, bucket }));
    }

    if (!files || files.length === 0) {
      logger.log('삭제할 파일 없음', {
        userId,
        operation: 'deleteUserFiles',
        bucket,
      });
      return success(undefined);
    }

    // 파일 경로 생성: {userId}/{filename}
    const filePaths = files.map((file) => `${userId}/${file.name}`);

    logger.log('사용자 파일 삭제 시작', {
      userId,
      operation: 'deleteUserFiles',
      bucket,
      fileCount: filePaths.length,
    });

    const { error: deleteError } = await supabase.storage.from(bucket).remove(filePaths);

    if (deleteError) {
      logger.error('파일 삭제 실패', {
        userId,
        operation: 'deleteUserFiles',
        bucket,
        error: AppError.fromStorageError(deleteError, { userId, bucket }),
      });
      return failure(AppError.fromStorageError(deleteError, { userId, bucket }));
    }

    logger.log('사용자 파일 삭제 성공', {
      userId,
      operation: 'deleteUserFiles',
      bucket,
      deletedCount: filePaths.length,
    });

    return success(undefined);
  } catch (error) {
    logger.error('사용자 파일 삭제 중 예외 발생', {
      userId,
      operation: 'deleteUserFiles',
      bucket,
      error,
    });
    return failure(AppError.fromNetworkError(error, { userId, operation: 'deleteUserFiles' }));
  }
}

/**
 * Public URL 가져오기
 */
export function getPublicUrl(bucket: string, filePath: string): string {
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return publicUrl;
}
