import { Suspense } from "react";
import HowToPlayPageClient from "@/app/how-to-play/HowToPlayPageClient";
import { buildPageMetadata } from "@/frontend/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "How to Play",
  description:
    "Learn how 50points works: game modes, tickets, strategies, scoring, and tournament flow.",
  path: "/how-to-play",
  keywords: ["how to play", "rules", "strategies", "50points tutorial"],
});

function HowToPlayPageFallback() {
  return <div className="min-h-[40vh]" aria-hidden />;
}

export default function HowToPlayPage() {
  return (
    <Suspense fallback={<HowToPlayPageFallback />}>
      <HowToPlayPageClient />
    </Suspense>
  );
}
