/**
 * Analytics Wrapper - Mixpanel
 *
 * Amplitude 등으로 전환 가능한 추상화 레이어.
 * 민감정보(감정 원문, 검사결과, PII 등)는 절대 수집하지 않음.
 */

import mixpanel from 'mixpanel-browser';

let initialized = false;

/**
 * Mixpanel 초기화. 앱 엔트리에서 1회만 호출.
 */
export function initAnalytics(): void {
  const token = import.meta.env.VITE_MIXPANEL_TOKEN;

  if (!token || typeof token !== 'string' || token.trim() === '') {
    if (import.meta.env.DEV) {
      console.warn('[analytics] VITE_MIXPANEL_TOKEN 미설정 - 이벤트 미전송');
    }
    return;
  }

  if (initialized) return;
  initialized = true;

  const isDev = import.meta.env.DEV;
  mixpanel.init(token, {
    debug: isDev,
    ignore_dnt: false,
  });

  // 앱 첫 진입(세션 시작) 이벤트
  trackEvent('app_open', { entry_point: 'web' });
}

/**
 * 커스텀 이벤트 전송
 * @param name 이벤트명
 * @param props 허용 속성만 (text, content, 진단결과, PII 등 금지)
 */
export function trackEvent(name: string, props?: Record<string, unknown>): void {
  if (!initialized) return;

  try {
    mixpanel.track(name, props ?? {});
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[analytics] trackEvent 실패:', name, err);
    }
  }
}

/**
 * 사용자 식별 (로그인 성공 시)
 */
export function identifyUser(userId: string, props?: Record<string, unknown>): void {
  if (!initialized) return;

  try {
    mixpanel.identify(userId);
    if (props && Object.keys(props).length > 0) {
      mixpanel.people.set(props);
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[analytics] identifyUser 실패:', err);
    }
  }
}

/**
 * 사용자 세션 초기화 (로그아웃 시)
 */
export function resetUser(): void {
  if (!initialized) return;

  try {
    mixpanel.reset();
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[analytics] resetUser 실패:', err);
    }
  }
}
