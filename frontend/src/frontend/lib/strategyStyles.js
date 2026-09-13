/** Shared strategy labels and badge colors (game DNA). */

const LABEL_BY_KEY = {
  full_point: 'Full Point',
  dual_point: 'Dual Point',
  smart_pick: 'Smart Point',
};

const LABEL_ALIASES = {
  'Full Point': 'Full Point',
  'Dual Point': 'Dual Point',
  'Smart Pick': 'Smart Point',
  'Smart Point': 'Smart Point',
  FULL_POINT: 'Full Point',
  DUAL_POINT: 'Dual Point',
  SMART_PICK: 'Smart Point',
  SMART_POINT: 'Smart Point',
};

export function normalizeStrategyLabel(strategy) {
  if (!strategy) return 'Full Point';
  return LABEL_BY_KEY[strategy] || LABEL_ALIASES[strategy] || strategy;
}

/** Pill classes: Full = purple, Dual = aquamarine, Smart = yellow */
export function strategyBadgeClass(strategy) {
  const label = normalizeStrategyLabel(strategy);
  if (label === 'Full Point') {
    return 'bg-purple-500/15 text-purple-300 border border-purple-500/30';
  }
  if (label === 'Dual Point') {
    return 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30';
  }
  if (label === 'Smart Point') {
    return 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30';
  }
  return 'bg-white/5 text-zinc-400 border border-white/10';
}

export function displayTicketPoints(points) {
  const value = Math.max(0, Number(points) || 0);
  return {
    value,
    text: value === 0 ? '0 pts' : `+${value.toLocaleString()} pts`,
    className: value > 0 ? 'text-emerald-400' : 'text-zinc-400',
  };
}
