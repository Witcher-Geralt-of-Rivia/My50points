import { Suspense } from "react";
import LeaderboardClient from "./LeaderboardClient";
import { buildPageMetadata } from "@/frontend/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Leaderboard",
  description:
    "Live global and tournament leaderboards. Track points, win rate, streaks, and rising players on 50points.",
  path: "/leaderboard",
  keywords: ["leaderboard", "rankings", "points", "horse racing tournament"],
});

export default function LeaderboardPage() {
  return (
    <Suspense fallback={null}>
      <LeaderboardClient />
    </Suspense>
  );
}
