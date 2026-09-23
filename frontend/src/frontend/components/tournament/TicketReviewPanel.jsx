'use client';

/**
 * Seven-race ticket review (pearl slip).
 *
 * Reads the LOCAL draft through `selectionForRace(raceId) -> {strategy, picks}`
 * (strategy = full | dual | smart). EDITAR only reopens that race in the local
 * draft — it never deletes anything on the server. CONFIRMAR TICKET is the
 * single commit point (POST /tickets/aggregate, owned by the caller).
 */
import { useMemo } from 'react';
import { ArrowLeft, Check, Pencil, ShieldCheck, AlertTriangle } from 'lucide-react';
import { strategies } from '@/frontend/components/tournament/PickSelector';
import { formatDateLong } from '@/frontend/lib/redesign';
import { raceBlockReason } from '@/frontend/lib/tournamentState';
import GuideRing from '@/frontend/components/ui/GuideRing';

const NAME = { full: 'Full Point', dual: 'Dual Point', smart: 'Smart Point' };

export function buildSlipRows(races, selectionForRace) {
  return races.slice(0, 7).map((race, idx) => {
    const sel = selectionForRace ? selectionForRace(race.id) : null;
    const id = sel?.strategy && NAME[sel.strategy] ? sel.strategy : null;
    const alloc = id ? strategies.find((s) => s.id === id)?.allocation || [] : [];
    const picks = Array.isArray(sel?.picks) ? sel.picks : [];
    return {
      raceId: race.id,
      index: idx + 1,
      blocked: raceBlockReason(race),
      strategyId: id,
      picks: picks.map((horseId, i) => {
        const horse = (race.horses || []).find((h) => h.id === horseId);
        return { points: alloc[i] ?? null, number: horse?.postPosition ?? null, name: horse?.name || null };
      }),
    };
  });
}

export function SlipRows({ rows, isEn, onEditRace }) {
  return (
    <ol className="slip__rows">
      {rows.map((row) => (
        <li className="slip__row" key={row.raceId} data-blocked={row.blocked || undefined}>
          <span className="slip__race">
            <span className="t-label">{isEn ? 'Race' : 'Carrera'}</span>
            <span className="t-data slip__raceidx">{row.index}</span>
          </span>
          <span className="slip__stratcell">
            <span className="slip__strat" data-strategy={row.strategyId || 'none'}>
              {row.strategyId ? NAME[row.strategyId] : isEn ? 'No picks' : 'Sin selección'}
            </span>
            {row.blocked ? (
              <span className="slip__blocked">
                {row.blocked === 'cancelled'
                  ? (isEn ? 'Cancelled · score pending' : 'Cancelada · puntuación pendiente')
                  : isEn ? 'Unavailable' : 'No disponible'}
              </span>
            ) : null}
          </span>
          <span className="slip__picks">
            {row.picks.length ? (
              row.picks.map((p, i) => (
                <span className="slip__pick" key={i}>
                  <span className="slip__pts t-num">{p.points ?? '—'}</span>
                  <span className="slip__horse">
                    <span className="slip__num t-num">#{p.number ?? '—'}</span>
                    <span className="slip__hname">{p.name || '—'}</span>
                  </span>
                </span>
              ))
            ) : (
              <span className="slip__empty">—</span>
            )}
          </span>
          {onEditRace ? (
            <button type="button" className="ui-btn ui-btn--on-light ui-btn--sm slip__edit" onClick={() => onEditRace(row.raceId)}>
              <Pencil size={14} aria-hidden />{isEn ? 'Edit' : 'Editar'}
            </button>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export default function TicketReviewPanel({
  tournament,
  races = [],
  activeTicketNumber = 1,
  selectionForRace,
  onEditRace,
  onBack,
  onConfirm,
  confirming = false,
  errorMessage = null,
  guideConfirm = false,
  isEn = false,
}) {
  const rows = useMemo(() => buildSlipRows(races, selectionForRace), [races, selectionForRace]);
  const played = rows.filter((r) => r.strategyId && r.picks.length).length;
  const counts = rows.reduce((acc, r) => { if (r.strategyId) acc[r.strategyId] += 1; return acc; }, { full: 0, dual: 0, smart: 0 });

  return (
    <section className="slip ui-pearl" id="ticket-review" aria-labelledby="slip-title">
      <header className="slip__head">
        <div>
          <p className="t-label slip__kicker">MY 50 POINTS · {isEn ? 'Ticket review' : 'Revisión de boleto'}</p>
          <h2 id="slip-title" className="t-section slip__title">
            {isEn ? `Ticket ${activeTicketNumber}` : `Boleto ${activeTicketNumber}`} · 7 {isEn ? 'races' : 'carreras'}
          </h2>
          <p className="slip__sub">
            {[tournament?.name, formatDateLong(tournament?.date, isEn)].filter(Boolean).join(' · ')}
          </p>
        </div>
        <span className="ui-chip" data-tone="progress">{isEn ? 'Not confirmed yet' : 'Aún sin confirmar'}</span>
      </header>

      <SlipRows rows={rows} isEn={isEn} onEditRace={confirming ? undefined : onEditRace} />

      <div className="slip__dist" aria-label={isEn ? 'Strategy mix' : 'Mezcla de estrategias'}>
        {['full', 'dual', 'smart'].map((id) => (
          <div className="slip__distcell" data-strategy={id} key={id}>
            <span className="t-label">{NAME[id]}</span>
            <span className="t-data">{counts[id]}</span>
            <span className="slip__distunit">{isEn ? (counts[id] === 1 ? 'race' : 'races') : counts[id] === 1 ? 'carrera' : 'carreras'}</span>
          </div>
        ))}
      </div>

      <p className="slip__note">
        <ShieldCheck size={16} aria-hidden />
        {isEn
          ? 'Once confirmed, this ticket is registered for the 7 races and can no longer be edited.'
          : 'Al confirmar, este boleto queda registrado para las 7 carreras y ya no se puede editar.'}
      </p>

      {errorMessage ? (
        <p className="slip__error" role="alert"><AlertTriangle size={16} aria-hidden />{errorMessage}</p>
      ) : null}

      <div className="slip__actions">
        {onBack ? (
          <button type="button" className="ui-btn ui-btn--on-light" onClick={onBack} disabled={confirming}>
            <ArrowLeft size={17} aria-hidden />{isEn ? 'Back to races' : 'Volver a carreras'}
          </button>
        ) : null}
        <button
          type="button"
          className="ui-btn ui-btn--primary ui-btn--lg slip__confirm"
          onClick={onConfirm}
          disabled={confirming || played < 7 || !onConfirm}
          aria-busy={confirming || undefined}
        >
          {confirming ? <span className="ui-spin" aria-hidden /> : <Check size={19} aria-hidden />}
          {confirming ? (isEn ? 'Confirming…' : 'Confirmando…') : isEn ? 'CONFIRM TICKET' : 'CONFIRMAR TICKET'}
          {guideConfirm && !confirming && onConfirm ? <GuideRing tone="gold" /> : null}
        </button>
      </div>
    </section>
  );
}
