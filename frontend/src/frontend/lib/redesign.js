/**
 * Shared helpers for the redesigned UI: art lookup, status/phase display,
 * date formatting. Pure functions — no API calls.
 */
import { staticFile } from '@/frontend/lib/config/paths';
import { getTournamentPhase, PHASE } from '@/frontend/lib/tournamentState';

/**
 * Legacy photographic art converted from images already in the repository
 * (public/Img, public/images, public/figma). Their original author / licence is
 * not documented, so they are NOT rendered on public surfaces any more; the UI
 * uses CSS-only artwork (NeonTrack, strategy stages). Kept only for reference.
 */
export const ART = {
  hero1920: staticFile('/redesign/hero-jockey-1920.webp'),
  hero1280: staticFile('/redesign/hero-jockey-1280.webp'),
  hero760: staticFile('/redesign/hero-jockey-760.webp'),
  heroPortrait: staticFile('/redesign/hero-jockey-portrait-900.webp'),
  tournamentHero: staticFile('/redesign/tournament-hero-1600.webp'),
  rankingHero: staticFile('/redesign/ranking-hero-1600.webp'),
  liveStrip: staticFile('/redesign/live-strip-1600.webp'),
  jockeyPurple: staticFile('/redesign/jockey-purple.webp'),
  jockeyCyan: staticFile('/redesign/jockey-cyan.webp'),
  jockeyGold: staticFile('/redesign/jockey-gold.webp'),
};

const TRACK_ART = [
  ['santa anita', '/redesign/track-santa-anita.webp'],
  ['santa-anita', '/redesign/track-santa-anita.webp'],
  ['gulfstream', '/redesign/track-gulfstream.webp'],
  ['churchill', '/redesign/track-churchill.webp'],
  ['saratoga', '/redesign/track-saratoga.webp'],
];

/** Racing photograph for a tournament/track. Decorative; never a data claim. */
export function trackArt(tournament) {
  const hay = `${tournament?.track || ''} ${tournament?.name || ''} ${tournament?.slug || ''}`.toLowerCase();
  const hit = TRACK_ART.find(([k]) => hay.includes(k));
  return staticFile(hit ? hit[1] : '/redesign/track-generic.webp');
}

function sameLocalDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** First post time of a tournament, from its races (real data only). */
export function firstPostTime(tournament) {
  const times = (tournament?.races || [])
    .filter((r) => r.scheduledTime && r.scheduledTime !== 'TBD')   // new Date(null) would be 1970
    .map((r) => new Date(r.scheduledTime))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => a - b);
  return times[0] || null;
}

/**
 * Display status for a tournament card / hero, derived from the backend
 * status (authoritative) plus the first post time for the "today" nuance.
 * Returns { key: live|today|upcoming|finished|archived, es, en }.
 */
export function displayStatus(tournament, now = new Date()) {
  const phase = getTournamentPhase(tournament);
  if (phase === PHASE.LIVE) return { key: 'live', es: 'En vivo', en: 'Live' };
  if (phase === PHASE.COMPLETED) return { key: 'finished', es: 'Finalizado', en: 'Finished' };
  if (phase === PHASE.ARCHIVED) return { key: 'archived', es: 'Archivado', en: 'Archived' };
  if (phase === PHASE.CANCELLED) return { key: 'cancelled', es: 'Cancelado', en: 'Cancelled' };
  const first = firstPostTime(tournament) || (tournament?.date ? new Date(tournament.date) : null);
  if (first && sameLocalDay(first, now)) return { key: 'today', es: 'Hoy', en: 'Today' };
  return { key: 'upcoming', es: 'Próximo', en: 'Upcoming' };
}

export function formatDateLong(value, isEn) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  // A date-only value (the meeting day at UTC midnight) is a calendar date: never shift it by the viewer's zone.
  const dateOnly = typeof value === 'string' && /T00:00:00(\.0+)?(Z|\+00:00)$/.test(value);
  return d.toLocaleDateString(isEn ? 'en-GB' : 'es-ES', {
    weekday: 'short', day: 'numeric', month: 'short', ...(dateOnly ? { timeZone: 'UTC' } : {}),
  });
}

export function formatTime(value, isEn) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString(isEn ? 'en-GB' : 'es-ES', { hour: '2-digit', minute: '2-digit' });
}

/** The seven tournament races, ordered (tournament index 1..7). */
export function tournamentRaces(tournament) {
  const sorted = (tournament?.races || []).slice().sort((a, b) => (a.raceNumber || 0) - (b.raceNumber || 0));
  return sorted.length > 7 ? sorted.slice(-7) : sorted;
}
