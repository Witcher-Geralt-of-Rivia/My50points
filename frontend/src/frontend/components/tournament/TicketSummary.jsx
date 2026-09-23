'use client';

/**
 * Workspace action bar — "Guardar carrera".
 *
 * Saving a race only marks it complete in the LOCAL draft and moves on to the
 * next race. It never sends anything to the server; the whole ticket is sent
 * once from the review (CONFIRMAR TICKET). Sticky at the bottom of the
 * workspace, above the mobile tab bar — never over the review / confirm.
 */
import { ChevronLeft, ChevronRight, Save, Check } from 'lucide-react';
import { strategies } from './PickSelector';

export default function TicketSummary({
  index,
  activeStrategy,
  selectedHorses = [],
  horses = [],
  saved = false,
  onSave,
  onPrev,
  onNext,
  isLast = false,
  savedCount = 0,
  totalRaces = 7,
  isEn = false,
}) {
  const strategy = strategies.find((s) => s.id === activeStrategy) || strategies[0];
  const allocation = strategy.allocation;
  const picked = selectedHorses.map((id) => horses.find((h) => h.id === id)).filter(Boolean);
  const assigned = allocation.slice(0, picked.length).reduce((s, v) => s + v, 0);
  const complete = picked.length === strategy.maxPicks;
  const missing = Math.max(0, strategy.maxPicks - picked.length);

  return (
    <div className="wsbar" role="region" aria-label={isEn ? 'Race selection' : 'Selección de la carrera'}>
      <div className="wsbar__info">
        <span className="t-label wsbar__race">
          {isEn ? 'Race' : 'Carrera'} {index} · {strategy.name}
        </span>
        <span className="wsbar__picks">
          {picked.length ? (
            picked.map((h, i) => (
              <span className="wsbar__pick" key={h.id}>
                <b className="t-num">{allocation[i]}</b> #{h.postPosition} {h.name}
              </span>
            ))
          ) : (
            <span className="wsbar__hint">{isEn ? 'Pick your horses above' : 'Elige tus caballos arriba'}</span>
          )}
        </span>
        <span className="wsbar__meter" aria-label={`${assigned} / 50`}>
          <span className="wsbar__meterfill" style={{ width: `${(assigned / 50) * 100}%` }} />
        </span>
        <span className="t-meta wsbar__count">
          {assigned}/50 pts · {savedCount}/{totalRaces} {isEn ? 'races saved' : 'carreras guardadas'}
        </span>
      </div>
      <div className="wsbar__actions">
        <button type="button" className="ui-iconbtn" onClick={onPrev} disabled={!onPrev} aria-label={isEn ? 'Previous race' : 'Carrera anterior'}>
          <ChevronLeft size={20} aria-hidden />
        </button>
        {saved && complete ? (
          <button type="button" className="ui-btn ui-btn--secondary" onClick={onNext} disabled={!onNext}>
            <Check size={17} aria-hidden />
            {isLast ? (isEn ? 'Review ticket' : 'Revisar boleto') : isEn ? 'Next race' : 'Siguiente carrera'}
            <ChevronRight size={17} aria-hidden />
          </button>
        ) : (
          <button type="button" className="ui-btn ui-btn--primary wsbar__save" onClick={onSave} disabled={!complete || !onSave}>
            <Save size={17} aria-hidden />
            {complete
              ? isEn ? 'Save race' : 'Guardar carrera'
              : isEn ? `Pick ${missing} more` : `Elige ${missing} más`}
          </button>
        )}
      </div>
    </div>
  );
}
