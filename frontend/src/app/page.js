import HomePageClient from "./HomePageClient";
import { mapTournamentForHomeCard } from "@/frontend/lib/api/mappers";
import { getServerBackendUrl } from "@/frontend/lib/config/api";

export const revalidate = 30;

async function fetchHomeTournaments() {
  const base = getServerBackendUrl();

  try {
    const res = await fetch(`${base}/api/tournaments?for_home=1`, {
      next: { revalidate: 30 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.tournaments) ? data.tournaments : [];
  } catch {
    return [];
  }
}

export default async function Home() {
  const raw = await fetchHomeTournaments();
  const initialTournaments = raw.map(mapTournamentForHomeCard);

  return <HomePageClient initialTournaments={initialTournaments} />;
}
