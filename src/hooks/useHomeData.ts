import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@lib/supabaseClient';
import { notify } from '@lib/notify';

export type TodayRecord = {
  id: string;
  main_emotion: string; // DB 스키마: main_emotion
  content: string;
  emotion_date: string; // DB 스키마: emotion_date
  created_at: string;
};

export type WeekStat = {
  main_emotion: string; // DB 스키마: main_emotion
  count: number;
  date: string;
};

export type FlowerData = {
  id: string;
  user_id: string;
  growth_pct: number;
  bloom_level: number;
  last_updated: string;
  created_at: string;
};

export type FeedSummary = {
  likeSum: number;
  postCount: number;
};

export function useHomeData(userId?: string | null) {
  const location = useLocation();
  const [today, setToday] = useState<TodayRecord | null>(null);
  const [weekStats, setWeekStats] = useState<WeekStat[]>([]);
  const [flower, setFlower] = useState<FlowerData | null>(null);
  const [feedSummary, setFeedSummary] = useState<FeedSummary>({ likeSum: 0, postCount: 0 });
  const [seedName, setSeedName] = useState<string>('나의 씨앗');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    // 온보딩 라우트에서는 데이터 조회 skip
    if (location.pathname.startsWith('/onboarding')) {
      console.log('[useHomeData] 온보딩 라우트 감지, 데이터 조회 skip');
      setLoading(false);
      return;
    }

    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString();

      // 오늘의 기록 (emotion_date 기준, 최신 1건)
      const { data: todayData, error: todayError } = await supabase
        .from('emotions')
        .select('*')
        .eq('user_id', userId)
        .eq('emotion_date', todayStr) // DB 스키마: emotion_date 사용
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (todayError) {
        console.error('[useHomeData] 오늘 기록 조회 실패:', {
          code: todayError.code,
          message: todayError.message,
          details: todayError.details,
          hint: todayError.hint,
          userId
        });
      }

      // 주간 감정 요약 (최근 7일, emotion_date 기준)
      const weekStartDate = new Date();
      weekStartDate.setDate(weekStartDate.getDate() - 7);
      const weekStartStr = weekStartDate.toISOString().split('T')[0];

      const { data: weeklyData, error: weeklyError } = await supabase
        .from('emotions')
        .select('main_emotion, emotion_date') // DB 스키마: main_emotion, emotion_date
        .eq('user_id', userId)
        .gte('emotion_date', weekStartStr) // emotion_date 기준으로 조회
        .lte('emotion_date', todayStr)
        .order('emotion_date', { ascending: false });

      if (weeklyError) {
        console.error('[useHomeData] 주간 데이터 조회 실패:', {
          code: weeklyError.code,
          message: weeklyError.message,
          details: weeklyError.details,
          hint: weeklyError.hint,
          userId
        });
      }

      // 주간 통계 집계 (emotion_date 기준)
      const weekStatsMap = new Map<string, { count: number; date: string }>();
      weeklyData?.forEach((record) => {
        const date = record.emotion_date || new Date().toISOString().split('T')[0]; // emotion_date 사용
        const key = `${date}-${record.main_emotion}`; // main_emotion 사용
        const existing = weekStatsMap.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          weekStatsMap.set(key, { count: 1, date });
        }
      });

      const weekStatsArray: WeekStat[] = Array.from(weekStatsMap.entries()).map(([key, value]) => {
        const [, main_emotion] = key.split('-');
        return {
          main_emotion, // DB 스키마: main_emotion
          count: value.count,
          date: value.date
        };
      });

      // flowers 데이터 조회
      const { data: flowerData, error: flowerError } = await supabase
        .from('flowers')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (flowerError && flowerError.code !== 'PGRST116') {
        console.error('[useHomeData] flowers 조회 실패:', {
          code: flowerError.code,
          message: flowerError.message,
          details: flowerError.details,
          hint: flowerError.hint,
          userId
        });
      }

      // flowers가 없으면 생성 (fallback)
      if (!flowerData) {
        console.log('[useHomeData] flowers가 없어서 생성 시도 (fallback):', { userId });
        try {
          // ensureFlowerRow 사용
          const { ensureFlowerRow } = await import('@services/flowers');
          const newFlower = await ensureFlowerRow(userId);
          if (newFlower) {
            console.log('[useHomeData] flowers 생성 성공 (fallback):', {
              userId,
              flowerId: newFlower.id,
              growthPercent: newFlower.growth_percent
            });
            setFlower(newFlower);
          } else {
            console.warn('[useHomeData] flowers 생성 실패 (fallback):', { userId });
            setFlower(null);
          }
        } catch (fallbackError) {
          console.error('[useHomeData] flowers 생성 중 오류 (fallback):', {
            error: fallbackError,
            errorMessage: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
            userId
          });
          setFlower(null);
        }
      } else {
        setFlower(flowerData);
      }

      // 공감수 합계 (community_posts의 like_count 합계)
      const { data: postsData, error: postsError } = await supabase
        .from('community_posts')
        .select('like_count')
        .eq('user_id', userId);

      if (postsError) {
        console.error('공감수 조회 실패:', postsError);
      }

      const likeSum = postsData?.reduce((sum, post) => sum + (post.like_count || 0), 0) || 0;
      const postCount = postsData?.length || 0;

      // profiles에서 seed_name 조회
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('seed_name')
        .eq('id', userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('프로필 조회 실패:', profileError);
      }

      // seedName 우선순위: 1. profiles.seed_name, 2. flowers.seed_name, 3. 기본값 '나의 씨앗'
      const finalSeedName =
        profileData?.seed_name ||
        flowerData?.seed_name ||
        '나의 씨앗';

      setToday(todayData || null);
      setWeekStats(weekStatsArray);
      setFeedSummary({ likeSum, postCount });
      setSeedName(finalSeedName);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '데이터를 불러오는데 실패했어요.';
      setError(errorMessage);
      console.error('[useHomeData] 홈 데이터 로드 실패:', {
        error: err,
        errorMessage: err instanceof Error ? err.message : String(err),
        errorStack: err instanceof Error ? err.stack : undefined,
        userId
      });
      notify.error('데이터를 불러오지 못했어요 🌧', '🌧');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();

    if (!userId) return;

    // Realtime 구독: emotions 변경 시 자동 갱신
    const emotionsChannel = supabase
      .channel('home_emotions_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'emotions',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    // Realtime 구독: flowers 변경 시 자동 갱신
    const flowersChannel = supabase
      .channel('home_flowers_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'flowers',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    // Realtime 구독: community_posts 변경 시 자동 갱신
    const postsChannel = supabase
      .channel('home_posts_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_posts',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(emotionsChannel);
      supabase.removeChannel(flowersChannel);
      supabase.removeChannel(postsChannel);
    };
  }, [fetchData, userId, location.pathname]);

  return {
    today,
    weekStats,
    flower,
    feedSummary,
    seedName,
    loading,
    error,
    refetch: fetchData
  };
}

