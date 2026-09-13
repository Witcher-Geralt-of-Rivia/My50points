import ComenzarPageClient from "./ComenzarPageClient";
import { buildPageMetadata } from "@/frontend/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Comenzar",
  description:
    "Learn how 50points tournaments work and choose your game mode — free general tournaments with 3 independent tickets per racetrack.",
  path: "/comenzar",
  keywords: ["how to play", "game modes", "free tickets", "horse racing tournament"],
});

export default function ComenzarPage() {
  return <ComenzarPageClient />;
}
