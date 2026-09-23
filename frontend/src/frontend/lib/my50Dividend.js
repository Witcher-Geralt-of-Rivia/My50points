/**
 * MY50 fixed dividend — the ONLY place the frontend decides whether a numeric
 * MY50 dividend may be shown.
 *
 * Audit of the current backend contract (GET /tournaments/{slug}/dividends):
 *   runner.dividend = RaceDividend.dividend when a row exists, otherwise
 *   Horse.odds, otherwise 2.0. The response carries NO field saying which of
 *   the three it was, so a number there cannot be proven to be a frozen,
 *   pre-race MY50 value (it may be mutable live odds or a placeholder).
 *
 * Rule: a numeric MY50 dividend is shown only when the backend states, in the
 * response itself, that the value is frozen/fixed under the MY50 contract.
 * No such field exists today, so this returns null for every runner and every
 * MY50 surface renders the "pending publication" state.
 *
 * Do not add heuristics here (tournament status, value ranges, odds): when the
 * backend exposes explicit provenance, read that field — and only that field.
 */
export function publishedMy50Dividend(/* runner */) {
  return null;
}

export const MY50_PENDING = { es: 'Pendiente de publicación', en: 'Not published yet' };
