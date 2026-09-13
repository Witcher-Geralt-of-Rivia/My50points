"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronRight, ArrowRight } from "lucide-react";
import AnimateInView from "@/frontend/components/ui/AnimateInView";
import HomeLanding from "@/frontend/components/home/HomeLanding";
import LiveTournamentCard from "@/frontend/components/home/LiveTournamentCard";
import HowItWorksStepCard from "@/frontend/components/home/HowItWorksStepCard";
import TournamentPlaysSection from "@/frontend/components/home/TournamentPlaysSection";
import SectionHeader from "@/frontend/components/home/SectionHeader";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { useAuth } from "@/frontend/contexts/AuthContext";
import { staticFile } from "@/frontend/lib/config/paths";
import { fetchJson } from "@/frontend/lib/api/client";
import { mapLegendForHome } from "@/frontend/lib/api/mappers";
import { useLiveTournamentsPoll } from "@/frontend/lib/hooks/useLiveTournamentsPoll";
import VideoFeedPreview from "@/frontend/components/home/VideoFeedPreview";

const howItWorksMeta = [{ step: 1 }, { step: 2 }, { step: 3 }];

function getRankStyle(rank) {
  switch (rank) {
    case 1:
      return "bg-gradient-to-br from-yellow-400 to-amber-600 text-black shadow-lg shadow-amber-500/20";
    case 2:
      return "bg-gradient-to-br from-zinc-300 to-zinc-500 text-black";
    case 3:
      return "bg-gradient-to-br from-amber-600 to-amber-800 text-white";
    default:
      return "bg-white/5 text-zinc-400";
  }
}

function getStepBullets(step, t) {
  return [1, 2, 3].map((n) => ({
    lead: t(`howItWorksSection.step${step}Bullet${n}Lead`),
    text: t(`howItWorksSection.step${step}Bullet${n}Text`),
  }));
}

function LiveTournamentCardSkeleton() {
  return (
    <div
      className="live-tournament-card live-tournament-card--upcoming live-tournament-card--cover live-tournament-card--preview animate-pulse pointer-events-none"
      aria-hidden
    >
      <div className="live-tournament-card__shell">
        <div className="h-full min-h-[12rem] bg-white/5" />
      </div>
    </div>
  );
}

export default function HomePageClient({ initialTournaments = [] }) {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [liveTournaments, setLiveTournaments] = useState(
    () => initialTournaments || []
  );
  const [topPlayers, setTopPlayers] = useState([]);
  const [homeLoading, setHomeLoading] = useState(
    !(initialTournaments && initialTournaments.length > 0)
  );
  const [playersLoading, setPlayersLoading] = useState(true);

  useLiveTournamentsPoll({
    forHome: true,
    onData: (mapped) => setLiveTournaments(mapped),
    onLoadingChange: (loading) => setHomeLoading(loading),
  });

  useEffect(() => {
    let cancelled = false;
    fetchJson("/leaderboard?limit=5", { cache: "no-store", timeoutMs: 15000 })
      .then((res) => {
        if (!cancelled) {
          setTopPlayers((res?.legends || []).map(mapLegendForHome));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setPlayersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const howItWorks = howItWorksMeta.map((item) => {
    const stepLabel = `${t("howItWorksSection.step")} ${item.step}`.toUpperCase();

    if (item.step === 1) {
      return {
        ...item,
        variant: "strategy",
        stepLabel,
        titleLead: t("howItWorksSection.step1TitleLead"),
        titleAccent: t("howItWorksSection.step1TitleAccent"),
        intro: t("howItWorksSection.step1Intro"),
        strategies: [
          {
            name: t("strategies.fullPoint"),
            description: t("howItWorksSection.step1FullPointDesc"),
            iconCount: 1,
          },
          {
            name: t("strategies.dualPoint"),
            description: t("howItWorksSection.step1DualPointDesc"),
            iconCount: 2,
          },
          {
            name: t("strategies.smartPoint"),
            description: t("howItWorksSection.step1SmartPointDesc"),
            iconCount: 3,
          },
        ],
      };
    }

    if (item.step === 2) {
      return {
        ...item,
        variant: "paragraph",
        stepLabel,
        title: t("howItWorksSection.step2Title"),
        description: t("howItWorksSection.step2Desc"),
      };
    }

    return {
      ...item,
      variant: "bullets",
      stepLabel,
      title: t(`howItWorksSection.step${item.step}Title`),
      bullets: getStepBullets(item.step, t),
    };
  });

  return (
    <div className="relative overflow-x-hidden">
      <HomeLanding />

      <section className="relative py-16 sm:py-24">
        <div className="absolute inset-0">
          <img
            src={staticFile("/images/hero-lobby.jpg")}
            alt=""
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-dark via-brand-dark/85 to-brand-dark" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
          <AnimateInView>
            <SectionHeader
              label={t("tournamentsSection.liveLabel")}
              title={t("tournamentsSection.title")}
              descriptionLead={t("tournamentsSection.descriptionLead")}
              descriptionHighlight={t("tournamentsSection.descriptionHighlight")}
            />
          </AnimateInView>

          <div className="live-tournaments-section__grid">
            {homeLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <LiveTournamentCardSkeleton key={i} />
              ))
            ) : liveTournaments.length === 0 ? (
              <p className="text-zinc-500 text-sm col-span-full py-8">
                {t("tournamentsSection.empty")}
              </p>
            ) : (
              liveTournaments.map((tournament, i) => (
                <AnimateInView key={tournament.id || tournament.slug} delay={i * 0.15}>
                  <LiveTournamentCard
                    tournament={tournament}
                    t={t}
                    featured={i === 0}
                    previewOnly
                  />
                </AnimateInView>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="relative py-16 sm:py-24">
        <div className="absolute inset-0 bg-brand-dark" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
          <AnimateInView>
            <SectionHeader
              label={t("howItWorksSection.label")}
              title={t("howItWorksSection.title")}
              descriptionLead={t("howItWorksSection.descriptionLead")}
              descriptionHighlight={t("howItWorksSection.descriptionHighlight")}
            />
          </AnimateInView>

          <div className="how-it-works-grid">
            {howItWorks.map((step, i) => (
              <AnimateInView key={step.step} delay={i * 0.15}>
                <HowItWorksStepCard
                  step={step.step}
                  stepLabel={step.stepLabel}
                  variant={step.variant}
                  title={step.title}
                  titleLead={step.titleLead}
                  titleAccent={step.titleAccent}
                  intro={step.intro}
                  description={step.description}
                  strategies={step.strategies}
                  bullets={step.bullets}
                />
              </AnimateInView>
            ))}
          </div>

          <AnimateInView delay={0.3}>
            <div className="mt-12 sm:mt-16">
              <TournamentPlaysSection t={t} />
            </div>
          </AnimateInView>
        </div>
      </section>

      <section className="relative py-16 sm:py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-dark via-brand-card/20 to-brand-dark" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6">
          <AnimateInView>
            <SectionHeader
              label={t("topPlayers.label")}
              title={t("topPlayers.title")}
              descriptionLead={t("topPlayers.descriptionLead")}
              descriptionHighlight={t("topPlayers.descriptionHighlight")}
            />
          </AnimateInView>

          <AnimateInView delay={0.1}>
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="px-4 sm:px-6 py-3 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider w-full">
                  <span className="w-10 text-center">{t("topPlayers.rank")}</span>
                  <span className="flex-1">{t("topPlayers.player")}</span>
                  <span className="w-20 text-right hidden sm:block">{t("topPlayers.winRate")}</span>
                  <span className="w-20 text-right hidden sm:block">{t("topPlayers.streak")}</span>
                  <span className="w-24 text-right">{t("topPlayers.points")}</span>
                </div>
              </div>

              {playersLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="px-4 sm:px-6 py-3.5 flex items-center gap-4 animate-pulse border-b border-white/[0.03] last:border-0"
                  >
                    <div className="w-10 h-7 bg-white/5 rounded-lg" />
                    <div className="flex-1 h-4 bg-white/5 rounded max-w-[8rem]" />
                    <div className="w-24 h-4 bg-white/5 rounded ml-auto" />
                  </div>
                ))
              ) : topPlayers.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-zinc-500">
                  {t("leaderboard.empty") || "—"}
                </p>
              ) : (
                topPlayers.map((player, i) => (
                  <AnimateInView key={player.rank} delay={0.1 + i * 0.08}>
                    <div
                      className={`px-4 sm:px-6 py-3.5 flex items-center gap-4 transition-all duration-200 hover:bg-white/[0.02] ${
                        i < topPlayers.length - 1 ? "border-b border-white/[0.03]" : ""
                      } ${player.rank === 1 ? "bg-gradient-to-r from-amber-500/[0.04] to-transparent" : ""}`}
                    >
                      <div className="w-10 flex justify-center">
                        <span
                          className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold ${getRankStyle(player.rank)}`}
                        >
                          {player.rank}
                        </span>
                      </div>
                      <div className="flex-1 flex items-center gap-3 min-w-0">
                        <div
                          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold text-white shrink-0"
                          style={{
                            backgroundColor: `${player.avatarColor}33`,
                            color: player.avatarColor,
                          }}
                        >
                          {player.avatar}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{player.username}</p>
                          <p className="text-[11px] text-zinc-600 sm:hidden">{player.winRate} WR</p>
                        </div>
                      </div>
                      <div className="w-20 text-right hidden sm:block">
                        <span className="text-sm text-zinc-400">{player.winRate}</span>
                      </div>
                      <div className="w-20 text-right hidden sm:flex items-center justify-end gap-1">
                        {player.streakType === "win" ? (
                          <>
                            <img
                              src={staticFile("/images/icons/icon-fire.png")}
                              alt=""
                              className="w-4 h-4 object-contain"
                            />
                            <span className="text-sm font-medium text-orange-400">{player.streak}W</span>
                          </>
                        ) : (
                          <span className="text-sm text-zinc-600">{player.streak}L</span>
                        )}
                      </div>
                      <div className="w-24 text-right">
                        <span
                          className={`text-sm sm:text-base font-bold ${player.rank === 1 ? "text-gradient-gold" : "text-white"}`}
                        >
                          {player.totalPoints.toLocaleString()}
                        </span>
                        <span className="text-[11px] text-zinc-600 ml-1">{t("common.pts")}</span>
                      </div>
                    </div>
                  </AnimateInView>
                ))
              )}

              <div className="px-6 py-4 border-t border-white/5 text-center">
                <Link
                  href="/leaderboard"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-purple-light hover:text-white transition-colors group"
                >
                  {t("topPlayers.viewAll")}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </AnimateInView>

          <div id="feed">
            <VideoFeedPreview />
          </div>
        </div>
      </section>

      {!isAuthenticated && (
      <section className="relative py-16 sm:py-24">
        <div className="absolute inset-0 bg-brand-dark" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6">
          <AnimateInView>
            <div className="relative glass-card rounded-3xl p-8 sm:p-14 text-center overflow-hidden">
              <div className="absolute inset-0">
                <img
                  src={staticFile("/images/sidebar-promo.jpg")}
                  alt=""
                  className="w-full h-full object-cover opacity-15"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-brand-dark/60 via-brand-dark/90 to-brand-dark" />
              </div>
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple via-purple-light to-cyan" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[200px] bg-purple/10 rounded-full blur-[80px] pointer-events-none" />

              <div className="relative">
                <img
                  src={staticFile("/images/icons/icon-controller.png")}
                  alt=""
                  className="w-12 h-12 sm:w-14 sm:h-14 object-contain mx-auto mb-5 sm:mb-6"
                />
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4">
                  {t("cta.title")}
                </h2>
                <p className="text-sm sm:text-lg text-zinc-400 max-w-lg mx-auto mb-8 leading-relaxed">
                  {t("cta.description")}
                </p>
                <Link
                  href="/register"
                  className="inline-flex items-center px-10 py-4 text-base font-semibold text-white bg-gradient-to-r from-purple to-purple-light rounded-xl btn-glow animate-glow-pulse"
                >
                  {t("cta.createAccount")}
                  <ChevronRight className="inline-block w-5 h-5 ml-1" />
                </Link>
                <p className="text-xs text-zinc-600 mt-5">{t("cta.noCreditCard")}</p>
              </div>
            </div>
          </AnimateInView>
        </div>
      </section>
      )}
    </div>
  );
}
