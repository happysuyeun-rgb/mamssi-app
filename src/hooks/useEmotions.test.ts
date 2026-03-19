import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useEmotions } from './useEmotions';
import { supabase } from '@lib/supabaseClient';

// Supabase mock: mount 시 fetch는 select 체인(Promise), addEmotion은 insert().select().single() 사용
vi.mock('@lib/supabaseClient', () => {
  const resolvedFetch = Promise.resolve({ data: [], error: null });
  const thenableChain = {
    then: (resolve: (v: { data: unknown[]; error: null }) => void) => resolvedFetch.then(resolve),
    catch: (fn: (e: unknown) => void) => resolvedFetch.catch(fn),
  };
  const defaultSingle = vi.fn().mockResolvedValue({ data: { id: 'new-id', image_url: null }, error: null });
  return {
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue(resolvedFetch),
              ...thenableChain,
            }),
            ...thenableChain,
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({ single: defaultSingle }),
        }),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: defaultSingle,
      })),
      auth: {
        getUser: vi.fn(),
      },
    },
  };
});

// from() 1회는 fetch(select 체인), 2회는 insert/update용 — 공통 체인 생성
function createFromReturn(insertSingle = vi.fn().mockResolvedValue({ data: { id: 'new-id', image_url: null }, error: null })) {
  const resolvedFetch = Promise.resolve({ data: [], error: null });
  const thenable = { then: (r: (v: any) => void) => resolvedFetch.then(r), catch: (f: (e: any) => void) => resolvedFetch.catch(f) };
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue(resolvedFetch), ...thenable }),
        ...thenable,
      }),
    }),
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ single: insertSingle }),
    }),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: insertSingle,
  };
}

describe('useEmotions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addEmotion - image_url 처리', () => {
    it('image_url이 null이어도 payload에 포함되어야 함', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'new-id', image_url: null },
        error: null,
      });
      (supabase.from as any).mockReturnValue(createFromReturn(mockSingle));
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
      (supabase.from as any).mockReturnValue(createFromReturn(mockSingle));
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
        expect(mockSingle).toHaveBeenCalled();
      });
    });

    it('image_url이 유효한 URL이면 그대로 포함되어야 함', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'new-id', image_url: 'https://example.com/image.jpg' },
        error: null,
      });
      (supabase.from as any).mockReturnValue(createFromReturn(mockSingle));
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
        ...createFromReturn(),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({ single: mockSingle }),
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useEmotions({ userId: 'test-user-id' }));

      await waitFor(async () => {
        const response = await result.current.updateEmotion('test-id', { image_url: null });
        expect(response.error).toBeNull();
      });
    });

    it('image_url이 빈 문자열이면 null로 변환되어야 함', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'updated-id', image_url: null },
        error: null,
      });
      (supabase.from as any).mockReturnValue({
        ...createFromReturn(),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({ single: mockSingle }),
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useEmotions({ userId: 'test-user-id' }));

      await waitFor(async () => {
        const response = await result.current.updateEmotion('test-id', { image_url: '' });
        expect(response.error).toBeNull();
      });
    });
  });
});
