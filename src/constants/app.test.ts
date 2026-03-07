import { describe, it, expect } from 'vitest';
import { SUPPORT_EMAIL } from './app';

describe('app constants', () => {
  it('SUPPORT_EMAIL이 mamssi.official@gmail.com으로 설정되어 있음', () => {
    expect(SUPPORT_EMAIL).toBe('mamssi.official@gmail.com');
  });

  it('고객문의/신고 mailto URL에 수신 이메일이 올바르게 포함됨', () => {
    const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=test&body=test`;
    expect(mailtoUrl).toContain('mamssi.official@gmail.com');
    expect(mailtoUrl).toMatch(/^mailto:mamssi\.official@gmail\.com/);
  });
});
