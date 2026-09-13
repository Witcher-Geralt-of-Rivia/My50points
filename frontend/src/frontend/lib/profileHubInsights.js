import { getUsedTicketsForTrack } from "@/frontend/lib/trackTicketUsage";

/** Derive profile hub insight cards from API profile payload. */

function isToday(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function getHotTicketInsight(allTickets = [], tournamentSummaries = []) {
  const todayTickets = allTickets.filter((t) => isToday(t.createdAt) && (t.pointsEarned ?? 0) > 0);
  const pool = todayTickets.length ? todayTickets : allTickets.filter((t) => (t.pointsEarned ?? 0) > 0);
  const best = pool.reduce(
    (acc, t) => ((t.pointsEarned ?? 0) > (acc?.pointsEarned ?? 0) ? t : acc),
    null,
  );
  if (best) {
    return {
      rank: 1,
      track: best.track || best.tournamentName || "—",
      points: best.pointsEarned ?? 0,
    };
  }
  const bestTour = tournamentSummaries.reduce(
    (acc, row) => ((row.totalPoints ?? 0) > (acc?.totalPoints ?? 0) ? row : acc),
    null,
  );
  if (bestTour) {
    return {
      rank: 1,
      track: bestTour.track || bestTour.name || "—",
      points: bestTour.totalPoints ?? 0,
    };
  }
  return { rank: null, track: "—", points: 0 };
}

export function getRankingRiseInsight(performanceHistory = [], globalRank = null) {
  const hist = performanceHistory.filter((d) => (d.points ?? 0) >= 0);
  if (hist.length >= 2) {
    const prev = hist[hist.length - 2]?.points ?? 0;
    const last = hist[hist.length - 1]?.points ?? 0;
    const delta = Math.max(0, last - prev);
    if (delta > 0) {
      return { delta, rank: globalRank };
    }
  }
  return { delta: 0, rank: globalRank };
}

export function getLastAchievementInsight(achievements = [], streak = 0, isEn = false) {
  const unlocked = achievements.filter((a) => a.unlocked);
  if (unlocked.length) {
    const latest = unlocked[unlocked.length - 1];
    return {
      label: isEn ? latest.nameEn || latest.name : latest.name,
      detail: isEn ? latest.descEn || latest.description : latest.description,
    };
  }
  if (streak > 0) {
    return {
      label: isEn ? `Active streak ${streak} days` : `Racha activa ${streak} días`,
      detail: isEn ? "Keep playing to extend it" : "Sigue jugando para ampliarla",
    };
  }
  return {
    label: isEn ? "No achievements yet" : "Sin logros aún",
    detail: isEn ? "Play tickets to unlock" : "Juega tickets para desbloquear",
  };
}

export function getTopTicketsToday(allTickets = [], tournamentSummaries = []) {
  const byKey = new Map();
  for (const t of allTickets) {
    if (!isToday(t.createdAt)) continue;
    const key = `${t.tournamentId || t.tournamentSlug || t.track}-${t.track}`;
    const prev = byKey.get(key) || {
      track: t.track || "—",
      ticketLabel: t.tournamentName || t.track || "Ticket",
      points: 0,
    };
    prev.points += t.pointsEarned ?? 0;
    byKey.set(key, prev);
  }

  let rows = [...byKey.values()]
    .filter((r) => r.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, 5);

  if (rows.length < 5 && tournamentSummaries.length) {
    const extra = tournamentSummaries
      .filter((s) => isToday(s.lastPlayed))
      .map((s) => ({
        track: s.track || s.name,
        ticketLabel: s.name,
        points: s.totalPoints ?? 0,
      }))
      .sort((a, b) => b.points - a.points);
    for (const row of extra) {
      if (rows.length >= 5) break;
      if (!rows.some((r) => r.track === row.track && r.points === row.points)) {
        rows.push(row);
      }
    }
    rows = rows.sort((a, b) => b.points - a.points).slice(0, 5);
  }

  return rows.map((row, i) => ({ rank: i + 1, ...row }));
}

export function getTrackTicketProgress(trackSlug) {
  if (!trackSlug) return { usedCount: 0, state: "none" };
  const used = getUsedTicketsForTrack(trackSlug);
  const usedCount = used.length;
  if (usedCount === 0) return { usedCount, state: "none" };
  if (usedCount >= 3) return { usedCount, state: "complete" };
  return { usedCount, state: "partial" };
}
