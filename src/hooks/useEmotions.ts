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
        query = query.eq('is_public', true);
      } else if (userId) {
        // RLS 정책에 의해 본인 기록만 조회됨
        query = query.eq('user_id', userId);
      }

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

      const { data, error: insertError } = await supabase
        .from('emotions')
        .insert({
          user_id: userId,
          ...payload
        })
        .select()
        .single();

      if (insertError) {
        const error = new Error(insertError.message || '감정 기록 저장에 실패했어요.');
        setError(error);
        throw error;
      }

      if (data) {
        setEmotions((prev) => [data, ...prev]);
      }

      return { data, error: null };
    },
    [userId]
  );

  const updateEmotion = useCallback(
    async (id: string, payload: Partial<Omit<EmotionRecord, 'id' | 'user_id' | 'created_at'>>) => {
      if (!userId) {
        throw new Error('로그인이 필요해요.');
      }

      setError(null);

      const { data, error: updateError } = await supabase
        .from('emotions')
        .update({
          ...payload,
          updated_at: new Date().toISOString()
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
        setEmotions((prev) => prev.map((emotion) => (emotion.id === id ? data : emotion)));
      }

      return { data, error: null };
    },
    [userId]
  );

  const deleteEmotion = useCallback(
    async (id: string) => {
      if (!userId) {
        throw new Error('로그인이 필요해요.');
      }

      setError(null);

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

  return {
    emotions,
    loading,
    error,
    fetchEmotions,
    addEmotion,
    updateEmotion,
    deleteEmotion,
    getEmotionByDate
  };
}

