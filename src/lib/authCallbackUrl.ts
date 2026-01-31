/**
 * OAuth 콜백 URL (환경에 따라 동적 생성)
 * - path 기반 /auth/callback 사용 (모바일 OAuth에서 hash 제거 이슈 방지)
 * - vercel.json rewrite로 /auth/callback → index.html 처리
 */
export function getAuthCallbackUrl(): string {
  return `${window.location.origin}/auth/callback`;
}
