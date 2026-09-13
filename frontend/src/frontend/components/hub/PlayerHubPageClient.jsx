"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Trophy, MessageCircle, Ticket, Flag, Star, BarChart3, Video } from "lucide-react";
import AnimateInView from "@/frontend/components/ui/AnimateInView";
import TicketWorkflowJourney from "@/frontend/components/onboarding/TicketWorkflowJourney";
import ModalityHubBoard from "@/frontend/components/modalities/ModalityHubBoard";
import HubSegmentSection from "@/frontend/components/hub/HubSegmentSection";
import HubTracksSummary from "@/frontend/components/hub/HubTracksSummary";
import HubMenuRowsSummary from "@/frontend/components/hub/HubMenuRowsSummary";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { useAuth } from "@/frontend/contexts/AuthContext";
import { getModality, withModalityQuery } from "@/frontend/lib/gameModalities";
import { useModality } from "@/frontend/contexts/ModalityContext";
import VideoFeedPreview from "@/frontend/components/home/VideoFeedPreview";
import { fetchJson } from "@/frontend/lib/api/client";
import { mapLegendForHome } from "@/frontend/lib/api/mappers";
import { ticketWorkflowAsset } from "@/frontend/lib/config/ticketWorkflowAssets";

import { motion, AnimatePresence } from "framer-motion";

export default function PlayerHubPageClient() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { activeModalityId } = useModality();
  const [topPlayers, setTopPlayers] = useState([]);
  const mod = getModality(activeModalityId);

  const q = (href) => withModalityQuery(href, activeModalityId);

  const heroBg = ticketWorkflowAsset("landingHeroBg");
  const noise = ticketWorkflowAsset("noiseOverlayTile");

  const [headerCollapsed, setHeaderCollapsed] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isAccepted = sessionStorage.getItem("modality_4_accepted") === "true";
      const isCollapsed = sessionStorage.getItem("modality_header_collapsed") !== "false";
      setHeaderCollapsed(isAccepted && isCollapsed);

      const handleUpdate = () => {
        const acceptedVal = sessionStorage.getItem("modality_4_accepted") === "true";
        const collapsedVal = sessionStorage.getItem("modality_header_collapsed") !== "false";
        setHeaderCollapsed(acceptedVal && collapsedVal);
      };

      window.addEventListener("50points-header-collapse-updated", handleUpdate);
      window.addEventListener("50points-modality-accepted", handleUpdate);
      return () => {
        window.removeEventListener("50points-header-collapse-updated", handleUpdate);
        window.removeEventListener("50points-modality-accepted", handleUpdate);
      };
    }
  }, []);

  const gameMenuItems = useMemo(
    () => [
      {
        id: "gameModes",
        href: "/modalidades",
        title: t("floatingMenu.gameModes"),
        description: t("playerHub.segmentGameModesDesc"),
        icon: Flag,
      },
      {
        id: "tickets",
        href: "/statistics",
        title: t("floatingMenu.tickets"),
        description: t("playerHub.segmentTicketsDesc"),
        icon: Ticket,
      },
    ],
    [t],
  );

  const competitionMenuItems = useMemo(
    () => [
      {
        id: "ranking",
        href: "/leaderboard",
        title: t("floatingMenu.ranking"),
        description: t("playerHub.segmentRankingDesc"),
        icon: Trophy,
      },
      {
        id: "chat",
        href: "/chat",
        title: t("floatingMenu.chat"),
        description: t("playerHub.segmentChatDesc"),
        icon: MessageCircle,
      },
      {
        id: "feed",
        href: "/feed",
        title: t("floatingMenu.feed"),
        description: t("playerHub.feedDesc"),
        icon: Video,
      },
    ],
    [t],
  );

  const prestigeMenuItems = useMemo(
    () => [
      {
        id: "hallOfFame",
        href: "/hall-of-fame",
        title: t("floatingMenu.hallOfFame"),
        description: t("playerHub.segmentHallDesc"),
        icon: Star,
      },
      {
        id: "statistics",
        href: "/statistics/explorer",
        title: t("floatingMenu.statistics"),
        description: t("playerHub.segmentStatsDesc"),
        icon: BarChart3,
      },
    ],
    [t],
  );

  useEffect(() => {
    let cancelled = false;
    fetchJson("/leaderboard?limit=5", { cache: "no-store", timeoutMs: 15000 })
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.players) ? data.players : [];
        setTopPlayers(list.map(mapLegendForHome).slice(0, 5));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash?.replace("#", "");
    if (!hash) return;
    const target = document.getElementById(hash);
    if (!target) return;
    const timer = window.setTimeout(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="player-hub-page">
      <div
        className="ticket-landing-surface player-hub-page__onboard"
        data-modality={activeModalityId}
        style={headerCollapsed ? { minHeight: "auto", paddingBottom: 0 } : undefined}
      >
        {!headerCollapsed && (
          <div className="ticket-landing__bg-layer" aria-hidden>
            {heroBg ? <img src={heroBg} alt="" className="ticket-landing__hero-bg" /> : null}
            <div className="ticket-landing__shade" />
            {noise ? (
              <div
                className="ticket-landing__noise"
                style={{ backgroundImage: `url(${noise})` }}
              />
            ) : null}
          </div>
        )}

        <div className={`ticket-landing ticket-landing--player-hub ${headerCollapsed ? "pt-4 pb-0" : ""}`}>
          <AnimatePresence initial={false}>
            {!headerCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden w-full"
              >
                <TicketWorkflowJourney />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimateInView delay={0.1} className="w-full">
            <ModalityHubBoard
              layout="flat"
              showHow={false}
              titleAs="h2"
              className="modality-hub-board--player-hub"
            />
          </AnimateInView>
        </div>
      </div>

      <div
        className="player-hub-page__dashboard"
        data-modality={activeModalityId}
        style={{ "--modality-accent": mod.accent }}
      >
        <p className="player-hub-page__welcome">
          {user?.username
            ? t("playerHub.welcomeUser").replace("{name}", user.username)
            : t("playerHub.welcome")}
        </p>
        <p className="player-hub-page__subtitle">{t("playerHub.subtitle")}</p>

        <AnimateInView>
          <HubSegmentSection
            eyebrow={t(`gameModalities.${activeModalityId}.title`)}
            tabLabel={t("gameModalities.hubTabTracks")}
            title={t("gameModalities.tracksTitle")}
            subtitle={t("gameModalities.tracksSubtitle")}
            seeAllHref={q("/tournaments")}
            seeAllLabel={t("playerHub.seeAll")}
          >
            <HubTracksSummary modalityId={activeModalityId} />
          </HubSegmentSection>
        </AnimateInView>

        <AnimateInView delay={0.08}>
          <HubSegmentSection
            title={t("floatingMenu.blockGame")}
            subtitle={t("playerHub.segmentGameDesc")}
          >
            <HubMenuRowsSummary items={gameMenuItems} modalityId={activeModalityId} />
          </HubSegmentSection>
        </AnimateInView>

        <AnimateInView delay={0.12}>
          <HubSegmentSection
            title={t("floatingMenu.blockCompetition")}
            subtitle={t("playerHub.segmentCompetitionDesc")}
          >
            <HubMenuRowsSummary items={competitionMenuItems} modalityId={activeModalityId} />
          </HubSegmentSection>
        </AnimateInView>

        <section className="player-hub-section">
          <div className="player-hub-section__head">
            <h2 className="player-hub-section__title">{t("playerHub.liveRanking")}</h2>
            <Link href={q("/leaderboard")} className="player-hub-section__link">
              {t("playerHub.seeAll")}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <ul className="player-hub-ranking">
            {topPlayers.length === 0 ? (
              <li className="player-hub-ranking__empty">{t("leaderboard.empty")}</li>
            ) : (
              topPlayers.map((p) => (
                <li key={p.rank} className="player-hub-ranking__row">
                  <span className="player-hub-ranking__rank">{p.rank}</span>
                  <span className="player-hub-ranking__name">{p.username}</span>
                  <span className="player-hub-ranking__pts">{p.totalPoints?.toLocaleString()} pts</span>
                </li>
              ))
            )}
          </ul>
        </section>

        <AnimateInView delay={0.16}>
          <HubSegmentSection
            title={t("floatingMenu.blockPrestige")}
            subtitle={t("playerHub.segmentPrestigeDesc")}
          >
            <HubMenuRowsSummary items={prestigeMenuItems} modalityId={activeModalityId} />
          </HubSegmentSection>
        </AnimateInView>

        <section id="feed" className="player-hub-section player-hub-section--feed">
          <h2 className="player-hub-section__title">{t("floatingMenu.feed")}</h2>
          <p className="player-hub-section__desc">{t("playerHub.feedDesc")}</p>
          <VideoFeedPreview />
        </section>
      </div>
    </div>
  );
}
