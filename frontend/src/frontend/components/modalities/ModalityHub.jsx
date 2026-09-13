"use client";

import { useEffect } from "react";
import ModalityPageShell from "@/frontend/components/modalities/ModalityPageShell";
import ModalityHubBoard from "@/frontend/components/modalities/ModalityHubBoard";

export default function ModalityHub() {
  useEffect(() => {
    const hash = window.location.hash?.replace("#", "");
    if (!hash) return;
    const target = document.getElementById(hash);
    if (!target) return;
    const timer = window.setTimeout(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <ModalityPageShell className="modality-page--hub">
      <div className="modality-hub-surface">
        <ModalityHubBoard layout="flat" />
      </div>
    </ModalityPageShell>
  );
}
