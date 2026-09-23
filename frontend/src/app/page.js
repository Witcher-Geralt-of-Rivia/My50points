import HomeExperience from "./HomeExperience";

export const revalidate = 30;

export default async function Home() {
  // Canonical home. The former HomePageClient / landing / comenzar
  // experiences are no longer routed (landing and comenzar redirect here).
  // Tournament discovery lives under "Torneos"; the home page is modality-first.
  return <HomeExperience />;
}
