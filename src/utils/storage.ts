// 메모리 스토리지 fallback
const memoryStorage: Record<string, string> = {};

/**
 * 안전한 localStorage.getItem (fallback: memoryStorage)
 */
function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (err) {
    console.warn('localStorage.getItem 실패, 메모리 스토리지 사용:', err);
    return memoryStorage[key] || null;
  }
}

/**
 * 안전한 localStorage.setItem (fallback: memoryStorage)
 */
function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.warn('localStorage.setItem 실패, 메모리 스토리지 사용:', err);
    memoryStorage[key] = value;
  }
}

/**
 * 안전한 localStorage.removeItem (fallback: memoryStorage)
 */
function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn('localStorage.removeItem 실패, 메모리 스토리지 사용:', err);
    delete memoryStorage[key];
  }
}

export function getJson<T>(key: string, fallback: T): T {
  try {
    const raw = safeGetItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function setJson<T>(key: string, value: T): void {
  try {
    safeSetItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('setJson 실패:', err);
  }
}

export function lsGet<T>(key: string, defaultValue: T): T {
  try {
    const v = safeGetItem(key);
    return v ? (JSON.parse(v) as T) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function lsSet<T>(key: string, value: T) {
  try {
    safeSetItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('lsSet 실패:', err);
  }
}

export function lsRemove(key: string) {
  safeRemoveItem(key);
}

// safeStorage 래퍼 export
export const safeStorage = {
  getItem: safeGetItem,
  setItem: safeSetItem,
  removeItem: safeRemoveItem,
};
