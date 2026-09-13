"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { staticFile } from "@/frontend/lib/config/paths";

export default function LiveTournamentCard({
  tournament,
  t,
  featured = false,
  href = "/tournaments",
  previewOnly = false,
}) {
  const isLive = tournament.status === "LIVE" || tournament.status === "live";

  const cardClass = [
    "live-tournament-card",
    isLive ? "live-tournament-card--active" : "live-tournament-card--upcoming",
    featured ? "live-tournament-card--featured" : "",
    previewOnly ? "live-tournament-card--preview" : "",
    "live-tournament-card--cover",
  ]
    .filter(Boolean)
    .join(" ");

  const shell = (
    <div className="live-tournament-card__shell">
      <div className="live-tournament-card__gloss" aria-hidden />
      <div className="live-tournament-card__gloss-edge" aria-hidden />

      <div className="live-tournament-card__media">
        <img
          src={tournament.imageUrl || staticFile("/images/live-feed.jpg")}
          alt=""
          className="live-tournament-card__image"
        />
        <div className="live-tournament-card__media-shade" aria-hidden />
        <div className="live-tournament-card__media-gloss" aria-hidden />
        <div className="live-tournament-card__badges">
          <span className="live-tournament-card__track-pill">{tournament.trackName}</span>
        </div>
      </div>

      {!previewOnly ? (
        <div className="live-tournament-card__body live-tournament-card__body--cover">
          <span className="live-tournament-card__cta">
            {t("tournamentsSection.enterTournament")}
            <ChevronRight className="live-tournament-card__cta-icon" aria-hidden />
          </span>
        </div>
      ) : null}
    </div>
  );

  if (previewOnly) {
    return (
      <article className={cardClass} aria-label={tournament.trackName}>
        {shell}
      </article>
    );
  }

  return (
    <Link href={href} className={cardClass}>
      {shell}
    </Link>
  );
}
