"use client";

import { useCallback, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { avBgFile, logoFile } from "@/frontend/lib/config/paths";
import ModalityPageShell from "@/frontend/components/modalities/ModalityPageShell";
import TrackTicketsPanel from "@/frontend/components/modalities/TrackTicketsPanel";
import TicketFamilyGallery from "@/frontend/components/modalities/TicketFamilyGallery";

export default function GuestAvTracksPage({ modalityId, tracks, loading }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [expandedSlug, setExpandedSlug] = useState(null);
  const [usageVersion, setUsageVersion] = useState(0);
  const [gallery, setGallery] = useState(null);

  const expandedTrack = tracks.find((tr) => tr.slug === expandedSlug) || null;

  const refreshUsage = useCallback(() => {
    setUsageVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    const onRefresh = () => refreshUsage();
    window.addEventListener("focus", onRefresh);
    window.addEventListener("50points-tickets-updated", onRefresh);
    return () => {
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener("50points-tickets-updated", onRefresh);
    };
  }, [refreshUsage]);

  const openGallery = useCallback((track, ticketIndex = 0) => {
    setExpandedSlug(track.slug);
    setGallery({ track, ticketIndex });
  }, []);

  const handlePlayTicket = useCallback(
    (_ticketNum, href) => {
      if (href) router.push(href);
    },
    [router],
  );

  const toggleTrack = (slug) => {
    setExpandedSlug((prev) => (prev === slug ? null : slug));
  };

  return (
    <ModalityPageShell modalityId={modalityId} className="modality-page--guest-av">
      <div className="av-tracks-surface">
        <img
          className="av-tracks-surface__bg"
          src={avBgFile()}
          alt=""
          aria-hidden
          decoding="async"
          fetchPriority="high"
          loading="eager"
        />
        <div className="av-tracks-surface__veil" aria-hidden />

        <div className="av-tracks-layout">
          <header className="av-tracks-header">
            <Link href="/" className="av-tracks-brand">
              <img src={logoFile()} alt="" className="av-tracks-brand__mark" />
              <span className="av-tracks-brand__name">{t("guestTracks.brand")}</span>
            </Link>
          </header>

          <section className="av-tracks-hero">
            <span className="av-tracks-hero__badge">
              <Shield className="av-tracks-hero__badge-icon" aria-hidden strokeWidth={2} />
              {t("gameModalities.guest.title")}
            </span>
            <h1 className="av-tracks-hero__title">
              <span className="av-tracks-hero__title-line">{t("guestTracks.heroAvailable")}</span>
              <span className="av-tracks-hero__title-accent">{t("guestTracks.heroRacetracks")}</span>
            </h1>
            <p className="av-tracks-hero__subtitle">{t("gameModalities.tracksSubtitle")}</p>
          </section>

          <div className="av-tracks-main">
            {loading ? (
              <p className="av-tracks-status">{t("gameModalities.loading")}</p>
            ) : tracks.length === 0 ? (
              <p className="av-tracks-status">{t("tournamentsSection.empty")}</p>
            ) : (
              <ul className="modality-tracks-accordion modality-tracks-accordion--guest">
                {tracks.map((track) => {
                  const isOpen = expandedSlug === track.slug;
                  return (
                    <li
                      key={track.slug}
                      className={`modality-tracks-accordion__item${isOpen ? " modality-tracks-accordion__item--open" : ""}`}
                    >
                      <button
                        type="button"
                        className="modality-track-row modality-track-row--button modality-track-row--guest"
                        onClick={() => toggleTrack(track.slug)}
                        aria-expanded={isOpen}
                      >
                        <span
                          className="modality-track-row__thumb"
                          style={
                            track.imageUrl
                              ? { backgroundImage: `url(${track.imageUrl})` }
                              : undefined
                          }
                        />
                        <span className="modality-track-row__info">
                          <span className="modality-track-row__name">{track.name}</span>
                          {track.location ? (
                            <span className="modality-track-row__loc">
                              <MapPin className="w-3 h-3 inline mr-1 opacity-60" aria-hidden />
                              {track.location}
                            </span>
                          ) : null}
                          <span className="modality-track-row__meta">
                            {track.count === 1
                              ? t("gameModalities.oneTournamentAtTrack")
                              : `${track.count} ${t("gameModalities.tournamentsAtTrack")}`}
                            {track.live ? (
                              <span className="modality-track-row__live">{t("gameModalities.live")}</span>
                            ) : null}
                          </span>
                        </span>
                        {isOpen ? (
                          <ChevronUp className="modality-track-row__chevron" aria-hidden />
                        ) : (
                          <ChevronDown className="modality-track-row__chevron" aria-hidden />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {expandedTrack?.tournamentSlug ? (
              <div id="track-tickets-dock" className="track-tickets-dock">
                <TrackTicketsPanel
                  modalityId={modalityId}
                  trackSlug={expandedTrack.slug}
                  tournamentSlug={expandedTrack.tournamentSlug}
                  usageVersion={usageVersion}
                  onOpenGallery={(ticketIndex) => openGallery(expandedTrack, ticketIndex)}
                  onPlayTicket={handlePlayTicket}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <TicketFamilyGallery
        open={!!gallery}
        track={gallery?.track}
        modalityId={modalityId}
        initialTicketIndex={gallery?.ticketIndex ?? 0}
        onClose={() => setGallery(null)}
      />
    </ModalityPageShell>
  );
}
