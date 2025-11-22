import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@lib/supabaseClient';
import { notify } from '@lib/notify';

export type TodayRecord = {
  id: string;
  emotion_type: string;
  content: string;
  image_url: string | null;
  created_at: string;
};

export type WeekStat = {
  emotion_type: string;
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
  const [today, setToday] = useState<TodayRecord | null>(null);
  const [weekStats, setWeekStats] = useState<WeekStat[]>([]);
  const [flower, setFlower] = useState<FlowerData | null>(null);
  const [feedSummary, setFeedSummary] = useState<FeedSummary>({ likeSum: 0, postCount: 0 });
  const [seedName, setSeedName] = useState<string>('나의 씨앗');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
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

      // 오늘의 기록 (최신 1건)
      const { data: todayData, error: todayError } = await supabase
        .from('emotions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', `${todayStr}T00:00:00`)
        .lt('created_at', `${todayStr}T23:59:59`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (todayError && todayError.code !== 'PGRST116') {
        console.error('오늘 기록 조회 실패:', todayError);
      }

      // 주간 감정 요약 (최근 7일)
      const { data: weeklyData, error: weeklyError } = await supabase
        .from('emotions')
        .select('emotion_type, created_at')
        .eq('user_id', userId)
        .gte('created_at', sevenDaysAgoStr)
        .order('created_at', { ascending: false });

      if (weeklyError) {
        console.error('주간 데이터 조회 실패:', weeklyError);
      }

      // 주간 통계 집계
      const weekStatsMap = new Map<string, { count: number; date: string }>();
      weeklyData?.forEach((record) => {
        const date = new Date(record.created_at).toISOString().split('T')[0];
        const key = `${date}-${record.emotion_type}`;
        const existing = weekStatsMap.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          weekStatsMap.set(key, { count: 1, date });
        }
      });

      const weekStatsArray: WeekStat[] = Array.from(weekStatsMap.entries()).map(([key, value]) => {
        const [, emotion_type] = key.split('-');
        return {
          emotion_type,
          count: value.count,
          date: value.date
        };
      });

      // flowers 데이터 조회
      const { data: flowerData, error: flowerError } = await supabase
        .from('flowers')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (flowerError && flowerError.code !== 'PGRST116') {
        console.error('flowers 조회 실패:', flowerError);
      }

      // flowers가 없으면 생성
      if (!flowerData) {
        const { error: updateError } = await supabase.rpc('update_flower_growth', { uid: userId });
        if (updateError) {
          console.error('flowers 생성 실패:', updateError);
        } else {
          // 생성 후 다시 조회
          const { data: newFlowerData } = await supabase
            .from('flowers')
            .select('*')
            .eq('user_id', userId)
            .single();
          setFlower(newFlowerData || null);
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
      console.error('홈 데이터 로드 실패:', err);
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
  }, [fetchData, userId]);

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

