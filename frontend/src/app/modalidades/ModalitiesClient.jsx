'use client';

/**
 * /modalidades — the four ways to play, on the dark arena canvas.
 * M2 (registered, free) and M4 (guest) are live; M1 (paid) and M3 (special)
 * are shown honestly as future modes, with no action.
 */
import Link from 'next/link';
import { ArrowRight, Clock3, Trophy, UserRound, Ticket, Star, Check } from 'lucide-react';
import { useAuth } from '@/frontend/contexts/AuthContext';
import { useModality } from '@/frontend/contexts/ModalityContext';
import { useLanguage } from '@/frontend/lib/i18n/LanguageContext';

export const MODALITY_CARDS = [
  {
    id: 'free', code: 'M2', accent: 'm2', icon: Trophy, live: true,
    es: { name: 'Torneo gratis', tag: 'Con tu cuenta', points: ['3 boletos por torneo', 'Boleto 1 gratis · un anuncio desbloquea el 2 y el 3', 'Ranking global con tu nombre'] },
    en: { name: 'Free tournament', tag: 'With your account', points: ['3 tickets per tournament', 'Ticket 1 free · one ad unlocks tickets 2 and 3', 'Global ranking under your name'] },
  },
  {
    id: 'guest', code: 'M4', accent: 'm4', icon: UserRound, live: true,
    es: { name: 'Torneo gratis (sin registro)', tag: 'Invitado', points: ['Juega al instante con un alias', 'Boleto 1 gratis · un anuncio por boleto extra', 'Código para recuperar tu sesión'] },
    en: { name: 'Free tournament (no sign-up)', tag: 'Guest', points: ['Play instantly with an alias', 'Ticket 1 free · one ad per extra ticket', 'Recovery code to resume your session'] },
  },
  {
    id: 'paid', code: 'M1', accent: 'm1', icon: Ticket, live: false,
    es: { name: 'Torneo', tag: 'Más adelante', points: ['Torneo oficial por puntos', 'Aún no disponible'] },
    en: { name: 'Tournament', tag: 'Later', points: ['Official points tournament', 'Not available yet'] },
  },
  {
    id: 'special', code: 'M3', accent: 'm3', icon: Star, live: false,
    es: { name: 'Torneo especial', tag: 'Más adelante', points: ['Eventos especiales de temporada', 'Aún no disponible'] },
    en: { name: 'Special tournament', tag: 'Later', points: ['Seasonal special events', 'Not available yet'] },
  },
];

export function ModalityCard({ card, isEn, active = false }) {
  const c = isEn ? card.en : card.es;
  const Icon = card.icon;
  const body = (
    <>
      <span className="mcard__top">
        <span className="mcard__icon"><Icon size={24} aria-hidden /></span>
        <span className="mcard__code t-data">{card.code}</span>
      </span>
      <span className="t-card mcard__name">{c.name}</span>
      <span className="ui-chip mcard__tag" data-tone={card.live ? card.accent : 'archived'}>
        {card.live ? null : <Clock3 size={13} aria-hidden />}{c.tag}
      </span>
      <ul className="mcard__list">
        {c.points.map((p) => <li key={p}><Check size={15} aria-hidden />{p}</li>)}
      </ul>
      {card.live ? (
        <span className="mcard__cta">{active ? (isEn ? 'Your current mode' : 'Tu modalidad actual') : isEn ? 'Choose' : 'Elegir'}<ArrowRight size={17} aria-hidden /></span>
      ) : null}
    </>
  );
  const cls = `mcard ${card.id === 'guest' ? 'ui-pearl' : 'ui-metal'}${card.live ? ' ui-hover-lift' : ' is-future'}${active ? ' is-active' : ''}`;
  return card.live ? (
    <Link href={`/modalidades/${card.id}`} className={cls} data-accent={card.accent} aria-current={active ? 'true' : undefined}>{body}</Link>
  ) : (
    <div className={cls} data-accent={card.accent} aria-disabled="true">{body}</div>
  );
}

export default function ModalitiesClient() {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const { activeModalityId } = useModality();
  const { user } = useAuth();

  return (
    <div className="ui-container ui-page">
      <header className="ui-pagehead">
        <p className="t-eyebrow" data-accent="aqua">{isEn ? 'Ways to play' : 'Formas de jugar'}</p>
        <h1 className="t-page">{isEn ? 'Game modes' : 'Modalidades'}</h1>
        <p className="t-body-lg ui-pagehead__lead">
          {isEn
            ? 'Same tournaments, same 50-point strategy. Pick how you want to take part.'
            : 'Los mismos torneos y la misma estrategia de 50 puntos. Elige cómo quieres participar.'}
        </p>
        {user ? (
          <p className="t-meta">
            {isEn ? 'Signed in as' : 'Sesión iniciada como'} <strong>{user.username}</strong>
            {user.isGuest ? (isEn ? ' (guest)' : ' (invitado)') : ''}
          </p>
        ) : null}
      </header>
      <div className="mgrid">
        {MODALITY_CARDS.map((card) => (
          <ModalityCard key={card.id} card={card} isEn={isEn} active={card.live && card.id === activeModalityId && Boolean(user)} />
        ))}
      </div>
    </div>
  );
}
