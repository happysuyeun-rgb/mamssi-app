import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Record from './Record';
import { NotifyProvider } from '@providers/NotifyProvider';

// Mock dependencies
const mockNavigate = vi.fn();
const mockNotify = {
  warning: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  banner: vi.fn(),
  dismissBanner: vi.fn()
};

const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com'
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(), vi.fn()]
  };
});

vi.mock('@providers/NotifyProvider', () => ({
  NotifyProvider: ({ children }: { children: React.ReactNode }) => children,
  useNotify: () => mockNotify
}));

vi.mock('@hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    isGuest: false,
    session: { access_token: 'test-token' }
  })
}));

vi.mock('@hooks/useEmotions', () => ({
  useEmotions: () => ({
    emotions: [],
    addEmotion: vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null }),
    updateEmotion: vi.fn().mockResolvedValue({ data: { id: 'updated-id' }, error: null }),
    fetchEmotions: vi.fn(),
    checkTodayPrivateEmotion: vi.fn().mockResolvedValue(false),
    getEmotionById: vi.fn().mockResolvedValue(null)
  })
}));

vi.mock('@hooks/useHomeData', () => ({
  useHomeData: () => ({
    refetch: vi.fn()
  })
}));

vi.mock('@hooks/useActionGuard', () => ({
  useActionGuard: () => ({
    requireAuthForAction: vi.fn((action, callback) => callback())
  })
}));

vi.mock('@utils/imageUpload', () => ({
  uploadEmotionImage: vi.fn().mockResolvedValue({
    url: 'https://example.com/image.jpg',
    error: null
  }),
  deleteEmotionImage: vi.fn()
}));

vi.mock('@services/flowers', () => ({
  updateFlowerGrowth: vi.fn().mockResolvedValue({})
}));

vi.mock('@services/notifications', () => ({
  createNotification: vi.fn().mockResolvedValue({})
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

describe('Record - 이미지 업로드 2개 제한', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // URL.createObjectURL mock
    global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/test');
    global.URL.revokeObjectURL = vi.fn();
  });

  it('이미지 0개 상태에서 이미지 1개 추가 가능해야 함', async () => {
    renderWithProviders(<Record />);

    const fileInput = screen.getByLabelText(/사진 추가/i).querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const fileList = {
      0: file,
      length: 1,
      item: (index: number) => file,
      [Symbol.iterator]: function* () {
        yield file;
      }
    } as unknown as FileList;

    Object.defineProperty(fileInput, 'files', {
      value: fileList,
      writable: false
    });

    fireEvent.change(fileInput!);

    await waitFor(() => {
      // 이미지 미리보기가 표시되어야 함
      const images = screen.queryAllByAltText(/감정 기록 이미지/i);
      expect(images.length).toBeGreaterThan(0);
    });
  });

  it('이미지 2개 상태에서 추가 시도 시 경고 메시지를 표시해야 함', async () => {
    renderWithProviders(<Record />);

    const fileInput = screen.getByLabelText(/사진 추가/i).querySelector('input[type="file"]');
    
    // 이미지 2개 추가
    const file1 = new File(['test1'], 'test1.jpg', { type: 'image/jpeg' });
    const file2 = new File(['test2'], 'test2.jpg', { type: 'image/jpeg' });
    
    const fileList1 = {
      0: file1,
      length: 1,
      item: (index: number) => file1,
      [Symbol.iterator]: function* () {
        yield file1;
      }
    } as unknown as FileList;

    const fileList2 = {
      0: file2,
      length: 1,
      item: (index: number) => file2,
      [Symbol.iterator]: function* () {
        yield file2;
      }
    } as unknown as FileList;

    // 첫 번째 이미지 추가
    Object.defineProperty(fileInput, 'files', {
      value: fileList1,
      writable: false
    });
    fireEvent.change(fileInput!);

    await waitFor(() => {
      expect(mockNotify.warning).not.toHaveBeenCalled();
    });

    // 두 번째 이미지 추가
    Object.defineProperty(fileInput, 'files', {
      value: fileList2,
      writable: false
    });
    fireEvent.change(fileInput!);

    await waitFor(() => {
      expect(mockNotify.warning).not.toHaveBeenCalled();
    });

    // 세 번째 이미지 추가 시도
    const file3 = new File(['test3'], 'test3.jpg', { type: 'image/jpeg' });
    const fileList3 = {
      0: file3,
      length: 1,
      item: (index: number) => file3,
      [Symbol.iterator]: function* () {
        yield file3;
      }
    } as unknown as FileList;

    Object.defineProperty(fileInput, 'files', {
      value: fileList3,
      writable: false
    });
    fireEvent.change(fileInput!);

    await waitFor(() => {
      expect(mockNotify.warning).toHaveBeenCalledWith(
        '이미지는 최대 2개까지 첨부할 수 있어요',
        '⚠️'
      );
    });
  });

  it('10MB 초과 이미지 선택 시 경고 메시지를 표시해야 함', async () => {
    renderWithProviders(<Record />);

    const fileInput = screen.getByLabelText(/사진 추가/i).querySelector('input[type="file"]');
    
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    const fileList = {
      0: largeFile,
      length: 1,
      item: (index: number) => largeFile,
      [Symbol.iterator]: function* () {
        yield largeFile;
      }
    } as unknown as FileList;

    Object.defineProperty(fileInput, 'files', {
      value: fileList,
      writable: false
    });

    fireEvent.change(fileInput!);

    await waitFor(() => {
      expect(mockNotify.warning).toHaveBeenCalledWith(
        '10MB 이하의 이미지만 첨부할 수 있어요',
        '⚠️'
      );
    });
  });

  it('이미지가 아닌 파일 선택 시 무시해야 함', async () => {
    renderWithProviders(<Record />);

    const fileInput = screen.getByLabelText(/사진 추가/i).querySelector('input[type="file"]');
    
    const textFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    const fileList = {
      0: textFile,
      length: 1,
      item: (index: number) => textFile,
      [Symbol.iterator]: function* () {
        yield textFile;
      }
    } as unknown as FileList;

    Object.defineProperty(fileInput, 'files', {
      value: fileList,
      writable: false
    });

    fireEvent.change(fileInput!);

    await waitFor(() => {
      // 이미지 미리보기가 표시되지 않아야 함
      const images = screen.queryAllByAltText(/감정 기록 이미지/i);
      expect(images.length).toBe(0);
    });
  });
});
