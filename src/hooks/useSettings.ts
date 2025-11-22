import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@lib/supabaseClient';

export type UserSettings = {
  user_id: string;
  nickname: string | null;
  mbti: string | null;
  profile_url: string | null;
  lock_type: 'pattern' | 'pin' | null;
  lock_value: string | null;
  updated_at: string;
  created_at: string;
};

export function useSettings(userId?: string | null) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!userId) {
      setSettings(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // 레코드가 없으면 null로 설정
          setSettings(null);
        } else {
          console.error('설정 조회 실패:', fetchError);
          setError(fetchError.message);
        }
      } else {
        setSettings(data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '설정을 불러오는데 실패했어요.';
      setError(errorMessage);
      console.error('설정 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const updateSettings = useCallback(
    async (payload: Partial<Omit<UserSettings, 'user_id' | 'created_at' | 'updated_at'>>) => {
      if (!userId) {
        throw new Error('사용자 ID가 필요해요.');
      }

      setError(null);

      try {
        const { data, error: updateError } = await supabase
          .from('user_settings')
          .upsert(
            {
              user_id: userId,
              ...payload,
              updated_at: new Date().toISOString()
            },
            {
              onConflict: 'user_id'
            }
          )
          .select()
          .single();

        if (updateError) {
          console.error('설정 업데이트 실패:', updateError);
          throw updateError;
        }

        if (data) {
          setSettings(data);
        }

        return { data, error: null };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '설정 업데이트에 실패했어요.';
        setError(errorMessage);
        console.error('설정 업데이트 실패:', err);
        return { data: null, error: err };
      }
    },
    [userId]
  );

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    fetchSettings,
    updateSettings,
    loading,
    error
  };
}

