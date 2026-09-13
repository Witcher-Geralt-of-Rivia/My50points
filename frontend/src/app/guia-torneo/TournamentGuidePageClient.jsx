"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { ticketWorkflowAsset } from "@/frontend/lib/config/ticketWorkflowAssets";
import TournamentGuideSteps, {
  TournamentGuideHeroArt,
  TournamentGuidePath,
} from "@/frontend/components/tournament-guide/TournamentGuideSteps";
import TournamentGuideQuickSummary from "@/frontend/components/tournament-guide/TournamentGuideQuickSummary";
import TournamentGuideRules from "@/frontend/components/tournament-guide/TournamentGuideRules";
import TournamentGuideModality4 from "@/frontend/components/tournament-guide/TournamentGuideModality4";

export default function TournamentGuidePageClient() {
  const { t } = useLanguage();
  const pageBg = ticketWorkflowAsset("tracksWorkflowBg");
  const noise = ticketWorkflowAsset("noiseOverlayTile");
  const tracks = t("tournamentGuide.trackExamples");
  const trackList = Array.isArray(tracks) ? tracks : [];
  const strategies = t("tournamentGuide.strategies");
  const strategyList = Array.isArray(strategies) ? strategies : [];

  return (
    <div className="tg-page-surface">
      <div className="tg-page-surface__ambient" aria-hidden>
        {pageBg ? <img src={pageBg} alt="" className="tg-page-surface__hero-bg" /> : null}
        <div className="tg-page-surface__fog" />
        {noise ? (
          <div
            className="tg-page-surface__noise"
            style={{ backgroundImage: `url(${noise})` }}
          />
        ) : null}
      </div>

      <div className="tg-page__inner">
        <header className="tg-page__hero">
          <TournamentGuideHeroArt />
          <div className="tg-page__hero-copy">
            <p className="tg-page__doc-label">{t("tournamentGuide.docTitle")}</p>
            <h1 className="tg-page__title">{t("tournamentGuide.pageTitle")}</h1>
          </div>
        </header>

        <section className="tg-page__section">
          <h2 className="tg-page__section-title">{t("tournamentGuide.objectiveTitle")}</h2>
          <p className="tg-page__lead">{t("tournamentGuide.objectiveText")}</p>
        </section>

        <section className="tg-page__section">
          <h2 className="tg-page__section-title">{t("tournamentGuide.part1Title")}</h2>
          <p className="tg-page__lead">{t("tournamentGuide.part1Intro")}</p>
          <p className="tg-page__path-label">{t("tournamentGuide.pathLabel")}</p>
          <TournamentGuidePath t={t} className="tg-page__path" />
          <TournamentGuideSteps t={t} />

          <div className="tg-page__step-detail">
            <h3 className="tg-page__step-detail-title">{t("tournamentGuide.step2Title")}</h3>
            <p className="tg-page__lead">{t("tournamentGuide.step2Detail")}</p>
            <ul className="tg-page__tracks">
              {trackList.map((track) => (
                <li key={track}>{track}</li>
              ))}
            </ul>
            <p className="tg-page__lead">{t("tournamentGuide.step2Note")}</p>
          </div>

          <div className="tg-page__step-detail">
            <h3 className="tg-page__step-detail-title">{t("tournamentGuide.step4Title")}</h3>
            <p className="tg-page__lead">{t("tournamentGuide.step4Detail")}</p>
            <ul className="tg-page__strategies">
              {strategyList.map((item) => (
                <li key={item.name}>
                  <strong>{item.name}</strong>
                  <span>{item.desc}</span>
                </li>
              ))}
            </ul>
            <p className="tg-page__lead">{t("tournamentGuide.step4Note")}</p>
          </div>

          <TournamentGuideQuickSummary t={t} />
        </section>

        <section className="tg-page__section">
          <h2 className="tg-page__section-title">{t("tournamentGuide.part2Title")}</h2>
          <TournamentGuideRules t={t} />
        </section>

        <section className="tg-page__section tg-page__section--mod4">
          <TournamentGuideModality4 t={t} />
        </section>

        <footer className="tg-page__cta">
          <Link href="/modalidades" className="tg-page__cta-btn">
            <Play className="w-5 h-5" strokeWidth={2.5} aria-hidden />
            {t("tournamentGuide.beginSub")}
          </Link>
          <p className="tg-page__menu-hint">{t("tournamentGuide.menuHint")}</p>
        </footer>
      </div>
    </div>
  );
}
