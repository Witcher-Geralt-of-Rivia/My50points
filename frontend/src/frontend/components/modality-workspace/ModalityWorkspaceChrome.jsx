"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { isModalityWelcomeAccepted } from "@/frontend/lib/modalityWelcomeStorage";
import ModalityNavRail from "@/frontend/components/modality-workspace/ModalityNavRail";
import ModalityTorneoBar from "@/frontend/components/modality-workspace/ModalityTorneoBar";
import ModalityWelcomeSummaryPanel from "@/frontend/components/modality-welcome/ModalityWelcomeSummaryPanel";
import OnboardingSequenceGate from "@/frontend/components/onboarding/OnboardingSequenceGate";
import TournamentGuideModal from "@/frontend/components/tournament-guide/TournamentGuideModal";

/**
 * Workspace after modality accept: TORNEO header → 4 stripes → nav → info panel.
 */
export default function ModalityWorkspaceChrome({
  modalityId,
  liveStep = "tracks",
  tracks = [],
  tracksLoading = false,
  workflow = null,
  children,
  embedded = false,
  showWelcomePanel = true,
}) {
  const { t } = useLanguage();
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setWorkspaceReady(isModalityWelcomeAccepted(modalityId));
  }, [modalityId]);

  const handleWorkspaceUnlocked = useCallback(() => {
    setWorkspaceReady(true);
  }, []);

  return (
    <>
      <OnboardingSequenceGate
        modalityId={modalityId}
        onWorkspaceUnlocked={handleWorkspaceUnlocked}
      />

      {workspaceReady ? (
        <>
          {!embedded && (
            <header className="mw-workspace-top">
              <ModalityTorneoBar t={t} modalityId={modalityId} onOpenGuide={() => setGuideOpen(true)} />
            </header>
          )}

          {!embedded && (
            <div className="mw-workspace-nav-block">
              <ModalityNavRail activeModalityId={modalityId} />
              {showWelcomePanel && (
                <ModalityWelcomeSummaryPanel modalityId={modalityId} defaultExpanded />
              )}
            </div>
          )}

          {children}
        </>
      ) : null}

      <TournamentGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </>
  );
}
