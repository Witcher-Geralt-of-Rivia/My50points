'use client';

/**
 * Tournament hero + status strip — presentation only (Milestone 1, pass 1).
 *
 * Everything rendered here comes from data the page already has. Nothing is
 * invented: if the backend does not supply a value, the block is omitted
 * rather than filled with a placeholder.
 */

import React from 'react';
import Link from 'next/link';
import { MapPin, Calendar, ArrowRight, Trophy, FileSpreadsheet, HelpCircle } from 'lucide-react';
import { PHASE, getPhaseLabel } from '@/frontend/lib/tournamentState';

function formatDate(value, isEn) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(isEn ? 'en-GB' : 'es-ES', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function TournamentHero({
  tournament,
  phase = PHASE.UPCOMING,
  visibility = {},
  countdown = null,
  nextRace = null,
  totalRaces = 7,
  racesCompleted = 0,
  onPrimaryAction,
  onOpenDividends,
  onOpenGuide,
  rankingHref = '/leaderboard',
  isEn = false,
}) {
  if (!tournament) return null;

  const { text: statusText, tone } = getPhaseLabel(phase, isEn);
  const dateLabel = formatDate(tournament.date, isEn);
  const hasLocation = Boolean(tournament.track || tournament.location);

  // Boolean(): a bare `&&` chain over numeric fields would render a stray "0".
  const showCountdown = Boolean(
    visibility.showCountdown &&
      countdown &&
      (countdown.days || countdown.hours || countdown.minutes || countdown.seconds),
  );

  const countdownUnits = showCountdown
    ? [
        ...(countdown.days > 0 ? [{ value: countdown.days, label: isEn ? 'D' : 'DÍAS' }] : []),
        { value: countdown.hours, label: 'HRS' },
        { value: countdown.minutes, label: 'MIN' },
        { value: countdown.seconds, label: 'SEG' },
      ]
    : [];

  return (
    <section className="tp-hero">
      <div className="tp-hero__grid">
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--my50-space-3)' }}>
            <span className={`tp-status tp-status--${tone}`}>
              {phase === PHASE.LIVE && <span className="tp-status__dot" />}
              {statusText}
            </span>
            <span className="tp-eyebrow">
              {isEn ? 'MY 50 POINTS · OFFICIAL TOURNAMENT' : 'MY 50 POINTS · TORNEO OFICIAL'}
            </span>
          </div>

          <h1 className="tp-hero__title">{tournament.name}</h1>

          {tournament.track && tournament.track !== tournament.name && (
            <p className="tp-hero__track">{tournament.track}</p>
          )}

          <div className="tp-hero__meta">
            {hasLocation && (
              <span className="tp-hero__meta-item">
                <MapPin size={15} style={{ color: 'var(--my50-aqua)' }} />
                <span>{[tournament.track, tournament.location].filter(Boolean).join(', ')}</span>
              </span>
            )}
            {dateLabel && (
              <span className="tp-hero__meta-item">
                <Calendar size={15} style={{ color: 'var(--my50-purple-light)' }} />
                <span>{dateLabel}</span>
              </span>
            )}
          </div>

          <div className="tp-hero__actions">
            {visibility.showPrimaryTicketCta && onPrimaryAction && (
              <button type="button" className="tp-btn tp-btn--primary" onClick={onPrimaryAction}>
                {isEn ? 'BUILD MY TICKET NOW' : 'HACER MI TICKET AHORA'}
                <ArrowRight size={16} />
              </button>
            )}

            <Link href={rankingHref} className="tp-btn tp-btn--ghost">
              <Trophy size={16} style={{ color: 'var(--my50-gold)' }} />
              {isEn ? 'VIEW RANKING' : 'VER RANKING'}
            </Link>

            {onOpenDividends && (
              <button
                id="tournament-view-dividends-btn"
                type="button"
                className="tp-btn tp-btn--dividends"
                onClick={onOpenDividends}
              >
                <FileSpreadsheet size={15} />
                {isEn ? 'FIXED DIVIDENDS' : 'DIVIDENDOS FIJOS'}
              </button>
            )}

            {/* Inline guide trigger — replaces the fixed pill that used to
                float over the ticket selector and the action row. */}
            {onOpenGuide && (
              <button type="button" className="tp-btn tp-btn--ghost" onClick={onOpenGuide}>
                <HelpCircle size={15} style={{ color: 'var(--my50-purple-light)' }} />
                {isEn ? 'HOW TO PLAY' : 'CÓMO JUGAR'}
              </button>
            )}
          </div>
        </div>

        <aside className="tp-hero__facts">
          <div className="tp-fact">
            <span className="tp-fact__label">{isEn ? 'Tournament format' : 'Formato del torneo'}</span>
            <span className="tp-fact__value tp-fact__value--gold">
              {totalRaces} {isEn ? 'RACES' : 'CARRERAS'}
            </span>
          </div>

          {visibility.showProgress && (
            <div className="tp-fact">
              <span className="tp-fact__label">{isEn ? 'Progress' : 'Progresión'}</span>
              <span className="tp-fact__value">
                {racesCompleted} / {totalRaces}
              </span>
            </div>
          )}

          {showCountdown && (
            <div className="tp-fact">
              <span className="tp-fact__label">
                {nextRace
                  ? isEn
                    ? 'Next race in'
                    : 'Próxima carrera en'
                  : isEn
                    ? 'Starts in'
                    : 'Comienza en'}
              </span>
              <div className="tp-count" style={{ marginTop: 6 }}>
                {countdownUnits.map((unit) => (
                  <div key={unit.label} className="tp-count__cell">
                    <span className="tp-count__num">{String(unit.value).padStart(2, '0')}</span>
                    <span className="tp-count__unit">{unit.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

/**
 * Compact status strip. Only renders metrics the page actually holds —
 * page 139 of the design material is a state/example board, so its labels are
 * reused but every value and every state word here is conditional.
 */
export function TournamentKpiStrip({
  phase = PHASE.UPCOMING,
  showProgress = false,
  showTicketKpis = true,
  totalRaces = 7,
  racesCompleted = 0,
  confirmedCount = 0,
  pendingCount = 0,
  activeTicketNumber = 1,
  playersJoined = null,
  isEn = false,
}) {
  const { text: statusText, tone } = getPhaseLabel(phase, isEn);

  return (
    <div className="tp-kpi" role="status">
      <div className="tp-kpi__cell">
        <span className="tp-kpi__label">{isEn ? 'Status' : 'Estado'}</span>
        <span className={`tp-status tp-status--${tone}`} style={{ marginTop: 6 }}>
          {phase === PHASE.LIVE && <span className="tp-status__dot" />}
          {statusText}
        </span>
      </div>

      <div className="tp-kpi__cell">
        <span className="tp-kpi__label">
          {showProgress
            ? isEn ? 'Races run' : 'Carreras corridas'
            : isEn ? 'Tournament races' : 'Carreras del torneo'}
        </span>
        <span className="tp-kpi__value tp-kpi__value--gold">
          {showProgress ? `${racesCompleted} / ${totalRaces}` : totalRaces}
        </span>
      </div>

      {/* Ticket-progress metrics describe an editable ticket, so they are not
          shown once the tournament is closed — a finished tournament must not
          read as if it were still being configured. */}
      {showTicketKpis && (
        <>
          <div className="tp-kpi__cell">
            <span className="tp-kpi__label">{isEn ? 'Active ticket' : 'Boleto activo'}</span>
            <span className="tp-kpi__value tp-kpi__value--purple">#{activeTicketNumber}</span>
          </div>

          <div className="tp-kpi__cell">
            <span className="tp-kpi__label">{isEn ? 'Confirmed' : 'Confirmadas'}</span>
            <span className="tp-kpi__value tp-kpi__value--green">
              {confirmedCount} / {totalRaces}
            </span>
          </div>

          <div className="tp-kpi__cell">
            <span className="tp-kpi__label">{isEn ? 'Pending' : 'Pendientes'}</span>
            <span className="tp-kpi__value tp-kpi__value--aqua">{pendingCount}</span>
          </div>
        </>
      )}

      {Number.isFinite(playersJoined) && playersJoined > 0 && (
        <div className="tp-kpi__cell">
          <span className="tp-kpi__label">{isEn ? 'Players' : 'Jugadores'}</span>
          <span className="tp-kpi__value">{playersJoined.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}
