import { describe, it, expect } from 'vitest';

// 씨앗 이름 유효성 검사 함수
export function validateSeedName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim();

  if (!trimmed) {
    return { valid: false, error: '씨앗 이름을 입력해주세요.' };
  }

  if (trimmed.length > 10) {
    return { valid: false, error: '씨앗 이름은 10자 이내로 입력해주세요.' };
  }

  return { valid: true };
}

// 닉네임 유효성 검사 함수
export function validateNickname(nickname: string): { valid: boolean; error?: string } {
  const trimmed = nickname.trim();

  if (!trimmed) {
    return { valid: false, error: '닉네임을 비워둘 수는 없어요' };
  }

  if (trimmed.length > 12) {
    return { valid: false, error: '닉네임은 1~12자로 입력해 주세요' };
  }

  const forbidden = ['시발', '씨발', '개새', '좆', 'fuck', 'shit'];
  if (forbidden.some((w) => trimmed.toLowerCase().includes(w))) {
    return { valid: false, error: '조금 더 다정한 닉네임으로 바꿔볼까요?' };
  }

  return { valid: true };
}

describe('validation', () => {
  describe('validateSeedName', () => {
    it('빈 문자열은 유효하지 않아야 함', () => {
      const result = validateSeedName('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('입력해주세요');
    });

    it('공백만 있는 문자열은 유효하지 않아야 함', () => {
      const result = validateSeedName('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('입력해주세요');
    });

    it('10자를 초과하면 유효하지 않아야 함', () => {
      const result = validateSeedName('12345678901'); // 11자
      expect(result.valid).toBe(false);
      expect(result.error).toContain('10자 이내');
    });

    it('10자 이하는 유효해야 함', () => {
      const result = validateSeedName('1234567890'); // 10자
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('1-9자는 유효해야 함', () => {
      const result = validateSeedName('봄비');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('앞뒤 공백은 제거되어야 함', () => {
      const result = validateSeedName('  봄비  ');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('validateNickname', () => {
    it('빈 문자열은 유효하지 않아야 함', () => {
      const result = validateNickname('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('비워둘 수는 없어요');
    });

    it('12자를 초과하면 유효하지 않아야 함', () => {
      const result = validateNickname('1234567890123'); // 13자
      expect(result.valid).toBe(false);
      expect(result.error).toContain('1~12자');
    });

    it('금지어가 포함되면 유효하지 않아야 함', () => {
      const result = validateNickname('시발놈');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('다정한 닉네임');
    });

    it('금지어는 대소문자 구분 없이 체크해야 함', () => {
      const result = validateNickname('FUCK123');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('다정한 닉네임');
    });

    it('1-12자는 유효해야 함', () => {
      const result = validateNickname('마음씨');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('정상적인 닉네임은 유효해야 함', () => {
      const result = validateNickname('햇살이');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });
});
