"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { profileHubAsset } from "@/frontend/lib/config/profileHubAssets";

export default function ProfileHubFooter({ t, userProfile, isRegistered = false }) {
  const stats = [
    {
      key: "points",
      icon: profileHubAsset("footerStatPoints"),
      label: t("profile.totalPoints"),
      value: userProfile.totalPoints.toLocaleString(),
    },
    {
      key: "winRate",
      icon: profileHubAsset("footerStatWinRate"),
      label: t("profile.winRate"),
      value: `${userProfile.winRate}%`,
    },
    {
      key: "tournaments",
      icon: profileHubAsset("footerStatTournaments"),
      label: t("profile.tournaments"),
      value: String(userProfile.tournamentsPlayed),
    },
    {
      key: "streak",
      icon: profileHubAsset("footerStatStreak"),
      label: t("profile.streak"),
      value: `${userProfile.currentStreak} ${t("profile.hub.streakDays")}`,
    },
  ];

  const navLinks = [
    {
      href: "/leaderboard",
      label: t("profile.hub.rankingSystem"),
      icon: profileHubAsset("iconInsightRanking"),
    },
    ...(isRegistered
      ? [
          {
            href: "/profile?section=tickets",
            label: t("profile.hub.ticketsPlayed"),
            icon: profileHubAsset("iconHistoryTabToday"),
          },
        ]
      : []),
    {
      href: "/profile?section=achievements",
      label: t("profile.hub.achievementsHistory"),
      icon: profileHubAsset("iconInsightAchievement"),
    },
  ];

  return (
    <footer className="profile-hub-footer">
      <div className="profile-hub-footer__stats">
        {stats.map((stat) => (
          <article key={stat.key} className="profile-hub-footer__stat">
            {stat.icon ? (
              <img src={stat.icon} alt="" className="profile-hub-footer__stat-icon" />
            ) : null}
            <p className="profile-hub-footer__stat-label">{stat.label}</p>
            <p className="profile-hub-footer__stat-value">{stat.value}</p>
          </article>
        ))}
      </div>

      <div className="profile-hub-footer__nav">
        {navLinks.map((link) => (
          <Link key={link.href} href={link.href} className="profile-hub-footer__nav-btn">
            {link.icon ? <img src={link.icon} alt="" className="profile-hub-footer__nav-icon" /> : null}
            <span>{link.label}</span>
            <ChevronRight strokeWidth={2.5} aria-hidden />
          </Link>
        ))}
      </div>
    </footer>
  );
}
