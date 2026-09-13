'use client';

import { useEffect, useRef } from 'react';
import { fetchTournamentsList } from '@/frontend/lib/api/tournaments';
import { mapTournamentForHomeCard } from '@/frontend/lib/api/mappers';
import { ROUTE_CHANGE_EVENT } from '@/frontend/lib/navigationCache';

/** How often the UI pulls latest DB data (backend scrapes every ~8s). */
export const LIVE_DATA_POLL_MS = 8000;

/**
 * Poll tournaments from the API and push updates to the UI (no page refresh).
 * Uses refresh=false — backend background job keeps the database current.
 */
export function useLiveTournamentsPoll({
  enabled = true,
  forHome = false,
  mapFn = mapTournamentForHomeCard,
  onData,
  onLoadingChange,
  pollMs = LIVE_DATA_POLL_MS,
}) {
  const onDataRef = useRef(onData);
  const onLoadingRef = useRef(onLoadingChange);

  onDataRef.current = onData;
  onLoadingRef.current = onLoadingChange;

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;
    let inFlight = false;

    async function tick() {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        const res = await fetchTournamentsList({
          refresh: false,
          forHome,
          timeoutMs: 30000,
        });
        if (cancelled) return;
        const list = Array.isArray(res?.tournaments) ? res.tournaments : [];
        onDataRef.current?.(list.map(mapFn), res);
        onLoadingRef.current?.(false);
      } catch {
        /* keep last good data */
      } finally {
        inFlight = false;
      }
    }

    tick();
    const id = setInterval(tick, pollMs);

    const onRouteChange = () => {
      tick();
    };
    window.addEventListener(ROUTE_CHANGE_EVENT, onRouteChange);

    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener(ROUTE_CHANGE_EVENT, onRouteChange);
    };
  }, [enabled, forHome, mapFn, pollMs]);
}
