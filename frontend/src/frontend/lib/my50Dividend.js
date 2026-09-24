/**
 * MY50 fixed dividend — the ONLY place the frontend decides whether a numeric
 * MY50 dividend may be shown.
 *
 * Backend contract (tournament detail horses and GET /tournaments/{slug}/dividends):
 *   my50Dividend        exact decimal text frozen at tournament publication
 *   my50DividendFrozen  true only for a value frozen under the MY50 V1.1 rule
 *   my50TieStatus       unique | pending_tie_adjustment (tenths rule pending)
 * Provider odds are never shown as a MY50 dividend.
 *
 * Rule: a numeric MY50 dividend is shown only when the backend states, in the
 * response itself, that the value is frozen (and not awaiting a tie
 * adjustment); every other runner renders the "pending publication" state.
 *
 * Do not add heuristics here (tournament status, value ranges, odds): when the
 * backend exposes explicit provenance, read that field — and only that field.
 */
export function publishedMy50Dividend(runner) {
  // The backend states provenance explicitly: my50DividendFrozen === true means
  // the value was frozen at tournament publication (MY50 V1.1). A value whose
  // tie adjustment (tenths rule) is still pending is not final -> pending state.
  if (!runner || runner.my50DividendFrozen !== true) return null;
  if (runner.my50TieStatus === 'pending_tie_adjustment') return null;
  const value = Number(runner.my50Dividend);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export const MY50_PENDING = { es: 'Pendiente de publicación', en: 'Not published yet' };
export const MY50_TIE_PENDING = { es: 'Empate · ajuste pendiente', en: 'Tie · adjustment pending' };

/** Label for a runner without a displayable MY50 value. */
export function my50PendingLabel(runner, isEn) {
  const label = runner && runner.my50TieStatus === 'pending_tie_adjustment' ? MY50_TIE_PENDING : MY50_PENDING;
  return isEn ? label.en : label.es;
}
