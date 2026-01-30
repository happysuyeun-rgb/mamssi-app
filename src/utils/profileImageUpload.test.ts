import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadProfileImage, deleteProfileImage } from './profileImageUpload';
import { supabase } from '@lib/supabaseClient';

// Supabase mock
vi.mock('@lib/supabaseClient', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(),
        list: vi.fn(),
        remove: vi.fn(),
      })),
      listBuckets: vi.fn(),
    },
  },
}));

describe('profileImageUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadProfileImage', () => {
    it('파일 크기가 5MB를 초과하면 에러를 반환해야 함', async () => {
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      });
      const userId = 'test-user-id';

      const result = await uploadProfileImage(largeFile, userId);

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('5MB 이하');
      expect(result.url).toBeNull();
    });

    it('이미지 파일이 아니면 에러를 반환해야 함', async () => {
      const textFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const userId = 'test-user-id';

      const result = await uploadProfileImage(textFile, userId);

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('이미지 파일만');
      expect(result.url).toBeNull();
    });

    it('유효한 이미지 파일은 업로드를 시도해야 함', async () => {
      const imageFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const userId = 'test-user-id';
      const mockPublicUrl = 'https://example.com/profile.jpg';

      const mockStorage = {
        upload: vi
          .fn()
          .mockResolvedValue({ data: { path: `${userId}/profile.123.jpg` }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: mockPublicUrl } }),
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      };

      vi.mocked(supabase.storage.from).mockReturnValue(mockStorage as any);

      const result = await uploadProfileImage(imageFile, userId);

      expect(mockStorage.upload).toHaveBeenCalled();
      expect(result.url).toBe(mockPublicUrl);
      expect(result.error).toBeNull();
    });

    it('업로드 실패 시 에러를 반환해야 함', async () => {
      const imageFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const userId = 'test-user-id';
      const uploadError = { message: 'Upload failed', statusCode: 500 };

      const mockStorage = {
        upload: vi.fn().mockRejectedValue(uploadError),
        getPublicUrl: vi.fn(),
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
        remove: vi.fn(),
      };

      vi.mocked(supabase.storage.from).mockReturnValue(mockStorage as any);

      const result = await uploadProfileImage(imageFile, userId);

      expect(result.error).toBeTruthy();
      expect(result.url).toBeNull();
    });

    it('버킷이 없을 때 에러를 반환해야 함', async () => {
      const imageFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const userId = 'test-user-id';
      const bucketError = { message: 'bucket not found', statusCode: 404 };

      const mockStorage = {
        upload: vi.fn().mockRejectedValue(bucketError),
        getPublicUrl: vi.fn(),
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
        remove: vi.fn(),
      };

      vi.mocked(supabase.storage.from).mockReturnValue(mockStorage as any);

      const result = await uploadProfileImage(imageFile, userId);

      expect(result.error).toBeTruthy();
      expect(result.url).toBeNull();
      // 에러 메시지는 일반적인 메시지로 변환됨 (코드 로직상)
      expect(result.error?.message).toBeTruthy();
    });
  });

  describe('deleteProfileImage', () => {
    it('기존 이미지가 있으면 삭제를 시도해야 함', async () => {
      const userId = 'test-user-id';
      const existingFiles = [{ name: 'profile.123.jpg' }, { name: 'profile.456.jpg' }];

      const mockStorage = {
        list: vi.fn().mockResolvedValue({ data: existingFiles, error: null }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      };

      vi.mocked(supabase.storage.from).mockReturnValue(mockStorage as any);

      await deleteProfileImage(userId);

      expect(mockStorage.list).toHaveBeenCalledWith(userId, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      });
      expect(mockStorage.remove).toHaveBeenCalled();
    });

    it('기존 이미지가 없으면 삭제를 시도하지 않아야 함', async () => {
      const userId = 'test-user-id';

      const mockStorage = {
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
        remove: vi.fn(),
      };

      vi.mocked(supabase.storage.from).mockReturnValue(mockStorage as any);

      await deleteProfileImage(userId);

      expect(mockStorage.list).toHaveBeenCalled();
      expect(mockStorage.remove).not.toHaveBeenCalled();
    });
  });
});
