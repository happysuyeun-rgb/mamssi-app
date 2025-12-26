import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

export type EmotionRecord = {
  id: string;
  user_id: string;
  emotion_type: string;
  intensity?: number;
  content: string;
  image_url?: string | null;
  is_public: boolean;
  category_id?: string | null;
  created_at: string;
  updated_at: string;
};

type UseEmotionsOptions = {
  userId?: string | null;
  publicOnly?: boolean;
  limit?: number;
};

export function useEmotions(options: UseEmotionsOptions = {}) {
  const { userId, publicOnly = false, limit } = options;
  const [emotions, setEmotions] = useState<EmotionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchEmotions = useCallback(async () => {
    if (!userId && !publicOnly) {
      setEmotions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let query = supabase.from('emotions').select('*');

      if (publicOnly) {
        // 공개 기록만 조회
        query = query.eq('is_public', true);
      } else if (userId) {
        // RLS 정책에 의해 본인 기록만 조회됨
        query = query.eq('user_id', userId);
      }

      // 최신순 정렬
      query = query.order('created_at', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setEmotions(data || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('감정 기록을 불러오는데 실패했어요.');
      setError(error);
      console.error('감정 기록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, publicOnly, limit]);

  useEffect(() => {
    fetchEmotions();
  }, [fetchEmotions]);

  const addEmotion = useCallback(
    async (payload: {
      emotion_type: string;
      intensity?: number;
      content: string;
      image_url?: string | null;
      is_public: boolean;
      category_id?: string | null;
    }) => {
      if (!userId) {
        throw new Error('로그인이 필요해요.');
      }

      setError(null);

      try {
        // auth.uid() 확인 (RLS 정책이 자동으로 체크하므로 경고만)
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          console.error('[addEmotion] auth.uid() 없음:', {
            userId,
            message: '인증된 사용자가 없습니다.'
          });
          throw new Error('로그인이 필요해요. 다시 로그인해주세요.');
        }
        
        if (authUser.id !== userId) {
          console.warn('[addEmotion] auth.uid() 불일치 (경고만, RLS가 체크함):', {
            userId,
            authUid: authUser.id,
            message: 'user_id와 auth.uid()가 일치하지 않지만 RLS 정책이 체크합니다.'
          });
          // RLS 정책이 자동으로 체크하므로 여기서는 경고만 하고 계속 진행
        }

        // payload에서 undefined 값 제거 및 검증
        const cleanPayload: Record<string, unknown> = {
          emotion_type: payload.emotion_type,
          content: payload.content,
          is_public: payload.is_public
        };

        if (payload.intensity !== undefined && payload.intensity !== null) {
          cleanPayload.intensity = payload.intensity;
        }
        if (payload.image_url !== undefined && payload.image_url !== null) {
          cleanPayload.image_url = payload.image_url;
        }
        if (payload.category_id !== undefined && payload.category_id !== null) {
          cleanPayload.category_id = payload.category_id;
        }

        // insert payload 준비
        const insertPayload = {
          user_id: userId,
          ...cleanPayload
        };

        console.log('[addEmotion] insert 시도:', {
          userId,
          authUid: authUser.id,
          payload: insertPayload,
          payloadKeys: Object.keys(insertPayload)
        });

        // RLS 정책에 의해 auth.uid() = user_id 조건이 자동 적용됨
        const { data, error: insertError } = await supabase
          .from('emotions')
          .insert(insertPayload)
          .select()
          .single();

        if (insertError) {
          console.error('[addEmotion] insert 실패:', {
            error: insertError,
            code: insertError.code,
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
            userId,
            payload: insertPayload
          });
          const error = new Error(insertError.message || '감정 기록 저장에 실패했어요.');
          setError(error);
          throw error;
        }

        if (!data) {
          console.error('[addEmotion] data가 null입니다:', {
            userId,
            payload: insertPayload
          });
          throw new Error('감정 기록이 저장되었지만 데이터를 받아오지 못했어요.');
        }

        console.log('[addEmotion] insert 성공:', {
          dataId: data.id,
          userId: data.user_id,
          emotionType: data.emotion_type
        });

        // 상태 업데이트: 최신 기록을 맨 앞에 추가
        setEmotions((prev) => [data, ...prev]);

        return { data, error: null };
      } catch (err) {
        console.error('[addEmotion] 예외 발생:', {
          error: err,
          errorMessage: err instanceof Error ? err.message : String(err),
          errorStack: err instanceof Error ? err.stack : undefined,
          userId,
          payload
        });
        
        // 에러 타입별 처리
        let errorMessage = '감정 기록 저장에 실패했어요.';
        if (err instanceof Error) {
          errorMessage = err.message;
          
          // RLS 정책 에러 체크
          if (err.message.includes('permission denied') || err.message.includes('RLS') || err.message.includes('42501')) {
            errorMessage = '기록 저장 권한이 없어요. 로그인 상태를 확인해주세요.';
            console.error('[addEmotion] RLS 정책 에러 감지');
          }
          
          // 네트워크 에러 체크
          if (err.message.includes('fetch') || err.message.includes('network') || err.message.includes('Failed to fetch')) {
            errorMessage = '네트워크 연결을 확인해주세요.';
            console.error('[addEmotion] 네트워크 에러 감지');
          }
        }
        
        const error = err instanceof Error ? new Error(errorMessage) : new Error(errorMessage);
        setError(error);
        
        // 에러를 throw하지 않고 반환 (Record.tsx에서 처리)
        return { data: null, error };
      }
    },
    [userId]
  );

  const updateEmotion = useCallback(
    async (id: string, payload: Partial<Omit<EmotionRecord, 'id' | 'user_id' | 'created_at'>>) => {
      if (!userId) {
        throw new Error('로그인이 필요해요.');
      }

      setError(null);

      try {
        // RLS 정책에 의해 auth.uid() = user_id 조건이 자동 적용됨
        const { data, error: updateError } = await supabase
          .from('emotions')
          .update({
            ...payload,
            // updated_at은 트리거가 자동으로 갱신하므로 명시적으로 설정하지 않아도 됨
          })
          .eq('id', id)
          .eq('user_id', userId) // RLS와 함께 이중 체크
          .select()
          .single();

        if (updateError) {
          const error = new Error(updateError.message || '감정 기록 수정에 실패했어요.');
          setError(error);
          throw error;
        }

        if (data) {
          // 상태 업데이트: 수정된 기록을 반영
          setEmotions((prev) => prev.map((emotion) => (emotion.id === id ? data : emotion)));
        }

        return { data, error: null };
      } catch (err) {
        const error = err instanceof Error ? err : new Error('감정 기록 수정에 실패했어요.');
        setError(error);
        throw error;
      }
    },
    [userId]
  );

  const deleteEmotion = useCallback(
    async (id: string) => {
      if (!userId) {
        throw new Error('로그인이 필요해요.');
      }

      setError(null);

      try {
        // RLS 정책에 의해 auth.uid() = user_id 조건이 자동 적용됨
        const { error: deleteError } = await supabase
          .from('emotions')
          .delete()
          .eq('id', id)
          .eq('user_id', userId); // RLS와 함께 이중 체크

        if (deleteError) {
          const error = new Error(deleteError.message || '감정 기록 삭제에 실패했어요.');
          setError(error);
          throw error;
        }

        setEmotions((prev) => prev.filter((emotion) => emotion.id !== id));

        return { error: null };
      } catch (err) {
        const error = err instanceof Error ? err : new Error('감정 기록 삭제에 실패했어요.');
        setError(error);
        throw error;
      }
    },
    [userId]
  );

  const getEmotionByDate = useCallback(
    (date: string): EmotionRecord | null => {
      const targetDate = new Date(`${date}T00:00:00`).toISOString().split('T')[0];
      return (
        emotions.find((emotion) => {
          const emotionDate = new Date(emotion.created_at).toISOString().split('T')[0];
          return emotionDate === targetDate;
        }) || null
      );
    },
    [emotions]
  );

  // 오늘 감정 존재 여부 체크 (서버 쿼리)
  const checkTodayEmotion = useCallback(
    async (targetDate?: string): Promise<EmotionRecord | null> => {
      if (!userId) {
        return null;
      }

      try {
        const date = targetDate || new Date().toISOString().split('T')[0];
        const startOfDay = new Date(`${date}T00:00:00Z`).toISOString();
        const endOfDay = new Date(`${date}T23:59:59Z`).toISOString();

        const { data, error } = await supabase
          .from('emotions')
          .select('*')
          .eq('user_id', userId)
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('오늘 감정 체크 실패:', error);
          return null;
        }

        return data;
      } catch (err) {
        console.error('오늘 감정 체크 중 오류:', err);
        return null;
      }
    },
    [userId]
  );

  // 오늘 비공개 감정 존재 여부 체크
  const checkTodayPrivateEmotion = useCallback(
    async (targetDate?: string): Promise<boolean> => {
      if (!userId) {
        return false;
      }

      try {
        const date = targetDate || new Date().toISOString().split('T')[0];
        const startOfDay = new Date(`${date}T00:00:00Z`).toISOString();
        const endOfDay = new Date(`${date}T23:59:59Z`).toISOString();

        const { data, error } = await supabase
          .from('emotions')
          .select('id')
          .eq('user_id', userId)
          .eq('is_public', false)
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay)
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('오늘 비공개 감정 체크 실패:', error);
          return false;
        }

        return data !== null;
      } catch (err) {
        console.error('오늘 비공개 감정 체크 중 오류:', err);
        return false;
      }
    },
    [userId]
  );

  // 오늘 감정 기록 존재 여부 체크 (boolean 반환)
  const hasTodayEmotion = useCallback(
    async (targetDate?: string): Promise<boolean> => {
      if (!userId) {
        return false;
      }

      try {
        const date = targetDate || new Date().toISOString().split('T')[0];
        const startOfDay = new Date(`${date}T00:00:00Z`).toISOString();
        const endOfDay = new Date(`${date}T23:59:59Z`).toISOString();

        const { data, error } = await supabase
          .from('emotions')
          .select('id')
          .eq('user_id', userId) // 명시적으로 user_id 필터링 (RLS 정책과 함께 이중 체크)
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay)
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('오늘 감정 기록 체크 실패:', error);
          return false;
        }

        return data !== null;
      } catch (err) {
        console.error('오늘 감정 기록 체크 중 오류:', err);
        return false;
      }
    },
    [userId]
  );

  return {
    emotions,
    loading,
    error,
    fetchEmotions,
    addEmotion,
    updateEmotion,
    deleteEmotion,
    getEmotionByDate,
    checkTodayEmotion,
    checkTodayPrivateEmotion,
    hasTodayEmotion
  };
}







