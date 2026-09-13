import { staticFile } from "@/frontend/lib/config/paths";

/** Drop generated images into public/Img/leaderboard/ — see docs/LEADERBOARD_ASSET_PROMPTS.md */
const LEADERBOARD = "/Img/leaderboard";

export const LEADERBOARD_ASSET_KEYS = {
  heroBg: "leaderboard-hero-bg.png",
  podiumGold: "leaderboard-podium-gold.png",
  podiumSilver: "leaderboard-podium-silver.png",
  podiumBronze: "leaderboard-podium-bronze.png",
  tableHeaderBg: "leaderboard-table-header-bg.png",
  crownGlow: "leaderboard-crown-glow.png",
  rankFlare: "leaderboard-rank-flare.png",
  streakFlame: "leaderboard-streak-flame.png",
  emptyState: "leaderboard-empty-state.png",
};

/** @type {Record<number, keyof typeof LEADERBOARD_ASSET_KEYS>} */
export const PODIUM_ASSET_KEY = {
  1: "podiumGold",
  2: "podiumSilver",
  3: "podiumBronze",
};

/** @param {keyof typeof LEADERBOARD_ASSET_KEYS} key */
export function leaderboardAsset(key) {
  const file = LEADERBOARD_ASSET_KEYS[key];
  if (!file) return "";
  return staticFile(`${LEADERBOARD}/${file}`);
}

/** Podium card background for rank 1–3. */
export function leaderboardPodiumAsset(rank) {
  const key = PODIUM_ASSET_KEY[rank];
  return key ? leaderboardAsset(key) : "";
}

export const LEADERBOARD_ASSET_DIR = LEADERBOARD;
