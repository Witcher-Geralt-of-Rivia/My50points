'use client';

/**
 * Ticket selector — three premium digital racing tickets.
 *
 * States (decided by the caller, never here):
 *   available   ticket usable, nothing drafted yet
 *   progress    a LOCAL draft exists (n/7 races saved) — NOT confirmed
 *   confirmed   the server confirmed this ticket (POST /tickets/aggregate)
 *   locked      entitlement not granted yet (M2/M4 ad unlock, unchanged)
 * Local completion is never presented as confirmed.
 */
import { CheckCircle2, Lock, PlayCircle, PenLine } from 'lucide-react';
import { HelpPopover } from '@/frontend/components/ui';
import { useLanguage } from '@/frontend/lib/i18n/LanguageContext';
import GuideRing from '@/frontend/components/ui/GuideRing';

const LABEL = {
  available: { es: 'Disponible', en: 'Available' },
  progress: { es: 'En progreso', en: 'In progress' },
  confirmed: { es: 'Confirmado', en: 'Confirmed' },
  locked: { es: 'Bloqueado', en: 'Locked' },
};
const ICON = { available: PlayCircle, progress: PenLine, confirmed: CheckCircle2, locked: Lock };

export default function TicketCarousel({ tickets = [], activeTicketId = 1, onSelectTicket, onUnlockRequest, isGuest = false, totalRaces = 7, guide = false }) {
  const { language } = useLanguage();
  const isEn = language === 'en';

  return (
    <section className="trn-tickets" aria-labelledby="trn-tickets-title" data-guide-step={guide ? 'ticket' : undefined}>
      <div className="trn-tickets__head">
        <div>
          <p className="t-eyebrow" data-accent="aqua">{isEn ? 'Step 1' : 'Paso 1'}</p>
          <h2 id="trn-tickets-title" className="t-section">{isEn ? 'Your tickets' : 'Tus boletos'}</h2>
          <p className="t-meta trn-tickets__rule">
            {isEn
              ? '3 free tickets per tournament · each ticket competes separately'
              : '3 boletos gratis por torneo · cada boleto compite por separado'}
            <HelpPopover label={isEn ? 'How tickets work' : 'Cómo funcionan los boletos'}>
              {isEn ? (
                <>Every tournament gives you <strong>3 tickets</strong>. Each one travels the 7 races with its own strategies and its own score — they never share points. Ticket 1 is free; {isGuest ? 'as a guest, each extra ticket unlocks after watching one ad.' : 'one ad unlocks tickets 2 and 3 for this tournament.'}</>
              ) : (
                <>Cada torneo te da <strong>3 boletos</strong>. Cada uno recorre las 7 carreras con sus propias estrategias y su propia puntuación: nunca comparten puntos. El boleto 1 es gratis; {isGuest ? 'como invitado, cada boleto extra se desbloquea con un anuncio.' : 'un anuncio desbloquea los boletos 2 y 3 de este torneo.'}</>
              )}
            </HelpPopover>
          </p>
        </div>
      </div>
      <div className="trn-tickets__row" role="tablist" aria-label={isEn ? 'Tickets' : 'Boletos'}>
        {tickets.map((tk) => {
          const active = tk.n === activeTicketId;
          const Icon = ICON[tk.state] || PlayCircle;
          const onClick = () => {
            if (tk.state === 'locked') onUnlockRequest?.(tk.n);
            else onSelectTicket?.(tk.n);
          };
          return (
            <button
              key={tk.n}
              type="button"
              role="tab"
              aria-selected={active}
              className={`tstub${active ? ' is-active' : ''}`}
              data-state={tk.state}
              onClick={onClick}
            >
              <span className="tstub__holo" aria-hidden />
              <span className="tstub__top">
                <span className="tstub__brand">MY 50 <b>POINTS</b></span>
                <span className="tstub__label t-label">{isEn ? 'Ticket' : 'Boleto'}</span>
              </span>
              <span className="tstub__num t-data">{tk.n}</span>
              <span className="tstub__perf" aria-hidden />
              <span className="tstub__band">
                <Icon size={16} aria-hidden />
                <span>{isEn ? LABEL[tk.state].en : LABEL[tk.state].es}</span>
              </span>
              <span className="tstub__foot t-meta">
                {tk.state === 'locked'
                  ? isEn ? 'Watch an ad to unlock' : 'Ver anuncio para desbloquear'
                  : tk.state === 'confirmed'
                    ? isEn ? `${totalRaces} races · registered` : `${totalRaces} carreras · registrado`
                    : `${tk.saved || 0} / ${totalRaces} ${isEn ? 'races saved' : 'carreras guardadas'}`}
              </span>
              {/* Guided light: the three ticket choices are the next step. */}
              {guide && tk.state !== 'confirmed' ? <GuideRing tone={tk.state === 'locked' ? 'aqua' : 'my50'} /> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
