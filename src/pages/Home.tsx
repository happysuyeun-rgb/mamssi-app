import { useMemo, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '@components/Layout';
import HomeHeader from '@components/home/HomeHeader';
import TodayRecordCTA from '@components/home/TodayRecordCTA';
import WeeklyMoodWidget from '@components/home/WeeklyMoodWidget';
import FlowerBadge from '@components/home/FlowerBadge';
import FeedPreview from '@components/home/FeedPreview';
import { useAuth } from '@hooks/useAuth';
import { useNotify } from '@providers/NotifyProvider';
import { useHomeData } from '@hooks/useHomeData';
import { useEmotions } from '@hooks/useEmotions';
import { EMOTION_OPTIONS } from '@constants/emotions';
import { safeStorage } from '@lib/safeStorage';
import { diag } from '@boot/diag';
import '@styles/home.css';

// 로그인/가입 상태 키
const AUTH_FLOW_KEY = 'authFlowType';

function formatIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isoToDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getWeekStartIso(date: Date): string {
  const copy = new Date(date);
  const day = copy.getDay(); // Sunday = 0
  const diff = (day + 6) % 7;
  copy.setDate(copy.getDate() - diff);
  return formatIso(copy);
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export default function Home() {
  const [searchParams] = useSearchParams();
  const { isGuest, session, user } = useAuth();
  const notify = useNotify();
  const { today, weekStats, flower, feedSummary, seedName, loading: homeDataLoading, refetch: refetchHomeData } = useHomeData(user?.id || null);
  const { emotions, loading: emotionsLoading, hasTodayEmotion, fetchEmotions } = useEmotions({
    userId: user?.id || null
  });
  const [todayHasEmotion, setTodayHasEmotion] = useState<boolean>(false);
  const [checkingToday, setCheckingToday] = useState<boolean>(false);

  // 게스트 모드 확인 (URL 파라미터 또는 상태)
  const guestMode = searchParams.get('guest') === '1' || isGuest;

  // 게스트 모드 배너 표시
  useEffect(() => {
    if (guestMode && !session) {
      notify.banner({
        level: 'info',
        message: '게스트 모드입니다. 기록/공감 작성은 로그인 후 이용 가능해요.',
        dismissible: true
      });
    } else {
      // 로그인 시 배너 자동 숨김
      notify.dismissBanner('');
    }
  }, [guestMode, session, notify]);

  // 로그인/가입 피드백 메시지 표시
  useEffect(() => {
    if (!session || !user) return;

    const authFlowType = safeStorage.getItem(AUTH_FLOW_KEY);
    if (authFlowType) {
      diag.log('Home: 로그인/가입 피드백 표시', { authFlowType });
      
      if (authFlowType === 'SIGNUP') {
        notify.success('처음 오셨네요, 씨앗을 받아볼까요? 🌱', '✨');
      } else if (authFlowType === 'LOGIN') {
        notify.success('다시 오셨네요! 오늘도 따뜻한 하루 되세요 🌿', '👋');
      }
      
      // 메시지 표시 후 플래그 제거
      safeStorage.removeItem(AUTH_FLOW_KEY);
    }
  }, [session, user, notify]);

  // 오늘 날짜
  const todayIso = useMemo(() => formatIso(new Date()), []);
  const todayDate = useMemo(() => isoToDate(todayIso), [todayIso]);

  // 주간 감정 데이터 (useHomeData의 weekStats를 기반으로 변환)
  const initialWeekStart = useMemo(() => getWeekStartIso(todayDate), [todayDate]);
  const weekSummary = useMemo(() => {
    if (guestMode || !user || homeDataLoading) {
      // 게스트 모드나 로딩 중이면 빈 데이터
      const startDate = isoToDate(initialWeekStart);
      return Array.from({ length: 7 }, (_, idx) => {
        const iso = formatIso(addDays(startDate, idx));
        return {
          date: iso,
          emoji: '',
          label: undefined,
          note: undefined,
          recordId: undefined
        };
      });
    }

    // 실제 emotions 데이터로 주간 요약 생성 (emotion_date 기준)
    const startDate = isoToDate(initialWeekStart);
    return Array.from({ length: 7 }, (_, idx) => {
      const iso = formatIso(addDays(startDate, idx));
      const dailyRecords = emotions
        .filter((e) => {
          // DB 스키마: emotion_date 우선 사용, 없으면 created_at에서 추출
          const emotionDate = e.emotion_date || new Date(e.created_at).toISOString().split('T')[0];
          return emotionDate === iso;
        })
        .sort((a, b) => (a.created_at > b.created_at ? -1 : 1));

      if (!dailyRecords.length) {
        return {
          date: iso,
          emoji: '',
          label: undefined,
          note: undefined,
          recordId: undefined
        };
      }

      const first = dailyRecords[0];
      // DB 스키마: main_emotion 사용
      const emotionOpt = EMOTION_OPTIONS.find((opt) => opt.label === first.main_emotion);
      return {
        date: iso,
        emoji: emotionOpt?.emoji || '',
        label: emotionOpt?.label || first.main_emotion,
        note: first.content,
        recordId: first.id
      };
    });
  }, [initialWeekStart, emotions, user, guestMode, homeDataLoading]);

  // 성장 데이터 (flowers 테이블 또는 계산값)
  const growthPct = useMemo(() => {
    if (guestMode || !user) return 0;
    // DB 스키마: growth_percent
    const percent = flower?.growth_percent || 0;
    return clampPercent(percent);
  }, [flower, user, guestMode]);
  
  // flower state 변경 감지 (디버깅용)
  useEffect(() => {
    if (flower) {
      console.log('[Home] flower state 변경:', {
        flowerId: flower.id,
        growthPercent: flower.growth_percent,
        isBloomed: flower.is_bloomed,
        calculatedGrowthPct: growthPct
      });
    }
  }, [flower, growthPct]);

  // 성장 단계 계산 (설계서 기준: 포인트 기반)
  // Level 0 (씨앗): 0pt
  // Level 1 (새싹): 10pt ~ 29pt
  // Level 2 (줄기): 30pt ~ 49pt
  // Level 3 (꽃봉오리): 50pt ~ 69pt
  // Level 4 (반쯤 열린 꽃봉오리): 70pt ~ 99pt
  // Level 5 (개화): 100pt
  const bloomLevel = useMemo(() => {
    if (guestMode || !user) return 0;
    
    const percent = flower?.growth_percent || 0; // growth_percent는 포인트 값 (0-100pt)
    
    if (percent >= 100) return 5; // Level 5: 개화 (100pt)
    if (percent >= 70) return 4; // Level 4: 반쯤 열린 꽃봉오리 (70pt~99pt)
    if (percent >= 50) return 3; // Level 3: 꽃봉오리 (50pt~69pt)
    if (percent >= 30) return 2; // Level 2: 줄기 (30pt~49pt)
    if (percent >= 10) return 1; // Level 1: 새싹 (10pt~29pt)
    return 0; // Level 0: 씨앗 (0pt~9pt)
  }, [flower, user, guestMode]);

  // 정원 상태 (30일 기준)
  const garden = useMemo(() => {
    if (guestMode || !user || emotionsLoading) {
      return { totalDays: 30, recordedDays: 0 };
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentEmotions = emotions.filter((e) => {
      const emotionDate = new Date(e.created_at);
      return emotionDate >= thirtyDaysAgo;
    });

    const uniqueDates = new Set(
      recentEmotions.map((e) => new Date(e.created_at).toISOString().split('T')[0])
    );

    return {
      totalDays: 30,
      recordedDays: uniqueDates.size
    };
  }, [emotions, user, guestMode, emotionsLoading]);

  // 오늘 기록 여부 체크 (hasTodayEmotion 사용)
  useEffect(() => {
    if (guestMode || !user || checkingToday) {
      if (guestMode || !user) {
        setTodayHasEmotion(false);
      }
      return;
    }

    const checkToday = async () => {
      setCheckingToday(true);
      try {
        const hasEmotion = await hasTodayEmotion();
        setTodayHasEmotion(hasEmotion);
      } catch (err) {
        console.error('오늘 기록 체크 실패:', err);
        setTodayHasEmotion(false);
      } finally {
        setCheckingToday(false);
      }
    };

    checkToday();
  }, [user, guestMode, hasTodayEmotion]);

  // emotions가 변경되면 오늘 기록 여부 다시 체크 (debounce)
  useEffect(() => {
    if (guestMode || !user || checkingToday) return;
    
    const timer = setTimeout(async () => {
      try {
        const hasEmotion = await hasTodayEmotion();
        setTodayHasEmotion(hasEmotion);
      } catch (err) {
        console.error('오늘 기록 체크 실패:', err);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [emotions, user, guestMode, hasTodayEmotion, checkingToday]);

  // 오늘 기록 여부 (hasTodayEmotion 결과 사용)
  const todayLogged = useMemo(() => {
    if (guestMode || !user) return false;
    return todayHasEmotion;
  }, [todayHasEmotion, user, guestMode]);

  // 공감숲 피드 요약
  const feedCount = useMemo(() => {
    if (guestMode || !user) return 0;
    return feedSummary.postCount || 0;
  }, [feedSummary, user, guestMode]);

  return (
    <Layout hideHeader>
      <HomeHeader />
      {guestMode && !session && (
        <div
          style={{
            background: 'linear-gradient(180deg, #F0FFFA, #E5FAF4)',
            border: '1px solid #CDEAE1',
            borderRadius: 18,
            padding: '12px 16px',
            marginBottom: 16,
            fontSize: 13,
            color: '#144E43',
            textAlign: 'center'
          }}
        >
          👤 게스트 모드: 기록과 공감 작성은 로그인 후 이용할 수 있어요.
        </div>
      )}
      {homeDataLoading && !guestMode && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 16px',
            fontSize: 14,
            color: 'var(--ms-ink-soft)'
          }}
        >
          <span style={{ fontSize: 24, marginRight: 8, animation: 'spin 1s linear infinite' }}>🌱</span>
          정원을 불러오는 중...
        </div>
      )}
      {!homeDataLoading && (
        <>
          <FlowerBadge
            growthPct={growthPct}
            bloomLevel={bloomLevel}
            seedName={seedName || '나의 씨앗'}
            totalDays={garden.totalDays}
            recordedDays={garden.recordedDays}
            todayMessage={
              bloomLevel >= 3
                ? '축하해요! 감정꽃이 피었어요 🌸'
                : '오늘의 정원 소식: 오늘 내 씨앗이 작은 공감들을 모으고 있어요 🌱'
            }
          />
          <TodayRecordCTA todayLogged={todayLogged} todayDate={todayIso} />
          <WeeklyMoodWidget weekSummary={weekSummary} weekStart={initialWeekStart} todayDate={todayIso} />
          <FeedPreview feedCount={feedCount} likeSum={feedSummary.likeSum} />
        </>
      )}
    </Layout>
  );
}
