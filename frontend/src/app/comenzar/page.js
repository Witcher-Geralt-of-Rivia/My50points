import Page22LandingClient from "../landing/Page22LandingClient";
import { buildPageMetadata } from "@/frontend/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "MY 50 POINTS - Comenzar | Torneo Oficial",
  description:
    "Aprende cómo funciona el torneo MY 50 POINTS y elige tu modalidad. 3 tickets independientes por hipódromo.",
  path: "/comenzar",
  keywords: ["comenzar", "how to play", "game modes", "free tickets", "horse racing tournament"],
});

export default function ComenzarPage() {
  return <Page22LandingClient />;
}
