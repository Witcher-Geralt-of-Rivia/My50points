import Page22LandingClient from "./Page22LandingClient";
import { buildPageMetadata } from "@/frontend/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "MY 50 POINTS - Gran Entrada | Torneo Oficial",
  description:
    "Elige tu modalidad en el torneo de carreras MY 50 POINTS. Tu estrategia, tus puntos, tu juego. Participa gratis o compite por premios oficiales.",
  path: "/landing",
  keywords: [
    "carreras de caballos",
    "50 points",
    "modalidad 4",
    "torneo gratis",
    "horse racing",
    "dividendos fijos",
  ],
});

export default function LandingPage() {
  return <Page22LandingClient />;
}
