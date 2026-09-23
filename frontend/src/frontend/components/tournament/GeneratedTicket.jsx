'use client';

/**
 * Confirmed ticket receipt (pearl).
 *
 * IDENTITY RULE: no ticket code is generated here. Only what the backend
 * returned is shown — tournamentTicket.ticketNumber and tournamentTicket.id
 * (as "REF"). There is no QR / barcode because the backend exposes no
 * scannable code. A confirmed ticket is immutable: no Edit, no resubmit.
 */
import { useMemo } from 'react';
import Link from 'next/link';
import { CheckCircle2, Trophy, Plus } from 'lucide-react';
import BrandMark from '@/frontend/components/nav/BrandMark';
import { buildSlipRows, SlipRows } from './TicketReviewPanel';
import { formatDateLong } from '@/frontend/lib/redesign';

export default function GeneratedTicket({
  tournament,
  races = [],
  selectionForRace,
  ticketNumber = null,
  backendTicket = null,
  rankingHref = null,
  onPlayAnother = null,
  anotherLabel = null,
  isEn = false,
}) {
  const rows = useMemo(() => buildSlipRows(races, selectionForRace), [races, selectionForRace]);
  const shownNumber = backendTicket?.ticketNumber ?? ticketNumber;
  const backendRef = backendTicket?.id ?? null;

  return (
    <section className="receipt ui-pearl" aria-labelledby="receipt-title">
      <p className="receipt__status" role="status">
        <CheckCircle2 size={18} aria-hidden />
        {isEn ? 'Confirmed · registered for the 7 races' : 'Confirmado · registrado para las 7 carreras'}
      </p>
      <header className="receipt__head">
        <BrandMark size={40} />
        <div>
          <h2 id="receipt-title" className="t-section receipt__title">{tournament?.name}</h2>
          <p className="receipt__sub">
            {[tournament?.track, formatDateLong(tournament?.date, isEn)].filter(Boolean).join(' · ')}
          </p>
        </div>
        {shownNumber != null ? (
          <div className="receipt__id">
            <span className="t-label">{isEn ? 'Ticket' : 'Boleto'}</span>
            <span className="t-data receipt__num">{shownNumber}</span>
            {backendRef != null ? <span className="receipt__ref t-num">REF {backendRef}</span> : null}
          </div>
        ) : null}
      </header>
      <div className="receipt__perf" aria-hidden />
      <SlipRows rows={rows} isEn={isEn} />
      <p className="receipt__note">
        {isEn
          ? 'Each slot scores only if that horse wins. Points appear here and in the ranking as results are published.'
          : 'Cada asignación puntúa solo si ese caballo gana. Los puntos aparecen aquí y en el ranking cuando se publican los resultados.'}
      </p>
      <div className="receipt__actions">
        {rankingHref ? (
          <Link href={rankingHref} className="ui-btn ui-btn--primary">
            <Trophy size={17} aria-hidden />{isEn ? 'View tournament ranking' : 'Ver ranking del torneo'}
          </Link>
        ) : null}
        {onPlayAnother ? (
          <button type="button" className="ui-btn ui-btn--on-light" onClick={onPlayAnother}>
            <Plus size={17} aria-hidden />{anotherLabel || (isEn ? 'Play another ticket' : 'Jugar otro boleto')}
          </button>
        ) : null}
      </div>
    </section>
  );
}
