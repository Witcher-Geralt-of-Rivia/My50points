"use client";

import { ChevronRight } from "lucide-react";

export default function TicketWorkflowContext({
  trackName,
  ticketNum,
  raceNumber,
  isEn,
}) {
  return (
    <nav className="ticket-workflow-context" aria-label={isEn ? "Your position in the ticket flow" : "Tu ubicacion en el flujo del ticket"}>
      <ol className="ticket-workflow-context__list">
        <li className="ticket-workflow-context__item ticket-workflow-context__item--tournament">
          <span className="ticket-workflow-context__label">
            {isEn ? "Tournament" : "Torneo"}
          </span>
          <span className="ticket-workflow-context__value">{trackName}</span>
        </li>
        <li className="ticket-workflow-context__sep" aria-hidden>
          <ChevronRight size={14} />
        </li>
        <li className="ticket-workflow-context__item ticket-workflow-context__item--ticket">
          <span className="ticket-workflow-context__label">
            {isEn ? "Ticket" : "Ticket"}
          </span>
          <span className="ticket-workflow-context__value">{ticketNum}</span>
        </li>
        {raceNumber ? (
          <>
            <li className="ticket-workflow-context__sep" aria-hidden>
              <ChevronRight size={14} />
            </li>
            <li className="ticket-workflow-context__item ticket-workflow-context__item--race ticket-workflow-context__item--active">
              <span className="ticket-workflow-context__label">
                {isEn ? "Race" : "Carrera"}
              </span>
              <span className="ticket-workflow-context__value">{raceNumber}</span>
            </li>
          </>
        ) : null}
      </ol>
    </nav>
  );
}
