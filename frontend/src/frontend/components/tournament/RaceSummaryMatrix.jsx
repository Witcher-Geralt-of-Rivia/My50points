'use client';

/**
 * Seven-race tournament strip (design page 45).
 *
 * A tournament is ALWAYS exactly 7 races. The index shown on each chip (1..7)
 * is the tournament race index. `race.raceNumber` is the racetrack's own race
 * number and is only ever shown as a secondary label, and only when the
 * backend actually provides one that differs from the tournament index — it is
 * never fabricated and never replaces the tournament index.
 */

import React from 'react';
import { Calendar, Clock, MapPin, FileSpreadsheet, Lock } from 'lucide-react';
import { useLanguage } from '@/frontend/lib/i18n/LanguageContext';

const TOURNAMENT_RACES = 7;

function formatDate(value, isEn) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(isEn ? 'en-GB' : 'es-ES', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatTime(value, isEn) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString(isEn ? 'en-GB' : 'es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Display state for one race chip.
 *
 * `readOnly` means the parent tournament is COMPLETED/ARCHIVED. A stored race
 * row can still carry a stale `live`/`running` status in that case, so the
 * presentation is normalized: a closed tournament can never show a live chip.
 * Nothing is written back and no result is invented — `resultado` is only used
 * when the race actually carries result rows.
 */
function raceStateOf(race, readOnly = false) {
  const s = String(race?.status || '').toLowerCase();
  const hasResults = Array.isArray(race?.results) && race.results.length > 0;

  if (readOnly) return hasResults ? 'resultado' : 'closed';

  if (s === 'finished' || s === 'completed') return hasResults ? 'resultado' : 'closed';
  if (s === 'live' || s === 'running') return 'running';
  return 'open';
}

export default function RaceSummaryMatrix({
  tournament,
  races = [],
  currentRaceIndex = 0,
  onSelectRace,
  picks = {},
  onOpenDividends,
  readOnly = false,
}) {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const trackName = tournament?.track || tournament?.name || '';
  const location = tournament?.location || '';
  const dateLabel = formatDate(tournament?.date, isEn);

  // Exactly the 7 tournament races.
  const tournamentRaces = races.slice(0, TOURNAMENT_RACES);
  const firstPost = formatTime(tournamentRaces[0]?.scheduledTime, isEn);

  return (
    <section className="tp-panel">
      <div className="tp-section-head">
        <div>
          <p className="tp-eyebrow">
            {isEn ? 'MY 50 POINTS · 7-RACE TOURNAMENT' : 'MY 50 POINTS · TORNEO DE 7 CARRERAS'}
          </p>
          <h2 className="tp-section-title">
            {isEn ? 'Tournament races' : 'Carreras del torneo'}
          </h2>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'var(--my50-space-4)',
              marginTop: 'var(--my50-space-2)',
              fontSize: 'var(--my50-font-label)',
              color: 'var(--my50-text-muted)',
            }}
          >
            {(trackName || location) && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--my50-aqua)' }} />
                <span>{[trackName, location].filter(Boolean).join(', ')}</span>
              </span>
            )}
            {dateLabel && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--my50-purple-light)' }} />
                <span>{dateLabel}</span>
              </span>
            )}
            {firstPost && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Clock className="w-3.5 h-3.5" style={{ color: 'var(--my50-success)' }} />
                <span>
                  {isEn ? 'First post ' : 'Primera salida '}
                  {firstPost}
                </span>
              </span>
            )}
          </div>
        </div>

        {onOpenDividends && (
          <button
            id="matrix-open-dividends-btn"
            type="button"
            onClick={onOpenDividends}
            className="tp-btn tp-btn--dividends"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isEn ? 'Fixed dividends' : 'Dividendos fijos'}</span>
          </button>
        )}
      </div>

      <div className="tp-races">
        {tournamentRaces.map((race, idx) => {
          const tournamentRaceIndex = idx + 1;
          // Racetrack race number, shown secondarily only when the backend
          // provides one that is not the same as the tournament index.
          const trackRaceNumber =
            Number.isFinite(Number(race?.raceNumber)) &&
            Number(race.raceNumber) !== tournamentRaceIndex
              ? Number(race.raceNumber)
              : null;

          const isSelected = idx === currentRaceIndex;
          const state = raceStateOf(race, readOnly);
          const postTime = formatTime(race?.scheduledTime, isEn);

          const racePick = picks[race.id];
          const horseIds = Array.isArray(racePick)
            ? racePick
            : racePick?.horseIds || (racePick?.horseId ? [racePick.horseId] : []);

          let strategyName = null;
          let stratStyle = { background: 'rgba(255,255,255,0.06)', color: 'var(--my50-text-faint)' };
          if (horseIds.length === 1) {
            strategyName = 'FULL POINT';
            stratStyle = { background: 'var(--my50-purple)', color: '#fff' };
          } else if (horseIds.length === 2) {
            strategyName = 'DUAL POINT';
            stratStyle = { background: 'var(--my50-aqua)', color: '#03212b' };
          } else if (horseIds.length >= 3) {
            strategyName = 'SMART POINT';
            stratStyle = { background: 'var(--my50-gold)', color: '#1a1400' };
          }

          const horseNumbers = horseIds.map((hid) => {
            const h = (race.horses || []).find((item) => item.id === hid);
            return h?.postPosition || h?.number || hid;
          });

          return (
            <button
              key={race.id || idx}
              id={`race-summary-card-${tournamentRaceIndex}`}
              type="button"
              disabled={readOnly}
              onClick={() => onSelectRace && onSelectRace(idx)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                textAlign: 'center',
                cursor: readOnly ? 'default' : 'pointer',
                background: 'var(--my50-panel-2)',
                borderRadius: 'var(--my50-radius-sm)',
                border: `1px solid ${isSelected ? 'var(--my50-border-selected)' : 'var(--my50-border)'}`,
                boxShadow: isSelected ? 'var(--my50-ring-selected)' : 'none',
                padding: 0,
              }}
            >
              {/* Tournament race index — always 1..7 */}
              <span
                style={{
                  display: 'block',
                  background: isSelected ? 'var(--my50-gold)' : 'var(--my50-cream)',
                  color: 'var(--my50-cream-ink)',
                  fontWeight: 900,
                  fontSize: 'var(--my50-font-label)',
                  letterSpacing: '0.06em',
                  padding: '6px 4px',
                }}
              >
                {isEn ? 'RACE' : 'CARRERA'} {tournamentRaceIndex}
              </span>

              {/* Racetrack race number (secondary, only when supplied) */}
              {trackRaceNumber !== null && (
                <span
                  style={{
                    display: 'block',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    color: 'var(--my50-text-faint)',
                    padding: '4px 2px 0',
                  }}
                >
                  {isEn ? `TRACK R${trackRaceNumber}` : `PISTA C${trackRaceNumber}`}
                </span>
              )}

              {/* Selection / strategy state */}
              <span
                style={{
                  display: 'block',
                  margin: '6px 6px 0',
                  borderRadius: 'var(--my50-radius-xs)',
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: '0.08em',
                  padding: '4px 2px',
                  ...stratStyle,
                }}
              >
                {strategyName || (isEn ? 'NO PICKS' : 'SIN PICKS')}
              </span>

              {/* Selected horse numbers */}
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  minHeight: 42,
                  padding: '8px 4px',
                }}
              >
                {horseNumbers.length > 0 ? (
                  horseNumbers.map((num, nIdx) => (
                    <span
                      key={nIdx}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        background: '#fff',
                        color: '#000',
                        fontWeight: 900,
                        fontSize: 13,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {num}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: 11, color: 'var(--my50-text-faint)' }}>—</span>
                )}
              </span>

              {/* Race status / post time footer */}
              <span
                style={{
                  display: 'block',
                  borderTop: '1px solid var(--my50-border)',
                  padding: '6px 4px',
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  color:
                    state === 'resultado'
                      ? 'var(--my50-gold)'
                      : state === 'closed'
                        ? 'var(--my50-text-faint)'
                        : state === 'running'
                          ? 'var(--my50-live)'
                          : 'var(--my50-success)',
                }}
              >
                {state === 'resultado' ? (
                  isEn ? 'RESULT' : 'RESULTADO'
                ) : state === 'closed' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Lock className="w-3 h-3" />
                    {isEn ? 'CLOSED' : 'CERRADA'}
                  </span>
                ) : state === 'running' ? (
                  isEn ? 'RUNNING' : 'EN CURSO'
                ) : postTime ? (
                  postTime
                ) : isEn ? (
                  'OPEN'
                ) : (
                  'ABIERTA'
                )}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
