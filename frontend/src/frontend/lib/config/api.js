/** Production Render API — used when env vars are missing from the client bundle. */
export const PRODUCTION_API_URL = 'https://backend-production-7512.up.railway.app';

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
  return PRODUCTION_API_URL;
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
