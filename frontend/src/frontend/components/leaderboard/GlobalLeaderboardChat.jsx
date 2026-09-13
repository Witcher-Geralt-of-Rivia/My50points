"use client";

import TournamentChat from "@/frontend/components/tournament/TournamentChat";

/** Reuses tournament chat UI for global leaderboard tab (Phase 2). */
export default function GlobalLeaderboardChat({ variant = "embedded" }) {
  return <TournamentChat variant={variant} />;
}
