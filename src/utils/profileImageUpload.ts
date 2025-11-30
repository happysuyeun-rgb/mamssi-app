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
    // 파일명 생성: {user_id}.jpg (항상 덮어쓰기)
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${userId}.${fileExt}`;
    const filePath = fileName;

    // 기존 이미지가 있으면 삭제
    const { error: deleteError } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);
    if (deleteError && deleteError.message !== 'Object not found') {
      console.warn('기존 이미지 삭제 실패 (무시):', deleteError);
    }

    // Storage에 업로드
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
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
    const error = err instanceof Error ? err : new Error('프로필 이미지 업로드에 실패했어요.');
    console.error('프로필 이미지 업로드 실패:', error);
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
    // 모든 확장자 시도
    const extensions = ['jpg', 'jpeg', 'png', 'webp'];
    const filesToDelete = extensions.map((ext) => `${userId}.${ext}`);

    const { error } = await supabase.storage.from(BUCKET_NAME).remove(filesToDelete);

    if (error && error.message !== 'Object not found') {
      console.error('프로필 이미지 삭제 실패:', error);
    }
  } catch (err) {
    console.error('프로필 이미지 삭제 중 오류:', err);
  }
}



