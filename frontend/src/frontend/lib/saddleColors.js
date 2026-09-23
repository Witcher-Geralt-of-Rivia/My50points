/**
 * Saddle-cloth / post-position colour standard.
 *
 * Extracted verbatim from RaceCard's original `postPositionColors` so the
 * horse table and the fixed-dividend table render the same number badges.
 * Values are unchanged — this module only makes them shareable.
 */

export const SADDLE_COLORS = [
  { bg: '#E31937', text: '#FFFFFF' }, // 1 - Red
  { bg: '#FFFFFF', text: '#000000' }, // 2 - White
  { bg: '#003DA5', text: '#FFFFFF' }, // 3 - Royal Blue
  { bg: '#FFD100', text: '#000000' }, // 4 - Yellow
  { bg: '#00843D', text: '#FFFFFF' }, // 5 - Green
  { bg: '#000000', text: '#FFD100' }, // 6 - Black w/ yellow
  { bg: '#FF6900', text: '#FFFFFF' }, // 7 - Orange
  { bg: '#E5007D', text: '#FFFFFF' }, // 8 - Pink
  { bg: '#00B5E2', text: '#FFFFFF' }, // 9 - Turquoise
  { bg: '#6F2DA8', text: '#FFFFFF' }, // 10 - Purple
  { bg: '#A7A8AA', text: '#000000' }, // 11 - Grey
  { bg: '#78BE20', text: '#000000' }, // 12 - Lime
];

/** Colour pair for a 1-based saddle-cloth number (wraps past 12). */
export function saddleColor(number) {
  const n = Number(number);
  if (!Number.isFinite(n) || n < 1) return { bg: '#374151', text: '#FFFFFF' };
  return SADDLE_COLORS[(n - 1) % SADDLE_COLORS.length];
}
