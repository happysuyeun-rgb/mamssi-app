import { supabase } from '@lib/supabaseClient';

const BUCKET_NAME = 'profile-images';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export type ProfileImageUploadResult = {
  url: string | null;
  error: Error | null;
};

/**
 * 프로필 이미지를 Supabase Storage에 업로드
 * @param file 업로드할 이미지 파일
 * @param userId 사용자 ID
 * @returns 업로드된 이미지의 public URL 또는 에러
 */
export async function uploadProfileImage(file: File, userId: string): Promise<ProfileImageUploadResult> {
  // 파일 크기 검증
  if (file.size > MAX_FILE_SIZE) {
    return {
      url: null,
      error: new Error('5MB 이하의 이미지만 업로드할 수 있어요.')
    };
  }

  // 파일 타입 검증
  if (!file.type.startsWith('image/')) {
    return {
      url: null,
      error: new Error('이미지 파일만 업로드할 수 있어요.')
    };
  }

  try {
    console.log('[uploadProfileImage] 업로드 시작:', { userId, fileName: file.name, fileSize: file.size, fileType: file.type });
    
    // 파일명 생성: 원본 파일명 사용 (확장자 포함)
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const timestamp = Date.now();
    const fileName = `profile.${timestamp}.${fileExt}`;
    
    // 경로 규칙: profile-images/{userId}/{filename}
    const filePath = `${userId}/${fileName}`;

    console.log('[uploadProfileImage] 파일 경로:', { filePath, bucket: BUCKET_NAME, userId, fileName });

    // 버킷 존재 여부 확인 (선택적)
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      console.warn('[uploadProfileImage] 버킷 목록 조회 실패 (무시):', listError);
    } else {
      const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);
      if (!bucketExists) {
        const error = new Error(`Storage 버킷 '${BUCKET_NAME}'이 존재하지 않아요. 관리자에게 문의해주세요.`);
        console.error('[uploadProfileImage] 버킷 없음:', error);
        return { url: null, error };
      }
      console.log('[uploadProfileImage] 버킷 확인 완료:', { bucketName: BUCKET_NAME });
    }

    // 기존 이미지가 있으면 삭제 (해당 사용자 폴더의 모든 파일)
    console.log('[uploadProfileImage] 기존 이미지 삭제 시작...');
    const { data: existingFiles, error: listFilesError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(userId, {
        limit: 100
      });

    if (listFilesError && listFilesError.message !== 'Object not found') {
      console.warn('[uploadProfileImage] 기존 파일 목록 조회 실패 (무시):', listFilesError);
    } else if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map(file => `${userId}/${file.name}`);
      const { error: deleteError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(filesToDelete);
      
      if (deleteError) {
        console.warn('[uploadProfileImage] 기존 이미지 삭제 실패 (무시):', deleteError);
      } else {
        console.log('[uploadProfileImage] 기존 이미지 삭제 완료:', { deletedCount: existingFiles.length });
      }
    } else {
      console.log('[uploadProfileImage] 기존 이미지 없음');
    }

    // Storage에 업로드
    console.log('[uploadProfileImage] 파일 업로드 시작...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('[uploadProfileImage] 파일 업로드 실패:', {
        error: uploadError,
        code: uploadError.statusCode,
        message: uploadError.message,
        errorCode: uploadError.error
      });
      throw uploadError;
    }

    console.log('[uploadProfileImage] 파일 업로드 성공:', { uploadData });

    // Public URL 가져오기 (프로필 이미지는 Public URL 사용)
    const {
      data: { publicUrl }
    } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

    console.log('[uploadProfileImage] Public URL 생성 완료:', { publicUrl, filePath });

    return {
      url: publicUrl,
      error: null
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error('프로필 이미지 업로드에 실패했어요.');
    console.error('[uploadProfileImage] 업로드 중 예외 발생:', {
      userId,
      error: err,
      errorMessage: error.message,
      errorStack: error.stack
    });
    return {
      url: null,
      error
    };
  }
}

/**
 * 프로필 이미지 삭제
 * @param userId 사용자 ID
 */
export async function deleteProfileImage(userId: string): Promise<void> {
  try {
    console.log('[deleteProfileImage] 삭제 시작:', { userId });
    
    // 경로 규칙: profile-images/{userId}/* 형식으로 해당 사용자의 모든 파일 삭제
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(userId, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (listError) {
      console.error('[deleteProfileImage] 파일 목록 조회 실패:', listError);
      return;
    }

    if (!files || files.length === 0) {
      console.log('[deleteProfileImage] 삭제할 파일 없음:', { userId });
      return;
    }

    // 해당 사용자 폴더의 모든 파일 삭제
    const filesToDelete = files.map(file => `${userId}/${file.name}`);
    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(filesToDelete);

    if (deleteError) {
      console.error('[deleteProfileImage] 파일 삭제 실패:', deleteError);
    } else {
      console.log('[deleteProfileImage] 파일 삭제 완료:', { userId, deletedCount: files.length });
    }
  } catch (err) {
    console.error('[deleteProfileImage] 삭제 중 예외 발생:', err);
  }
}













