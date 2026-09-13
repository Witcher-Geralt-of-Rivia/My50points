import { Suspense } from "react";
import TournamentGuidePageClient from "@/app/guia-torneo/TournamentGuidePageClient";
import { buildPageMetadata } from "@/frontend/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Guía del Torneo",
  description:
    "Recorrido completo y reglas básicas para participar en los torneos de MY 50 POINTS.",
  path: "/guia-torneo",
  keywords: ["guia del torneo", "tutorial", "reglas", "50points", "MY 50 POINTS"],
});

function TournamentGuideFallback() {
  return <div className="min-h-[40vh]" aria-hidden />;
}

export default function TournamentGuidePage() {
  return (
    <Suspense fallback={<TournamentGuideFallback />}>
      <TournamentGuidePageClient />
    </Suspense>
  );
}
