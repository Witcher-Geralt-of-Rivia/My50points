/**
 * Main navigation — grouped blocks (player → game → competition → prestige → personal → system).
 * Icons only (no emoji); labels come from i18n `floatingMenu.*`.
 */

export const FLOATING_MENU_BLOCKS = [
  {
    id: "game",
    labelKey: "floatingMenu.blockGame",
    items: [
      { id: "mainPage", href: "/inicio", labelKey: "floatingMenu.mainPage" },
      { id: "profile", href: "/profile", labelKey: "floatingMenu.profile" },
      { id: "tournaments", href: "/tournaments", labelKey: "floatingMenu.tournaments" },
      { id: "gameModes", href: "/modalidades", labelKey: "floatingMenu.gameModes" },
      { id: "ranking", href: "/leaderboard", labelKey: "floatingMenu.ranking" },
    ],
  },
  {
    id: "system",
    labelKey: "floatingMenu.blockSystem",
    items: [
      { id: "help", href: "/how-to-play", labelKey: "floatingMenu.help" },
      { id: "tournamentGuide", href: "/guia-torneo", labelKey: "floatingMenu.tournamentGuide", skipModality: true },
      { id: "logout", labelKey: "floatingMenu.logout", isLogout: true },
    ],
  },
];

/** Flat list for animation index / legacy helpers */
export function flatFloatingMenuItems() {
  return FLOATING_MENU_BLOCKS.flatMap((b) => b.items);
}
