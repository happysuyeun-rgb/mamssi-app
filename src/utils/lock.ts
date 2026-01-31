import { lsGet, lsSet } from './storage';
import type { LockSettings } from '@domain/lock';
import { LOCK_SESSION_KEY, LOCK_STORAGE_KEY, defaultLockSettings } from '@domain/lock';

export function normalizeLockSettings(raw?: Partial<LockSettings> | null): LockSettings {
  if (!raw) return { ...defaultLockSettings };
  const mode = raw.mode === 'pin' ? 'pin' : 'pattern';
  const pattern = Array.isArray(raw.pattern) ? raw.pattern : [];
  const pin = typeof raw.pin === 'string' ? raw.pin : '';
  const biometricEnabled = Boolean(raw.biometricEnabled);
  return {
    ...defaultLockSettings,
    ...raw,
    mode,
    pattern,
    pin,
    biometricEnabled,
  };
}

export function loadLockSettings(): LockSettings {
  const stored = lsGet<LockSettings>(LOCK_STORAGE_KEY, defaultLockSettings);
  const normalized = normalizeLockSettings(stored);
  const requiresUpdate =
    stored.mode !== normalized.mode ||
    stored.pin !== normalized.pin ||
    stored.enabled !== normalized.enabled ||
    stored.biometricEnabled !== normalized.biometricEnabled ||
    JSON.stringify(stored.pattern ?? []) !== JSON.stringify(normalized.pattern);
  if (requiresUpdate) {
    saveLockSettings(normalized);
  }
  return normalized;
}

export function saveLockSettings(next: LockSettings) {
  lsSet(LOCK_STORAGE_KEY, next);
}

/**
 * 로그아웃 시 잠금 설정 초기화
 * - localStorage의 잠금 설정을 비활성화
 * - sessionStorage의 잠금 해제 상태 제거
 */
export function clearLockOnSignOut() {
  saveLockSettings(defaultLockSettings);
  try {
    sessionStorage.removeItem(LOCK_SESSION_KEY);
  } catch {
    // sessionStorage 접근 실패 시 무시
  }
}
