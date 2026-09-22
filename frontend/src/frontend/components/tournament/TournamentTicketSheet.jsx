"use client";

const STRATEGY_SHORT = {
  // Backend enum values (app/auth_utils.py STRATEGIES) + UI short ids.
  full_point: "Full",
  dual_point: "Dual",
  smart_pick: "Smart",
  smart_point: "Smart",
  full: "Full",
  dual: "Dual",
  smart: "Smart",
};

function strategyLabel(ticket) {
  if (!ticket?.strategy) return "—";
  // Never leak a raw backend enum (e.g. "smart_pick") into the UI.
  return STRATEGY_SHORT[ticket.strategy] || "—";
}

export default function TournamentTicketSheet({
  races,
  activeTicketNumber,
  onSelectTicket,
  submittedTickets,
  labels = {},
  expandedRaceId,
  onSelectRace,
  lockedTickets = {},
  confirmedTickets = {},
  onUnlockRequest,
}) {
  const {
    ticketLabel = "Ticket",
    independentHint = "Cada ticket es un torneo completo e independiente (7 carreras).",
  } = labels;

  // Sort races ascending: Carrera 1, Carrera 2, ..., Carrera 7
  const orderedRaces = [...(races || [])].sort((a, b) => (a.raceNumber || 0) - (b.raceNumber || 0));

  const ticketTotals = [1, 2, 3].map((num) => {
    let points = 0;
    let confirmed = 0;
    for (const race of races || []) {
      const sub = submittedTickets[`${race.id}-${num}`];
      if (sub) {
        confirmed += 1;
        if (sub.isScored && sub.pointsEarned) points += sub.pointsEarned;
      }
    }
    return { num, points, confirmed };
  });

  const activeConfirmed = ticketTotals.find((t) => t.num === activeTicketNumber)?.confirmed ?? 0;

  return (
    <div className="tournament-ticket-sheet w-full">
      <p className="tournament-ticket-sheet__hint mb-2">{independentHint}</p>

      {/* Row 1: Tickets selectors (Grey=Available, Green=In Use, Yellow=Used) */}
      <div className="tournament-ticket-sheet__tabs" role="tablist" aria-label={ticketLabel}>
        {ticketTotals.map(({ num, points, confirmed }) => {
          // Single source of truth, shared with TicketCarousel: backend
          // confirmed state first, then ad entitlement, then local progress.
          const isConfirmed =
            Boolean(confirmedTickets[num]) || confirmed >= (races?.length || 7);
          const isLocked = Boolean(lockedTickets[num]) && !isConfirmed;
          const isActive = activeTicketNumber === num;

          let stateClass = "tournament-ticket-sheet__tab--available";
          let stateMeta = "Disponible";

          if (isConfirmed) {
            stateClass = "tournament-ticket-sheet__tab--used";
            stateMeta = points > 0 ? `${points.toLocaleString()} pts` : "Usado";
          } else if (isLocked) {
            stateClass = "tournament-ticket-sheet__tab--locked";
            stateMeta = "Bloqueado";
          } else if (isActive) {
            stateClass = "tournament-ticket-sheet__tab--in-use";
            stateMeta = "En Uso";
          }

          return (
            <button
              key={num}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`tournament-ticket-sheet__tab ${stateClass} tour-step-ticket-tab`}
              onClick={() => (isLocked ? onUnlockRequest?.(num) : onSelectTicket(num))}
            >
              <span className="tournament-ticket-sheet__tab-title">
                {ticketLabel} {num}
              </span>
              <span className="tournament-ticket-sheet__tab-meta">
                {stateMeta}
              </span>
            </button>
          );
        })}
      </div>

      {/* Row 2: Races selectors horizontal */}
      <div className="tournament-ticket-sheet__races-horizontal">
        {orderedRaces.map((race) => {
          const sub = submittedTickets[`${race.id}-${activeTicketNumber}`];
          const done = Boolean(sub);
          const isCurrent = expandedRaceId === race.id;
          
          return (
            <button
              key={race.id}
              type="button"
              onClick={() => onSelectRace && onSelectRace(race.id)}
              className={`tournament-ticket-sheet__race-badge${done ? " tournament-ticket-sheet__race-badge--done" : ""}${isCurrent ? " tournament-ticket-sheet__race-badge--active" : ""}`}
            >
              <span className="tournament-ticket-sheet__race-badge-num">
                Carrera {race.raceNumber ?? race.number}
              </span>
              <span className="tournament-ticket-sheet__race-badge-strategy">
                {done ? strategyLabel(sub) : "Pendiente"}
              </span>
              <span className="tournament-ticket-sheet__race-badge-status">
                {done ? (sub.isScored ? `+${sub.pointsEarned || 0} pts` : "Listo ✓") : "Jugar"}
              </span>
            </button>
          );
        })}
      </div>

      {activeConfirmed >= 7 && (
        <div className="tournament-ticket-sheet__complete p-4 mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center flex items-center justify-center gap-2">
          <span className="text-lg">✅</span>
          <div className="text-left">
            <p className="text-xs font-bold text-emerald-400">¡Ticket listo!</p>
            <p className="text-[10px] text-white/40">
              Espera los resultados de las carreras para ver tus puntos en vivo.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
