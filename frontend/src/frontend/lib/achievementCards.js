/** Collectible achievement cards (tournament wins, podium, record ties). */

import { getApiBase } from '@/frontend/lib/api/client';

export const CARD_TYPES = {
  TOURNAMENT_WINNER: 'tournament_winner',
  TOURNAMENT_SECOND: 'tournament_second',
  TOURNAMENT_THIRD: 'tournament_third',
  RECORD_EQUAL: 'record_equal',
};

const STORAGE_PREFIX = '50points-achievement-cards';

function storageKey(userId) {
  return `${STORAGE_PREFIX}-${userId || 'guest'}`;
}

export function getAchievementCards(userId) {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey(userId));
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveCards(userId, cards) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(cards));
  } catch {
    /* quota */
  }
}

export function cardExists(userId, cardId) {
  return getAchievementCards(userId).some((c) => c.id === cardId);
}

/**
 * Add a card to the gallery. Returns the card if newly added, null if duplicate.
 */
export function syncAchievementCardToServer(card) {
  if (typeof window === 'undefined' || !card?.id) return;
  const token = localStorage.getItem('50points_token');
  if (!token) return;
  // Only the configured backend. A legacy host fallback used to receive the
  // user's bearer token as well; it was removed for security.
  fetch(`${getApiBase()}/profile/achievement-cards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(card),
  }).catch(() => {});
}

export function addAchievementCard(userId, card) {
  if (!userId || !card?.id) return null;
  const list = getAchievementCards(userId);
  if (list.some((c) => c.id === card.id)) return null;
  const entry = { ...card, earnedAt: card.earnedAt || new Date().toISOString() };
  saveCards(userId, [entry, ...list]);
  syncAchievementCardToServer(entry);
  return entry;
}

export function buildTournamentCard({ place, user, tournament }) {
  const type =
    place === 1
      ? CARD_TYPES.TOURNAMENT_WINNER
      : place === 2
        ? CARD_TYPES.TOURNAMENT_SECOND
        : CARD_TYPES.TOURNAMENT_THIRD;

  const points = place === 1 ? 50 : place === 2 ? 50 : 25;
  const date = tournament?.date
    ? new Date(tournament.date).toLocaleDateString('es-ES', {
        timeZone: 'UTC',
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).toUpperCase()
    : '18 MAY 2026';

  return {
    id: `tournament-${tournament?.slug || 'unknown'}-p${place}-${user?.id}`,
    type,
    place,
    playerName: (user?.username || 'JUGADOR').toUpperCase(),
    playerColor: user?.avatarColor || '#fbbf24',
    tournamentName: tournament?.name || 'Torneo',
    tournamentSlug: tournament?.slug,
    track: (tournament?.track || 'LA RINCONADA').toUpperCase(),
    location: tournament?.location,
    date,
    points,
  };
}

export function buildRecordEqualCard({ user, feat, points }) {
  return {
    id: `record-${feat?.id || 'feat'}-${user?.id}`,
    type: CARD_TYPES.RECORD_EQUAL,
    place: 2,
    playerName: (user?.username || 'JUGADOR').toUpperCase(),
    playerColor: user?.avatarColor || '#06b6d4',
    featName: feat?.name,
    featNameEn: feat?.nameEn,
    track: 'LA RINCONADA',
    date: new Date().toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).toUpperCase(),
    points: points ?? feat?.threshold ?? 1000,
  };
}

export function awardTournamentPlace({ userId, user, tournament, place }) {
  if (!userId || !place || place < 1 || place > 3) return null;
  const card = buildTournamentCard({ place, user, tournament });
  return addAchievementCard(userId, card);
}

export function awardRecordEqual({ userId, user, feat, points }) {
  if (!userId || !feat) return null;
  const card = buildRecordEqualCard({ user, feat, points });
  return addAchievementCard(userId, card);
}

/** Best leaderboard rank for the current user (lowest position number). */
export function getUserTournamentPlace(rankingData, userId) {
  if (!rankingData?.players?.length || !userId) return null;
  const uid = String(userId);
  const positions = rankingData.players
    .filter((p) => p.id === uid && typeof p.position === 'number')
    .map((p) => p.position);
  if (!positions.length) return null;
  return Math.min(...positions);
}
