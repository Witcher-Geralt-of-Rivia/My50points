"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AnimateInView from "@/frontend/components/ui/AnimateInView";
import AppPageHeader from "@/frontend/components/layout/AppPageHeader";
import ModalityScope from "@/frontend/components/modalities/ModalityScope";
import ModalityFlowNav from "@/frontend/components/modalities/ModalityFlowNav";
import TracksWorkflowAccordion from "@/frontend/components/modalities/TracksWorkflowAccordion";
import { buildTracksFromTournaments } from "@/frontend/components/modalities/ModalityTracksList";
import { useTracksWorkflowState } from "@/frontend/lib/hooks/useTracksWorkflowState";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { useLiveTournamentsPoll } from "@/frontend/lib/hooks/useLiveTournamentsPoll";
import { isValidModalityId, readPersistedModality } from "@/frontend/lib/gameModalities";

function TrackTabsSkeleton() {
  return (
    <div className="browser-tabs browser-tabs--tracks browser-tabs--tracks-primary animate-pulse" aria-hidden>
      <div className="browser-tabs__bar browser-tabs__bar--tracks">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="browser-tabs__tab browser-tabs__tab--track-rich">
            <span className="browser-tabs__tab-thumb-wrap bg-white/5" />
            <span className="browser-tabs__tab-pill bg-white/5 border-white/10 text-transparent">—</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TournamentsPageClient() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const fromQuery = searchParams.get("modality");
  const expandFromUrl = searchParams.get("track");
  const ticketFromUrl = Number.parseInt(searchParams.get("ticket") || "", 10);
  const modalityId = isValidModalityId(fromQuery)
    ? fromQuery
    : readPersistedModality() || "guest";
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const workflow = useTracksWorkflowState(expandFromUrl, ticketFromUrl);
  const tracks = useMemo(() => buildTracksFromTournaments(tournaments), [tournaments]);
  const freezeTrackTabs = Boolean(workflow.expandedSlug && workflow.racesOpen);

  useLiveTournamentsPoll({
    forHome: true,
    enabled: !freezeTrackTabs,
    onData: (mapped) => setTournaments(mapped),
    onLoadingChange: setLoading,
  });

  return (
    <ModalityScope modalityId={modalityId}>
      <AnimateInView>
        <AppPageHeader
          title={t("tournamentsSection.title")}
          subtitle={`${t("tournamentsSection.descriptionLead")} ${t("tournamentsSection.descriptionHighlight")}.`}
          filters={
            <span className="mis-stats-filter">
              <span className="w-2 h-2 rounded-full bg-[#22c55e] shadow-[0_0_8px_#22c55e]" />
              {t("tournamentsSection.liveLabel")}
            </span>
          }
        />
      </AnimateInView>

      {loading ? (
        <TrackTabsSkeleton />
      ) : (
        <TracksWorkflowAccordion
          tracks={tracks}
          modalityId={modalityId}
          loading={false}
          t={t}
          workflow={workflow}
        />
      )}
    </ModalityScope>
  );
}
