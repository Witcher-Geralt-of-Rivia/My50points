/**
 * Proxy /api/* to the FastAPI backend (server-side).
 * Set API_BACKEND_URL on Vercel to your Render URL (no trailing slash).
 */

/** Allow slow racing sync on Vercel (requires Pro for >10s on some plans). */
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

import { getServerBackendUrl } from '@/frontend/lib/config/api';

const BACKEND = getServerBackendUrl();

function targetUrl(pathSegments, search) {
  const base = BACKEND.replace(/\/$/, '');
  const path = pathSegments.join('/');
  return `${base}/api/${path}${search}`;
}

async function proxy(request, context) {
  const { path } = await context.params;
  const segments = Array.isArray(path) ? path : [];
  const search = new URL(request.url).search;
  const url = targetUrl(segments, search);

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'host') return;
    headers.set(key, value);
  });

  const init = {
    method: request.method,
    headers,
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  const isRacingSync = search.includes('refresh=1');
  const isHomeList = search.includes('for_home=1');
  const timeoutMs = isRacingSync ? 120000 : isHomeList ? 45000 : 30000;

  const res = await fetch(url, {
    ...init,
    cache: 'no-store',
    signal: AbortSignal.timeout(timeoutMs),
  });
  const outHeaders = new Headers(res.headers);
  outHeaders.delete('content-encoding');
  if (isRacingSync) {
    outHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  }

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: outHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
