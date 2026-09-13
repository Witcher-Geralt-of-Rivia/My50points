"use client";

import { useCallback, useEffect, useState } from "react";
import { shouldShowTournamentGuide } from "@/frontend/lib/tournamentGuideStorage";
import {
  isModalityWelcomeAccepted,
  shouldShowModalityWelcome,
  acceptModalityWelcome,
} from "@/frontend/lib/modalityWelcomeStorage";
import { useAuth } from "@/frontend/contexts/AuthContext";
import { useRouter } from "next/navigation";
import TournamentGuideModal from "@/frontend/components/tournament-guide/TournamentGuideModal";
import ModalityWelcomeModal from "@/frontend/components/modality-welcome/ModalityWelcomeModal";

/**
 * On modality entry: 
 * - For Guests: We show the unified TournamentGuideModal containing the guest form.
 * - For Registered: We show the Tournament Guide first, then the specific Modality Welcome.
 */
export default function OnboardingSequenceGate({
  modalityId,
  enabled = true,
  onWorkspaceUnlocked,
}) {
  const [phase, setPhase] = useState("idle");
  const { user, loading } = useAuth();
  const router = useRouter();

  const needsWelcome = useCallback(() => {
    if (!modalityId) return false;
    // For guest mode: if there's no active user session, we MUST show the welcome modal to choose an alias
    if (modalityId === "guest" && !user) {
      return true;
    }
    return shouldShowModalityWelcome(modalityId);
  }, [modalityId, user]);

  // Pausa por inactividad (2 min de invitado) o expiración de la identidad con la
  // página ya abierta: la sesión muere en caliente y el flujo ya está en "done",
  // así que sin esto la ventana de bienvenida no reaparecía y el jugador quedaba
  // en un workspace sin sesión. Al detectar user=null se le lleva de vuelta a la
  // ventana de "reanuda tu alias o crea uno nuevo".
  useEffect(() => {
    if (loading) return;
    if (modalityId === "guest" && !user && phase === "done") {
      setPhase("modality");
    }
  }, [loading, user, modalityId, phase]);

  useEffect(() => {
    if (loading) return; // Wait for authentication bootstrap to finish
    if (phase !== "idle") return; // Avoid re-triggering flow once initiated

    if (!enabled || !modalityId) {
      setPhase("done");
      if (isModalityWelcomeAccepted(modalityId)) {
        onWorkspaceUnlocked?.();
      }
      return;
    }

    // Unified flow: all modalities show the guide first if not dismissed, then welcome modal
    if (shouldShowTournamentGuide()) {
      setPhase("guide");
    } else if (needsWelcome()) {
      setPhase("modality");
    } else {
      setPhase("done");
      onWorkspaceUnlocked?.();
    }
  }, [enabled, modalityId, onWorkspaceUnlocked, loading, needsWelcome]);

  const handleGuideClose = useCallback((result) => {
    const isGuest = modalityId === "guest";
    
    if (isGuest) {
      // Guest mode: must click "COMENZAR" (begin === true) to configure alias
      if (result && result.begin) {
        setPhase("modality");
      } else {
        // Cancelled or closed: redirect to cover page
        router.push("/");
      }
    } else {
      // Registered modes: proceed to welcome modal or workspace
      if (needsWelcome()) {
        setPhase("modality");
      } else {
        setPhase("done");
        onWorkspaceUnlocked?.();
      }
    }
  }, [modalityId, needsWelcome, onWorkspaceUnlocked, router]);

  const handleModalityAccept = useCallback(() => {
    setPhase("done");
    onWorkspaceUnlocked?.();
  }, [onWorkspaceUnlocked]);

  if (loading || phase === "idle" || phase === "done") return null;

  if (phase === "guide") {
    // Render standard guide modal with modalityId for themed borders and backdrop
    return <TournamentGuideModal open onClose={handleGuideClose} modalityId={modalityId} hideGuestForm={true} />;
  }

  return (
    <ModalityWelcomeModal
      open
      modalityId={modalityId}
      onAccept={handleModalityAccept}
    />
  );
}
