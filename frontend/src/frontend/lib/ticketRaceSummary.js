import { strategies } from "@/frontend/components/tournament/PickSelector";

const STRATEGY_MAP = { full: "full_point", dual: "dual_point", smart: "smart_pick" };
const STRATEGY_REVERSE = { full_point: "full", dual_point: "dual", smart_pick: "smart" };

const STRATEGY_LABEL = {
  full_point: "FULL POINT",
  dual_point: "DUAL POINT",
  smart_pick: "SMART POINT",
};

export function horsePostPosition(race, horseId) {
  const horse = race?.horses?.find(
    (h) => h.id === horseId || String(h.id) === String(horseId),
  );
  return horse?.postPosition ?? horse?.number ?? "?";
}

/** @returns {{ strategy: string|null, strategyId: string|null, posts: (number|string)[], ready: boolean, draft: boolean }} */
export function getRacePickSummary(race, submittedTicket, localPicks, localStrategy) {
  if (submittedTicket) {
    const picks = Array.isArray(submittedTicket.picks) ? submittedTicket.picks : [];
    const strategyId = STRATEGY_REVERSE[submittedTicket.strategy] || null;
    return {
      strategy: STRATEGY_LABEL[submittedTicket.strategy] || submittedTicket.strategy,
      strategyId,
      posts: picks.map((id) => horsePostPosition(race, id)),
      ready: true,
      draft: false,
    };
  }

  if (localPicks?.length) {
    const strat = strategies.find((s) => s.id === localStrategy);
    return {
      strategy: strat?.name || null,
      strategyId: localStrategy || null,
      posts: localPicks.map((id) => horsePostPosition(race, id)),
      ready: false,
      draft: true,
    };
  }

  return { strategy: null, strategyId: null, posts: [], ready: false, draft: false };
}

export { STRATEGY_MAP, STRATEGY_REVERSE, STRATEGY_LABEL };

const STRATEGY_KEY_TO_ID = {
  full_point: "full",
  dual_point: "dual",
  smart_pick: "smart",
};

/** @returns {{ full: number, dual: number, smart: number, rows: Array }} */
export function buildTicketReviewData(tournament, submittedTickets, ticketNum) {
  const rows = (tournament?.races || []).map((race) => {
    const ticket = submittedTickets[`${race.id}-${ticketNum}`];
    const strategyKey = ticket?.strategy || null;
    const strategyId = strategyKey ? STRATEGY_KEY_TO_ID[strategyKey] || null : null;
    const picks = Array.isArray(ticket?.picks) ? ticket.picks : [];
    return {
      raceId: race.id,
      raceNumber: race.raceNumber ?? race.number,
      strategyKey,
      strategyId,
      strategyLabel: strategyKey ? STRATEGY_LABEL[strategyKey] || strategyKey : null,
      posts: picks.map((id) => horsePostPosition(race, id)),
      ready: Boolean(ticket),
    };
  });

  const counts = { full: 0, dual: 0, smart: 0 };
  for (const row of rows) {
    if (row.strategyId && counts[row.strategyId] !== undefined) {
      counts[row.strategyId] += 1;
    }
  }

  const total = rows.length || 1;
  const breakdown = [
    { id: "full", label: STRATEGY_LABEL.full_point, count: counts.full, pct: (counts.full / total) * 100 },
    { id: "dual", label: STRATEGY_LABEL.dual_point, count: counts.dual, pct: (counts.dual / total) * 100 },
    { id: "smart", label: STRATEGY_LABEL.smart_pick, count: counts.smart, pct: (counts.smart / total) * 100 },
  ];

  return { rows, breakdown, allReady: rows.every((row) => row.ready) };
}
