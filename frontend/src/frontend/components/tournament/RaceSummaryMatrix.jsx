'use client';

/**
 * RaceProgress — the seven tournament races (always exactly 7).
 *
 * The big number is the TOURNAMENT index (1..7). `race.raceNumber` is the
 * racetrack's own number, shown only as a secondary label when it differs.
 * Tabs are navigation/status only: selecting one NEVER writes to the server.
 */
import { Check, Lock, Radio } from 'lucide-react';
import { useLanguage } from '@/frontend/lib/i18n/LanguageContext';
import { formatTime } from '@/frontend/lib/redesign';

const STATE_TEXT = {
  empty: { es: 'Sin elegir', en: 'Not picked' },
  draft: { es: 'Borrador', en: 'Draft' },
  saved: { es: 'Guardada', en: 'Saved' },
  confirmed: { es: 'Confirmada', en: 'Confirmed' },
  result: { es: 'Resultado', en: 'Result' },
  closed: { es: 'Cerrada', en: 'Closed' },
  running: { es: 'En curso', en: 'Running' },
};
const STRAT_SHORT = { full: 'FULL', dual: 'DUAL', smart: 'SMART' };

export default function RaceSummaryMatrix({ races = [], activeRaceId = null, raceState, onSelectRace, readOnly = false }) {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const list = races.slice(0, 7);

  return (
    <nav className="rprog" aria-label={isEn ? 'Tournament races' : 'Carreras del torneo'}>
      <ol className="rprog__list">
        {list.map((race, idx) => {
          const st = raceState ? raceState(race) : { state: 'empty' };
          const active = race.id === activeRaceId;
          const track = Number(race.raceNumber);
          const showTrack = Number.isFinite(track) && track !== idx + 1;
          const time = formatTime(race.scheduledTime, isEn);
          const Icon = st.state === 'saved' || st.state === 'confirmed' ? Check : st.state === 'running' ? Radio : st.state === 'closed' ? Lock : null;
          const content = (
            <>
              <span className="rprog__top">
                <span className="rprog__idx t-data">{idx + 1}</span>
                {Icon ? <Icon size={15} aria-hidden className="rprog__icon" /> : null}
              </span>
              <span className="rprog__label t-label">{isEn ? 'Race' : 'Carrera'}{showTrack ? ` · ${isEn ? 'T' : 'P'}${track}` : ''}</span>
              <span className="rprog__state">{st.strategy ? STRAT_SHORT[st.strategy] : isEn ? STATE_TEXT[st.state]?.en : STATE_TEXT[st.state]?.es}</span>
              {time ? <span className="rprog__time t-num">{time}</span> : null}
            </>
          );
          return (
            <li key={race.id}>
              {readOnly || !onSelectRace ? (
                <span className="rprog__tab" data-state={st.state} aria-current={active ? 'step' : undefined}>{content}</span>
              ) : (
                <button
                  type="button"
                  className={`rprog__tab${active ? ' is-active' : ''}`}
                  data-state={st.state}
                  data-strategy={st.strategy || undefined}
                  aria-current={active ? 'step' : undefined}
                  aria-label={`${isEn ? 'Race' : 'Carrera'} ${idx + 1}: ${isEn ? STATE_TEXT[st.state]?.en : STATE_TEXT[st.state]?.es}`}
                  onClick={() => onSelectRace(race.id)}
                >
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
