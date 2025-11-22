import { useState, useMemo } from 'react';
import type { MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import '@styles/home.css';
import '@styles/forest.css';

type WeekDayRecord = {
  date: string; // ISO 형식
  emoji: string;
  label?: string;
  note?: string;
  recordId?: string;
};

type WeeklyMoodWidgetProps = {
  weekSummary?: WeekDayRecord[]; // 더미 props (7일치 배열)
  weekStart?: string; // 더미 props (ISO 형식)
  todayDate?: string; // 더미 props (ISO 형식)
};

const weekdays = ['월', '화', '수', '목', '금', '토', '일'] as const;

function formatWeekRange(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`;
}

function getDayIso(weekStart: string, index: number): string {
  const start = new Date(`${weekStart}T00:00:00`);
  const day = new Date(start);
  day.setDate(day.getDate() + index);
  return day.toISOString().split('T')[0];
}

function formatDotDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}


function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export default function WeeklyMoodWidget({ weekSummary, weekStart, todayDate }: WeeklyMoodWidgetProps) {
  const navigate = useNavigate();
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [emotionModalOpen, setEmotionModalOpen] = useState(false);

  // 더미 props가 없으면 실제 데이터 생성
  const actualToday = todayDate || new Date().toISOString().split('T')[0];
  const actualWeekStart = weekStart || (() => {
    const today = new Date(actualToday);
    const day = today.getDay();
    const diff = (day + 6) % 7;
    const start = new Date(today);
    start.setDate(start.getDate() - diff);
    return start.toISOString().split('T')[0];
  })();

  const weekData = useMemo(() => {
    if (weekSummary) {
      return weekSummary.map((record, idx) => ({
        ...record,
        date: record.date || getDayIso(actualWeekStart, idx)
      }));
    }
    // 더미 데이터가 없으면 빈 배열 반환
    return Array.from({ length: 7 }, (_, idx) => ({
      date: getDayIso(actualWeekStart, idx),
      emoji: '',
      label: undefined,
      note: undefined,
      recordId: undefined
    }));
  }, [weekSummary, actualWeekStart]);

  const weekRangeLabel = useMemo(() => formatWeekRange(actualWeekStart), [actualWeekStart]);
  const modalRecord = selectedDayIndex !== null ? weekData[selectedDayIndex] : null;
  const modalDayName = selectedDayIndex != null ? weekdays[selectedDayIndex] : '';
  const modalDateLabel = modalRecord ? formatDotDate(modalRecord.date) : '';

  function handleWeekDayClick(index: number) {
    const dayIso = getDayIso(actualWeekStart, index);
    const entry = weekData[index];
    if (!entry || !entry.emoji) {
      if (dayIso === actualToday) {
        navigate(`/record?date=${dayIso}`);
      }
      return;
    }
    setSelectedDayIndex(index);
    setEmotionModalOpen(true);
  }

  function onEditEmotion() {
    if (!modalRecord || !modalRecord.recordId) return;
    setEmotionModalOpen(false);
    navigate(`/record?id=${modalRecord.recordId}&date=${modalRecord.date}`);
  }

  return (
    <>
      <section className="home-week-card">
        <div className="home-week-header">
          <div>
            <div className="home-week-title">이번 주 감정 달력</div>
            <div className="home-week-desc">하루씩 떠올리며 내 마음의 흐름을 살펴봐요</div>
          </div>
          <div className="home-week-range-label">{weekRangeLabel}</div>
        </div>
        <div className="home-week-grid" style={{ marginBottom: 6 }}>
          {weekdays.map((d) => (
            <div key={d} className="home-week-day-label">
              {d}
            </div>
          ))}
        </div>
        <div className="home-week-grid">
          {weekData.map((record, idx) => {
            const dayIso = getDayIso(actualWeekStart, idx);
            const isToday = dayIso === actualToday;
            const isSelected = selectedDayIndex === idx && emotionModalOpen && !!record.emoji;
            const emoji = record.emoji || '·';
            return (
              <button
                key={dayIso}
                type="button"
                className={cn(
                  'home-week-day-btn',
                  record.emoji && 'has-emotion',
                  isToday && 'is-today',
                  isSelected && 'is-selected',
                  !record.emoji && 'is-empty'
                )}
                onClick={() => handleWeekDayClick(idx)}
              >
                {emoji}
              </button>
            );
          })}
        </div>
        <p className="home-week-helper">기록이 없는 날은 · 로 표시돼요. 눌러서 오늘부터 천천히 채워갈 수 있어요.</p>
      </section>

      {/* 감정 상세 모달 */}
      {emotionModalOpen && modalRecord && modalRecord.emoji && (
        <div
          className="ms-modal-backdrop show"
          onClick={(e: MouseEvent<HTMLDivElement>) => {
            if (e.target === e.currentTarget) setEmotionModalOpen(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 30
          }}
        >
          <div className="forest-sheet home-detail-sheet">
            <div className="forest-sheet-top">
              <div>
                <p className="forest-sheet-label">주간 감정 기록</p>
                <h2 className="forest-sheet-title">{modalDayName}요일의 마음</h2>
                <p className="forest-sheet-meta">{modalDateLabel}</p>
              </div>
              <button type="button" className="forest-sheet-close" onClick={() => setEmotionModalOpen(false)}>
                닫기
              </button>
            </div>

            <div className="forest-sheet-emotion-row">
              <span className="forest-sheet-emotion">{modalRecord.emoji}</span>
              {modalRecord.label && <span className="forest-category-pill">{modalRecord.label}</span>}
            </div>

            {modalRecord.note && (
              <div className="forest-sheet-body">
                <p>{modalRecord.note}</p>
              </div>
            )}

            {modalRecord.recordId && (
              <div className="forest-sheet-actions">
                <button type="button" className="forest-sheet-owner-btn" onClick={onEditEmotion}>
                  수정
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

