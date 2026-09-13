import { fetchJson } from '@/frontend/lib/api/client';

/**
 * Load tournaments from the API. When refresh is true, backend re-scrapes public racecards.
 */
export async function fetchTournamentsList({
  refresh = false,
  forHome = false,
  timeoutMs = refresh ? 120000 : 30000,
} = {}) {
  const params = new URLSearchParams();
  if (refresh) params.set('refresh', '1');
  if (forHome) params.set('for_home', '1');
  const qs = params.toString();
  return fetchJson(`/tournaments${qs ? `?${qs}` : ''}`, { cache: 'no-store', timeoutMs });
}

export function fetchTournamentDetail(slug, { refresh = false, timeoutMs = refresh ? 120000 : 30000 } = {}) {
  const qs = refresh ? '?refresh=1' : '';
  return fetchJson(`/tournaments/${encodeURIComponent(slug)}${qs}`, { cache: 'no-store', timeoutMs });
}

