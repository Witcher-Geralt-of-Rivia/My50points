/** Tracks global rank changes for ranking-update popups. */

const HISTORY_PREFIX = '50points-rank-history';
const LAST_RANK_PREFIX = '50points-last-rank';

function historyKey(userId) {
  return `${HISTORY_PREFIX}-${userId}`;
}

function lastRankKey(userId) {
  return `${LAST_RANK_PREFIX}-${userId}`;
}

export function getRankHistory(userId) {
  if (typeof window === 'undefined' || !userId) return [];
  try {
    const raw = localStorage.getItem(historyKey(userId));
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function recordRankSnapshot(userId, rank, points = 0) {
  if (typeof window === 'undefined' || !userId || !rank) return;
  const history = getRankHistory(userId);
  const entry = { rank, points, ts: Date.now() };
  const trimmed = [...history, entry].slice(-60);
  try {
    localStorage.setItem(historyKey(userId), JSON.stringify(trimmed));
    localStorage.setItem(lastRankKey(userId), String(rank));
  } catch {
    /* quota */
  }
}

export function getLastKnownRank(userId) {
  if (typeof window === 'undefined' || !userId) return null;
  const raw = localStorage.getItem(lastRankKey(userId));
  if (raw == null) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

/** Positive = climbed (e.g. was 31, now 24 → +7). */
export function getWeeklyPositionChange(userId, currentRank) {
  const history = getRankHistory(userId);
  if (!history.length || !currentRank) return 0;
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const baseline =
    [...history].reverse().find((h) => h.ts <= weekAgo) || history[0];
  if (!baseline?.rank) return 0;
  return baseline.rank - currentRank;
}

export function getNextRankGoal(currentRank) {
  if (!currentRank || currentRank <= 1) return 'TOP 1';
  if (currentRank <= 3) return 'TOP 1';
  if (currentRank <= 10) return 'TOP 3';
  if (currentRank <= 25) return 'TOP 10';
  return 'TOP 25';
}

export function detectRankImprovement(userId, newRank) {
  const prev = getLastKnownRank(userId);
  if (!prev || !newRank || newRank >= prev) {
    recordRankSnapshot(userId, newRank);
    return null;
  }
  const delta = prev - newRank;
  recordRankSnapshot(userId, newRank);
  return { previousRank: prev, currentRank: newRank, positionsGained: delta };
}
