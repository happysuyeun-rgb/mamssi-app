import { describe, it, expect } from 'vitest';

// 날짜 유틸리티 함수들
export function formatIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getWeekStart(date: Date): Date {
  const copy = new Date(date);
  const day = copy.getDay(); // Sunday = 0
  const diff = (day + 6) % 7; // 월요일 기준으로 조정
  copy.setDate(copy.getDate() - diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function isFutureDate(dateIso: string, todayIso: string): boolean {
  return dateIso > todayIso;
}

export function isPastDate(dateIso: string, todayIso: string): boolean {
  return dateIso < todayIso;
}

export function isToday(dateIso: string, todayIso: string): boolean {
  return dateIso === todayIso;
}

describe('dateUtils', () => {
  describe('formatIso', () => {
    it('날짜를 YYYY-MM-DD 형식으로 변환해야 함', () => {
      const date = new Date(2024, 0, 15); // 2024-01-15
      expect(formatIso(date)).toBe('2024-01-15');
    });

    it('한 자리 월/일은 0으로 패딩해야 함', () => {
      const date = new Date(2024, 0, 5); // 2024-01-05
      expect(formatIso(date)).toBe('2024-01-05');
    });

    it('12월 31일도 올바르게 변환해야 함', () => {
      const date = new Date(2024, 11, 31); // 2024-12-31
      expect(formatIso(date)).toBe('2024-12-31');
    });
  });

  describe('getWeekStart', () => {
    it('월요일이면 같은 날짜를 반환해야 함', () => {
      const monday = new Date(2024, 0, 15); // 2024-01-15 (월요일)
      const weekStart = getWeekStart(monday);
      expect(formatIso(weekStart)).toBe('2024-01-15');
    });

    it('일요일이면 전주 월요일을 반환해야 함', () => {
      const sunday = new Date(2024, 0, 14); // 2024-01-14 (일요일)
      const weekStart = getWeekStart(sunday);
      expect(formatIso(weekStart)).toBe('2024-01-08'); // 전주 월요일
    });

    it('금요일이면 같은 주 월요일을 반환해야 함', () => {
      const friday = new Date(2024, 0, 19); // 2024-01-19 (금요일)
      const weekStart = getWeekStart(friday);
      expect(formatIso(weekStart)).toBe('2024-01-15'); // 같은 주 월요일
    });
  });

  describe('isFutureDate', () => {
    it('미래 날짜는 true를 반환해야 함', () => {
      expect(isFutureDate('2024-01-16', '2024-01-15')).toBe(true);
    });

    it('오늘 날짜는 false를 반환해야 함', () => {
      expect(isFutureDate('2024-01-15', '2024-01-15')).toBe(false);
    });

    it('과거 날짜는 false를 반환해야 함', () => {
      expect(isFutureDate('2024-01-14', '2024-01-15')).toBe(false);
    });
  });

  describe('isPastDate', () => {
    it('과거 날짜는 true를 반환해야 함', () => {
      expect(isPastDate('2024-01-14', '2024-01-15')).toBe(true);
    });

    it('오늘 날짜는 false를 반환해야 함', () => {
      expect(isPastDate('2024-01-15', '2024-01-15')).toBe(false);
    });

    it('미래 날짜는 false를 반환해야 함', () => {
      expect(isPastDate('2024-01-16', '2024-01-15')).toBe(false);
    });
  });

  describe('isToday', () => {
    it('오늘 날짜는 true를 반환해야 함', () => {
      expect(isToday('2024-01-15', '2024-01-15')).toBe(true);
    });

    it('다른 날짜는 false를 반환해야 함', () => {
      expect(isToday('2024-01-14', '2024-01-15')).toBe(false);
      expect(isToday('2024-01-16', '2024-01-15')).toBe(false);
    });
  });
});
