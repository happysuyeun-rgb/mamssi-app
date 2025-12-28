import { lsGet, lsSet } from './storage';
import type { LockSettings } from '@domain/lock';
import { LOCK_STORAGE_KEY, defaultLockSettings } from '@domain/lock';

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
    biometricEnabled
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









