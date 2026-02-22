import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignupOnboardingStep from './SignupOnboardingStep';

const mockOnBack = vi.fn();
const mockOnSocialClick = vi.fn();
const mockOnOpenLogin = vi.fn();

const defaultProps = {
  onBack: mockOnBack,
  onSocialClick: mockOnSocialClick,
  onOpenLogin: mockOnOpenLogin,
};

describe('SignupOnboardingStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('회원약관 모달', () => {
    it('서비스 이용약관 문구 클릭 시 모달이 열려야 함', async () => {
      render(<SignupOnboardingStep {...defaultProps} />);

      const termsLink = screen.getByRole('button', {
        name: /서비스 이용약관에 동의합니다/,
      });
      expect(termsLink).toBeInTheDocument();

      await userEvent.click(termsLink);

      expect(screen.getByRole('dialog', { name: /서비스 이용약관/ })).toBeInTheDocument();
      expect(screen.getByText('서비스 이용약관')).toBeInTheDocument();
    });

    it('개인정보 처리방침 문구 클릭 시 모달이 열려야 함', async () => {
      render(<SignupOnboardingStep {...defaultProps} />);

      const privacyLink = screen.getByRole('button', {
        name: /개인정보 처리방침에 동의합니다/,
      });
      await userEvent.click(privacyLink);

      expect(screen.getByRole('dialog', { name: /개인정보 처리방침/ })).toBeInTheDocument();
      expect(screen.getByText('개인정보 처리방침')).toBeInTheDocument();
    });

    it('약관 문구 클릭 시 체크박스는 체크되지 않아야 함', async () => {
      render(<SignupOnboardingStep {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const termsCheckbox = checkboxes[1];
      const termsLink = screen.getByRole('button', { name: /서비스 이용약관에 동의합니다/ });

      expect(termsCheckbox).not.toBeChecked();
      await userEvent.click(termsLink);
      expect(termsCheckbox).not.toBeChecked();
    });

    it('체크박스 클릭 시에만 체크되어야 함', async () => {
      render(<SignupOnboardingStep {...defaultProps} />);

      const termsCheckbox = screen.getAllByRole('checkbox')[1];
      expect(termsCheckbox).not.toBeChecked();
      await userEvent.click(termsCheckbox);
      expect(termsCheckbox).toBeChecked();
    });

    it('약관 모달에서 확인 클릭 시 해당 체크박스가 체크되어야 함', async () => {
      render(<SignupOnboardingStep {...defaultProps} />);

      const termsCheckbox = screen.getAllByRole('checkbox')[1];
      const termsLink = screen.getByRole('button', { name: /서비스 이용약관에 동의합니다/ });

      expect(termsCheckbox).not.toBeChecked();
      await userEvent.click(termsLink);
      const confirmBtn = screen.getByRole('button', { name: '확인' });
      await userEvent.click(confirmBtn);
      expect(termsCheckbox).toBeChecked();
    });

    it('전체동의 선택 시 모든 체크박스가 선택되어야 함', async () => {
      render(<SignupOnboardingStep {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const allCheckbox = checkboxes[0];
      const termsCheckbox = checkboxes[1];
      const privacyCheckbox = checkboxes[2];
      const optionalCheckbox = checkboxes[3];

      expect(allCheckbox).not.toBeChecked();
      expect(termsCheckbox).not.toBeChecked();
      expect(privacyCheckbox).not.toBeChecked();
      expect(optionalCheckbox).not.toBeChecked();

      await userEvent.click(allCheckbox);

      expect(allCheckbox).toBeChecked();
      expect(termsCheckbox).toBeChecked();
      expect(privacyCheckbox).toBeChecked();
      expect(optionalCheckbox).toBeChecked();
    });
  });
});
