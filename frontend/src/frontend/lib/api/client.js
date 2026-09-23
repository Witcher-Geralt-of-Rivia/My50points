import {
  PUBLIC_API_URL,
  isLocalApiUrl,
  resolvePublicApiUrl,
} from '@/frontend/lib/config/api';

function createTimeoutSignal(timeoutMs) {
  if (timeoutMs == null) return undefined;
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs);
  }
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  if (controller.signal.addEventListener) {
    controller.signal.addEventListener('abort', () => clearTimeout(id), { once: true });
  }
  return controller.signal;
}

/** API bases to try (browser), most reliable first. */
export function getApiBases() {
  if (typeof window === 'undefined') {
    return [`${resolvePublicApiUrl()}/api`];
  }

  const bases = [];

  // Only the configured backend is used. The previous host-based branch
  // injected a hardcoded backend ahead of this one on *.vercel.app, so the
  // deployment called the wrong API first.
  if (PUBLIC_API_URL && !isLocalApiUrl(PUBLIC_API_URL)) {
    bases.push(`${PUBLIC_API_URL}/api`);
  }

  bases.push('/api');

  return [...new Set(bases)];
}

export function getApiBase() {
  return getApiBases()[0];
}

export function getStoredToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('50points_token');
}

export function authHeaders(token) {
  const t = token ?? getStoredToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export async function fetchJson(path, options = {}) {
  const { cache, timeoutMs, signal: userSignal, bases: customBases, ...rest } = options;
  const pathPart = path.startsWith('http')
    ? path
    : path.startsWith('/')
      ? path
      : `/${path}`;

  const bases = customBases ?? getApiBases();
  const urls = path.startsWith('http')
    ? [path]
    : bases.map((base) => `${base.replace(/\/$/, '')}${pathPart}`);

  const effectiveTimeoutMs = timeoutMs ?? 10000;
  let lastError;
  for (const url of urls) {
    try {
      const timeoutSignal = createTimeoutSignal(effectiveTimeoutMs);
      const res = await fetch(url, {
        cache: cache ?? 'default',
        ...rest,
        signal: userSignal ?? timeoutSignal,
        headers: {
          'Content-Type': 'application/json',
          ...(cache === 'no-store' ? { 'Cache-Control': 'no-cache' } : {}),
          ...rest.headers,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data.detail || data.error || res.statusText || 'Request failed');
        err.status = res.status;
        err.data = data;
        throw err;
      }
      return data;
    } catch (err) {
      // The server answered (4xx/5xx): that answer is final. Falling through
      // to the next base would repeat the request — e.g. a second
      // POST /tickets/aggregate. Only network failures try the next base.
      if (err?.status) throw err;
      lastError = err;
    }
  }

  throw lastError ?? new Error('Request failed');
}

export async function fetchAuthJson(path, options = {}) {
  return fetchJson(path, {
    ...options,
    headers: {
      ...authHeaders(),
      ...options.headers,
    },
  });
}

export const API_BASE = getApiBase();
