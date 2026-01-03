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
      throw uploadError;
    }

    // Public URL 가져오기
    const {
      data: { publicUrl }
    } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

    return {
      url: publicUrl,
      error: null
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error('이미지 업로드에 실패했어요.');
    console.error('이미지 업로드 실패:', error);
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













