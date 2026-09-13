"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  ChevronDown,
  Globe2,
  MapPin,
  Trophy,
  User,
  Flag,
} from "lucide-react";
import AppPageHeader from "@/frontend/components/layout/AppPageHeader";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { useAuth } from "@/frontend/contexts/AuthContext";
import { fetchAuthJson, fetchJson } from "@/frontend/lib/api/client";

const VALID_LEVELS = new Set(["race", "tournament", "racetrack", "global", "personal"]);

const LEVELS = [
  { id: "race", icon: Flag, accent: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10" },
  { id: "tournament", icon: Trophy, accent: "text-orange-400 border-orange-500/40 bg-orange-500/10" },
  { id: "racetrack", icon: MapPin, accent: "text-cyan-400 border-cyan-500/40 bg-cyan-500/10" },
  { id: "global", icon: Globe2, accent: "text-violet-400 border-violet-500/40 bg-violet-500/10" },
  { id: "personal", icon: User, accent: "text-purple-300 border-purple-500/40 bg-purple-500/10" },
];

function StrategyList({ items }) {
  if (!items?.length) return <p className="text-zinc-500 text-sm">—</p>;
  return (
    <ul className="space-y-1.5 text-sm">
      {items.map((s) => (
        <li key={s.strategyKey} className="flex justify-between gap-3">
          <span>
            {s.strategyShort || s.strategy}{" "}
            <span className="text-zinc-500 text-xs">({s.strategy})</span>
          </span>
          <span className="font-bold text-white">{s.percent}%</span>
        </li>
      ))}
    </ul>
  );
}

function HorseList({ items, limit = 10 }) {
  if (!items?.length) return <p className="text-zinc-500 text-sm">—</p>;
  return (
    <ol className="space-y-1.5 text-sm">
      {items.slice(0, limit).map((h, i) => (
        <li key={h.horseId} className="flex justify-between gap-3">
          <span>
            <span className="text-zinc-500 mr-2">#{i + 1}</span>
            {h.name}
          </span>
          <span className="text-purple-light font-semibold">{h.plays}</span>
        </li>
      ))}
    </ol>
  );
}

function MetricCard({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
      {sub ? <p className="text-xs text-zinc-500 mt-1">{sub}</p> : null}
    </div>
  );
}

export default function StatisticsDashboard({ initialLevel = "tournament" }) {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [activeLevel, setActiveLevel] = useState(initialLevel);
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [races, setRaces] = useState([]);
  const [selectedRaceId, setSelectedRaceId] = useState(null);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [raceStats, setRaceStats] = useState(null);
  const [tournamentStats, setTournamentStats] = useState(null);
  const [trackStats, setTrackStats] = useState(null);
  const [globalStats, setGlobalStats] = useState(null);
  const [personalStats, setPersonalStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const levelLabel = useCallback((id) => t(`statsLevels.${id}`), [t]);

  useEffect(() => {
    if (VALID_LEVELS.has(initialLevel)) setActiveLevel(initialLevel);
  }, [initialLevel]);

  const tracks = useMemo(() => {
    const set = new Set(tournaments.map((x) => x.track).filter(Boolean));
    return [...set];
  }, [tournaments]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const res = await fetchJson("/tournaments");
        const list = res.tournaments || res || [];
        if (cancelled) return;
        setTournaments(list);
        const live = list.find((x) => x.status === "live") || list[0];
        if (live) {
          setSelectedTournament(live);
          setSelectedTrack(live.track || null);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load");
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedTournament?.slug) return;
    let cancelled = false;
    fetchJson(`/tournaments/${encodeURIComponent(selectedTournament.slug)}`)
      .then((data) => {
        if (cancelled) return;
        const list = data.tournament?.races || data.races || [];
        setRaces(list);
        const first = list[0];
        if (first) setSelectedRaceId(first.id);
      })
      .catch(() => {
        if (!cancelled) setRaces([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedTournament?.slug]);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tasks = [
        fetchJson("/statistics/global").then(setGlobalStats),
      ];
      if (selectedTournament?.id) {
        tasks.push(
          fetchJson(`/statistics/tournament/${selectedTournament.id}`).then(setTournamentStats)
        );
      }
      if (selectedTrack) {
        tasks.push(
          fetchJson(`/statistics/track/${encodeURIComponent(selectedTrack)}`).then(setTrackStats)
        );
      }
      if (selectedRaceId) {
        const raceReq = isAuthenticated
          ? fetchAuthJson(`/statistics/race/${selectedRaceId}`)
          : fetchJson(`/statistics/race/${selectedRaceId}`);
        tasks.push(raceReq.then(setRaceStats));
      }
      if (isAuthenticated) {
        tasks.push(fetchAuthJson("/statistics/personal").then(setPersonalStats));
      } else {
        setPersonalStats(null);
      }
      await Promise.all(tasks);
    } catch (err) {
      setError(err.message || "Failed to load statistics");
    } finally {
      setLoading(false);
    }
  }, [selectedTournament?.id, selectedTrack, selectedRaceId, isAuthenticated]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const activeAccent = LEVELS.find((l) => l.id === activeLevel)?.accent || "";

  return (
    <>
        <AppPageHeader
          className="mb-6"
          title={t("nav.statistics")}
          subtitle={t("statsLevels.subtitle")}
        />

        <div className="flex flex-wrap gap-2 mb-6">
          {LEVELS.map(({ id, icon: Icon }) => {
            const active = activeLevel === id;
            const disabled = id === "personal" && !isAuthenticated;
            return (
              <button
                key={id}
                type="button"
                disabled={disabled}
                onClick={() => setActiveLevel(id)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide border transition-all ${
                  active
                    ? "bg-purple/25 border-purple/50 text-white"
                    : "border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
                } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {levelLabel(id)}
              </button>
            );
          })}
        </div>

        <div className="mis-stats-filters mb-6">
          <label className="mis-stats-filter mis-stats-filter--tournament">
            <Trophy className="mis-stats-filter__icon" aria-hidden />
            <span
              className="mis-stats-filter__label"
              title={selectedTournament?.name || t("misTicketsStats.filterNoTournaments")}
            >
              {selectedTournament?.name || t("misTicketsStats.filterNoTournaments")}
            </span>
            <select
              className="mis-stats-filter__control"
              aria-label={t("misTicketsStats.filterTournament")}
              value={selectedTournament?.id ?? ""}
              disabled={tournaments.length === 0}
              onChange={(e) => {
                const tourn = tournaments.find((x) => String(x.id) === e.target.value);
                setSelectedTournament(tourn || null);
                if (tourn?.track) setSelectedTrack(tourn.track);
              }}
            >
              {tournaments.length === 0 ? (
                <option value="">{t("misTicketsStats.filterNoTournaments")}</option>
              ) : (
                tournaments.map((tourn) => (
                  <option key={tourn.id} value={tourn.id}>
                    {tourn.name}
                  </option>
                ))
              )}
            </select>
            <ChevronDown className="mis-stats-filter__chevron" aria-hidden />
          </label>
          <label className="mis-stats-filter">
            <MapPin className="mis-stats-filter__icon" aria-hidden />
            <span
              className="mis-stats-filter__label"
              title={selectedTrack || t("misTicketsStats.filterAllTracks")}
            >
              {selectedTrack || t("misTicketsStats.filterAllTracks")}
            </span>
            <select
              className="mis-stats-filter__control"
              aria-label={t("misTicketsStats.filterTrack")}
              value={selectedTrack ?? ""}
              disabled={tracks.length === 0}
              onChange={(e) => setSelectedTrack(e.target.value || null)}
            >
              {tracks.length === 0 ? (
                <option value="">{t("misTicketsStats.filterAllTracks")}</option>
              ) : (
                tracks.map((track) => (
                  <option key={track} value={track}>
                    {track}
                  </option>
                ))
              )}
            </select>
            <ChevronDown className="mis-stats-filter__chevron" aria-hidden />
          </label>
        </div>

        {activeLevel === "race" && races.length > 0 ? (
          <div className="mis-stats-race-pills mb-6" role="tablist" aria-label={t("misTicketsStats.selectRace")}>
            {races.map((race) => {
              const isActive = selectedRaceId === race.id;
              return (
                <button
                  key={race.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setSelectedRaceId(race.id)}
                  className={`mis-stats-race-pill${isActive ? " mis-stats-race-pill--active" : ""}`}
                >
                  {t("tournaments.race")} {race.raceNumber}
                </button>
              );
            })}
          </div>
        ) : null}

        {loading && <p className="text-zinc-500 text-sm py-12 text-center">{t("statsLevels.loading")}</p>}
        {error && <p className="text-red-400 text-sm py-8">{error}</p>}

        {!loading && !error ? (
          <section className={`rounded-2xl border p-6 ${activeAccent}`}>
            {activeLevel === "race" && raceStats ? (
              <>
                <h2 className="text-lg font-bold mb-1">
                  {levelLabel("race")} — {raceStats.raceName}
                </h2>
                <p className="text-xs text-zinc-500 mb-4">
                  {raceStats.track} · {raceStats.tournamentName}
                </p>
                <div className="grid sm:grid-cols-3 gap-3 mb-6">
                  <MetricCard label={t("statsLevels.tickets")} value={raceStats.totalTickets} />
                  <MetricCard label={t("statsLevels.players")} value={raceStats.uniquePlayers} />
                  <MetricCard
                    label={t("statsLevels.avgPoints")}
                    value={raceStats.averagePointsEarned}
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-400 mb-2">{t("statsLevels.topHorses")}</h3>
                    <HorseList items={raceStats.topHorses} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-400 mb-2">{t("statsLevels.strategies")}</h3>
                    <StrategyList items={raceStats.strategyUsage} />
                  </div>
                </div>
                {raceStats.personal ? (
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <h3 className="text-sm font-bold text-purple-light mb-3">{t("statsLevels.yourRace")}</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <HorseList items={raceStats.personal.topHorses} limit={5} />
                      <StrategyList items={raceStats.personal.strategyUsage} />
                    </div>
                    <p className="text-sm mt-3">
                      {t("statsLevels.pointsEarned")}:{" "}
                      <span className="font-bold text-white">{raceStats.personal.pointsEarned}</span>
                    </p>
                  </div>
                ) : null}
              </>
            ) : null}

            {activeLevel === "tournament" && tournamentStats ? (
              <>
                <h2 className="text-lg font-bold mb-1">
                  {levelLabel("tournament")} — {tournamentStats.tournamentName}
                </h2>
                <p className="text-xs text-zinc-500 mb-4">{tournamentStats.track}</p>
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-400 mb-2">{t("statsLevels.topHorses")}</h3>
                    <HorseList items={tournamentStats.topHorses} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-400 mb-2">{t("statsLevels.strategies")}</h3>
                    <StrategyList items={tournamentStats.strategyUsage} />
                  </div>
                </div>
                <h3 className="text-sm font-bold text-zinc-400 mb-2">{t("statsLevels.ranking")}</h3>
                <ul className="space-y-1 text-sm">
                  {(tournamentStats.rankingSnapshot || []).slice(0, 10).map((row) => (
                    <li key={`${row.userId}-${row.ticketNumber}`} className="flex justify-between">
                      <span>
                        #{row.rank} · Ticket {row.ticketNumber}
                      </span>
                      <span className="text-orange-300 font-bold">{row.totalPoints} pts</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            {activeLevel === "racetrack" && trackStats ? (
              <>
                <h2 className="text-lg font-bold mb-1">
                  {levelLabel("racetrack")} — {trackStats.track}
                </h2>
                <p className="text-xs text-zinc-500 mb-4">
                  {trackStats.tournamentCount} {t("statsLevels.tournaments")} · {trackStats.participation}{" "}
                  {t("statsLevels.players")}
                </p>
                {trackStats.topPlayer ? (
                  <p className="text-sm mb-4">
                    {t("statsLevels.topPlayer")}:{" "}
                    <span className="text-cyan-300 font-bold">{trackStats.topPlayer.username}</span> (
                    {trackStats.highestRecord} pts)
                  </p>
                ) : null}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-400 mb-2">{t("statsLevels.topHorsesHistoric")}</h3>
                    <HorseList items={trackStats.topHorses} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-400 mb-2">{t("statsLevels.strategies")}</h3>
                    <StrategyList items={trackStats.strategyUsage} />
                  </div>
                </div>
                {trackStats.topRacesByParticipation?.length ? (
                  <div className="mt-6">
                    <h3 className="text-sm font-bold text-zinc-400 mb-2">{t("statsLevels.topRaces")}</h3>
                    <ul className="space-y-1 text-sm">
                      {trackStats.topRacesByParticipation.map((r) => (
                        <li key={r.raceId} className="flex justify-between">
                          <span>{r.label}</span>
                          <span>{r.plays}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            ) : null}

            {activeLevel === "global" && globalStats ? (
              <>
                <h2 className="text-lg font-bold mb-4">{levelLabel("global")}</h2>
                <div className="grid sm:grid-cols-2 gap-3 mb-6">
                  <MetricCard
                    label={t("statsLevels.popularTrack")}
                    value={globalStats.mostPopularTrack || "—"}
                  />
                  <MetricCard
                    label={t("statsLevels.profitableTrack")}
                    value={globalStats.mostProfitableTrack || "—"}
                  />
                  <MetricCard
                    label={t("statsLevels.difficultTrack")}
                    value={globalStats.mostDifficultTrack || "—"}
                  />
                  <MetricCard label={t("statsLevels.tickets")} value={globalStats.totalTickets} />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-400 mb-2">{t("statsLevels.topHorses")}</h3>
                    <HorseList items={globalStats.topHorses} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-400 mb-2">{t("statsLevels.strategies")}</h3>
                    <StrategyList items={globalStats.strategyUsage} />
                  </div>
                </div>
              </>
            ) : null}

            {activeLevel === "personal" ? (
              isAuthenticated && personalStats ? (
                <>
                  <h2 className="text-lg font-bold mb-1">
                    {levelLabel("personal")} — {personalStats.username}
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-3 mb-6">
                    <MetricCard label={t("statsLevels.totalPoints")} value={personalStats.totalPoints} />
                    <MetricCard label={t("statsLevels.winRate")} value={`${personalStats.winRate}%`} />
                    <MetricCard
                      label={t("statsLevels.favoriteTrack")}
                      value={personalStats.favoriteTrack || "—"}
                    />
                    <MetricCard
                      label={t("statsLevels.favoriteStrategy")}
                      value={personalStats.favoriteStrategy || "—"}
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <HorseList items={personalStats.topHorses} />
                    <StrategyList items={personalStats.strategyUsage} />
                  </div>
                </>
              ) : (
                <p className="text-zinc-500 text-sm">{t("statsLevels.loginRequired")}</p>
              )
            ) : null}
          </section>
        ) : null}

        <p className="text-xs text-zinc-600 mt-8 max-w-3xl leading-relaxed">{t("statsLevels.cascadeNote")}</p>
    </>
  );
}
