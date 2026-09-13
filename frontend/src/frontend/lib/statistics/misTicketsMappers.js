/** Map backend /statistics responses to MIS TICKETS UI shapes. */

export const POINTS_PER_RACE_BET = 50;

const CHART_COLORS = ["#a855f7", "#06b6d4", "#f59e0b", "#ef4444", "#22c55e", "#64748b"];

export function formatNum(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return Number(n).toLocaleString("es-ES");
}

export function formatPct(n, signed = false) {
  if (n == null || Number.isNaN(Number(n))) return null;
  const v = Number(n);
  const text = `${Math.abs(v).toLocaleString("es-ES", { maximumFractionDigits: 1 })}%`;
  if (!signed) return text;
  if (v > 0) return `+${text}`;
  if (v < 0) return `-${text}`;
  return text;
}

export function formatTournamentDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function buildDonutFromApi(horses, totalPoints = POINTS_PER_RACE_BET) {
  const top = (horses || []).slice(0, 6);
  if (!top.length) return [];
  const sum = top.reduce((s, h) => s + (h.plays || 0), 0) || 1;
  return top.map((h, i) => ({
    label: h.name,
    num: h.number ?? null,
    value: Math.round(((h.plays || 0) / sum) * 100),
    color: CHART_COLORS[i % CHART_COLORS.length],
    pts: Math.round(((h.plays || 0) / sum) * totalPoints),
  }));
}

export function mapFinishTableRows(rows) {
  return (rows || []).map((r) => ({
    pos: r.position,
    horse: r.horse,
    pts: String(r.points ?? 0),
    highlight: Boolean(r.highlight),
    color: r.color || CHART_COLORS[0],
  }));
}

export function mapHorseOptions(list) {
  return (list || []).map((item) => ({
    name: item.name,
    pct: item.percent ?? item.pct ?? "—",
  }));
}

export function mapUserTopHorses(horses, limit = 3) {
  const top = (horses || []).slice(0, limit);
  const total = top.reduce((s, h) => s + (h.plays || 0), 0) || 1;
  return top.map((h) => ({
    name: h.name,
    pct: `${Math.round(((h.plays || 0) / total) * 100)}%`,
  }));
}

export function padEvolution(values, slotCount) {
  const count = Math.max(slotCount, 1);
  const v = Array.isArray(values) ? [...values] : [];
  while (v.length < count) v.push(0);
  return v.slice(0, count);
}

export function personalMetricsView(personalStats, t) {
  const m = personalStats?.metrics;
  if (!m) return null;
  const field = m.bestRankField ? formatNum(m.bestRankField) : "—";
  return {
    pointsPlayed: formatNum(m.pointsPlayed),
    pointsWon: formatNum(m.pointsWon),
    profitability: formatPct(m.profitabilityPct, true) ?? "—",
    bestPosition: m.bestRank ? `${m.bestRank}°` : "—",
    bestPositionSub: m.bestRank
      ? `${t("misTicketsStats.ofPlayers").replace("{n}", field)}`
      : "—",
    linePurple: padEvolution(m.evolutionLine, 7),
    donutPct: Math.round(m.accuracyPct ?? personalStats?.winRate ?? 0),
  };
}

export function raceMetricsView(raceStats, personalStats) {
  if (!raceStats && !personalStats) return null;
  const m = personalStats?.metrics;
  const personal = raceStats?.personal;
  const line = m?.evolutionLine?.length ? m.evolutionLine : [];
  const hasPersonal = Boolean(personalStats || personal);
  return {
    racesPlayed: m?.racesPlayedCount ?? personalStats?.totalRaces ?? "—",
    accuracy:
      m?.accuracyPct != null
        ? `${Math.round(m.accuracyPct)}%`
        : personalStats?.winRate != null
          ? `${Math.round(personalStats.winRate)}%`
          : "—",
    avgPoints: formatNum(
      personal?.averagePointsEarned ?? m?.averagePointsPerRace ?? raceStats?.averagePointsEarned,
    ),
    bestRace: m?.bestRaceLabel ?? raceStats?.raceName ?? "—",
    bestRacePts: m?.bestRacePoints
      ? `${formatNum(m.bestRacePoints)} pts`
      : "—",
    bestRaceTrack: m?.bestRaceTrack ?? raceStats?.track ?? "—",
    lineGreen: padEvolution(line, 7),
    donutPct: Math.round(m?.accuracyPct ?? personalStats?.winRate ?? 0),
  };
}

export function tournamentMetricsView(tournamentStats, t) {
  if (!tournamentStats) return null;
  const user = tournamentStats.user;
  const field = user?.fieldSize ? formatNum(user.fieldSize) : "—";
  const evo = tournamentStats.performance?.personalEvolution ?? [];
  return {
    position: user?.rank ? `${user.rank}°` : "—",
    positionSub: user?.rank
      ? t("misTicketsStats.ofPlayers").replace("{n}", field)
      : "—",
    totalPoints: formatNum(user?.totalPoints),
    distributed: formatNum(tournamentStats.totalPointsDistributed),
    leader: tournamentStats.leader?.username ?? "—",
    leaderPts: tournamentStats.leader?.totalPoints
      ? `${formatNum(tournamentStats.leader.totalPoints)} pts`
      : "—",
    lineOrange: padEvolution(evo, tournamentStats.totalRaces ?? 7),
    donutPct: Math.round(user?.hitRate ?? 0),
  };
}

export function raceOutcomeView(raceStats) {
  const po = raceStats?.personalOutcome;
  const go = raceStats?.generalOutcome;
  return {
    personal: po
      ? {
          big: String(po.pointsEarned ?? 0),
          rank: po.rank ? `${po.rank}°` : "—",
          winner: formatWinner(po.winnerHorse, po.winnerNumber),
          table: mapFinishTableRows(po.finishTable),
        }
      : null,
    general: go
      ? {
          big: String(go.averagePoints ?? 0),
          avgPosition: go.averagePosition ? `${go.averagePosition}°` : "—",
          winner: formatWinner(go.winnerHorse, go.winnerNumber),
          table: mapFinishTableRows(go.finishTable),
        }
      : null,
  };
}

function formatWinner(name, number) {
  if (!name) return "—";
  if (number != null) return `${name} (${number})`;
  return name;
}

export function tournamentPerfView(tournamentStats, totalRaces) {
  if (!tournamentStats) return { personal: null, general: null };
  const user = tournamentStats.user;
  const perf = tournamentStats.performance;
  const perfGen = tournamentStats.performanceGeneral;
  const slots = totalRaces ?? tournamentStats.totalRaces ?? 7;

  return {
    personal: user
      ? {
          totalPoints: formatNum(user.totalPoints),
          rank: user.rank ? `${user.rank}°` : "—",
          avgPoints: formatNum(user.averagePoints),
          hitRate: user.hitRate != null ? `${Math.round(user.hitRate)}%` : "—",
          evolution: padEvolution(perf?.personalEvolution, slots),
          horseOptions: mapUserTopHorses(user.topHorses),
          distribution: user.strategyDistribution ?? [],
        }
      : null,
    general: {
      totalPoints: formatNum(tournamentStats.pointsDistribution?.averageTop10),
      avgPos: "—",
      avgPoints: formatNum(tournamentStats.pointsDistribution?.averageTop10),
      accuracy: "—",
      evolution: padEvolution(perfGen?.generalEvolution, slots),
      horseOptions: mapHorseOptions(tournamentStats.topHorseOptions),
      distribution: tournamentStats.strategyDistribution ?? [],
    },
  };
}
