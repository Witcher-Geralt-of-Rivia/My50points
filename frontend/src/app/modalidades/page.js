import ModalityHub from "@/frontend/components/modalities/ModalityHub";
import { buildPageMetadata } from "@/frontend/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Game Modes",
  description:
    "Choose your 50points game mode: guest, free registered, paid, or special tournaments. One points system and live rankings.",
  path: "/modalidades",
  keywords: ["game modes", "modalidades", "horse racing tournament", "free play"],
});

export default function ModalidadesPage() {
  return <ModalityHub />;
}
