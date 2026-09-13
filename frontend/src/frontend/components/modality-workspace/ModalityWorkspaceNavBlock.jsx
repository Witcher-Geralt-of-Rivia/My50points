"use client";

import { useCallback, useEffect, useState } from "react";
import { isModalityWelcomeAccepted } from "@/frontend/lib/modalityWelcomeStorage";
import ModalityInfoBar from "@/frontend/components/modality-welcome/ModalityInfoBar";
import ModalityNavRail from "@/frontend/components/modality-workspace/ModalityNavRail";
import OnboardingSequenceGate from "@/frontend/components/onboarding/OnboardingSequenceGate";

/** Nav de modalidades + barra informativa (única por modalidad). */
export default function ModalityWorkspaceNavBlock({ modalityId, onWorkspaceUnlocked }) {
  const [showInfoBar, setShowInfoBar] = useState(false);

  useEffect(() => {
    setShowInfoBar(isModalityWelcomeAccepted(modalityId));
  }, [modalityId]);

  const handleUnlock = useCallback(() => {
    setShowInfoBar(true);
    onWorkspaceUnlocked?.();
  }, [onWorkspaceUnlocked]);

  return (
    <>
      <OnboardingSequenceGate modalityId={modalityId} onWorkspaceUnlocked={handleUnlock} />
      <div className="mw-workspace-nav-block">
        <ModalityNavRail activeModalityId={modalityId} />
        {showInfoBar ? <ModalityInfoBar modalityId={modalityId} /> : null}
      </div>
    </>
  );
}
