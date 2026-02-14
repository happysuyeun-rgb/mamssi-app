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
    it('약관 문구 클릭 시 회원약관 모달이 열려야 함', async () => {
      render(<SignupOnboardingStep {...defaultProps} />);

      const termsLink = screen.getByRole('button', {
        name: /서비스 이용약관 및 개인정보 처리방침에 동의합니다/,
      });
      expect(termsLink).toBeInTheDocument();

      await userEvent.click(termsLink);

      // 모달 제목이 표시되어야 함
      expect(screen.getByRole('dialog', { name: /서비스 이용약관/ })).toBeInTheDocument();
      expect(screen.getByText('서비스 이용약관')).toBeInTheDocument();
    });

    it('약관 문구 클릭 시 체크박스는 체크되지 않아야 함', async () => {
      render(<SignupOnboardingStep {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const requiredCheckbox = checkboxes[1]; // (필수) 약관 체크박스
      const termsLink = screen.getByRole('button', {
        name: /서비스 이용약관 및 개인정보 처리방침에 동의합니다/,
      });

      expect(requiredCheckbox).not.toBeChecked();

      // 문구 클릭 (모달만 열리고 체크박스는 변하지 않음)
      await userEvent.click(termsLink);

      expect(requiredCheckbox).not.toBeChecked();
    });

    it('체크박스 클릭 시에만 체크되어야 함', async () => {
      render(<SignupOnboardingStep {...defaultProps} />);

      const requiredCheckbox = screen.getAllByRole('checkbox')[1];
      expect(requiredCheckbox).not.toBeChecked();

      await userEvent.click(requiredCheckbox);
      expect(requiredCheckbox).toBeChecked();
    });

    it('약관 모달에서 확인 클릭 시 체크박스가 체크되어야 함', async () => {
      render(<SignupOnboardingStep {...defaultProps} />);

      const requiredCheckbox = screen.getAllByRole('checkbox')[1];
      const termsLink = screen.getByRole('button', {
        name: /서비스 이용약관 및 개인정보 처리방침에 동의합니다/,
      });

      expect(requiredCheckbox).not.toBeChecked();

      await userEvent.click(termsLink);
      const confirmBtn = screen.getByRole('button', { name: '확인' });
      await userEvent.click(confirmBtn);

      expect(requiredCheckbox).toBeChecked();
    });

    it('전체동의 선택 시 모든 체크박스가 선택되어야 함', async () => {
      render(<SignupOnboardingStep {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const allCheckbox = checkboxes[0];
      const requiredCheckbox = checkboxes[1];
      const optionalCheckbox = checkboxes[2];

      expect(allCheckbox).not.toBeChecked();
      expect(requiredCheckbox).not.toBeChecked();
      expect(optionalCheckbox).not.toBeChecked();

      await userEvent.click(allCheckbox);

      expect(allCheckbox).toBeChecked();
      expect(requiredCheckbox).toBeChecked();
      expect(optionalCheckbox).toBeChecked();
    });
  });
});
