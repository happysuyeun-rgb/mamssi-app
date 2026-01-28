import { supabase } from '@lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

const BUCKET_NAME = 'emotion-images';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export type UploadResult = {
  url: string | null;
  error: Error | null;
};

/**
 * 이미지를 Supabase Storage에 업로드
 * @param file 업로드할 이미지 파일
 * @param userId 사용자 ID
 * @returns 업로드된 이미지의 public URL 또는 에러
 */
export async function uploadEmotionImage(file: File, userId: string): Promise<UploadResult> {
  // 파일 크기 검증
  if (file.size > MAX_FILE_SIZE) {
    return {
      url: null,
      error: new Error('10MB 이하의 이미지만 업로드할 수 있어요.')
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
    // 파일명 생성: {user_id}/{uuid}.{extension}
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${userId}/${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Storage에 업로드
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('[uploadEmotionImage] 파일 업로드 실패:', {
        error: uploadError,
        code: uploadError.statusCode,
        message: uploadError.message,
        errorCode: uploadError.error
      });
      
      // 버킷 관련 에러인 경우 더 명확한 메시지 제공
      let errorMessage = uploadError.message || '이미지 업로드에 실패했어요.';
      if (uploadError.message?.includes('bucket') || uploadError.message?.includes('버킷') || uploadError.statusCode === 404) {
        errorMessage = `Storage 버킷 '${BUCKET_NAME}'이 존재하지 않거나 접근할 수 없어요. Supabase Dashboard에서 버킷을 생성해주세요. (create_emotion_images_bucket.sql 실행)`;
        console.error('[uploadEmotionImage] 버킷 관련 에러 감지:', {
          error: uploadError.message,
          statusCode: uploadError.statusCode,
          hint: 'Supabase Dashboard > Storage에서 emotion-images 버킷 확인 필요'
        });
      } else if (uploadError.statusCode === 403 || uploadError.message?.includes('permission') || uploadError.message?.includes('권한')) {
        errorMessage = '이미지 업로드 권한이 없어요. 로그인 상태를 확인해주세요.';
        console.error('[uploadEmotionImage] 권한 관련 에러 감지:', {
          error: uploadError.message,
          statusCode: uploadError.statusCode
        });
      }
      
      const error = new Error(errorMessage);
      throw error;
    }

    console.log('[uploadEmotionImage] 파일 업로드 성공:', { uploadData });

    // Public URL 가져오기
    const {
      data: { publicUrl }
    } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

    console.log('[uploadEmotionImage] Public URL 생성 완료:', { publicUrl, filePath });

    return {
      url: publicUrl,
      error: null
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error('이미지 업로드에 실패했어요.');
    console.error('[uploadEmotionImage] 업로드 중 예외 발생:', {
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
 * 이미지 삭제
 * @param imageUrl 삭제할 이미지의 URL
 */
export async function deleteEmotionImage(imageUrl: string): Promise<void> {
  try {
    // URL에서 파일 경로 추출
    const urlParts = imageUrl.split('/');
    const fileNameIndex = urlParts.findIndex((part) => part === BUCKET_NAME);
    if (fileNameIndex === -1) {
      console.warn('이미지 URL에서 파일 경로를 찾을 수 없어요:', imageUrl);
      return;
    }

    const filePath = urlParts.slice(fileNameIndex + 1).join('/');

    const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);

    if (error) {
      console.error('이미지 삭제 실패:', error);
    }
  } catch (err) {
    console.error('이미지 삭제 중 오류:', err);
  }
}













