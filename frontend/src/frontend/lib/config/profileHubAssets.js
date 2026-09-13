import { staticFile } from "@/frontend/lib/config/paths";

const BASE = "/images/profile-hub";

/** Profile hub UI — ad slots, insight icons, stadium backgrounds */
export const PROFILE_HUB_ASSET_KEYS = {
  adBannerStadium: "ad-banner-stadium.svg",
  adSlotLoopScene: "ad-slot-loop-scene.svg",
  adSlotPromoStill: "ad-slot-promo-still.svg",
  avatarJockey: "avatar-jockey.svg",
  iconInsightHot: "icon-insight-hot.svg",
  iconInsightRanking: "icon-insight-ranking.svg",
  iconInsightAchievement: "icon-insight-achievement.svg",
  iconNewsProfile: "icon-news-profile.svg",
  iconNewsTournament: "icon-news-tournament.svg",
  footerStatPoints: "footer-stat-points.svg",
  footerStatWinRate: "footer-stat-winrate.svg",
  footerStatTournaments: "footer-stat-tournaments.svg",
  footerStatStreak: "footer-stat-streak.svg",
  iconHistoryTabToday: "icon-history-tab-today.svg",
  iconHistoryTabRecent: "icon-history-tab-recent.svg",
  iconHistoryTabFull: "icon-history-tab-full.svg",
  iconHistorySearch: "icon-history-search.svg",
  iconHistoryCalendarBtn: "icon-history-calendar-btn.svg",
};

/** @param {keyof typeof PROFILE_HUB_ASSET_KEYS} key */
export function profileHubAsset(key) {
  const file = PROFILE_HUB_ASSET_KEYS[key];
  if (!file) return "";
  return staticFile(`${BASE}/${file}`);
}
