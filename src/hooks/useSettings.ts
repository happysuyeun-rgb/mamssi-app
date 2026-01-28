import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@lib/supabaseClient';

export type UserSettings = {
  user_id: string;
  nickname: string | null;
  mbti: string | null;
  profile_url: string | null;
  seed_name: string | null; // 씨앗 이름 (10자 이내)
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
        const error = new Error('사용자 ID가 필요해요.');
        setError(error.message);
        return { data: null, error };
      }

      setError(null);

      try {
        console.log('[useSettings] 설정 업데이트 시작:', { 
          userId, 
          payload,
          payloadKeys: Object.keys(payload),
          seedNameValue: (payload as any).seed_name
        });
        
        const upsertPayload = {
          user_id: userId,
          ...payload,
          updated_at: new Date().toISOString()
        };
        
        console.log('[useSettings] upsert payload:', {
          user_id: upsertPayload.user_id,
          seed_name: (upsertPayload as any).seed_name,
          payloadKeys: Object.keys(upsertPayload)
        });
        
        // upsert 실행 (INSERT 또는 UPDATE)
        const { error: upsertError } = await supabase
          .from('user_settings')
          .upsert(
            upsertPayload,
            {
              onConflict: 'user_id'
            }
          );

        if (upsertError) {
          console.error('[useSettings] upsert 실패:', {
            userId,
            payload,
            upsertPayload,
            error: upsertError,
            code: upsertError.code,
            message: upsertError.message,
            details: upsertError.details,
            hint: upsertError.hint
          });
          
          // RLS 정책 관련 에러인 경우 더 명확한 메시지 제공
          let errorMessage = upsertError.message;
          if (upsertError.message?.includes('row-level security') || upsertError.message?.includes('RLS') || upsertError.code === '42501') {
            errorMessage = '권한 오류가 발생했어요. Supabase Dashboard에서 RLS 정책을 확인해주세요. (fix_user_settings_rls_policy.sql 실행 필요)';
            console.error('[useSettings] RLS 정책 관련 에러 감지:', {
              error: upsertError.message,
              code: upsertError.code,
              hint: 'Supabase Dashboard > SQL Editor에서 fix_user_settings_rls_policy.sql 실행 필요'
            });
          } else if (upsertError.message?.includes('seed_name') || upsertError.message?.includes('column')) {
            errorMessage = '씨앗 이름 컬럼을 찾을 수 없어요. Supabase Dashboard에서 마이그레이션을 실행해주세요. (fix_seed_name_column.sql)';
            console.error('[useSettings] seed_name 컬럼 관련 에러 감지. 마이그레이션 필요:', {
              error: upsertError.message,
              hint: 'Supabase Dashboard > SQL Editor에서 fix_seed_name_column.sql 실행 필요'
            });
          }
          
          setError(errorMessage);
          return { data: null, error: { ...upsertError, message: errorMessage } };
        }

        console.log('[useSettings] upsert 성공, 데이터 조회 시작');

        // upsert 성공 후 별도로 SELECT하여 최신 데이터 가져오기
        // (upsert 후 .select()가 RLS 정책 문제로 실패할 수 있으므로 분리)
        const { data, error: selectError } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (selectError) {
          console.error('[useSettings] SELECT 실패 (upsert는 성공했을 수 있음):', {
            userId,
            error: selectError,
            code: selectError.code,
            message: selectError.message,
            details: selectError.details,
            hint: selectError.hint
          });
          
          // upsert는 성공했지만 SELECT가 실패한 경우
          // upsertPayload를 기반으로 반환 (최선의 추정)
          console.warn('[useSettings] SELECT 실패했지만 upsert는 성공했을 수 있음. upsertPayload 반환');
          
          // 기존 settings가 있으면 그것을 기반으로 업데이트, 없으면 새로 생성
          // upsertPayload의 값들을 우선적으로 사용 (업데이트된 값 반영)
          const fallbackData: UserSettings = {
            user_id: userId,
            nickname: (upsertPayload as any).nickname !== undefined ? (upsertPayload as any).nickname : (settings?.nickname || null),
            mbti: (upsertPayload as any).mbti !== undefined ? (upsertPayload as any).mbti : (settings?.mbti || null),
            profile_url: (upsertPayload as any).profile_url !== undefined ? (upsertPayload as any).profile_url : (settings?.profile_url || null),
            seed_name: (upsertPayload as any).seed_name !== undefined ? (upsertPayload as any).seed_name : (settings?.seed_name || null),
            lock_type: (upsertPayload as any).lock_type !== undefined ? (upsertPayload as any).lock_type : (settings?.lock_type || null),
            lock_value: (upsertPayload as any).lock_value !== undefined ? (upsertPayload as any).lock_value : (settings?.lock_value || null),
            updated_at: upsertPayload.updated_at,
            created_at: settings?.created_at || new Date().toISOString()
          };
          
          setSettings(fallbackData);
          setError(null); // SELECT 실패는 경고로 처리
          return { data: fallbackData, error: null };
        }

        if (!data) {
          console.error('[useSettings] SELECT 결과가 null (upsert는 성공했을 수 있음):', {
            userId,
            payload
          });
          
          // upsert는 성공했지만 SELECT 결과가 null인 경우
          // 기존 settings가 있으면 그것을 기반으로 업데이트, 없으면 새로 생성
          // upsertPayload의 값들을 우선적으로 사용 (업데이트된 값 반영)
          const fallbackData: UserSettings = {
            user_id: userId,
            nickname: (upsertPayload as any).nickname !== undefined ? (upsertPayload as any).nickname : (settings?.nickname || null),
            mbti: (upsertPayload as any).mbti !== undefined ? (upsertPayload as any).mbti : (settings?.mbti || null),
            profile_url: (upsertPayload as any).profile_url !== undefined ? (upsertPayload as any).profile_url : (settings?.profile_url || null),
            seed_name: (upsertPayload as any).seed_name !== undefined ? (upsertPayload as any).seed_name : (settings?.seed_name || null),
            lock_type: (upsertPayload as any).lock_type !== undefined ? (upsertPayload as any).lock_type : (settings?.lock_type || null),
            lock_value: (upsertPayload as any).lock_value !== undefined ? (upsertPayload as any).lock_value : (settings?.lock_value || null),
            updated_at: upsertPayload.updated_at,
            created_at: settings?.created_at || new Date().toISOString()
          };
          
          setSettings(fallbackData);
          console.warn('[useSettings] SELECT 결과가 null이지만 upsert는 성공했을 수 있음. fallbackData 반환');
          return { data: fallbackData, error: null };
        }

        console.log('[useSettings] 설정 업데이트 성공:', { 
          userId, 
          data,
          savedSeedName: data.seed_name,
          savedNickname: data.nickname
        });

        // 저장된 seed_name 확인
        if ((payload as any).seed_name && data.seed_name !== (payload as any).seed_name) {
          console.warn('[useSettings] 저장된 seed_name이 입력값과 다름:', {
            input: (payload as any).seed_name,
            saved: data.seed_name
          });
        }

        if (data) {
          setSettings(data);
          console.log('[useSettings] settings state 업데이트 완료:', {
            seedName: data.seed_name
          });
        }

        return { data, error: null };
      } catch (err) {
        const error = err instanceof Error ? err : new Error('설정 업데이트에 실패했어요.');
        const errorMessage = error.message;
        setError(errorMessage);
        console.error('[useSettings] 설정 업데이트 중 예외 발생:', {
          userId,
          payload,
          error: err,
          errorMessage
        });
        return { data: null, error };
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












