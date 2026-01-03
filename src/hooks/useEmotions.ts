import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

export type EmotionRecord = {
  id: string;
  user_id: string;
  emotion_date: string; // YYYY-MM-DD
  main_emotion: string; // DB 스키마: main_emotion (기존 emotion_type)
  intensity?: number;
  note?: string | null; // DB 스키마: note (nullable)
  content: string; // DB 스키마: content (최근 추가)
  is_public?: boolean | null; // DB 스키마: is_public (nullable)
  category?: string | null; // DB 스키마: category (영문키: daily/worry/love/work/humor/growth/selfcare)
  image_url?: string | null; // DB 스키마: image_url (nullable)
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
      emotion_type: string; // 프론트엔드에서는 emotion_type으로 받지만 DB에는 main_emotion으로 저장
      intensity?: number;
      content: string;
      note?: string | null; // DB 스키마: note (nullable)
      is_public?: boolean | null; // DB 스키마: is_public (nullable)
      emotion_date?: string; // YYYY-MM-DD, 없으면 오늘 날짜 사용
      category?: string | null; // 공감숲 카테고리 영문키 (공유 시: daily/worry/love/work/humor/growth/selfcare)
    }) => {
      if (!userId) {
        throw new Error('로그인이 필요해요.');
      }

      setError(null);

      try {
        // auth.uid() 확인
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('[addEmotion] auth.getUser() 실패:', {
            error: authError,
            userId
          });
          const error = new Error('인증 정보를 확인할 수 없어요. 다시 로그인해주세요.');
          setError(error);
          return { data: null, error };
        }
        
        if (!authUser) {
          console.error('[addEmotion] auth.uid() 없음:', {
            userId,
            message: '인증된 사용자가 없습니다.'
          });
          const error = new Error('로그인이 필요해요. 다시 로그인해주세요.');
          setError(error);
          return { data: null, error };
        }
        
        // user_id와 auth.uid() 일치 확인 (RLS 정책 준수를 위해)
        if (authUser.id !== userId) {
          console.error('[addEmotion] auth.uid()와 userId 불일치:', {
            userId,
            authUid: authUser.id,
            message: 'user_id와 auth.uid()가 일치하지 않습니다. RLS 정책 위반 가능성.'
          });
          // RLS 정책이 체크하지만, 클라이언트에서도 일치시켜야 함
          // userId를 authUser.id로 교정
          console.warn('[addEmotion] userId를 auth.uid()로 교정:', {
            oldUserId: userId,
            newUserId: authUser.id
          });
          // userId를 authUser.id로 사용 (RLS 정책 준수)
        }
        
        // 최종 user_id 결정 (auth.uid() 우선)
        const finalUserId = authUser.id;

        // emotion_date 설정 (없으면 오늘 날짜)
        const emotionDate = payload.emotion_date || new Date().toISOString().split('T')[0];

        // DB 스키마에 맞게 payload 매핑
        // emotion_type → main_emotion
        // content는 그대로 사용
        // note는 선택적
        const cleanPayload: Record<string, unknown> = {
          emotion_date: emotionDate, // YYYY-MM-DD
          main_emotion: payload.emotion_type, // DB 스키마: main_emotion
          content: payload.content // DB 스키마: content
        };

        // 선택적 필드 추가
        if (payload.intensity !== undefined && payload.intensity !== null) {
          cleanPayload.intensity = payload.intensity;
        }
        if (payload.note !== undefined && payload.note !== null) {
          cleanPayload.note = payload.note;
        }
        if (payload.is_public !== undefined && payload.is_public !== null) {
          cleanPayload.is_public = payload.is_public;
        }
        if (payload.category !== undefined && payload.category !== null) {
          cleanPayload.category = payload.category; // 공감숲 카테고리 영문키
        }

        // insert payload 준비 (auth.uid()를 user_id로 사용)
        const insertPayload = {
          user_id: finalUserId, // auth.uid() 사용 (RLS 정책 준수)
          ...cleanPayload
        };

        // payload 검증
        if (!insertPayload.main_emotion || !insertPayload.content) {
          const error = new Error('필수 정보가 누락되었어요. 감정과 내용을 입력해주세요.');
          console.error('[addEmotion] payload 검증 실패:', {
            main_emotion: insertPayload.main_emotion,
            content: insertPayload.content,
            payload: insertPayload
          });
          setError(error);
          return { data: null, error };
        }

        console.log('[addEmotion] insert 시도:', {
          originalUserId: userId,
          finalUserId: finalUserId,
          authUid: authUser.id,
          userIdMatch: userId === authUser.id,
          payload: insertPayload,
          payloadKeys: Object.keys(insertPayload),
          payloadValues: Object.values(insertPayload),
          payloadStringified: JSON.stringify(insertPayload, null, 2)
        });

        // RLS 정책에 의해 auth.uid() = user_id 조건이 자동 적용됨
        console.log('[addEmotion] Supabase insert 호출 직전:', {
          table: 'emotions',
          payload: insertPayload,
          payloadStringified: JSON.stringify(insertPayload)
        });
        
        const { data, error: insertError } = await supabase
          .from('emotions')
          .insert(insertPayload)
          .select()
          .single();

        if (insertError) {
          console.error('[addEmotion] insert 실패 - 상세 에러:', {
            error: insertError,
            code: insertError.code,
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
            originalUserId: userId,
            finalUserId: finalUserId,
            authUid: authUser.id,
            payload: insertPayload,
            payloadStringified: JSON.stringify(insertPayload, null, 2),
            // RLS 정책 에러 체크
            isRLSError: insertError.code === '42501' || 
                       insertError.message?.includes('permission denied') || 
                       insertError.message?.includes('RLS') ||
                       insertError.message?.includes('row-level security'),
            // 네트워크 에러 체크
            isNetworkError: insertError.message?.includes('fetch') || 
                          insertError.message?.includes('network') ||
                          insertError.message?.includes('Failed to fetch')
          });
          
          // 에러 타입별 메시지
          let errorMessage = insertError.message || '감정 기록 저장에 실패했어요.';
          if (insertError.code === '42501' || insertError.message?.includes('permission denied') || insertError.message?.includes('RLS')) {
            errorMessage = '기록 저장 권한이 없어요. 로그인 상태를 확인해주세요.';
            console.error('[addEmotion] RLS 정책 에러 감지 - auth.uid()와 user_id 불일치 가능성');
          } else if (insertError.code === '23503') {
            errorMessage = '사용자 정보를 찾을 수 없어요. 다시 로그인해주세요.';
            console.error('[addEmotion] Foreign Key 제약 조건 위반 - users 테이블에 user_id가 없음');
          } else if (insertError.code === '23502') {
            errorMessage = '필수 정보가 누락되었어요. 다시 시도해주세요.';
            console.error('[addEmotion] NOT NULL 제약 조건 위반');
          } else if (insertError.code === '23514') {
            errorMessage = '입력값이 올바르지 않아요. 다시 확인해주세요.';
            console.error('[addEmotion] CHECK 제약 조건 위반');
          }
          
          const error = new Error(errorMessage);
          setError(error);
          
          // 에러를 throw하지 않고 반환 (Record.tsx에서 처리)
          return { data: null, error };
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
          mainEmotion: data.main_emotion
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
    async (
      id: string,
      payload: {
        emotion_type?: string; // 프론트엔드에서는 emotion_type으로 받지만 DB에는 main_emotion으로 저장
        intensity?: number;
        content?: string;
        note?: string | null;
        is_public?: boolean | null;
        emotion_date?: string;
        category?: string | null; // 공감숲 카테고리 영문키 (daily/worry/love/work/humor/growth/selfcare)
      }
    ) => {
      if (!userId) {
        throw new Error('로그인이 필요해요.');
      }

      setError(null);

      try {
        // DB 스키마에 맞게 payload 변환
        const updatePayload: Record<string, unknown> = {};
        
        if (payload.emotion_type !== undefined) {
          updatePayload.main_emotion = payload.emotion_type; // emotion_type → main_emotion
        }
        if (payload.intensity !== undefined) {
          updatePayload.intensity = payload.intensity;
        }
        if (payload.content !== undefined) {
          updatePayload.content = payload.content;
        }
        if (payload.note !== undefined) {
          updatePayload.note = payload.note;
        }
        if (payload.is_public !== undefined) {
          updatePayload.is_public = payload.is_public;
        }
        if (payload.emotion_date !== undefined) {
          updatePayload.emotion_date = payload.emotion_date;
        }
        if (payload.category !== undefined) {
          updatePayload.category = payload.category;
        }

        // RLS 정책에 의해 auth.uid() = user_id 조건이 자동 적용됨
        const { data, error: updateError } = await supabase
          .from('emotions')
          .update(updatePayload)
          // updated_at은 트리거가 자동으로 갱신하므로 명시적으로 설정하지 않아도 됨
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
      const targetDate = date.split('T')[0]; // YYYY-MM-DD 형식
      return (
        emotions.find((emotion) => {
          // emotion_date가 있으면 사용, 없으면 created_at에서 추출
          const emotionDate = emotion.emotion_date || new Date(emotion.created_at).toISOString().split('T')[0];
          return emotionDate === targetDate;
        }) || null
      );
    },
    [emotions]
  );

  // ID로 감정 기록 단건 조회 (Supabase 직접 조회)
  const getEmotionById = useCallback(
    async (id: string): Promise<EmotionRecord | null> => {
      if (!userId) {
        console.warn('[getEmotionById] userId가 없습니다.');
        return null;
      }

      try {
        console.log('[getEmotionById] 조회 시작:', { id, userId });
        
        const { data, error } = await supabase
          .from('emotions')
          .select('*')
          .eq('id', id)
          .eq('user_id', userId) // RLS 정책과 함께 이중 체크
          .maybeSingle();

        if (error) {
          console.error('[getEmotionById] 조회 실패:', { id, error, errorMessage: error.message });
          return null;
        }

        if (!data) {
          console.warn('[getEmotionById] 기록을 찾을 수 없음:', { id, userId });
          return null;
        }

        console.log('[getEmotionById] 조회 성공:', { id, dataId: data.id, mainEmotion: data.main_emotion });
        return data;
      } catch (err) {
        console.error('[getEmotionById] 예외 발생:', { id, error: err, errorMessage: err instanceof Error ? err.message : String(err) });
        return null;
      }
    },
    [userId]
  );

  // 오늘 감정 존재 여부 체크 (서버 쿼리)
  const checkTodayEmotion = useCallback(
    async (targetDate?: string): Promise<EmotionRecord | null> => {
      if (!userId) {
        return null;
      }

      try {
        const date = targetDate || new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // emotion_date 컬럼을 사용하여 조회 (DB 스키마에 맞게)
        const { data, error } = await supabase
          .from('emotions')
          .select('*')
          .eq('user_id', userId)
          .eq('emotion_date', date) // emotion_date로 조회
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
        const date = targetDate || new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // emotion_date 컬럼을 사용하여 조회 (DB 스키마에 맞게)
        const { data, error } = await supabase
          .from('emotions')
          .select('id')
          .eq('user_id', userId)
          .eq('emotion_date', date) // emotion_date로 조회
          .eq('is_public', false)
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
    getEmotionById,
    checkTodayEmotion,
    checkTodayPrivateEmotion,
    hasTodayEmotion
  };
}







