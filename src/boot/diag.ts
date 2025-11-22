/**
 * 진단 로그 시스템
 * 앱 부팅 및 라우팅 가드 디버깅용
 */

export const diag = {
  log: (...args: unknown[]) => {
    console.log('[MAEUMSSI]', ...args);
  },
  err: (...args: unknown[]) => {
    console.error('[MAEUMSSI][ERR]', ...args);
  },
  warn: (...args: unknown[]) => {
    console.warn('[MAEUMSSI][WARN]', ...args);
  }
};

// 전역 객체로도 접근 가능 (브라우저 콘솔에서)
if (typeof window !== 'undefined') {
  (window as any).__maeumssi_diag = diag;
}


