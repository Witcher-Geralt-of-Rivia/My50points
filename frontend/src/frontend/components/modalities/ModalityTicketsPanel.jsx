"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import {
  getModality,
  trackFromSlug,
  withModalityQuery,
} from "@/frontend/lib/gameModalities";
import { useLiveTournamentsPoll } from "@/frontend/lib/hooks/useLiveTournamentsPoll";
import { mapTournamentForHomeCard } from "@/frontend/lib/api/mappers";
import ModalityFlowNav from "@/frontend/components/modalities/ModalityFlowNav";
import ModalityPageShell from "@/frontend/components/modalities/ModalityPageShell";
import FreeTicketsMessage from "@/frontend/components/modalities/FreeTicketsMessage";
import StepTracker from "@/frontend/components/layout/StepTracker";

export default function ModalityTicketsPanel({ modalityId, trackSlugParam }) {
  const { t } = useLanguage();
  const mod = getModality(modalityId);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useLiveTournamentsPoll({
    forHome: true,
    onData: (mapped) => setTournaments(mapped),
    onLoadingChange: setLoading,
  });

  const trackName = useMemo(() => {
    const names = tournaments.map((x) => x.track || x.trackName).filter(Boolean);
    return trackFromSlug(trackSlugParam, [...new Set(names)]);
  }, [tournaments, trackSlugParam]);

  const trackTournaments = useMemo(() => {
    if (!trackName) return tournaments;
    return tournaments.filter(
      (x) => (x.track || x.trackName || "").toLowerCase() === trackName.toLowerCase(),
    );
  }, [tournaments, trackName]);

  const featured =
    trackTournaments.find((x) => x.status === "live" || x.status === "LIVE")
    || trackTournaments[0];
  const enterHref = featured
    ? withModalityQuery(`/tournament/${featured.slug}`, modalityId)
    : null;

  const tickets = [1, 2, 3];

  return (
    <ModalityPageShell modalityId={modalityId}>
        {/* Step Tracker */}
        <StepTracker currentStep="ticket" modalityId={modalityId} />

        <header className="modality-page__head">
          <p
            className="modality-page__eyebrow modality-page__eyebrow--accent"
            style={{ color: mod.accent }}
          >
            {trackName || decodeURIComponent(trackSlugParam || "")}
          </p>
          <h1 className="modality-page__title">{t("gameModalities.ticketsTitle")}</h1>
          <p className="modality-page__subtitle">
            {modalityId === "guest"
              ? t("gameModalities.ticketsGuestSub")
              : modalityId === "free"
                ? null
                : t("gameModalities.ticketsSub")}
          </p>
        </header>

        {modalityId === "free" ? (
          <FreeTicketsMessage className="modality-tickets-free-message" />
        ) : null}

        {featured ? (
          <div
            className={`modality-tournament-hero modality-tournament-hero--${modalityId}`}
            style={
              featured.imageUrl
                ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.88)), url(${featured.imageUrl})` }
                : undefined
            }
          >
            <p className="modality-tournament-hero__badge">{t("gameModalities.officialTournament")}</p>
            <h2 className="modality-tournament-hero__name">
              {featured.name || featured.trackName || featured.slug}
            </h2>
            <p className="modality-tournament-hero__meta">
              {t(`gameModalities.${modalityId}.title`)} · {featured.date || ""}
            </p>
          </div>
        ) : null}

        <section className="modality-tickets-block">
          <h2 className="modality-tickets-block__title">{t("gameModalities.yourTickets")}</h2>
          {loading ? (
            <p className="text-zinc-500 text-sm">{t("gameModalities.loading")}</p>
          ) : (
            <ul className="modality-tickets-list">
              {tickets.map((n) => (
                <li key={n} className={`modality-ticket-row modality-ticket-row--${modalityId}`}>
                  <span className="modality-ticket-row__check">
                    <Check className="w-4 h-4" aria-hidden />
                  </span>
                  <span className="modality-ticket-row__label">
                    {t("gameModalities.ticketLabel")} {n}
                  </span>
                  <span className="modality-ticket-row__hint">{t("gameModalities.ticketFree")}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {enterHref ? (
          <Link href={enterHref} className={`modality-enter-btn modality-enter-btn--${modalityId}`}>
            {t("gameModalities.enterTournament")}
          </Link>
        ) : (
          <p className="text-zinc-500 text-sm">{t("tournamentsSection.empty")}</p>
        )}

        <div className="modality-cross-links">
          <Link href={withModalityQuery("/leaderboard", modalityId)} className="modality-cross-links__item">
            {t("floatingMenu.ranking")}
          </Link>
          <Link href={withModalityQuery("/chat", modalityId)} className="modality-cross-links__item">
            {t("floatingMenu.chat")}
          </Link>
          <Link href={withModalityQuery("/statistics", modalityId)} className="modality-cross-links__item">
            {t("floatingMenu.tickets")}
          </Link>
        </div>
    </ModalityPageShell>
  );
}
