/**
 * OAuth 콜백 URL (환경에 따라 동적 생성)
 * - HashRouter 사용 시 /#/auth/callback으로 리다이렉트하여 Vercel 404 방지
 * - path 기반 /auth/callback은 서버 경로 404 발생 → hash 기반으로 해결
 */
export function getAuthCallbackUrl(): string {
  return `${window.location.origin}/#/auth/callback`;
}
