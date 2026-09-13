import { staticFile } from "@/frontend/lib/config/paths";

/** Drop generated images into public/Img/hof/ — see docs/HOF_ASSET_PROMPTS.md */
const HOF = "/Img/hof";

export const HOF_ASSET_KEYS = {
  cardBgDark: "card-bg-dark.png",
  cardBgLight: "card-bg-light-dots.png",
  confettiOverlay: "confetti-overlay.png",
  crownGold: "crown-gold.png",
  crownSilver: "crown-silver.png",
  laurelGoldLeft: "laurel-gold-left.png",
  laurelGoldRight: "laurel-gold-right.png",
  laurelSilverLeft: "laurel-silver-left.png",
  laurelSilverRight: "laurel-silver-right.png",
  trophyGold: "trophy-gold.png",
  trophyGoldStar: "trophy-gold-star.png",
  trophySilver2: "trophy-silver-2.png",
  trophyBronze3: "trophy-bronze-3.png",
  pointsTicketBadge: "points-ticket-badge.png",
  pointsLogoNeonRing: "points-logo-neon-ring.png",
  pointsLogoLight: "points-logo-light.png",
  horseAction: "horse-action.png",
  ticketPaper: "ticket-paper.png",
  ticketBarcode: "ticket-barcode.png",
  profileSilhouette: "profile-silhouette-spotlights.png",
  avatarGlowGold: "avatar-glow-gold.png",
  avatarGlowPurple: "avatar-glow-purple.png",
  dividerFiligree: "divider-filigree-gold.png",
  shieldGoldStar: "shield-gold-star.png",
  shieldPurpleStar: "shield-purple-star.png",
  ribbonTagPurple: "ribbon-tag-purple.png",
  footerBarGold: "footer-bar-gold.png",
  horseshoeGold: "horseshoe-gold.png",
  calendarGold: "calendar-gold.png",
  rankBannerGold: "rank-banner-gold.png",
  rankBannerSilver: "rank-banner-silver.png",
  rankBannerBronze: "rank-banner-bronze.png",
  winnerSparkles: "winner-sparkles.png",
  iconTrophyNeon: "icon-trophy-neon-purple.png",
  iconStarNeon: "icon-star-neon-blue.png",
};

/** @param {keyof typeof HOF_ASSET_KEYS} key */
export function hofAsset(key) {
  const file = HOF_ASSET_KEYS[key];
  if (!file) return "";
  return staticFile(`${HOF}/${file}`);
}

export const HOF_ASSET_DIR = HOF;
