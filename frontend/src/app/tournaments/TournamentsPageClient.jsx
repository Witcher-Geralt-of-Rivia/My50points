"use client";

/**
 * Tournament discovery. Data: the read-only home list (`for_home=1`) — it never
 * triggers a racing sync. Every card links to its real slug.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Flag, CalendarDays } from "lucide-react";
import TournamentCard from "@/frontend/components/tournaments/TournamentCard";
import { StateBlock, StatusChip } from "@/frontend/components/ui";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { useLiveTournamentsPoll } from "@/frontend/lib/hooks/useLiveTournamentsPoll";
import { isValidModalityId, readPersistedModality } from "@/frontend/lib/gameModalities";
import { displayStatus, ART } from "@/frontend/lib/redesign";
import { MODALITY_CHIP } from "@/frontend/lib/navConfig";

const identity = (t) => t;
const FILTERS = [
  { id: "all", es: "Todos", en: "All" },
  { id: "today", es: "Hoy", en: "Today" },
  { id: "live", es: "En vivo", en: "Live" },
  { id: "upcoming", es: "Próximos", en: "Upcoming" },
  { id: "finished", es: "Finalizados", en: "Finished" },
];

function CardSkeleton() {
  return (
    <div className="tcard ui-metal" aria-hidden>
      <div className="ui-skel" style={{ height: 200, borderRadius: 0 }} />
      <div className="tcard__body">
        <div className="ui-skel" style={{ height: 16, width: "60%" }} />
        <div className="ui-skel" style={{ height: 16, width: "45%" }} />
        <div className="ui-skel" style={{ height: 48 }} />
      </div>
    </div>
  );
}

export default function TournamentsPageClient() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const searchParams = useSearchParams();
  const fromQuery = searchParams.get("modality");
  // The persisted modality lives in browser storage: read it after mount so the
  // server HTML and the first client render match (no hydration mismatch).
  const [persisted, setPersisted] = useState(null);
  useEffect(() => { setPersisted(readPersistedModality() || null); }, []);
  const modalityId = isValidModalityId(fromQuery) ? fromQuery : persisted;
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useLiveTournamentsPoll({
    forHome: true,
    mapFn: identity,
    onData: (list) => setTournaments(list),
    onLoadingChange: setLoading,
  });

  const withStatus = useMemo(
    () => tournaments.map((t) => ({ t, s: displayStatus(t).key })),
    [tournaments],
  );
  const counts = useMemo(() => {
    const c = { all: withStatus.length, today: 0, live: 0, upcoming: 0, finished: 0 };
    for (const { s } of withStatus) {
      if (s === "archived") c.finished += 1;
      else if (c[s] !== undefined) c[s] += 1;
    }
    return c;
  }, [withStatus]);
  const visible = withStatus
    .filter(({ s }) => filter === "all" || s === filter || (filter === "finished" && s === "archived"))
    .map(({ t }) => t);
  const modMeta = modalityId ? MODALITY_CHIP[modalityId] : null;

  return (
    <div className="pg-tournaments">
      <section className="pg-band" aria-labelledby="t-title">
        <img className="pg-band__art" src={ART.tournamentHero} alt="" aria-hidden decoding="async" />
        <div className="pg-band__veil" aria-hidden />
        <div className="ui-container ui-container--wide pg-band__inner">
          <p className="t-eyebrow" data-accent="aqua">{isEn ? "Racing calendar" : "Calendario de carreras"}</p>
          <h1 id="t-title" className="t-page">{isEn ? "Tournaments" : "Torneos"}</h1>
          <p className="t-body-lg">
            {isEn
              ? "Every tournament is the last seven races of a racetrack. Choose one and build your ticket."
              : "Cada torneo son las siete últimas carreras de un hipódromo. Elige uno y construye tu boleto."}
          </p>
          {modMeta ? (
            <p className="pg-band__mod">
              <StatusChip tone={modMeta.tone} icon={false}>{isEn ? modMeta.en : modMeta.es}</StatusChip>
              <Link href="/modalidades" className="ui-btn ui-btn--link">{isEn ? "Change mode" : "Cambiar modalidad"}</Link>
            </p>
          ) : null}
        </div>
      </section>

      <div className="ui-container ui-container--wide pg-tournaments__body">
        <div className="ui-tabs" role="tablist" aria-label={isEn ? "Filter by status" : "Filtrar por estado"}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              className={`ui-tab${filter === f.id ? " is-on" : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {isEn ? f.en : f.es}
              <span className="ui-tab__count t-num">{loading ? "·" : counts[f.id]}</span>
            </button>
          ))}
        </div>

        <div className="home-tgrid" role="tabpanel">
          {loading && tournaments.length === 0 ? (
            [0, 1, 2].map((i) => <CardSkeleton key={i} />)
          ) : visible.length ? (
            visible.map((t, i) => (
              <TournamentCard key={t.slug || t.id} tournament={t} isEn={isEn} modalityId={modalityId} priority={i < 3} />
            ))
          ) : (
            <StateBlock
              icon={filter === "all" ? CalendarDays : Flag}
              accent="aqua"
              title={
                filter === "all"
                  ? isEn ? "No tournaments published yet" : "Todavía no hay torneos publicados"
                  : isEn ? "No tournaments in this view" : "No hay torneos en esta vista"
              }
              actions={filter !== "all" ? (
                <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" onClick={() => setFilter("all")}>
                  {isEn ? "Show all" : "Ver todos"}
                </button>
              ) : null}
            >
              {isEn
                ? "Tournaments appear as soon as a racetrack publishes its racecard. Check back on race day."
                : "Los torneos aparecen en cuanto un hipódromo publica su programa. Vuelve el día de carreras."}
            </StateBlock>
          )}
        </div>
      </div>
    </div>
  );
}
