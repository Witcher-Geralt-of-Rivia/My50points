"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import StatisticsDashboard from "@/frontend/components/statistics/StatisticsDashboard";

const VALID_LEVELS = new Set(["race", "tournament", "racetrack", "global", "personal"]);

function StatisticsExplorerContent() {
  const searchParams = useSearchParams();
  const levelParam = searchParams.get("level");
  const initialLevel = VALID_LEVELS.has(levelParam) ? levelParam : "tournament";

  return <StatisticsDashboard initialLevel={initialLevel} />;
}

export default function StatisticsExplorerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0b0e1b] flex items-center justify-center text-zinc-500 text-sm">
          …
        </div>
      }
    >
      <StatisticsExplorerContent />
    </Suspense>
  );
}
