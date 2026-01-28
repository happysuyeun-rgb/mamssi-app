import { useState, useMemo } from 'react';
import type { MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotify } from '@providers/NotifyProvider';
import '@styles/home.css';
import '@styles/forest.css';

type WeekDayRecord = {
  date: string; // ISO 형식
  emoji: string;
  label?: string;
  note?: string;
  recordId?: string;
  imageUrl?: string; // 이미지 URL (감정 기록 이미지)
};

type WeeklyMoodWidgetProps = {
  weekSummary?: WeekDayRecord[]; // 더미 props (7일치 배열)
  weekStart?: string; // 더미 props (ISO 형식)
  todayDate?: string; // 더미 props (ISO 형식)
  onDeleteRecord?: (recordId: string) => Promise<void>; // 삭제 콜백
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

export default function WeeklyMoodWidget({ weekSummary, weekStart, todayDate, onDeleteRecord }: WeeklyMoodWidgetProps) {
  const navigate = useNavigate();
  const notify = useNotify();
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [emotionModalOpen, setEmotionModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
      recordId: undefined,
      imageUrl: undefined
    }));
  }, [weekSummary, actualWeekStart]);

  const weekRangeLabel = useMemo(() => formatWeekRange(actualWeekStart), [actualWeekStart]);
  const modalRecord = selectedDayIndex !== null ? weekData[selectedDayIndex] : null;
  const modalDayName = selectedDayIndex != null ? weekdays[selectedDayIndex] : '';
  const modalDateLabel = modalRecord ? formatDotDate(modalRecord.date) : '';

  function handleWeekDayClick(index: number) {
    const dayIso = getDayIso(actualWeekStart, index);
    const entry = weekData[index];
    
    // 미래 날짜 체크
    if (dayIso > actualToday) {
      notify.warning('미래날짜는 기록할수 없어요!', '⚠️');
      return;
    }
    
    if (!entry || !entry.emoji) {
      // 기록이 없는 날짜 (과거 또는 오늘)
      if (dayIso === actualToday) {
        navigate(`/record?date=${dayIso}`);
      } else {
        // 과거 날짜는 기록 페이지로 이동 (기록 가능)
        navigate(`/record?date=${dayIso}`);
      }
      return;
    }
    
    // 기록이 있는 날짜는 모달 표시
    setSelectedDayIndex(index);
    setEmotionModalOpen(true);
  }

  function onEditEmotion() {
    if (!modalRecord || !modalRecord.recordId) return;
    console.log('[WeeklyMoodWidget] 수정 버튼 클릭:', { 
      recordId: modalRecord.recordId, 
      date: modalRecord.date 
    });
    setEmotionModalOpen(false);
    navigate(`/record?id=${modalRecord.recordId}&date=${modalRecord.date}`);
  }

  async function onDeleteEmotion() {
    if (!modalRecord || !modalRecord.recordId || !onDeleteRecord) return;
    
    const confirmed = window.confirm('정말 이 기록을 삭제할까요?');
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      console.log('[WeeklyMoodWidget] 삭제 시작:', { recordId: modalRecord.recordId });
      await onDeleteRecord(modalRecord.recordId);
      console.log('[WeeklyMoodWidget] 삭제 완료:', { recordId: modalRecord.recordId });
      setEmotionModalOpen(false);
    } catch (err) {
      console.error('[WeeklyMoodWidget] 삭제 실패:', { 
        recordId: modalRecord.recordId, 
        error: err,
        errorMessage: err instanceof Error ? err.message : String(err)
      });
      alert('기록 삭제에 실패했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsDeleting(false);
    }
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

            {modalRecord.imageUrl && (() => {
              // 이미지 URL 배열로 변환 (현재는 단일 이미지, 향후 확장 가능)
              const imageUrls = modalRecord.imageUrl ? [modalRecord.imageUrl] : [];
              
              return imageUrls.length > 0 ? (
                <div className="emotion-record-images">
                  {imageUrls.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`감정 기록 이미지 ${idx + 1}`}
                    />
                  ))}
                </div>
              ) : null;
            })()}

            {modalRecord.recordId && (
              <div className="forest-sheet-actions">
                <button 
                  type="button" 
                  className="forest-sheet-owner-btn" 
                  onClick={onEditEmotion}
                  disabled={isDeleting}
                >
                  수정
                </button>
                {onDeleteRecord && (
                  <button 
                    type="button" 
                    className="forest-sheet-owner-btn" 
                    onClick={onDeleteEmotion}
                    disabled={isDeleting}
                    style={{ 
                      color: '#ef4444',
                      borderColor: '#fecaca',
                      background: '#fff5f5'
                    }}
                  >
                    {isDeleting ? '삭제 중...' : '삭제'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

