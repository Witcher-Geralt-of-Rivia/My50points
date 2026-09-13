"use client";

import FreeTicketsOverviewBar from "@/frontend/components/modalities/FreeTicketsOverviewBar";

/**
 * MIS TICKETS DISPONIBLES — sits between the 3-tickets banner and hipódromos list.
 */
export default function TracksWorkflowTicketsBridge({
  tracks,
  workflow,
  loading,
  emptyLabel,
  title,
}) {
  if (loading || !tracks?.length) return null;

  return (
    <div className="tracks-workflow-tickets-bridge">
      <FreeTicketsOverviewBar
        tracks={tracks}
        usageVersion={workflow.usageVersion}
        activeTrackSlug={workflow.expandedSlug}
        activeTicketNum={workflow.activeTicketNum}
        onLogoClick={workflow.selectTrack}
        onTicketSlotClick={workflow.selectTrackTicket}
        variant="bridge"
        title={title}
      />
      {emptyLabel ? <p className="tracks-workflow-tickets-bridge__hint">{emptyLabel}</p> : null}
    </div>
  );
}
