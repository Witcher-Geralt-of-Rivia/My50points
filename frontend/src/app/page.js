import HomeExperience from "./HomeExperience";
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
  // Canonical home. The former HomePageClient / landing / comenzar
  // experiences are no longer routed (landing and comenzar redirect here).
  const initialTournaments = await fetchHomeTournaments();

  return <HomeExperience initialTournaments={initialTournaments} />;
}
