import { Suspense } from "react";
import TournamentsPageClient from "@/app/tournaments/TournamentsPageClient";
import { buildPageMetadata } from "@/frontend/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Live Tournaments",
  description:
    "Join live horse racing tournaments on 50points. Pick horses, earn points, and climb the rankings.",
  path: "/tournaments",
  keywords: ["live tournaments", "horse racing", "competition", "50points"],
});

function TournamentsPageFallback() {
  return (
    <div className="live-tournaments-section__grid" aria-hidden>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="live-tournament-card live-tournament-card--upcoming animate-pulse pointer-events-none min-h-[18rem]"
        >
          <div className="live-tournament-card__shell h-full">
            <div className="h-32 bg-white/5" />
            <div className="p-5 space-y-3">
              <div className="h-5 w-2/3 bg-white/5 rounded" />
              <div className="h-3 w-1/2 bg-white/5 rounded" />
              <div className="h-2 w-full bg-white/5 rounded-full" />
              <div className="h-10 w-full bg-white/5 rounded-xl mt-4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TournamentsPage() {
  return (
    <Suspense fallback={<TournamentsPageFallback />}>
      <TournamentsPageClient />
    </Suspense>
  );
}
