/**
 * 안전한 Storage 래퍼
 * 프라이빗 모드/권한 에러 등에서 localStorage 예외 발생 시 무시하고 null 반환
 */

const memoryStorage: Record<string, string> = {};

/**
 * 안전한 localStorage.getItem (fallback: memoryStorage)
 */
export function safeGetItem(key: string): string | null {
  try {
    if (typeof localStorage === 'undefined') {
      return memoryStorage[key] || null;
    }
    return localStorage.getItem(key);
  } catch (err) {
    // 프라이빗 모드, 쿠키 차단 등에서 발생할 수 있는 예외 무시
    return memoryStorage[key] || null;
  }
}

/**
 * 안전한 localStorage.setItem (fallback: memoryStorage)
 */
export function safeSetItem(key: string, value: string): void {
  try {
    if (typeof localStorage === 'undefined') {
      memoryStorage[key] = value;
      return;
    }
    localStorage.setItem(key, value);
  } catch (err) {
    // 프라이빗 모드, 쿠키 차단 등에서 발생할 수 있는 예외 무시
    memoryStorage[key] = value;
  }
}

/**
 * 안전한 localStorage.removeItem (fallback: memoryStorage)
 */
export function safeRemoveItem(key: string): void {
  try {
    if (typeof localStorage === 'undefined') {
      delete memoryStorage[key];
      return;
    }
    localStorage.removeItem(key);
  } catch (err) {
    // 프라이빗 모드, 쿠키 차단 등에서 발생할 수 있는 예외 무시
    delete memoryStorage[key];
  }
}

/**
 * Storage 접근성 테스트
 */
export function testStorageAccess(): { available: boolean; type: 'localStorage' | 'memory' } {
  try {
    if (typeof localStorage === 'undefined') {
      return { available: false, type: 'memory' };
    }
    const testKey = '__maeumssi_storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return { available: true, type: 'localStorage' };
  } catch {
    return { available: false, type: 'memory' };
  }
}

export const safeStorage = {
  getItem: safeGetItem,
  setItem: safeSetItem,
  removeItem: safeRemoveItem,
  test: testStorageAccess
};













