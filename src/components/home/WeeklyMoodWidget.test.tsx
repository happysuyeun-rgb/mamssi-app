import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import WeeklyMoodWidget from './WeeklyMoodWidget';
import { NotifyProvider } from '@providers/NotifyProvider';

// useNavigate mock
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// NotifyProvider mock
const mockNotify = {
  warning: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  banner: vi.fn(),
  dismissBanner: vi.fn()
};

vi.mock('@providers/NotifyProvider', () => ({
  NotifyProvider: ({ children }: { children: React.ReactNode }) => children,
  useNotify: () => mockNotify
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <NotifyProvider>
        {component}
      </NotifyProvider>
    </BrowserRouter>
  );
};

describe('WeeklyMoodWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('이미지 표시 (썸네일 스트립)', () => {
    it('이미지가 있는 기록 상세 모달에서 이미지가 썸네일 스트립 형태로 표시되어야 함', () => {
      const weekSummary = [
        {
          date: '2024-01-15',
          emoji: '😊',
          label: '기쁨',
          note: '테스트 내용',
          recordId: 'test-id',
          imageUrl: 'https://example.com/image.jpg'
        }
      ];

      renderWithProviders(
        <WeeklyMoodWidget
          weekSummary={weekSummary}
          weekStart="2024-01-15"
          todayDate="2024-01-15"
        />
      );

      // 날짜 클릭하여 모달 열기
      const dayButton = screen.getByText('월');
      fireEvent.click(dayButton);

      // 이미지가 표시되어야 함
      const image = screen.getByAltText('감정 기록 이미지 1');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
    });

    it('이미지가 없는 기록 상세 모달에서 이미지 영역이 렌더링되지 않아야 함', () => {
      const weekSummary = [
        {
          date: '2024-01-15',
          emoji: '😊',
          label: '기쁨',
          note: '테스트 내용',
          recordId: 'test-id',
          imageUrl: undefined
        }
      ];

      renderWithProviders(
        <WeeklyMoodWidget
          weekSummary={weekSummary}
          weekStart="2024-01-15"
          todayDate="2024-01-15"
        />
      );

      // 날짜 클릭하여 모달 열기
      const dayButton = screen.getByText('월');
      fireEvent.click(dayButton);

      // 이미지가 표시되지 않아야 함
      const image = screen.queryByAltText(/감정 기록 이미지/i);
      expect(image).not.toBeInTheDocument();
    });

    it('이미지가 썸네일 스트립 컨테이너에 표시되어야 함', () => {
      const weekSummary = [
        {
          date: '2024-01-15',
          emoji: '😊',
          label: '기쁨',
          note: '테스트 내용',
          recordId: 'test-id',
          imageUrl: 'https://example.com/image.jpg'
        },
        ...Array.from({ length: 6 }, (_, idx) => ({
          date: new Date(2024, 0, 16 + idx).toISOString().split('T')[0],
          emoji: '',
          label: undefined,
          note: undefined,
          recordId: undefined,
          imageUrl: undefined
        }))
      ];

      renderWithProviders(
        <WeeklyMoodWidget
          weekSummary={weekSummary}
          weekStart="2024-01-15"
          todayDate="2024-01-15"
        />
      );

      // 기록이 있는 날짜 버튼 찾기 (월요일)
      const dayButtons = screen.getAllByRole('button');
      const recordedDayButton = dayButtons.find(btn => btn.textContent?.includes('😊'));

      if (recordedDayButton) {
        fireEvent.click(recordedDayButton);

        // emotion-record-images 클래스를 가진 컨테이너 확인
        const container = document.querySelector('.emotion-record-images');
        expect(container).toBeInTheDocument();
        
        const image = screen.getByAltText('감정 기록 이미지 1');
        expect(container).toContainElement(image);
      }
    });
  });

  describe('미래 날짜 체크', () => {
    it('미래 날짜 클릭 시 경고 메시지를 표시해야 함', () => {
      const today = '2024-01-15';
      const weekStart = '2024-01-15'; // 월요일
      const weekSummary = Array.from({ length: 7 }, (_, idx) => ({
        date: new Date(2024, 0, 15 + idx).toISOString().split('T')[0],
        emoji: '',
        label: undefined,
        note: undefined,
        recordId: undefined
      }));

      // 미래 날짜 (내일) 클릭
      const futureDateIndex = 1; // 화요일 (내일)

      renderWithProviders(
        <WeeklyMoodWidget
          weekSummary={weekSummary}
          weekStart={weekStart}
          todayDate={today}
        />
      );

      // 미래 날짜 버튼 찾기 (화요일)
      const dayButtons = screen.getAllByRole('button');
      const futureDayButton = dayButtons.find(btn => 
        btn.textContent?.includes('화') || btn.textContent?.includes('16')
      );

      if (futureDayButton) {
        fireEvent.click(futureDayButton);
        
        expect(mockNotify.warning).toHaveBeenCalledWith(
          '미래날짜는 기록할수 없어요!',
          '⚠️'
        );
        expect(mockNavigate).not.toHaveBeenCalled();
      }
    });

    it('오늘 날짜 클릭 시 기록 화면으로 이동해야 함', () => {
      const today = '2024-01-15';
      const weekStart = '2024-01-15';
      const weekSummary = Array.from({ length: 7 }, (_, idx) => ({
        date: new Date(2024, 0, 15 + idx).toISOString().split('T')[0],
        emoji: '',
        label: undefined,
        note: undefined,
        recordId: undefined
      }));

      renderWithProviders(
        <WeeklyMoodWidget
          weekSummary={weekSummary}
          weekStart={weekStart}
          todayDate={today}
        />
      );

      // 오늘 날짜 버튼 찾기 (월요일)
      const dayButtons = screen.getAllByRole('button');
      const todayButton = dayButtons[0]; // 첫 번째 버튼 (월요일)

      if (todayButton) {
        fireEvent.click(todayButton);
        
        // getDayIso 함수가 weekStart + index로 계산하므로 2024-01-15가 맞음
        expect(mockNavigate).toHaveBeenCalled();
        expect(mockNavigate.mock.calls[0][0]).toContain('/record?date=');
        expect(mockNotify.warning).not.toHaveBeenCalled();
      }
    });

    it('과거 날짜 클릭 시 기록 화면으로 이동해야 함', () => {
      const today = '2024-01-20'; // 금요일
      const weekStart = '2024-01-15'; // 월요일
      const weekSummary = Array.from({ length: 7 }, (_, idx) => ({
        date: new Date(2024, 0, 15 + idx).toISOString().split('T')[0],
        emoji: '',
        label: undefined,
        note: undefined,
        recordId: undefined
      }));

      renderWithProviders(
        <WeeklyMoodWidget
          weekSummary={weekSummary}
          weekStart={weekStart}
          todayDate={today}
        />
      );

      // 과거 날짜 버튼 찾기 (월요일)
      const dayButtons = screen.getAllByRole('button');
      const pastDayButton = dayButtons[0]; // 첫 번째 버튼 (월요일)

      if (pastDayButton) {
        fireEvent.click(pastDayButton);
        
        // getDayIso 함수가 weekStart + index로 계산하므로 2024-01-15가 맞음
        expect(mockNavigate).toHaveBeenCalled();
        expect(mockNavigate.mock.calls[0][0]).toContain('/record?date=');
        expect(mockNotify.warning).not.toHaveBeenCalled();
      }
    });
  });

  describe('기록이 있는 날짜', () => {
    it('기록이 있는 날짜 클릭 시 모달을 표시해야 함', () => {
      const today = '2024-01-15';
      const weekStart = '2024-01-15';
      const weekSummary = [
        {
          date: '2024-01-15',
          emoji: '😊',
          label: '기쁨',
          note: '오늘 기분이 좋아요',
          recordId: 'record-1'
        },
        ...Array.from({ length: 6 }, (_, idx) => ({
          date: new Date(2024, 0, 16 + idx).toISOString().split('T')[0],
          emoji: '',
          label: undefined,
          note: undefined,
          recordId: undefined
        }))
      ];

      renderWithProviders(
        <WeeklyMoodWidget
          weekSummary={weekSummary}
          weekStart={weekStart}
          todayDate={today}
        />
      );

      // 기록이 있는 날짜 버튼 찾기
      const dayButtons = screen.getAllByRole('button');
      const recordedDayButton = dayButtons[0]; // 첫 번째 버튼 (월요일)

      if (recordedDayButton) {
        fireEvent.click(recordedDayButton);
        
        // 모달이 표시되어야 함 (이모지나 레이블이 보여야 함)
        expect(screen.getAllByText(/기쁨|오늘 기분이 좋아요/).length).toBeGreaterThan(0);
        expect(mockNavigate).not.toHaveBeenCalled();
      }
    });
  });
});
