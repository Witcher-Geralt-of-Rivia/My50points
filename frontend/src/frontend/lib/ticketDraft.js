/**
 * Local ticket draft — the redesign's ticket contract.
 *
 * Before final confirmation every race selection lives ONLY here (browser
 * storage). Nothing in the draft is ever sent to the backend until the player
 * presses CONFIRMAR TICKET, which posts the complete 7-race ticket once to
 * /tickets/aggregate. Race navigation, strategy changes, "Guardar carrera" and
 * "Editar" only touch this store — no POST /tickets, no DELETE /tickets.
 *
 * Key: identity (user id) + tournament id + ticket number, so one player's
 * draft can never surface in another player's session on the same device.
 */

const PREFIX = 'my50:ticket-draft:v1';
const STRATEGY_IDS = new Set(['full', 'dual', 'smart']);
const MAX_PICKS = { full: 1, dual: 2, smart: 3 };

export function draftKey(identityId, tournamentId, ticketNumber) {
  if (!identityId || !tournamentId || !ticketNumber) return null;
  return `${PREFIX}:${identityId}:${tournamentId}:${ticketNumber}`;
}

export function emptyDraft() {
  return { v: 1, updatedAt: null, races: {} };
}

/** Read a draft and drop anything that no longer matches the tournament. */
export function loadDraft(key, races = []) {
  if (!key || typeof window === 'undefined') return emptyDraft();
  let parsed = null;
  try {
    parsed = JSON.parse(window.localStorage.getItem(key) || 'null');
  } catch {
    parsed = null;
  }
  if (!parsed || typeof parsed !== 'object' || !parsed.races) return emptyDraft();
  const byId = new Map(races.map((r) => [String(r.id), r]));
  const clean = {};
  for (const [raceId, entry] of Object.entries(parsed.races)) {
    const race = byId.get(String(raceId));
    if (!race || !entry || !STRATEGY_IDS.has(entry.strategy)) continue;
    const horseIds = new Set((race.horses || []).map((h) => h.id));
    const picks = (Array.isArray(entry.picks) ? entry.picks : []).filter((id) => horseIds.has(id));
    const unique = [...new Set(picks)].slice(0, MAX_PICKS[entry.strategy]);
    clean[race.id] = {
      strategy: entry.strategy,
      picks: unique,
      // A saved race must still be complete after validation.
      saved: Boolean(entry.saved) && unique.length === MAX_PICKS[entry.strategy],
    };
  }
  return { v: 1, updatedAt: parsed.updatedAt || null, meta: parsed.meta || null, races: clean };
}

export function saveDraft(key, draft) {
  if (!key || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify({ ...draft, v: 1, updatedAt: new Date().toISOString() }));
  } catch {
    /* storage full / private mode: the in-memory draft still works */
  }
}

export function clearDraft(key) {
  if (!key || typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function requiredPicks(strategy) {
  return MAX_PICKS[strategy] || 1;
}

export function isRaceComplete(entry) {
  return Boolean(entry && entry.picks && entry.picks.length === requiredPicks(entry.strategy));
}

export function hasDraftContent(draft) {
  return Object.values(draft?.races || {}).some((e) => e && e.picks && e.picks.length > 0);
}

/**
 * Every local draft of one identity (for "Mis tickets"). Read-only scan of
 * this browser's storage; returns [{ tournamentId, ticketNumber, meta, saved, touched }].
 */
export function listDrafts(identityId) {
  if (!identityId || typeof window === 'undefined') return [];
  const prefix = `${PREFIX}:${identityId}:`;
  const out = [];
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      const [tournamentId, ticketNumber] = key.slice(prefix.length).split(':');
      let parsed = null;
      try { parsed = JSON.parse(window.localStorage.getItem(key) || 'null'); } catch { parsed = null; }
      const entries = Object.values(parsed?.races || {});
      const touched = entries.filter((e) => e?.picks?.length).length;
      if (!touched) continue;
      out.push({
        tournamentId: Number(tournamentId),
        ticketNumber: Number(ticketNumber),
        meta: parsed.meta || null,
        saved: entries.filter((e) => e?.saved).length,
        touched,
        updatedAt: parsed.updatedAt || null,
      });
    }
  } catch {
    return [];
  }
  return out;
}
