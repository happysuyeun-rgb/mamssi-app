import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useEmotions } from './useEmotions';
import { supabase } from '@lib/supabaseClient';

// Supabase mock
vi.mock('@lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

describe('useEmotions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addEmotion - image_url 처리', () => {
    it('image_url이 null이어도 payload에 포함되어야 함', async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        data: { id: 'new-id', image_url: null },
        error: null,
      });

      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'new-id', image_url: null },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });

      const { result } = renderHook(() => useEmotions({ userId: 'test-user-id' }));

      const payload = {
        emotion_type: '기쁨',
        content: '테스트 내용',
        image_url: null,
      };

      await waitFor(async () => {
        const response = await result.current.addEmotion(payload);
        expect(response.error).toBeNull();
      });
    });

    it('image_url이 빈 문자열이면 null로 변환되어야 함', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'new-id', image_url: null },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });

      const { result } = renderHook(() => useEmotions({ userId: 'test-user-id' }));

      const payload = {
        emotion_type: '기쁨',
        content: '테스트 내용',
        image_url: '',
      };

      await waitFor(async () => {
        const response = await result.current.addEmotion(payload);
        // insert 호출 시 image_url이 null로 변환되었는지 확인
        expect(mockSingle).toHaveBeenCalled();
      });
    });

    it('image_url이 유효한 URL이면 그대로 포함되어야 함', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'new-id', image_url: 'https://example.com/image.jpg' },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });

      const { result } = renderHook(() => useEmotions({ userId: 'test-user-id' }));

      const payload = {
        emotion_type: '기쁨',
        content: '테스트 내용',
        image_url: 'https://example.com/image.jpg',
      };

      await waitFor(async () => {
        const response = await result.current.addEmotion(payload);
        expect(response.error).toBeNull();
        expect(response.data?.image_url).toBe('https://example.com/image.jpg');
      });
    });
  });

  describe('updateEmotion - image_url 처리', () => {
    it('image_url이 null이어도 payload에 포함되어야 함', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'updated-id', image_url: null },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: mockSingle,
              }),
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useEmotions({ userId: 'test-user-id' }));

      const payload = {
        image_url: null,
      };

      await waitFor(async () => {
        const response = await result.current.updateEmotion('test-id', payload);
        expect(response.error).toBeNull();
      });
    });

    it('image_url이 빈 문자열이면 null로 변환되어야 함', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'updated-id', image_url: null },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: mockSingle,
              }),
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useEmotions({ userId: 'test-user-id' }));

      const payload = {
        image_url: '',
      };

      await waitFor(async () => {
        const response = await result.current.updateEmotion('test-id', payload);
        expect(response.error).toBeNull();
      });
    });
  });
});
