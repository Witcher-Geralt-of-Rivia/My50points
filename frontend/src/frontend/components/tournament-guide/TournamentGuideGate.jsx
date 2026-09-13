"use client";

import { useEffect, useState } from "react";
import { shouldShowTournamentGuide } from "@/frontend/lib/tournamentGuideStorage";
import TournamentGuideModal from "@/frontend/components/tournament-guide/TournamentGuideModal";

export default function TournamentGuideGate({ enabled = true }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (shouldShowTournamentGuide()) {
      setOpen(true);
    }
  }, [enabled]);

  const handleClose = () => {
    setOpen(false);
  };

  return <TournamentGuideModal open={open} onClose={handleClose} />;
}
