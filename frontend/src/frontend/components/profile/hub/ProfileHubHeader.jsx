"use client";

import { profileHubAsset } from "@/frontend/lib/config/profileHubAssets";
import { getModality, getModalityBadgeClasses } from "@/frontend/lib/gameModalities";
import {
  getHotTicketInsight,
  getRankingRiseInsight,
  getLastAchievementInsight,
} from "@/frontend/lib/profileHubInsights";

export default function ProfileHubHeader({
  t,
  isEn,
  username,
  playerNumber,
  modalityId,
  profile,
  userProfile,
}) {
  const mod = getModality(modalityId);
  const badge = getModalityBadgeClasses(mod.gameMode, modalityId === "guest");
  const avatarSrc = profileHubAsset("avatarJockey");
  const hot = getHotTicketInsight(profile?.allTickets ?? [], profile?.tournamentSummaries ?? []);
  const ranking = getRankingRiseInsight(
    profile?.performanceHistory ?? [],
    userProfile?.globalRank,
  );
  const achievement = getLastAchievementInsight(
    profile?.achievements ?? [],
    userProfile?.currentStreak ?? 0,
    isEn,
  );

  const insightCards = [
    {
      key: "hot",
      icon: profileHubAsset("iconInsightHot"),
      title: t("profile.hub.insightHotTitle"),
      line1: hot.rank ? `#${hot.rank} ${hot.track}` : hot.track,
      line2: `${hot.points.toLocaleString()} ${t("common.pts")}`,
    },
    {
      key: "ranking",
      icon: profileHubAsset("iconInsightRanking"),
      title: t("profile.hub.insightRankingTitle"),
      line1: ranking.delta > 0 ? `↑ ${ranking.delta}` : "—",
      line2:
        ranking.rank != null && ranking.rank !== "—"
          ? t("profile.hub.insightRankingPosition").replace("{rank}", String(ranking.rank))
          : t("profile.hub.insightRankingEmpty"),
    },
    {
      key: "achievement",
      icon: profileHubAsset("iconInsightAchievement"),
      title: t("profile.hub.insightAchievementTitle"),
      line1: achievement.label,
      line2: achievement.detail,
      link: t("profile.hub.insightAchievementLink"),
    },
  ];

  return (
    <header className="profile-hub-page__identity">
      <div className="profile-hub-page__player">
        <div className="profile-hub-page__avatar" aria-hidden>
          {avatarSrc ? (
            <img src={avatarSrc} alt="" className="profile-hub-page__avatar-img" />
          ) : (
            <span>{playerNumber}</span>
          )}
        </div>
        <div className="profile-hub-page__player-meta">
          <h2 className="profile-hub-page__name">{username}</h2>
          <span className={`profile-hub-page__modality ${badge.className}`}>
            {t(`gameModalities.${modalityId}.hubModalityNum`)}
          </span>
        </div>
      </div>

      <div className="profile-hub-page__insights">
        {insightCards.map((card) => (
          <article key={card.key} className="profile-hub-page__insight">
            <div className="profile-hub-page__insight-head">
              {card.icon ? (
                <img src={card.icon} alt="" className="profile-hub-page__insight-icon" />
              ) : null}
              <p className="profile-hub-page__insight-title">{card.title}</p>
            </div>
            <p className="profile-hub-page__insight-line1">{card.line1}</p>
            <p className="profile-hub-page__insight-line2">{card.line2}</p>
            {card.link ? (
              <span className="profile-hub-page__insight-link">{card.link}</span>
            ) : null}
          </article>
        ))}
      </div>
    </header>
  );
}
