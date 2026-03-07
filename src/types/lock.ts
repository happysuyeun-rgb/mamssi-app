export type LockSettings = {
  enabled: boolean;
  pin: string; // 4자리 숫자
  biometricEnabled: boolean; // 생체인증 허용 여부
  createdAt?: string; // 최초 설정 일시
  updatedAt?: string; // 마지막 수정 일시
};

export type LockState = {
  isLocked: boolean;
  unlockAttempts: number;
  lastUnlockAt?: string;
};

export const LOCK_STORAGE_KEY = 'ms_lock';
export const LOCK_SESSION_KEY = 'ms_lock_session_unlocked';

export const defaultLockSettings: LockSettings = {
  enabled: false,
  pin: '',
  biometricEnabled: false,
};
