'use client';

/**
 * Flagship home (/). Canonical experience — /landing and /comenzar redirect here.
 *
 * Order (client direction): compact hero → MODALITIES (first actionable
 * section) → strategies → how it works → fixed dividend → ranking preview.
 *
 * Single play entry (client requirement): the ONLY control on this page that
 * starts the game is the Modalidad 4 card's "Jugar como invitado"
 * (data-game-entry="m4"), highlighted with the guided light. The other
 * modalities are shown as information only: M2 is part of the project and is
 * next (productFlags), M1 / M3 are not a current priority. Tournament discovery
 * lives under "Torneos" in the navigation, not on the home page.
 * Artwork is CSS only (NeonTrack / strategy stages): no photos of unverified origin.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, PlayCircle, Ticket, Flag, ClipboardCheck, Trophy, UserRound, Gem, BookOpen, Check, Clock3 } from 'lucide-react';
import { useLanguage } from '@/frontend/lib/i18n/LanguageContext';
import { useAuth } from '@/frontend/contexts/AuthContext';
import { fetchJson } from '@/frontend/lib/api/client';
import { strategies } from '@/frontend/components/tournament/PickSelector';
import { SectionHeader } from '@/frontend/components/ui';
import GuideRing from '@/frontend/components/ui/GuideRing';
import NeonTrack from '@/frontend/components/ui/NeonTrack';
import { GUEST_ENTRY_HREF, NEXT_MODALITY } from '@/frontend/lib/productFlags';
import { MODALITY_NAMES } from '@/frontend/lib/modalityNames';

const STRATEGY_ACCENT = { full: 'm1', dual: 'm2', smart: 'm3' };
const STRATEGY_COPY = {
  full: { es: 'Todos tus puntos a un solo caballo.', en: 'All your points on one horse.' },
  dual: { es: 'Dos caballos, dos oportunidades.', en: 'Two horses, two chances.' },
  smart: { es: 'Reparte con criterio entre tres caballos.', en: 'Spread your conviction across three horses.' },
};

/** CSS-only stage for a strategy card: grid floor, horizon and one glowing bar
 *  per allocation, sized by its points (50 · 25/25 · 30/15/5). */
function StrategyStage({ allocation }) {
  const max = Math.max(...allocation);
  return (
    <div className="home-strat__stage" aria-hidden>
      <span className="home-strat__horizon" />
      <span className="home-strat__bars">
        {allocation.map((pts, i) => (
          <span key={i} className="home-strat__bar" style={{ '--h': `${Math.round((pts / max) * 100)}%` }}>
            <span className="home-strat__bar-val t-data">{pts}</span>
          </span>
        ))}
      </span>
    </div>
  );
}

function ModalityInfoCard({ id, isEn }) {
  const m = MODALITY_NAMES[id];
  const next = id === NEXT_MODALITY;
  const desc = {
    paid: { es: 'Torneo oficial por puntos.', en: 'Official points tournament.' },
    free: { es: 'Con tu cuenta: historial, estadísticas y logros.', en: 'With your account: history, stats and achievements.' },
    special: { es: 'Eventos especiales de temporada.', en: 'Seasonal special events.' },
  }[id];
  return (
    <article className="home-modinfo ui-metal" data-accent={`m${m.code}`} data-modality={id} data-next={next || undefined}>
      <span className="home-mod__tag t-label">{isEn ? `Mode ${m.code}` : `Modalidad ${m.code}`}</span>
      <h3 className="t-card home-modinfo__name">{isEn ? m.en : m.es}</h3>
      <p className="t-meta">{isEn ? desc.en : desc.es}</p>
      <span className="ui-chip" data-tone={next ? 'upcoming' : 'archived'}>
        <Clock3 size={13} aria-hidden />
        {next ? (isEn ? 'Coming next' : 'Próximamente') : isEn ? 'Later' : 'Más adelante'}
      </span>
    </article>
  );
}

export default function HomeExperience() {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const { user } = useAuth();
  const [leaders, setLeaders] = useState([]);
  const guest = MODALITY_NAMES.guest;

  useEffect(() => {
    let live = true;
    fetchJson('/leaderboard?limit=3', { timeoutMs: 15000 })
      .then((d) => { if (live) setLeaders(Array.isArray(d?.legends) ? d.legends.slice(0, 3) : []); })
      .catch(() => { if (live) setLeaders([]); });
    return () => { live = false; };
  }, []);

  return (
    <div className="home">
      {/* ======================================================== HERO (compact) */}
      <section className="home-hero home-hero--compact" aria-labelledby="home-title">
        <NeonTrack variant="home" accent="aqua" className="home-hero__art" />
        <div className="home-hero__veil" aria-hidden />
        <div className="ui-container ui-container--wide home-hero__inner">
          <div className="home-hero__copy">
            <p className="t-eyebrow" data-accent="aqua">{isEn ? 'Points tournament · 7 races' : 'Torneo por puntos · 7 carreras'}</p>
            <h1 id="home-title" className="t-display home-hero__title">
              <span className="home-hero__my">MY</span>
              <span className="home-hero__50">50</span>
              <span className="home-hero__points">POINTS</span>
            </h1>
            <p className="home-hero__slogan">
              <span data-c="gold">{isEn ? 'Your strategy.' : 'Tu estrategia.'}</span>{' '}
              <span data-c="purple">{isEn ? 'Your points.' : 'Tus puntos.'}</span>{' '}
              <span data-c="aqua">{isEn ? 'Your game.' : 'Tu juego.'}</span>
            </p>
            <p className="t-body-lg home-hero__lead">
              {isEn ? 'Split 50 points in each of the 7 races and climb the live ranking.' : 'Reparte 50 puntos en cada una de las 7 carreras y escala el ranking en vivo.'}
            </p>
            <div className="home-hero__ctas">
              <a href="#como-funciona" className="ui-btn ui-btn--secondary ui-btn--lg">
                <PlayCircle size={20} aria-hidden />
                {isEn ? 'How it works' : 'Cómo funciona'}
              </a>
              <Link href="/how-to-play" className="ui-btn ui-btn--ghost ui-btn--lg">
                <BookOpen size={20} aria-hidden />
                {isEn ? 'Read the rules' : 'Ver las reglas'}
              </Link>
            </div>
          </div>
        </div>
        <div className="home-hero__rail" aria-hidden><span /><span /><span /></div>
      </section>

      {/* ============================================================ MODALITIES */}
      <section className="home-section home-modalities" id="jugar" aria-labelledby="home-mod">
        <div className="ui-container ui-container--wide">
          <SectionHeader eyebrow={isEn ? 'Start here' : 'Empieza aquí'} title={<span id="home-mod">{isEn ? 'Game modes' : 'Modalidades'}</span>} accent="m4" />
          <article className="home-entry__card ui-pearl" data-accent="m4" data-modality="guest" data-current="true">
            <div className="home-entry__copy">
              <span className="home-mod__tag t-label"><UserRound size={16} aria-hidden />{isEn ? 'Mode 4' : 'Modalidad 4'}</span>
              <h2 className="t-section home-entry__name">{isEn ? guest.en : guest.es}</h2>
              <p className="t-body-lg">{isEn ? 'Play with a temporary alias for 12 hours.' : 'Juega con un alias temporal durante 12 horas.'}</p>
              <ul className="home-entry__facts">
                <li><Check size={16} aria-hidden />{isEn ? '3 tickets per tournament' : '3 boletos por torneo'}</li>
                <li><Check size={16} aria-hidden />{isEn ? 'Ticket 1 free · tickets 2 and 3 with one ad each' : 'Boleto 1 gratis · el 2 y el 3 con un anuncio cada uno'}</li>
              </ul>
            </div>
            <div className="home-entry__action">
              <Link href={GUEST_ENTRY_HREF} className="ui-btn ui-btn--primary ui-btn--lg ui-guided" data-game-entry="m4">
                {isEn ? 'Play as guest' : 'Jugar como invitado'} <ArrowRight size={20} aria-hidden />
                <GuideRing tone="my50" />
              </Link>
              {user?.isGuest ? (
                <p className="t-meta home-entry__session">{isEn ? 'Active session:' : 'Sesión activa:'} <strong>{user.username}</strong></p>
              ) : null}
            </div>
          </article>
          <div className="home-modinfo-row">
            {['paid', 'free', 'special'].map((id) => <ModalityInfoCard key={id} id={id} isEn={isEn} />)}
          </div>
        </div>
      </section>

      {/* ============================================================ STRATEGY */}
      <section className="home-section" aria-labelledby="home-strategy">
        <div className="ui-container">
          <SectionHeader
            eyebrow={isEn ? 'Three ways to play every race' : 'Tres formas de jugar cada carrera'}
            title={<span id="home-strategy">{isEn ? 'Choose your strategy' : 'Elige tu estrategia'}</span>}
            accent="m1"
          >
            {isEn ? '50 points per race. A slot scores only if its horse wins.' : '50 puntos por carrera. Cada asignación puntúa solo si su caballo gana.'}
          </SectionHeader>
          <div className="ui-grid ui-grid--3 home-strats">
            {strategies.map((s) => (
              <article key={s.id} className="home-strat home-strat--neon ui-metal ui-edge ui-hover-lift" data-accent={STRATEGY_ACCENT[s.id]} data-strategy={s.id}>
                <StrategyStage allocation={s.allocation} />
                <div className="home-strat__body">
                  <h3 className="t-card home-strat__name">{s.name}</h3>
                  <div className="home-strat__alloc" aria-label={`${s.allocation.join(' + ')} ${isEn ? 'points' : 'puntos'}`}>
                    {s.allocation.map((pts, i) => (
                      <span key={i} className="home-strat__pts"><span className="t-data">{pts}</span><span className="t-label">pts</span></span>
                    ))}
                  </div>
                  <p className="t-body">{isEn ? STRATEGY_COPY[s.id].en : STRATEGY_COPY[s.id].es}</p>
                  <p className="t-meta">{s.maxPicks === 1 ? (isEn ? '1 horse' : '1 caballo') : `${s.maxPicks} ${isEn ? 'horses' : 'caballos'}`}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================== HOW IT WORKS */}
      <section className="home-section" id="como-funciona" aria-labelledby="home-how">
        <div className="ui-container">
          <SectionHeader eyebrow={isEn ? 'Your path' : 'Tu camino'} title={<span id="home-how">{isEn ? 'How it works' : 'Cómo funciona'}</span>} accent="aqua" />
          <ol className="home-steps">
            {[
              { icon: UserRound, es: ['Alias', 'Entra como invitado, sin registro.'], en: ['Alias', 'Join as a guest, no sign-up.'] },
              { icon: Ticket, es: ['Boleto', 'Elige uno de tus 3 boletos.'], en: ['Ticket', 'Pick one of your 3 tickets.'] },
              { icon: Flag, es: ['7 carreras', 'Estrategia y caballos en cada carrera.'], en: ['7 races', 'Strategy and horses in every race.'] },
              { icon: ClipboardCheck, es: ['Confirma', 'Revisa y confirma tu boleto.'], en: ['Confirm', 'Review and confirm your ticket.'] },
              { icon: Trophy, es: ['Ranking', 'Suma puntos con cada ganador.'], en: ['Ranking', 'Score with every winner.'] },
            ].map((s, i) => {
              const [title, text] = isEn ? s.en : s.es;
              const Icon = s.icon;
              return (
                <li key={title} className="home-step">
                  <span className="home-step__num t-data">{i + 1}</span>
                  <span className="home-step__icon" aria-hidden><Icon size={24} /></span>
                  <span className="t-card home-step__title">{title}</span>
                  <span className="t-meta home-step__text">{text}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ======================================================= FIXED DIVIDEND */}
      <section className="home-section" aria-labelledby="home-div">
        <div className="ui-container">
          <div className="home-div ui-emerald" data-accent="green">
            <div className="home-div__copy">
              <p className="t-eyebrow">{isEn ? 'Fixed dividend' : 'Dividendo fijo'}</p>
              <h2 id="home-div" className="t-section">{isEn ? 'Know the value before you pick' : 'Conoce el valor antes de elegir'}</h2>
              <p className="t-body">
                {isEn
                  ? 'Every runner has a MY50 fixed dividend for the tournament. If your horse wins, its points are multiplied by it.'
                  : 'Cada caballo tiene un dividendo fijo MY50 para el torneo. Si tu caballo gana, sus puntos se multiplican por él.'}
              </p>
            </div>
            <div className="home-div__formula" aria-label={isEn ? 'points times fixed dividend' : 'puntos por dividendo fijo'}>
              <span className="home-div__term"><span className="t-data">50</span><span className="t-label">{isEn ? 'points' : 'puntos'}</span></span>
              <span className="home-div__op" aria-hidden>×</span>
              <span className="home-div__term home-div__term--gold"><Gem size={26} aria-hidden /><span className="t-label">{isEn ? 'fixed dividend' : 'dividendo fijo'}</span></span>
              <span className="home-div__op" aria-hidden>=</span>
              <span className="home-div__term"><Trophy size={26} aria-hidden /><span className="t-label">{isEn ? 'your score' : 'tu puntuación'}</span></span>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================= RANKING PREVIEW */}
      {leaders.length ? (
        <section className="home-section home-last" aria-labelledby="home-rank">
          <div className="ui-container">
            <SectionHeader
              eyebrow={isEn ? 'All-time' : 'Histórico'}
              title={<span id="home-rank">{isEn ? 'Top of the table' : 'Lo más alto de la tabla'}</span>}
              accent="gold"
              actions={<Link href="/leaderboard" className="ui-btn ui-btn--secondary ui-btn--sm">{isEn ? 'Full ranking' : 'Ranking completo'} <ArrowRight size={16} aria-hidden /></Link>}
            />
            <ol className="home-podium">
              {leaders.map((p, i) => (
                <li key={p.userId || i} className={`home-podium__item home-podium__item--${i + 1} ${i === 0 ? 'ui-gold-metal' : 'ui-metal'}`}>
                  <span className="home-podium__pos t-data">{i + 1}</span>
                  <span className="home-podium__avatar" style={{ '--av': p.avatarColor || 'var(--my50-purple-core)' }} aria-hidden>{String(p.username || '?').slice(0, 1).toUpperCase()}</span>
                  <span className="home-podium__name">{p.username}</span>
                  <span className="home-podium__pts t-data">{Number(p.totalPoints || 0).toLocaleString(isEn ? 'en-GB' : 'es-ES')}<span className="t-label"> pts</span></span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : <div className="home-last" aria-hidden />}
    </div>
  );
}
