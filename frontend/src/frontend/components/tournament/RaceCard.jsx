'use client';

/**
 * Active race workspace: strategy selector + runner selection.
 *
 * - Allocations come from the canonical `strategies` (PickSelector): Full 50,
 *   Dual 25+25, Smart 30+15+5. Nothing is re-declared here.
 * - Only real runner data is shown. The MY50 dividend comes from
 *   publishedMy50Dividend(), which returns a number only when the backend
 *   states the value is frozen under the MY50 contract — today it never does,
 *   so the column reads "—" / "Pendiente de publicación". Live odds are never
 *   shown under the MY50 label. No weight, no invented fields.
 * - Selecting changes the LOCAL draft only (the caller owns the draft).
 */
import { Check, Clock, Ruler, Users, Lock, Ban, CloudOff } from 'lucide-react';
import { strategies } from './PickSelector';
import { saddleColor } from '@/frontend/lib/saddleColors';
import { formatTime } from '@/frontend/lib/redesign';
import { publishedMy50Dividend, my50PendingLabel } from '@/frontend/lib/my50Dividend';
import GuideRing from '@/frontend/components/ui/GuideRing';

const STRAT_ACCENT = { full: 'm1', dual: 'm2', smart: 'm3' };

function SaddleNumber({ number, label = null, size = 'md' }) {
  const c = saddleColor(number);
  const shown = label || number;
  return (
    <span className={`saddle saddle--${size}`} style={{ '--sb': c.bg, '--sf': c.text }} aria-label={`N.º ${shown}`}>
      {shown}
    </span>
  );
}

/** Runner is not pickable: scratched, or no longer on the provider's card. */
function runnerOut(h) {
  return Boolean(h.scratched) || h.runnerStatus === 'scratched' || h.runnerStatus === 'unavailable';
}

function RunnerStatusChip({ runner, isEn }) {
  if (runner.scratched || runner.runnerStatus === 'scratched') {
    return <span className="ui-chip" data-tone="locked">{isEn ? 'Scratched' : 'Retirado'}</span>;
  }
  if (runner.runnerStatus === 'unavailable') {
    return <span className="ui-chip" data-tone="unavailable">{isEn ? 'Unavailable' : 'No disponible'}</span>;
  }
  return null;
}

function DividendValue({ runner, isEn, withLabel = false }) {
  const value = publishedMy50Dividend(runner);
  if (value != null) return <span className="divv divv--on t-num">{value.toFixed(2)}</span>;
  const pending = my50PendingLabel(runner, isEn);
  return (
    <span className="divv divv--off" title={pending}>
      <span aria-hidden>—</span>
      {withLabel ? <span className="divv__pending">{pending}</span> : <span className="ui-sr">{pending}</span>}
    </span>
  );
}

function strategyAlloc(id) {
  return strategies.find((s) => s.id === id)?.allocation || [50];
}

export function StrategySelector({ activeStrategy, onChange, disabled = false, isEn = false, guided = false }) {
  return (
    <div className={`strat${guided ? ' ui-guided' : ''}`} role="radiogroup" aria-label={isEn ? 'Points strategy' : 'Estrategia de puntos'} data-guide-step={guided ? 'strategy' : undefined}>
      {strategies.map((s) => {
        const on = activeStrategy === s.id;
        return (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            data-accent={STRAT_ACCENT[s.id]}
            className={`strat__card${on ? ' is-on' : ''}`}
            data-strategy={s.id}
            onClick={() => onChange?.(s.id)}
          >
            <span className="strat__name">{s.name}</span>
            <span className="strat__alloc">
              {s.allocation.map((p, i) => (
                <span key={i} className="strat__pts"><span className="t-data">{p}</span></span>
              ))}
            </span>
            <span className="strat__hint">{s.maxPicks === 1 ? (isEn ? '1 horse' : '1 caballo') : `${s.maxPicks} ${isEn ? 'horses' : 'caballos'}`}</span>
            {on ? <span className="strat__tick" aria-hidden><Check size={14} strokeWidth={3} /></span> : null}
          </button>
        );
      })}
      {guided ? <GuideRing outset /> : null}
    </div>
  );
}

export default function RaceCard({
  race,
  index = 1,
  activeStrategy = 'full',
  selectedHorses = [],
  onPickHorse,
  onStrategyChange,
  lockedReason = null,
  guideStep = null,
  isEn = false,
}) {
  if (!race) return null;
  const strat = strategies.find((s) => s.id === activeStrategy) || strategies[0];
  const alloc = strategyAlloc(strat.id);
  const locked = !onPickHorse;
  const full = selectedHorses.length >= strat.maxPicks;
  const time = formatTime(race.scheduledTime, isEn);
  const track = Number(race.trackRaceNumber ?? race.raceNumber);
  const showTrack = Number.isFinite(track) && track !== index;
  const horses = (race.horses || []).slice().sort((a, b) => (a.postPosition || 0) - (b.postPosition || 0));
  const distanceM = Number(race.distance);
  const raceStatus = String(race.status || '').toLowerCase();
  const raceNotice = raceStatus === 'cancelled'
    ? { icon: Ban, es: 'Carrera cancelada por el hipódromo. No se pueden añadir ni cambiar selecciones; tus elecciones se conservan y su puntuación queda pendiente de confirmación.', en: 'Race cancelled by the track. Picks cannot be added or changed; your choices are kept and how it scores is pending confirmation.' }
    : race.availability === 'unavailable'
      ? { icon: CloudOff, es: 'Esta carrera no está disponible temporalmente en el programa del hipódromo. No se pueden añadir ni cambiar selecciones; tus elecciones se conservan.', en: 'This race is temporarily unavailable on the track card. Picks cannot be added or changed; your choices are kept.' }
      : null;

  return (
    <section className="rws" aria-labelledby={`rws-title-${race.id}`} data-accent={STRAT_ACCENT[strat.id]}>
      <header className="rws__head">
        <div className="rws__id">
          <span className="rws__idx t-data">{index}</span>
          <div>
            <p className="t-label rws__kicker">{isEn ? 'Race' : 'Carrera'} {index}{showTrack ? ` · ${isEn ? 'track race' : 'carrera de pista'} ${track}` : ''}</p>
            <h3 id={`rws-title-${race.id}`} className="t-card rws__name">
              {race.name && race.name !== `Race ${race.raceNumber}` ? race.name : `${isEn ? 'Race' : 'Carrera'} ${index}`}
            </h3>
          </div>
        </div>
        <ul className="rws__meta">
          {time ? <li><Clock size={15} aria-hidden />{time}</li> : null}
          {Number.isFinite(distanceM) && distanceM > 0 ? <li><Ruler size={15} aria-hidden />{distanceM} m</li> : null}
          <li><Users size={15} aria-hidden />{horses.length} {isEn ? 'runners' : 'participantes'}</li>
        </ul>
      </header>

      {lockedReason ? (
        <p className="rws__locked"><Lock size={16} aria-hidden />{lockedReason}</p>
      ) : null}
      {raceNotice ? (
        <p className="rws__notice" role="status"><raceNotice.icon size={16} aria-hidden />{isEn ? raceNotice.en : raceNotice.es}</p>
      ) : null}

      <div className="rws__step">
        <p className="t-label rws__steplabel"><span className="rws__stepnum">A</span>{isEn ? 'Split your 50 points' : 'Reparte tus 50 puntos'}</p>
        <StrategySelector activeStrategy={strat.id} onChange={onStrategyChange} disabled={locked || !onStrategyChange} isEn={isEn} guided={guideStep === 'strategy'} />
      </div>

      <div className="rws__step">
        <div className="rws__pickhead">
          <p className="t-label rws__steplabel"><span className="rws__stepnum">B</span>{isEn ? 'Choose your horses' : 'Elige tus caballos'}</p>
          <span className={`rws__count${full ? ' is-done' : ''}`} aria-live="polite">
            {selectedHorses.length}/{strat.maxPicks} {isEn ? 'selected' : 'seleccionados'}
          </span>
        </div>

        <div className={`runners${guideStep === 'runners' ? ' ui-guided' : ''}`} role="table" aria-label={isEn ? 'Runners' : 'Participantes'} data-guide-step={guideStep === 'runners' ? 'runners' : undefined}>
          <div className="runners__head" role="row">
            <span role="columnheader">#</span>
            <span role="columnheader">{isEn ? 'Horse' : 'Caballo'}</span>
            <span role="columnheader">{isEn ? 'Jockey' : 'Jinete'}</span>
            <span role="columnheader">{isEn ? 'Trainer' : 'Entrenador'}</span>
            <span role="columnheader" className="runners__num">{isEn ? 'MY50 dividend' : 'Dividendo MY50'}</span>
            <span role="columnheader" className="runners__num">{isEn ? 'Pick' : 'Elegir'}</span>
          </div>
          {horses.map((h) => {
            const pos = selectedHorses.indexOf(h.id);
            const on = pos !== -1;
            const pts = on ? alloc[pos] : null;
            const out = runnerOut(h);
            const disabled = locked || out || (!on && full);
            return (
              <div key={h.id} role="row" className={`runner${on ? ' is-on' : ''}${out ? ' is-scratched' : ''}`}>
                <span role="cell" className="runner__num"><SaddleNumber number={h.postPosition} label={h.programNumber} /></span>
                <span role="cell" className="runner__horse">
                  <span className="runner__name">{h.name}</span>
                  <RunnerStatusChip runner={h} isEn={isEn} />
                  {on ? <span className="runner__pts t-num">{pts} pts</span> : null}
                </span>
                <span role="cell" className="runner__muted">{h.jockey || '—'}</span>
                <span role="cell" className="runner__muted">{h.trainer || '—'}</span>
                <span role="cell" className="runners__num"><DividendValue runner={h} isEn={isEn} /></span>
                <span role="cell" className="runners__num">
                  <button
                    type="button"
                    className={`pickbtn${on ? ' is-on' : ''}`}
                    aria-pressed={on}
                    disabled={disabled && !on}
                    onClick={() => onPickHorse?.(h.id)}
                    aria-label={`${on ? (isEn ? 'Remove' : 'Quitar') : isEn ? 'Pick' : 'Elegir'} ${h.name}`}
                  >
                    {on ? <><Check size={16} strokeWidth={3} aria-hidden />{isEn ? 'Picked' : 'Elegido'}</> : isEn ? 'Pick' : 'Elegir'}
                  </button>
                </span>
                {/* mobile card */}
                <button
                  type="button"
                  className="runner__card"
                  aria-pressed={on}
                  disabled={disabled && !on}
                  onClick={() => onPickHorse?.(h.id)}
                >
                  <span className="runner__cardl1">
                    <SaddleNumber number={h.postPosition} label={h.programNumber} size="lg" />
                    <span className="runner__cardname">
                      <span className="runner__name">{h.name}</span>
                      <span className="runner__cardsub">{[h.jockey, h.trainer].filter(Boolean).join(' · ') || '—'}</span>
                    </span>
                    <span className={`pickdot${on ? ' is-on' : ''}`} aria-hidden>{on ? <Check size={18} strokeWidth={3} /> : null}</span>
                  </span>
                  <span className="runner__cardl2">
                    <span className="t-label">{isEn ? 'MY50 dividend' : 'Dividendo MY50'}</span>
                    <DividendValue runner={h} isEn={isEn} withLabel />
                    {on ? <span className="runner__pts t-num">{pts} pts</span> : null}
                    <RunnerStatusChip runner={h} isEn={isEn} />
                  </span>
                </button>
              </div>
            );
          })}
          {guideStep === 'runners' ? <GuideRing outset /> : null}
        </div>
        <p className="t-meta rws__foot">
          {isEn
            ? 'A slot scores only if its horse wins. MY50 dividend: "—" until published.'
            : 'Cada asignación puntúa solo si su caballo gana. Dividendo MY50: "—" hasta su publicación.'}
        </p>
      </div>
    </section>
  );
}
