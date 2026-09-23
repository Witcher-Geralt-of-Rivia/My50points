/**
 * Modality exposure for the current public release.
 *
 * Project scope: Modalidad 2 (registered, free) and Modalidad 4 (guest) are the
 * modalities MY50 delivers. M1 and M3 keep their architecture but are not a
 * current priority.
 *
 * Public play entry right now: only Modalidad 4 is offered as a playable entry
 * while the client approves the M4 journey. M2 stays fully implemented and
 * supported (routes, auth, ad entitlement, backend rules) and is the next
 * modality to expose — flip it on with NEXT_PUBLIC_EXPOSED_MODALITIES, e.g.
 * "guest,free", and rebuild. Accepted ids: guest, free, paid, special.
 */
const KNOWN = ['guest', 'free', 'paid', 'special'];

function parseExposed(raw) {
  const ids = String(raw || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => KNOWN.includes(s));
  return ids.length ? [...new Set(ids)] : ['guest'];
}

/** Modalities the public UI offers as playable entries today. */
export const EXPOSED_MODALITIES = parseExposed(process.env.NEXT_PUBLIC_EXPOSED_MODALITIES);

/** Modalities in the agreed project scope (supported even while not exposed). */
export const PROJECT_MODALITIES = ['guest', 'free'];

/** The modality planned to be exposed after M4. */
export const NEXT_MODALITY = 'free';

export function isModalityExposed(id) {
  return EXPOSED_MODALITIES.includes(String(id || '').toLowerCase());
}

export function isModalityInProjectScope(id) {
  return PROJECT_MODALITIES.includes(String(id || '').toLowerCase());
}

/** True while the guest (M4) entry is the single public play entry. */
export const SINGLE_GUEST_ENTRY = EXPOSED_MODALITIES.length === 1 && EXPOSED_MODALITIES[0] === 'guest';

/** Where the single public play entry starts. */
export const GUEST_ENTRY_HREF = '/modalidades/guest';
