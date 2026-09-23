/**
 * Single navigation map for the whole app (desktop bar, mobile tab bar and
 * menu sheet). Navigation is read-only: links only, never API calls.
 */

export const PRIMARY_NAV = [
  { id: 'home', href: '/', es: 'Inicio', en: 'Home', icon: 'home' },
  { id: 'tournaments', href: '/tournaments', es: 'Torneos', en: 'Tournaments', icon: 'flag' },
  { id: 'tickets', href: '/profile?section=tickets', es: 'Mis tickets', en: 'My tickets', icon: 'ticket' },
  { id: 'ranking', href: '/leaderboard', es: 'Ranking', en: 'Ranking', icon: 'trophy' },
  { id: 'profile', href: '/profile', es: 'Perfil', en: 'Profile', icon: 'user' },
];

export const MORE_NAV = [
  { id: 'modalities', href: '/modalidades', es: 'Modalidades', en: 'Game modes', icon: 'layers' },
  { id: 'hub', href: '/inicio', es: 'Centro del jugador', en: 'Player hub', icon: 'grid' },
  { id: 'howto', href: '/how-to-play', es: 'Cómo jugar', en: 'How to play', icon: 'help' },
  { id: 'guide', href: '/guia-torneo', es: 'Guía del torneo', en: 'Tournament guide', icon: 'book' },
  { id: 'hof', href: '/hall-of-fame', es: 'Hall of Fame', en: 'Hall of Fame', icon: 'crown' },
  { id: 'legends', href: '/legends', es: 'Leyendas', en: 'Legends', icon: 'star' },
  { id: 'stats', href: '/statistics', es: 'Estadísticas', en: 'Statistics', icon: 'chart' },
  { id: 'chat', href: '/chat', es: 'Chat', en: 'Chat', icon: 'chat' },
  { id: 'groups', href: '/groups', es: 'Grupos', en: 'Groups', icon: 'users' },
];

/** Mobile bottom bar: four destinations + the menu sheet. */
export const TABBAR_IDS = ['home', 'tournaments', 'tickets', 'ranking'];

/**
 * Which nav item is active for a route. Covers every user-facing route so
 * the current place is always highlighted (no page without an active item
 * unless it genuinely belongs to none, e.g. login).
 */
export function activeNavId(pathname = '', section = null) {
  const p = pathname || '/';
  if (p === '/' || p === '/landing' || p === '/comenzar') return 'home';
  if (p === '/tournaments' || p.startsWith('/tournament/') || p === '/tournament') return 'tournaments';
  if (p === '/profile' && section === 'tickets') return 'tickets';
  if (p === '/profile' || p.startsWith('/profile/')) return 'profile';
  if (p === '/leaderboard' || p === '/ranking') return 'ranking';
  if (p === '/modalidades' || p.startsWith('/modalidades/')) return 'modalities';
  if (p === '/inicio') return 'hub';
  if (p === '/how-to-play') return 'howto';
  if (p === '/guia-torneo') return 'guide';
  if (p === '/hall-of-fame') return 'hof';
  if (p === '/legends') return 'legends';
  if (p === '/statistics' || p.startsWith('/statistics/')) return 'stats';
  if (p === '/chat') return 'chat';
  if (p === '/groups' || p.startsWith('/groups/')) return 'groups';
  return null;
}

export function isMoreId(id) {
  return MORE_NAV.some((item) => item.id === id);
}

/** Modality → display metadata for the nav chip (M1..M4 naming). */
export const MODALITY_CHIP = {
  paid: { tone: 'm1', short: 'M1', es: 'Modalidad 1', en: 'Mode 1' },
  free: { tone: 'm2', short: 'M2', es: 'Modalidad 2', en: 'Mode 2' },
  special: { tone: 'm3', short: 'M3', es: 'Modalidad 3', en: 'Mode 3' },
  guest: { tone: 'm4', short: 'M4', es: 'Invitado', en: 'Guest' },
};
