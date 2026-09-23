'use client';

/**
 * Tournament hero — photographic band, real state, date/time, countdown when
 * meaningful, ONE contextual primary CTA and the secondary controls.
 * Presentation only: the caller decides the CTA from real ticket state.
 */
import Link from 'next/link';
import { MapPin, CalendarDays, Clock, Trophy, FileSpreadsheet, HelpCircle, ArrowRight, Flag } from 'lucide-react';
import { StatusChip, Countdown } from '@/frontend/components/ui';
import { formatDateLong, formatTime } from '@/frontend/lib/redesign';
import NeonTrack from '@/frontend/components/ui/NeonTrack';
import GuideRing from '@/frontend/components/ui/GuideRing';

export default function TournamentHero({
  tournament,
  status,
  firstPost = null,
  racesRun = 0,
  totalRaces = 7,
  primaryCta = null,
  rankingHref,
  onOpenDividends,
  onOpenGuide,
  showCountdown = false,
  extraChips = null,
  sideNote = null,
  isEn = false,
}) {
  if (!tournament) return null;
  const dateText = formatDateLong(firstPost || tournament.date, isEn);
  const timeText = firstPost ? formatTime(firstPost, isEn) : null;
  const accent = status?.key === 'live' ? 'live' : status?.key === 'finished' || status?.key === 'archived' ? 'gold' : 'm1';

  return (
    <section className="trn-hero ui-glass" data-accent={accent} aria-labelledby="trn-title">
      <NeonTrack variant="hero" accent={accent === 'live' ? 'live' : accent === 'gold' ? 'gold' : 'aqua'} className="trn-hero__art" />
      <div className="trn-hero__veil" aria-hidden />
      <div className="trn-hero__grid">
        <div className="trn-hero__main">
          <div className="trn-hero__chips">
            {status ? <StatusChip tone={status.key}>{isEn ? status.en : status.es}</StatusChip> : null}
            <span className="ui-chip" data-tone="upcoming"><Flag size={13} aria-hidden />{totalRaces} {isEn ? 'races' : 'carreras'}</span>
            {extraChips}
          </div>
          <p className="t-label trn-hero__track">{tournament.track}</p>
          <h1 id="trn-title" className="t-page trn-hero__title">{tournament.name}</h1>
          <ul className="trn-hero__meta">
            {tournament.location ? <li><MapPin size={16} aria-hidden />{tournament.location}</li> : null}
            {dateText ? <li><CalendarDays size={16} aria-hidden />{dateText}</li> : null}
            {timeText ? <li><Clock size={16} aria-hidden />{isEn ? 'First post' : 'Primera salida'} {timeText}</li> : null}
          </ul>
          <div className="trn-hero__actions">
            {primaryCta ? (
              primaryCta.href ? (
                <Link href={primaryCta.href} className="ui-btn ui-btn--primary ui-btn--lg">
                  {primaryCta.label}<ArrowRight size={19} aria-hidden />
                  {primaryCta.guide ? <GuideRing /> : null}
                </Link>
              ) : (
                <button type="button" className="ui-btn ui-btn--primary ui-btn--lg" onClick={primaryCta.onClick}>
                  {primaryCta.label}<ArrowRight size={19} aria-hidden />
                  {primaryCta.guide ? <GuideRing /> : null}
                </button>
              )
            ) : null}
            {rankingHref ? (
              <Link href={rankingHref} className="ui-btn ui-btn--secondary">
                <Trophy size={17} aria-hidden />{isEn ? 'Ranking' : 'Ranking'}
              </Link>
            ) : null}
            {onOpenDividends ? (
              <button id="tournament-view-dividends-btn" type="button" className="ui-btn ui-btn--secondary trn-hero__div" onClick={onOpenDividends}>
                <FileSpreadsheet size={17} aria-hidden />{isEn ? 'Fixed dividends' : 'Dividendos fijos'}
              </button>
            ) : null}
            {onOpenGuide ? (
              <button type="button" className="ui-btn ui-btn--ghost" onClick={onOpenGuide}>
                <HelpCircle size={17} aria-hidden />{isEn ? 'How to play' : 'Cómo jugar'}
              </button>
            ) : null}
          </div>
        </div>
        <aside className="trn-hero__side" aria-label={isEn ? 'Tournament state' : 'Estado del torneo'}>
          {showCountdown && firstPost ? (
            <div className="trn-hero__fact">
              <span className="t-label">{isEn ? 'Entries close at first post' : 'Las jugadas cierran en la 1.ª salida'}</span>
              <Countdown target={firstPost} isEn={isEn} />
            </div>
          ) : null}
          {sideNote}
          <div className="trn-hero__fact trn-hero__fact--row">
            <span className="t-label">{isEn ? 'Races run' : 'Carreras corridas'}</span>
            <span className="t-data trn-hero__num">{racesRun}<span className="trn-hero__of"> / {totalRaces}</span></span>
          </div>
        </aside>
      </div>
    </section>
  );
}
