import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { useNotify } from '@providers/NotifyProvider';

/**
 * 쓰기 액션(기록/공감/신고/프로필 수정 등)을 위한 권한 체크 훅
 * 게스트가 쓰기 액션을 시도하면 로그인 유도 모달/토스트를 표시합니다.
 */
export function useActionGuard() {
  const { session, isGuest } = useAuth();
  const notify = useNotify();
  const navigate = useNavigate();

  /**
   * 쓰기 액션을 실행하기 전에 로그인 상태를 체크합니다.
   * @param actionName 액션 이름 (로깅/디버깅용)
   * @param onAllowed 로그인 상태일 때 실행할 콜백 함수
   * @param options 추가 옵션 (토스트만 표시할지, 모달을 표시할지 등)
   */
  const requireAuthForAction = useCallback(
    (
      actionName: string,
      onAllowed: () => void | Promise<void>,
      options?: {
        useModal?: boolean; // true면 모달, false면 토스트만 (기본값: true)
        customMessage?: string; // 커스텀 메시지
      }
    ) => {
      // 로그인 상태면 바로 실행
      if (session && !isGuest) {
        onAllowed();
        return;
      }

      // 게스트 또는 미로그인 상태
      const useModal = options?.useModal !== false; // 기본값은 true

      if (useModal) {
        // 모달로 로그인 유도
        notify.modal({
          title: '마음,씨에 가입하고 정원을 키워볼까요? 🌱',
          message:
            options?.customMessage ||
            '기록을 저장하고, 공감을 주고받으려면 로그인 또는 가입이 필요해요.',
          confirmLabel: '로그인/가입 하기',
          cancelLabel: '나중에 할게요',
          onConfirm: () => {
            navigate('/onboarding', { replace: true });
          }
        });
      } else {
        // 토스트만 표시
        notify.warning('로그인이 필요해요 💧', '💧');
      }
    },
    [session, isGuest, notify, navigate]
  );

  return { requireAuthForAction };
}









