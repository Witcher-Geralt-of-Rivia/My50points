"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { getModality, trackSlug } from "@/frontend/lib/gameModalities";
import { useLiveTournamentsPoll } from "@/frontend/lib/hooks/useLiveTournamentsPoll";
import ModalityPageShell from "@/frontend/components/modalities/ModalityPageShell";
import TracksWorkflowList from "@/frontend/components/modalities/TracksWorkflowList";
import { getTournamentImageUrl } from "@/frontend/lib/tournamentImages";

export function buildTracksFromTournaments(tournaments) {
  const map = new Map();
  const now = new Date();

  for (const tourn of tournaments) {
    const track =
      tourn.track || tourn.trackName || tourn.name?.split("—")[0]?.trim() || "Track";
    const slug = trackSlug(track);

    const races = Array.isArray(tourn.races) ? tourn.races : [];
    const firstRaceTime = races.length > 0 ? (races[0].scheduledTime || races[0].scheduled_time) : null;
    const lastRaceTime = races.length > 0 ? (races[races.length - 1].scheduledTime || races[races.length - 1].scheduled_time) : null;

    // El horario SOLO puede salir del post time real de la primera carrera.
    // Antes, si venía "TBD", se caía a `tourn.date` (medianoche UTC) y en zonas
    // con offset negativo se pintaba como "7:00 P.M." del día ANTERIOR: la
    // tarjeta decía 27 de julio mientras el torneo era del 28.
    const validRaceTime =
      firstRaceTime && firstRaceTime !== "TBD" && !isNaN(new Date(firstRaceTime).getTime())
        ? firstRaceTime
        : null;
    const eventDate = validRaceTime || tourn.eventDate || tourn.date || null;
    const startDate = validRaceTime ? new Date(validRaceTime) : null;
    
    const validLastRaceTime =
      lastRaceTime && lastRaceTime !== "TBD" && !isNaN(new Date(lastRaceTime).getTime())
        ? lastRaceTime
        : null;
    let endDate = validLastRaceTime ? new Date(validLastRaceTime) : null;
    if (endDate && !isNaN(endDate.getTime())) {
      endDate = new Date(endDate.getTime() + 35 * 60 * 1000); // add 35 mins for final race
    } else if (startDate && !isNaN(startDate.getTime())) {
      endDate = new Date(startDate.getTime() + 4 * 3600 * 1000); // 4 hrs default tournament window
    }

    // El estado lo decide el BACKEND, que lo deriva de los resultados oficiales.
    // Antes se recalculaba aquí con una ventana de horas y las dos fuentes se
    // contradecían: un torneo con sus 7 carreras resueltas seguía saliendo "en
    // vivo", y uno que aún no había puntuado se daba por terminado.
    const computedLive = tourn.status === "live";
    const computedFinished = tourn.status === "completed" || tourn.status === "finished";

    const cardKey = tourn.slug || slug;
    const existing = map.get(cardKey);
    // Prioritize active (non-completed) tournaments and most recent dates
    const isNewerOrActive = !existing || 
      (!computedFinished && existing.isFinished) ||
      (startDate && existing.startDate && startDate > existing.startDate && (!computedFinished || existing.isFinished));

    if (isNewerOrActive) {
      map.set(cardKey, {
        id: tourn.id,
        name: track,
        slug: tourn.slug || slug,
        trackSlug: slug,
        location: tourn.location || "",
        eventDate: eventDate,
        startDate: startDate,
        endDate: endDate,
        startTime: tourn.startTime || tourn.nextRace || null,
        imageUrl:
          tourn.imageUrl ||
          getTournamentImageUrl({ track, slug: tourn.slug, imageUrl: tourn.imageUrl }) ||
          undefined,
        isLive: computedLive,
        isFinished: computedFinished,
        live: computedLive,
        finished: computedFinished,
        racesCount: races.length || 7,
        status: tourn.status,
      });
    }
  }

  return [...map.values()].sort((a, b) => {
    if (a.live && !b.live) return -1;
    if (!a.live && b.live) return 1;
    if (!a.finished && b.finished) return -1;
    if (a.finished && !b.finished) return 1;

    const dateA = a.eventDate ? new Date(a.eventDate).getTime() : Infinity;
    const dateB = b.eventDate ? new Date(b.eventDate).getTime() : Infinity;

    return dateA - dateB;
  });
}

export default function ModalityTracksList({ modalityId, embedded = false, onTrackClick = null }) {
  const { t } = useLanguage();
  const mod = getModality(modalityId);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useLiveTournamentsPoll({
    forHome: true,
    onData: (mapped) => setTournaments(mapped),
    onLoadingChange: setLoading,
  });

  const tracks = useMemo(() => buildTracksFromTournaments(tournaments), [tournaments]);

  if (!mod.available) {
    return (
      <ModalityPageShell modalityId={modalityId}>
        <p className="modality-empty-msg">{t("gameModalities.comingSoon")}</p>
        <Link href="/modalidades" className="modality-back-link">
          ← {t("gameModalities.stepHub")}
        </Link>
      </ModalityPageShell>
    );
  }

  return (
    <TracksWorkflowList
      modalityId={modalityId}
      tracks={tracks}
      loading={loading}
      t={t}
      embedded={embedded}
      onTrackClick={onTrackClick}
    />
  );
}
