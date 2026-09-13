"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { buildTracksFromTournaments } from "@/frontend/components/modalities/ModalityTracksList";
import { useLiveTournamentsPoll } from "@/frontend/lib/hooks/useLiveTournamentsPoll";
import { withModalityQuery } from "@/frontend/lib/gameModalities";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";

function trackHref(modalityId, trackSlug) {
  const base = withModalityQuery("/tournaments", modalityId);
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}track=${encodeURIComponent(trackSlug)}`;
}

export default function HubTracksSummary({ modalityId }) {
  const { t } = useLanguage();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useLiveTournamentsPoll({
    forHome: true,
    onData: (mapped) => setTournaments(mapped),
    onLoadingChange: setLoading,
  });

  const tracks = useMemo(() => buildTracksFromTournaments(tournaments), [tournaments]);

  if (loading) {
    return (
      <ul className="modality-tracks-list player-hub-tracks-list">
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i}>
            <div className="modality-track-row modality-track-row--skeleton animate-pulse" aria-hidden>
              <span className="modality-track-row__thumb bg-white/5" />
              <span className="modality-track-row__info">
                <span className="block h-4 w-32 bg-white/5 rounded mb-1" />
                <span className="block h-3 w-24 bg-white/5 rounded" />
              </span>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (tracks.length === 0) {
    return <p className="player-hub-segment__empty">{t("tournamentsSection.empty")}</p>;
  }

  return (
    <ul className="modality-tracks-list player-hub-tracks-list">
      {tracks.map((track) => (
        <li key={track.slug}>
          <Link
            href={trackHref(modalityId, track.slug)}
            className={`modality-track-row modality-track-row--${modalityId}`}
          >
            <span
              className="modality-track-row__thumb"
              style={track.imageUrl ? { backgroundImage: `url(${track.imageUrl})` } : undefined}
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
                {track.count} {t("gameModalities.tournamentsAtTrack")}
                {track.live ? (
                  <span className="modality-track-row__live">{t("gameModalities.live")}</span>
                ) : null}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
