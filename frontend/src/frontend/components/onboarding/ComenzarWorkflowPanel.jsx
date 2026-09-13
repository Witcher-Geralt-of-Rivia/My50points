"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { useAuth } from "@/frontend/contexts/AuthContext";
import { useModality } from "@/frontend/contexts/ModalityContext";
import { getModality } from "@/frontend/lib/gameModalities";
import { useLiveTournamentsPoll } from "@/frontend/lib/hooks/useLiveTournamentsPoll";
import { buildTracksFromTournaments } from "@/frontend/components/modalities/ModalityTracksList";
import ModalityPageShell from "@/frontend/components/modalities/ModalityPageShell";
import ModalityWorkspaceChrome from "@/frontend/components/modality-workspace/ModalityWorkspaceChrome";
import TracksWorkflowAccordion from "@/frontend/components/modalities/TracksWorkflowAccordion";
import { useTracksWorkflowState } from "@/frontend/lib/hooks/useTracksWorkflowState";
import { ticketWorkflowAsset } from "@/frontend/lib/config/ticketWorkflowAssets";

function resolveDefaultModality(activeModalityId, user) {
  if (activeModalityId === "guest" || activeModalityId === "free") {
    return activeModalityId;
  }
  return user?.isGuest ? "guest" : "free";
}

export default function ComenzarWorkflowPanel() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { activeModalityId } = useModality();
  const [selectedModalityId, setSelectedModalityId] = useState(() =>
    resolveDefaultModality(activeModalityId, user),
  );
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  const mod = getModality(selectedModalityId);
  const tracks = useMemo(() => buildTracksFromTournaments(tournaments), [tournaments]);

  useEffect(() => {
    setSelectedModalityId(resolveDefaultModality(activeModalityId, user));
  }, [activeModalityId, user]);

  useLiveTournamentsPoll({
    forHome: true,
    onData: (mapped) => setTournaments(mapped),
    onLoadingChange: setLoading,
  });

  const workflow = useTracksWorkflowState();
  const noise = ticketWorkflowAsset("noiseOverlayTile");
  const pageBg = ticketWorkflowAsset("tracksWorkflowBg");
  const mainPanelBg = ticketWorkflowAsset("tracksWorkflowMainPanelBg");
  const workflowAvailable = selectedModalityId === "guest" || selectedModalityId === "free";

  return (
    <ModalityPageShell modalityId={selectedModalityId} className="modality-page--workflow-embedded">
      <div
        className="tracks-workflow-surface tracks-workflow-surface--embedded comenzar-workflow-panel"
        data-modality={selectedModalityId}
      >
        <div className="tracks-workflow-surface__ambient" aria-hidden>
          {pageBg ? (
            <img src={pageBg} alt="" className="tracks-workflow-surface__hero-bg" />
          ) : null}
          <div className="tracks-workflow-surface__fog" />
          <div className="tracks-workflow-surface__glow" />
          <div className="tracks-workflow-surface__trails" />
          {noise ? (
            <div
              className="tracks-workflow-surface__noise"
              style={{ backgroundImage: `url(${noise})` }}
            />
          ) : null}
        </div>

        <div className="tracks-workflow__inner comenzar-workflow-panel__inner tracks-workflow__inner--workspace">
          {!workflowAvailable ? (
            <>
              <ModalityWorkspaceChrome modalityId={selectedModalityId} />
              <p className="tracks-workflow__status">{t("gameModalities.comingSoon")}</p>
            </>
          ) : (
            <ModalityWorkspaceChrome
              modalityId={selectedModalityId}
              tracks={tracks}
              tracksLoading={loading}
              workflow={workflow}
            >
              <div className="tracks-workflow__grid tracks-workflow__grid--stacked">
                <div className="tracks-workflow__main tracks-workflow__main--full">
                  <div
                    className="tracks-workflow__panel"
                    style={
                      mainPanelBg ? { "--workflow-panel-bg": `url(${mainPanelBg})` } : undefined
                    }
                  >
                    <header className="tracks-workflow__head">
                      <p className="tracks-workflow__eyebrow" style={{ color: mod.accent }}>
                        {t(`gameModalities.${selectedModalityId}.title`)}
                      </p>
                      <h3 className="tracks-workflow__title">{t("gameModalities.tracksTitle")}</h3>
                      <p className="tracks-workflow__subtitle">{t("gameModalities.tracksSubtitle")}</p>
                    </header>

                    <TracksWorkflowAccordion
                      tracks={tracks}
                      modalityId={selectedModalityId}
                      loading={loading}
                      t={t}
                      workflow={workflow}
                    />
                  </div>
                </div>
              </div>
            </ModalityWorkspaceChrome>
          )}
        </div>
      </div>
    </ModalityPageShell>
  );
}
