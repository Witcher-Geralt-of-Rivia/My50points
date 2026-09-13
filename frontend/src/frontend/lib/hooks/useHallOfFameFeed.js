'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { buildHallOfFameNewsFeed } from '@/frontend/lib/data/hallOfFameData';
import { fetchJson } from '@/frontend/lib/api/client';

const ROTATE_MS = 4500;
const REFRESH_MS = 20000;

function mergeLeaderboardIntoFeed(feed, legends, isEn) {
  if (!legends?.length) return feed;
  const extra = legends.slice(0, 3).map((p, i) => ({
    id: `live-${p.username}-${i}`,
    type: i === 0 ? 'entry' : 'record',
    player: (p.username || 'Player').toUpperCase(),
    playerColor: p.avatarColor || '#7c3aed',
    points: p.totalPoints,
    date: new Date().toLocaleDateString(isEn ? 'en-US' : 'es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).toUpperCase(),
    dateISO: new Date().toISOString().slice(0, 10),
    live: true,
  }));
  const ids = new Set(feed.map((x) => x.player));
  const novel = extra.filter((x) => !ids.has(x.player));
  if (!novel.length) return feed;
  return [...novel, ...feed];
}

/**
 * Rotating Hall of Fame news feed — cycles items and refreshes from leaderboard.
 */
export function useHallOfFameFeed(isEn = false) {
  const [items, setItems] = useState(() => buildHallOfFameNewsFeed(isEn));
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const refreshFromApi = useCallback(async () => {
    try {
      const data = await fetchJson('/leaderboard?limit=5', {
        cache: 'no-store',
        timeoutMs: 12000,
      });
      const legends = data?.legends || [];
      setItems((prev) => mergeLeaderboardIntoFeed(buildHallOfFameNewsFeed(isEn), legends, isEn));
    } catch {
      /* keep mock feed */
    }
  }, [isEn]);

  useEffect(() => {
    setItems(buildHallOfFameNewsFeed(isEn));
    refreshFromApi();
  }, [isEn, refreshFromApi]);

  useEffect(() => {
    const refreshId = setInterval(refreshFromApi, REFRESH_MS);
    return () => clearInterval(refreshId);
  }, [refreshFromApi]);

  useEffect(() => {
    const rotateId = setInterval(() => {
      setItems((prev) => {
        if (prev.length < 2) return prev;
        return [...prev.slice(1), prev[0]];
      });
    }, ROTATE_MS);
    return () => clearInterval(rotateId);
  }, []);

  return items;
}
