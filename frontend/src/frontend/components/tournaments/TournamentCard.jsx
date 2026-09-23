'use client';

/**
 * Event-poster card for a tournament. The whole card is a real link to the
 * tournament's actual slug (no inferred/guessed destination). If a slug is
 * missing the card renders as an honest, non-interactive "not available".
 */
import Link from 'next/link';
import { MapPin, CalendarDays, Clock, ArrowRight, Flag } from 'lucide-react';
import { StatusChip } from '@/frontend/components/ui';
import { trackArt, displayStatus, firstPostTime, formatDateLong, formatTime } from '@/frontend/lib/redesign';
import { withModalityQuery } from '@/frontend/lib/gameModalities';

const CTA = {
  live: { es: 'Seguir en vivo', en: 'Follow live' },
  today: { es: 'Entrar al torneo', en: 'Enter tournament' },
  upcoming: { es: 'Entrar al torneo', en: 'Enter tournament' },
  finished: { es: 'Ver resultados', en: 'See results' },
  archived: { es: 'Ver resultados', en: 'See results' },
};

export default function TournamentCard({ tournament, isEn = false, modalityId = null, priority = false }) {
  const status = displayStatus(tournament);
  const first = firstPostTime(tournament) || (tournament?.date ? new Date(tournament.date) : null);
  const dateText = formatDateLong(first || tournament?.date, isEn);
  const timeText = first ? formatTime(first, isEn) : null;
  const slug = tournament?.slug;
  const href = slug ? withModalityQuery(`/tournament/${encodeURIComponent(slug)}`, modalityId) : null;
  const accent = status.key === 'live' ? 'live' : status.key === 'finished' || status.key === 'archived' ? 'gold' : status.key === 'today' ? 'aqua' : 'm1';
  const cta = CTA[status.key] || CTA.upcoming;
  const races = Array.isArray(tournament?.races) ? tournament.races.length : tournament?.totalRaces || 7;

  const body = (
    <>
      <div className="tcard__media">
        <img src={trackArt(tournament)} alt="" loading={priority ? 'eager' : 'lazy'} decoding="async" />
        <div className="tcard__scrim" aria-hidden />
        <div className="tcard__badges">
          <StatusChip tone={status.key}>{isEn ? status.en : status.es}</StatusChip>
          <span className="tcard__races"><Flag size={13} aria-hidden /> {races} {isEn ? 'races' : 'carreras'}</span>
        </div>
        <div className="tcard__title-wrap">
          <p className="t-label tcard__track">{tournament?.track || (isEn ? 'Racetrack' : 'Hipódromo')}</p>
          <h3 className="t-card tcard__name">{tournament?.name}</h3>
        </div>
      </div>
      <div className="tcard__body">
        <ul className="tcard__meta">
          {dateText ? <li><CalendarDays size={15} aria-hidden /><span>{dateText}</span></li> : null}
          {timeText ? <li><Clock size={15} aria-hidden /><span>{isEn ? 'First post' : '1.ª salida'} {timeText}</span></li> : null}
          {tournament?.location ? <li><MapPin size={15} aria-hidden /><span>{tournament.location}</span></li> : null}
        </ul>
        <span className={`tcard__cta${href ? '' : ' is-disabled'}`}>
          {href ? (isEn ? cta.en : cta.es) : isEn ? 'Not available' : 'No disponible'}
          {href ? <ArrowRight size={17} aria-hidden /> : null}
        </span>
      </div>
    </>
  );

  if (!href) {
    return <article className="tcard ui-metal is-unavailable" data-accent={accent}>{body}</article>;
  }
  return (
    <Link href={href} className="tcard ui-metal ui-hover-lift" data-accent={accent} aria-label={`${tournament?.name} — ${isEn ? status.en : status.es}`}>
      {body}
    </Link>
  );
}
