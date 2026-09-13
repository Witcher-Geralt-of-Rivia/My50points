import { Suspense } from "react";
import TournamentRankingBoard from "@/frontend/components/leaderboard/TournamentRankingBoard";
import GlobalLeaderboardChat from "@/frontend/components/leaderboard/GlobalLeaderboardChat";
import { buildPageMetadata } from "@/frontend/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Leaderboard",
  description:
    "Live global and tournament leaderboards. Track points, win rate, streaks, and rising players on 50points.",
  path: "/leaderboard",
  keywords: ["leaderboard", "rankings", "points", "horse racing tournament"],
});

function LeaderboardPageFallback() {
  return <div className="min-h-[50vh]" aria-hidden />;
}

/**
 * Centro de actividades: ranking del torneo + chat.
 *
 * Antes esta página montaba el tablero nuevo ENCIMA del ranking antiguo, así que
 * salían duplicados el buscador, el filtro de modalidades, el desplegable de
 * resultados y la propia tabla. Ahora hay una sola tabla de posiciones.
 */
export default function LeaderboardPage() {
  return (
    <Suspense fallback={<LeaderboardPageFallback />}>
      <div className="mx-auto w-full max-w-6xl space-y-6 px-3 py-5 md:px-6 md:py-8">
        <TournamentRankingBoard />
        <GlobalLeaderboardChat />
      </div>
    </Suspense>
  );
}
