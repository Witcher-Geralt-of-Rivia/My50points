"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ProfileIcon from "@/frontend/components/profile/ProfileIcons";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { fetchAuthJson } from "@/frontend/lib/api/client";

const POLL_MS = 10000;

function formatCountdown(seconds) {
  if (seconds == null || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return { minutes: m, seconds: s };
}

function TournamentInfoBanner({ tab, isEn, t }) {
  const leader = tab.leader;
  const isWon = tab.statusKey === "won";
  const isLeading = tab.statusKey === "leading";
  const countdown = formatCountdown(tab.turnSecondsRemaining);

  const headlineTop = isWon
    ? t("profile.rankingTabWonTop")
    : isLeading
      ? t("profile.rankingTabLeaderTop")
      : t("profile.rankingTabLiveTop");

  const headlineBottom = isWon
    ? t("profile.rankingTabWonBottom")
    : isLeading
      ? t("profile.rankingTabLeaderBottom")
      : leader
        ? (isEn ? `${leader.username} leads` : `Lidera ${leader.username}`)
        : t("profile.rankingTabLiveBottom");

  return (
    <div className="ranking-info-banner">
      <div className="ranking-info-banner__leader">
        <div
          className={`ranking-info-banner__avatar ${tab.status === "live" ? "ranking-info-banner__avatar--live" : ""}`}
          style={{
            borderColor: leader?.avatarColor || "#f59e0b",
            boxShadow: `0 0 20px ${leader?.avatarColor || "#f59e0b"}55`,
          }}
        >
          <span style={{ color: leader?.avatarColor || "#fbbf24" }}>
            {(leader?.username || "?").slice(0, 2).toUpperCase()}
          </span>
          {tab.status === "live" ? (
            <ProfileIcon name="flame" className="ranking-info-banner__flame" />
          ) : isWon ? (
            <ProfileIcon name="trophy" className="ranking-info-banner__flame" />
          ) : null}
        </div>
      </div>

      <div className="ranking-info-banner__main">
        <p className="ranking-info-banner__eyebrow">{t("profile.rankingTabEyebrow")}</p>
        <h3 className="ranking-info-banner__headline">{headlineTop}</h3>
        <p className="ranking-info-banner__sub">{headlineBottom}</p>

        {countdown && tab.status === "live" ? (
          <p className="ranking-info-banner__timer">
            <ProfileIcon name="clock" className="w-3.5 h-3.5" />
            {isEn
              ? `${countdown.minutes} min ${String(countdown.seconds).padStart(2, "0")} sec until this turn closes`
              : `Faltan ${countdown.minutes} min ${String(countdown.seconds).padStart(2, "0")} seg para el cierre de este turno`}
          </p>
        ) : null}

        {tab.slug ? (
          <Link href={`/tournament/${tab.slug}/ranking`} className="ranking-info-banner__cta">
            {t("profile.rankingTabCta")}
          </Link>
        ) : null}
      </div>

      <div className="ranking-info-banner__top3">
        <p className="ranking-info-banner__top3-label">{t("profile.rankingTabTop3")}</p>
        <div className="ranking-info-banner__top3-list">
          {(tab.top3 || []).map((entry) => (
            <div key={`${entry.userId}-${entry.ticketNumber}`} className="ranking-info-banner__top3-item">
              <span className="ranking-info-banner__top3-rank">#{entry.rank}</span>
              <span className="ranking-info-banner__top3-pts">
                {entry.totalPoints.toLocaleString()} {t("common.pts")}
              </span>
            </div>
          ))}
        </div>
        {tab.userTickets?.length > 0 ? (
          <div className="ranking-info-banner__my-tickets">
            <p className="ranking-info-banner__top3-label">{t("profile.rankingTabMyTickets")}</p>
            {tab.userTickets.map((tk) => (
              <div key={tk.ticketNumber} className="ranking-info-banner__top3-item ranking-info-banner__top3-item--mine">
                <span className="ranking-info-banner__top3-rank">
                  T{tk.ticketNumber} #{tk.rank}
                </span>
                <span className="ranking-info-banner__top3-pts">
                  {tk.totalPoints.toLocaleString()} {t("common.pts")}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function TournamentRankingTabs({ onActiveTournamentChange }) {
  const { t, language } = useLanguage();
  const isEn = language === "en";
  const [tabs, setTabs] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadTabs = useCallback(async () => {
    try {
      const data = await fetchAuthJson("/profile/ranking-tabs");
      const list = data?.tabs || [];
      setTabs(list);
      setActiveId((prev) => {
        if (prev && list.some((x) => x.tournamentId === prev)) return prev;
        return list[0]?.tournamentId ?? null;
      });
    } catch {
      setTabs([]);
      setActiveId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTabs();
    const id = setInterval(loadTabs, POLL_MS);
    return () => clearInterval(id);
  }, [loadTabs]);

  useEffect(() => {
    onActiveTournamentChange?.(activeId);
  }, [activeId, onActiveTournamentChange]);

  const activeTab = tabs.find((x) => x.tournamentId === activeId);

  if (loading) {
    return (
      <section className="profile-hub profile-hub--ranking">
        <p className="profile-hub__empty">{t("profile.rankingTabLoading")}</p>
      </section>
    );
  }

  if (!tabs.length) {
    return (
      <section className="profile-hub profile-hub--ranking">
        <p className="profile-hub__eyebrow">{t("profile.rankingTabEyebrow")}</p>
        <h2 className="profile-hub__title">{t("profile.rankingTabTitle")}</h2>
        <p className="profile-hub__empty">{t("profile.rankingTabEmpty")}</p>
      </section>
    );
  }

  return (
    <section className="profile-hub profile-hub--ranking">
      <div className="profile-hub__header">
        <div>
          <p className="profile-hub__eyebrow">{t("profile.rankingTabEyebrow")}</p>
          <h2 className="profile-hub__title">{t("profile.rankingTabTitle")}</h2>
          <p className="profile-hub__hint">{t("profile.rankingTabHint")}</p>
        </div>
        <span className="ranking-info-live-dot">
          <span className="ranking-info-live-dot__pulse" />
          {t("profile.rankingTabLive")}
        </span>
      </div>

      <div className="ranking-tournament-tabs" role="tablist">
        {tabs.map((tab) => {
          const isActive = tab.tournamentId === activeId;
          const statusLabel =
            tab.status === "live"
              ? t("tournamentsPage.live")
              : tab.status === "completed"
                ? "OK"
                : tab.track;
          return (
            <button
              key={tab.tournamentId}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`ranking-tournament-tabs__pill ${isActive ? "ranking-tournament-tabs__pill--active" : ""}`}
              onClick={() => setActiveId(tab.tournamentId)}
            >
              <span className="ranking-tournament-tabs__name">{tab.name}</span>
              <span className="ranking-tournament-tabs__meta">{statusLabel}</span>
            </button>
          );
        })}
      </div>

      {activeTab ? (
        <TournamentInfoBanner tab={activeTab} isEn={isEn} t={t} />
      ) : null}
    </section>
  );
}
