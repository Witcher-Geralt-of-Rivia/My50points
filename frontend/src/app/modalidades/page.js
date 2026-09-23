import ModalitiesClient from "./ModalitiesClient";
import { buildPageMetadata } from "@/frontend/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Game Modes",
  description:
    "MY50 game modes: free tournament without sign-up, free tournament with an account, and more. One points system and live rankings.",
  path: "/modalidades",
  keywords: ["game modes", "modalidades", "horse racing tournament", "free play"],
});

export default function ModalidadesPage() {
  return <ModalitiesClient />;
}
