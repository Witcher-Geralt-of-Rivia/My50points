/**
 * Tournament phase — PRESENTATION ONLY.
 *
 * This module derives a display phase from the authoritative status the
 * backend already returns (`upcoming` | `open` | `live` | `completed` |
 * `finished`). It does not decide anything: it never gates a request, never
 * changes entitlement, and never enforces a game rule. Its single job is to
 * stop the page from rendering two mutually exclusive states at once (e.g. an
 * editable ticket CTA next to a "TORNEO FINALIZADO" podium).
 *
 * The backend has no `archived` status today, so ARCHIVED is only reachable
 * when a tournament explicitly reports one. Nothing is fabricated here.
 */

export const PHASE = {
  UPCOMING: 'upcoming',
  OPEN: 'open',
  LIVE: 'live',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
};

/** Map the raw backend status string onto a display phase. */
export function getTournamentPhase(tournament) {
  const raw = String(tournament?.status || '').toLowerCase();

  if (raw === 'archived') return PHASE.ARCHIVED;
  if (raw === 'completed' || raw === 'finished') return PHASE.COMPLETED;
  if (raw === 'live' || raw === 'running') return PHASE.LIVE;
  if (raw === 'open') return PHASE.OPEN;
  if (raw === 'upcoming') return PHASE.UPCOMING;

  // Unknown status: treat as upcoming (the most restrictive readable state)
  // rather than guessing that the tournament is over.
  return PHASE.UPCOMING;
}

/**
 * What the page is allowed to show for a phase.
 *
 * `canEditPicks` is a *visibility* hint only — the per-race lock (race status)
 * and the server remain the authority on whether a pick is actually accepted.
 */
export function getPhaseVisibility(phase) {
  switch (phase) {
    case PHASE.OPEN:
      return {
        showTicketWorkflow: true,
        showTicketKpis: true,
        showPrimaryTicketCta: true,
        canEditPicks: true,
        showCountdown: true,
        showProgress: false,
        showLiveKpis: false,
        showResults: false,
        showLiveRanking: false,
        showFinalRanking: false,
        readOnly: false,
      };
    case PHASE.LIVE:
      return {
        showTicketWorkflow: true,
        showTicketKpis: true,
        showPrimaryTicketCta: false,
        canEditPicks: true,
        showCountdown: true,
        showProgress: true,
        showLiveKpis: true,
        showResults: false,
        showLiveRanking: true,
        showFinalRanking: false,
        readOnly: false,
      };
    case PHASE.COMPLETED:
      return {
        showTicketWorkflow: false,
        showTicketKpis: false,
        showPrimaryTicketCta: false,
        canEditPicks: false,
        showCountdown: false,
        showProgress: true,
        showLiveKpis: true,
        showResults: true,
        showLiveRanking: false,
        showFinalRanking: true,
        readOnly: true,
      };
    case PHASE.ARCHIVED:
      return {
        showTicketWorkflow: false,
        showTicketKpis: false,
        showPrimaryTicketCta: false,
        canEditPicks: false,
        showCountdown: false,
        showProgress: true,
        showLiveKpis: true,
        showResults: true,
        showLiveRanking: false,
        showFinalRanking: true,
        readOnly: true,
      };
    case PHASE.UPCOMING:
    default:
      return {
        showTicketWorkflow: true,
        showTicketKpis: true,
        showPrimaryTicketCta: true,
        canEditPicks: true,
        showCountdown: true,
        showProgress: false,
        showLiveKpis: false,
        showResults: false,
        showLiveRanking: false,
        showFinalRanking: false,
        readOnly: false,
      };
  }
}

const PHASE_LABEL = {
  [PHASE.UPCOMING]: { es: 'PRÓXIMO', en: 'UPCOMING', tone: 'upcoming' },
  [PHASE.OPEN]: { es: 'ABIERTO', en: 'OPEN', tone: 'open' },
  [PHASE.LIVE]: { es: 'EN VIVO', en: 'LIVE', tone: 'live' },
  [PHASE.COMPLETED]: { es: 'FINALIZADO', en: 'COMPLETED', tone: 'completed' },
  [PHASE.ARCHIVED]: { es: 'ARCHIVADO', en: 'ARCHIVED', tone: 'completed' },
};

export function getPhaseLabel(phase, isEn = false) {
  const entry = PHASE_LABEL[phase] || PHASE_LABEL[PHASE.UPCOMING];
  return { text: isEn ? entry.en : entry.es, tone: entry.tone };
}
