import type { CalendarEmotionRecord, WeekEmotions } from '@domain/emotion';

const DAY = 24 * 60 * 60 * 1000;

const presetWeeks: WeekEmotions[] = [
  {
    weekStart: '2025-11-10',
    days: [
      createRecord('2025-11-10', '🙂', '평온', '잔잔한 숨을 고르며 하루를 열었어요.'),
      createRecord('2025-11-11', '😟', '불안', '알 수 없는 긴장감이 계속 맴돌던 날.'),
      createRecord('2025-11-12', '😌', '안심', '친구의 한마디 덕에 마음이 조금 가벼워졌어요.'),
      null,
      createRecord('2025-11-14', '😮', '설렘', '새로운 소식이 찾아와 설레던 금요일.'),
      createRecord('2025-11-15', '🙂', '차분', '느린 호흡으로 하루를 마무리했습니다.'),
      createRecord('2025-11-16', '😴', '피곤', '휴식이 필요해서 조용히 쉬었어요.')
    ]
  },
  {
    weekStart: '2025-11-17',
    days: [
      createRecord('2025-11-17', '😃', '기쁨', '작은 성취가 마음을 환하게 비춰줬어요.'),
      createRecord('2025-11-18', '😔', '먹먹', '말로 설명하기 어려운 하루였어요.'),
      null,
      createRecord('2025-11-20', '😌', '안심', '일이 제자리를 찾아가고 있어요.'),
      createRecord('2025-11-21', '😍', '사랑', '따뜻한 메시지가 하루를 덮어줬어요.'),
      null,
      createRecord('2025-11-23', '😴', '피곤', '긴 한 주의 끝이라 그런가 봐요.')
    ]
  }
];

const emojiPool: Array<Pick<CalendarEmotionRecord, 'emoji' | 'label'>> = [
  { emoji: '🙂', label: '평온' },
  { emoji: '😌', label: '안심' },
  { emoji: '😃', label: '기쁨' },
  { emoji: '😟', label: '불안' },
  { emoji: '😴', label: '피곤' },
  { emoji: '😍', label: '사랑' }
];

function createRecord(date: string, emoji: string, label: string, note: string): CalendarEmotionRecord {
  return {
    recordId: `rec-${date}-${emoji}`,
    date,
    emoji,
    label,
    note,
    isMine: false,
    isPublic: false,
    createdAt: `${date}T00:00:00Z`
  };
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function cloneWeek(week: WeekEmotions): WeekEmotions {
  return {
    weekStart: week.weekStart,
    days: week.days.map(day => (day ? { ...day } : null))
  };
}

function generateWeek(weekStart: string): WeekEmotions {
  const start = new Date(weekStart);
  const days = Array.from({ length: 7 }, (_, idx) => {
    const date = new Date(start.getTime() + idx * DAY);
    const iso = formatDate(date);
    const shouldRecord = (idx + date.getDate()) % 3 !== 0;
    if (!shouldRecord) return null;
    const emotionSeed = (idx + date.getDate()) % emojiPool.length;
    const palette = emojiPool[emotionSeed];
    return createRecord(iso, palette.emoji, palette.label, `${palette.label}했던 순간들을 마음에 담아봤어요.`);
  });
  return {
    weekStart,
    days
  };
}

export function getWeekEmotions(weekStart: string): WeekEmotions {
  const preset = presetWeeks.find(w => w.weekStart === weekStart);
  if (preset) return cloneWeek(preset);
  return generateWeek(weekStart);
}

