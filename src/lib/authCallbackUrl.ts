/**
 * OAuth 콜백 URL (환경에 따라 동적 생성)
 * - localhost 하드코딩 금지: window.location.origin 사용
 * - 배포 환경(Vercel 등)에서 모바일 리다이렉트 시 ERR_CONNECTION_REFUSED 방지
 */
export function getAuthCallbackUrl(): string {
  return `${window.location.origin}/auth/callback`;
}
