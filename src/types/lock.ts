export type LockMode = 'pattern' | 'pin';

export type LockSettings = {
  enabled: boolean;
  mode: LockMode;
  pattern: number[];
  pin: string; // 4자리 숫자
  biometricEnabled: boolean; // 생체인증 허용 여부
  createdAt?: string; // 최초 설정 일시
  updatedAt?: string; // 마지막 수정 일시
};

export type LockState = {
  isLocked: boolean; // 현재 잠금 상태
  unlockAttempts: number; // 연속 실패 횟수
  lastUnlockAt?: string; // 마지막 해제 일시
};

export const LOCK_STORAGE_KEY = 'ms_lock';
export const LOCK_SESSION_KEY = 'ms_lock_session_unlocked';

export const defaultLockSettings: LockSettings = {
  enabled: false,
  mode: 'pattern',
  pattern: [],
  pin: '',
  biometricEnabled: false
};

