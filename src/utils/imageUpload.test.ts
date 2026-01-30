import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadEmotionImage, deleteEmotionImage } from './imageUpload';
import { supabase } from '@lib/supabaseClient';

// Supabase mock
vi.mock('@lib/supabaseClient', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(() => ({
          data: { publicUrl: 'https://example.com/image.jpg' },
        })),
        remove: vi.fn(),
      })),
    },
  },
}));

describe('imageUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadEmotionImage', () => {
    it('파일 크기가 10MB를 초과하면 에러를 반환해야 함', async () => {
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      });
      const userId = 'test-user-id';

      const result = await uploadEmotionImage(largeFile, userId);

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('10MB 이하');
      expect(result.url).toBeNull();
    });

    it('이미지 파일이 아니면 에러를 반환해야 함', async () => {
      const textFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const userId = 'test-user-id';

      const result = await uploadEmotionImage(textFile, userId);

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('이미지 파일만');
      expect(result.url).toBeNull();
    });

    it('유효한 이미지 파일은 업로드를 시도해야 함', async () => {
      const imageFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const userId = 'test-user-id';

      const mockUpload = vi.fn().mockResolvedValue({
        data: { path: 'test-user-id/uuid.jpg' },
        error: null,
      });

      (supabase.storage.from as any).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: vi.fn(() => ({
          data: { publicUrl: 'https://example.com/image.jpg' },
        })),
      });

      const result = await uploadEmotionImage(imageFile, userId);

      expect(mockUpload).toHaveBeenCalled();
      expect(result.error).toBeNull();
      expect(result.url).toBe('https://example.com/image.jpg');
    });

    it('업로드 실패 시 에러를 반환해야 함', async () => {
      const imageFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const userId = 'test-user-id';

      const mockUpload = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Upload failed', statusCode: 500 },
      });

      (supabase.storage.from as any).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: vi.fn(),
      });

      const result = await uploadEmotionImage(imageFile, userId);

      expect(result.error).toBeTruthy();
      expect(result.url).toBeNull();
    });

    it('버킷이 없을 때 명확한 에러 메시지를 반환해야 함', async () => {
      const imageFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const userId = 'test-user-id';

      const mockUpload = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'bucket not found', statusCode: 404 },
      });

      (supabase.storage.from as any).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: vi.fn(),
      });

      const result = await uploadEmotionImage(imageFile, userId);

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('emotion-images');
      expect(result.error?.message).toContain('버킷');
    });

    it('권한 에러 시 명확한 에러 메시지를 반환해야 함', async () => {
      const imageFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const userId = 'test-user-id';

      const mockUpload = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'permission denied', statusCode: 403 },
      });

      (supabase.storage.from as any).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: vi.fn(),
      });

      const result = await uploadEmotionImage(imageFile, userId);

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('권한');
    });
  });

  describe('deleteEmotionImage', () => {
    it('유효한 URL에서 파일 경로를 추출하여 삭제해야 함', async () => {
      const imageUrl =
        'https://example.com/storage/v1/object/public/emotion-images/user-id/file.jpg';
      const mockRemove = vi.fn().mockResolvedValue({ error: null });

      (supabase.storage.from as any).mockReturnValue({
        remove: mockRemove,
      });

      await deleteEmotionImage(imageUrl);

      expect(mockRemove).toHaveBeenCalledWith(['user-id/file.jpg']);
    });

    it('버킷 이름이 URL에 없으면 경고만 출력하고 종료해야 함', async () => {
      const imageUrl = 'https://example.com/invalid-url';
      const mockRemove = vi.fn();

      (supabase.storage.from as any).mockReturnValue({
        remove: mockRemove,
      });

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await deleteEmotionImage(imageUrl);

      expect(mockRemove).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '이미지 URL에서 파일 경로를 찾을 수 없어요:',
        imageUrl
      );

      consoleWarnSpy.mockRestore();
    });

    it('삭제 실패 시 에러를 로깅해야 함', async () => {
      const imageUrl =
        'https://example.com/storage/v1/object/public/emotion-images/user-id/file.jpg';
      const mockRemove = vi.fn().mockResolvedValue({
        error: { message: 'Delete failed' },
      });

      (supabase.storage.from as any).mockReturnValue({
        remove: mockRemove,
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await deleteEmotionImage(imageUrl);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '이미지 삭제 실패:',
        expect.objectContaining({ message: 'Delete failed' })
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
