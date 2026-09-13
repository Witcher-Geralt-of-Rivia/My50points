import PlayerHubPageClient from "@/frontend/components/hub/PlayerHubPageClient";
import { buildPageMetadata } from "@/frontend/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Player Hub",
  description:
    "Your 50points player hub: tournaments, rankings, tickets, feed, and quick links to every game mode.",
  path: "/inicio",
  keywords: ["player hub", "dashboard", "50points", "tournaments"],
});

export default function InicioPage() {
  return <PlayerHubPageClient />;
}
