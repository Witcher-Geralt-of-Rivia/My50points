/**
 * No hardcoded backend host. The API base comes only from the configured
 * environment (API_BACKEND_URL / NEXT_PUBLIC_API_URL); when it is missing the
 * app uses the same-origin /api proxy instead of guessing a remote backend.
 */

/**
 * Inlined at build time. On Vercel, set API_BACKEND_URL — next.config copies it here.
 */
export const PUBLIC_API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_BACKEND_URL ||
  ''
).replace(/\/$/, '');

export function isLocalApiUrl(url) {
  if (!url) return true;
  return url.includes('localhost') || url.includes('127.0.0.1');
}

export function resolvePublicApiUrl() {
  if (PUBLIC_API_URL && !isLocalApiUrl(PUBLIC_API_URL)) {
    return PUBLIC_API_URL;
  }
  // Server-side default (localhost in dev, API_BACKEND_URL on the host).
  return getServerBackendUrl();
}

/**
 * Backend base URL for server-side fetch (SSR, API route proxy).
 * Uses 127.0.0.1 instead of localhost to avoid Windows IPv6 EACCES errors.
 */
export function getServerBackendUrl() {
  let base =
    process.env.API_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://127.0.0.1:8000';
  base = base.replace(/\/$/, '');
  if (base.includes('://localhost')) {
    base = base.replace('://localhost', '://127.0.0.1');
  }
  return base;
}
