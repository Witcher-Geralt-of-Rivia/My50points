'use client';

/**
 * Flagship home (/). Canonical experience — /landing and /comenzar redirect
 * here. Real data only: tournaments from /tournaments?for_home=1 (server) and
 * the public leaderboard; examples are labelled as examples.
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, PlayCircle, Layers, Ticket, Flag, ClipboardCheck, Trophy, Sparkles,
  Crown, UserRound, Lock, Gem, ChevronRight,
} from 'lucide-react';
import { useLanguage } from '@/frontend/lib/i18n/LanguageContext';
import { useAuth } from '@/frontend/contexts/AuthContext';
import { useModality } from '@/frontend/contexts/ModalityContext';
import { fetchJson } from '@/frontend/lib/api/client';
import { strategies } from '@/frontend/components/tournament/PickSelector';
import TournamentCard from '@/frontend/components/tournaments/TournamentCard';
import { StatusChip, StateBlock, Countdown, SectionHeader } from '@/frontend/components/ui';
import { ART, displayStatus, firstPostTime, formatDateLong, formatTime } from '@/frontend/lib/redesign';
import { withModalityQuery } from '@/frontend/lib/gameModalities';

const STRATEGY_ART = { full: ART.jockeyPurple, dual: ART.jockeyCyan, smart: ART.jockeyGold };
const STRATEGY_ACCENT = { full: 'm1', dual: 'm2', smart: 'm3' };
const STRATEGY_COPY = {
  full: { es: 'Todo a un caballo. Máximo riesgo, máxima recompensa.', en: 'Everything on one horse. Maximum risk, maximum reward.' },
  dual: { es: 'Dos caballos, dos oportunidades de ganar la carrera.', en: 'Two horses, two chances to win the race.' },
  smart: { es: 'Reparte con criterio entre tres caballos.', en: 'Spread your conviction across three horses.' },
};

const TABS = [
  { id: 'today', es: 'Hoy', en: 'Today' },
  { id: 'live', es: 'En vivo', en: 'Live' },
  { id: 'upcoming', es: 'Próximos', en: 'Upcoming' },
  { id: 'finished', es: 'Finalizados', en: 'Finished' },
];

function useEnterHref(modalityId) {
  const { isAuthenticated, user } = useAuth();
  // Entering a tournament does not require an account; the gated action
  // (building a ticket) asks for sign-in / guest at that moment.
  return (slug) => withModalityQuery(`/tournament/${encodeURIComponent(slug)}`, user?.isGuest ? 'guest' : isAuthenticated ? modalityId || 'free' : modalityId);
}

export default function HomeExperience({ initialTournaments = [] }) {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const { isAuthenticated, user } = useAuth();
  const { activeModalityId } = useModality();
  const enterHref = useEnterHref(activeModalityId);
  const [tab, setTab] = useState(null);
  const [leaders, setLeaders] = useState([]);

  const tournaments = useMemo(() => (Array.isArray(initialTournaments) ? initialTournaments : []), [initialTournaments]);
  const buckets = useMemo(() => {
    const b = { today: [], live: [], upcoming: [], finished: [] };
    for (const t of tournaments) {
      const k = displayStatus(t).key;
      if (k === 'archived') b.finished.push(t);
      else if (b[k]) b[k].push(t);
    }
    return b;
  }, [tournaments]);
  const activeTab = tab || TABS.find((t) => buckets[t.id].length)?.id || 'today';

  // Featured: live first, then today, then the next upcoming.
  const featured = buckets.live[0] || buckets.today[0] || buckets.upcoming[0] || null;
  const featuredStatus = featured ? displayStatus(featured) : null;
  const featuredFirst = featured ? firstPostTime(featured) : null;

  useEffect(() => {
    let live = true;
    fetchJson('/leaderboard?limit=3', { timeoutMs: 15000 })
      .then((d) => { if (live) setLeaders(Array.isArray(d?.legends) ? d.legends.slice(0, 3) : []); })
      .catch(() => { if (live) setLeaders([]); });
    return () => { live = false; };
  }, []);

  const primaryHref = featured?.slug ? enterHref(featured.slug) : '/tournaments';
  const m2Href = isAuthenticated && !user?.isGuest ? '/modalidades/free' : '/login?modality=free&next=%2Fmodalidades%2Ffree';

  return (
    <div className="home">
      {/* =============================================================== HERO */}
      <section className="home-hero" aria-labelledby="home-title">
        <picture className="home-hero__art" aria-hidden>
          <source media="(max-width: 639px)" srcSet={ART.heroPortrait} />
          <source media="(max-width: 1279px)" srcSet={ART.hero1280} />
          <img src={ART.hero1920} alt="" fetchPriority="high" decoding="async" />
        </picture>
        <div className="home-hero__veil" aria-hidden />
        <div className="ui-container ui-container--wide home-hero__inner">
          <div className="home-hero__copy">
            <p className="t-eyebrow" data-accent="aqua">{isEn ? 'Official tournament · 7 races' : 'Torneo oficial · 7 carreras'}</p>
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
              {isEn
                ? 'Split 50 points on every one of the tournament’s 7 races. When your horse wins, its fixed dividend multiplies your points — climb the live ranking race by race.'
                : 'Reparte 50 puntos en cada una de las 7 carreras del torneo. Si tu caballo gana, su dividendo fijo multiplica tus puntos: escala el ranking en vivo carrera a carrera.'}
            </p>
            <div className="home-hero__ctas">
              <Link href={primaryHref} className="ui-btn ui-btn--primary ui-btn--lg">
                {isEn ? 'Play now' : 'Jugar ahora'}
                <ArrowRight size={20} aria-hidden />
              </Link>
              <a href="#como-funciona" className="ui-btn ui-btn--secondary ui-btn--lg">
                <PlayCircle size={20} aria-hidden />
                {isEn ? 'How it works' : 'Cómo funciona'}
              </a>
            </div>
          </div>

          <aside className="home-hero__status ui-glass ui-edge" data-accent={featuredStatus?.key === 'live' ? 'live' : 'aqua'} aria-label={isEn ? 'Next tournament' : 'Próximo torneo'}>
            {featured ? (
              <>
                <div className="home-hero__status-top">
                  <StatusChip tone={featuredStatus.key}>{isEn ? featuredStatus.en : featuredStatus.es}</StatusChip>
                  <span className="t-meta">{formatDateLong(featuredFirst || featured.date, isEn)}</span>
                </div>
                <p className="t-label home-hero__status-track">{featured.track}</p>
                <p className="t-card home-hero__status-name">{featured.name}</p>
                {featuredStatus.key !== 'live' && featuredFirst ? (
                  <>
                    <p className="t-meta">{isEn ? 'First post' : 'Primera salida'} · {formatTime(featuredFirst, isEn)}</p>
                    <Countdown target={featuredFirst} isEn={isEn} compact />
                  </>
                ) : (
                  <p className="t-meta">{isEn ? 'Races are running now.' : 'Las carreras están en curso.'}</p>
                )}
                <Link href={enterHref(featured.slug)} className="ui-btn ui-btn--aqua ui-btn--block">
                  {isEn ? 'Open tournament' : 'Abrir torneo'} <ChevronRight size={18} aria-hidden />
                </Link>
              </>
            ) : (
              <>
                <p className="t-label home-hero__status-track">{isEn ? 'Tournaments' : 'Torneos'}</p>
                <p className="t-card home-hero__status-name">{isEn ? 'No tournament scheduled right now' : 'Ahora no hay torneos programados'}</p>
                <p className="t-meta">{isEn ? 'New racecards are published every racing day.' : 'Cada jornada de carreras se publican nuevos torneos.'}</p>
                <Link href="/tournaments" className="ui-btn ui-btn--secondary ui-btn--block">{isEn ? 'See all tournaments' : 'Ver todos los torneos'}</Link>
              </>
            )}
          </aside>
        </div>
        <div className="home-hero__rail" aria-hidden><span /><span /><span /></div>
      </section>

      {/* ============================================================ STRATEGY */}
      <section className="home-section" aria-labelledby="home-strategy">
        <div className="ui-container">
          <SectionHeader
            eyebrow={isEn ? 'Three ways to play every race' : 'Tres formas de jugar cada carrera'}
            title={<span id="home-strategy">{isEn ? 'Choose your strategy' : 'Elige tu estrategia'}</span>}
            accent="m1"
          >
            {isEn
              ? 'In each race you distribute exactly 50 points. Every slot scores only if that horse wins.'
              : 'En cada carrera repartes exactamente 50 puntos. Cada asignación puntúa solo si ese caballo gana.'}
          </SectionHeader>
          <div className="ui-grid ui-grid--3 home-strats">
            {strategies.map((s) => (
              <article key={s.id} className="home-strat ui-metal ui-edge ui-hover-lift" data-accent={STRATEGY_ACCENT[s.id]}>
                <div className="home-strat__art" aria-hidden><img src={STRATEGY_ART[s.id]} alt="" loading="lazy" decoding="async" /></div>
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
              { icon: Layers, es: ['Modalidad', 'Regístrate gratis o juega como invitado.'], en: ['Game mode', 'Sign up free or play as a guest.'] },
              { icon: Ticket, es: ['Boleto', '3 boletos gratis por torneo; cada uno compite por separado.'], en: ['Ticket', '3 free tickets per tournament, each competing separately.'] },
              { icon: Flag, es: ['7 carreras', 'Elige estrategia y caballos en cada carrera.'], en: ['7 races', 'Pick a strategy and horses in every race.'] },
              { icon: ClipboardCheck, es: ['Revisión', 'Revisa las 7 carreras y confirma tu boleto.'], en: ['Review', 'Check all 7 races and confirm your ticket.'] },
              { icon: Trophy, es: ['Ranking', 'Suma puntos con cada ganador y sube en vivo.'], en: ['Ranking', 'Score with every winner and climb live.'] },
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

      {/* ======================================================= DISCOVERY */}
      <section className="home-section" aria-labelledby="home-tournaments">
        <div className="ui-container ui-container--wide">
          <SectionHeader
            eyebrow={isEn ? 'Racing calendar' : 'Calendario de carreras'}
            title={<span id="home-tournaments">{isEn ? 'Tournaments' : 'Torneos'}</span>}
            accent="aqua"
            actions={<Link href="/tournaments" className="ui-btn ui-btn--secondary ui-btn--sm">{isEn ? 'All tournaments' : 'Todos los torneos'} <ArrowRight size={16} aria-hidden /></Link>}
          />
          <div className="ui-tabs" role="tablist" aria-label={isEn ? 'Tournament status' : 'Estado del torneo'}>
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={activeTab === t.id}
                className={`ui-tab${activeTab === t.id ? ' is-on' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {isEn ? t.en : t.es}
                <span className="ui-tab__count t-num">{buckets[t.id].length}</span>
              </button>
            ))}
          </div>
          <div role="tabpanel" className="home-tgrid">
            {buckets[activeTab].length ? (
              buckets[activeTab].map((t, i) => <TournamentCard key={t.slug || t.id} tournament={t} isEn={isEn} modalityId={activeModalityId} priority={i < 2} />)
            ) : (
              <StateBlock
                icon={Flag}
                accent="aqua"
                title={isEn ? 'Nothing here right now' : 'Nada por aquí ahora mismo'}
                actions={<Link href="/tournaments" className="ui-btn ui-btn--secondary ui-btn--sm">{isEn ? 'Browse the calendar' : 'Ver el calendario'}</Link>}
              >
                {isEn ? 'Tournaments appear here as soon as the racecards are published.' : 'Los torneos aparecen aquí en cuanto se publican los programas de carreras.'}
              </StateBlock>
            )}
          </div>
        </div>
      </section>

      {/* ======================================================= 7-RACE PREVIEW */}
      <section className="home-section" aria-labelledby="home-ticket">
        <div className="ui-container home-split">
          <div className="home-split__copy">
            <SectionHeader eyebrow={isEn ? 'One ticket · one tournament' : 'Un boleto · un torneo'} title={<span id="home-ticket">{isEn ? 'Seven races, one racing slip' : 'Siete carreras, un boleto'}</span>} accent="m1">
              {isEn
                ? 'Your ticket travels through the tournament’s last seven races. Build it race by race, review it, then confirm it once — that is the moment it enters the competition.'
                : 'Tu boleto recorre las siete últimas carreras del torneo. Constrúyelo carrera a carrera, revísalo y confírmalo una vez: ese es el momento en que entra en la competición.'}
            </SectionHeader>
            <ul className="home-bullets">
              <li><Sparkles size={18} aria-hidden />{isEn ? 'Drafts are saved on your device until you confirm.' : 'Tu borrador se guarda en tu dispositivo hasta que confirmes.'}</li>
              <li><Ticket size={18} aria-hidden />{isEn ? '3 free tickets per tournament, scored independently.' : '3 boletos gratis por torneo, cada uno con su propia puntuación.'}</li>
            </ul>
          </div>
          <div className="home-slip ui-pearl" aria-label={isEn ? 'Example ticket' : 'Boleto de ejemplo'}>
            <div className="home-slip__head">
              <span className="t-label">{isEn ? 'Example' : 'Ejemplo'}</span>
              <span className="home-slip__brand">MY 50 <b>POINTS</b></span>
            </div>
            {['full', 'dual', 'smart', 'full', 'dual', 'smart', 'full'].map((id, i) => {
              const s = strategies.find((x) => x.id === id);
              return (
                <div key={i} className="home-slip__row" data-strategy={id}>
                  <span className="t-label">{isEn ? 'Race' : 'Carrera'} {i + 1}</span>
                  <span className="home-slip__strat">{s.name}</span>
                  <span className="home-slip__alloc t-num">{s.allocation.join(' · ')}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ======================================================= DIVIDENDS */}
      <section className="home-section" aria-labelledby="home-div">
        <div className="ui-container">
          <div className="home-div ui-emerald" data-accent="green">
            <div className="home-div__copy">
              <p className="t-eyebrow">{isEn ? 'Fixed dividends' : 'Dividendos fijos'}</p>
              <h2 id="home-div" className="t-section">{isEn ? 'Know the value before you pick' : 'Conoce el valor antes de elegir'}</h2>
              <p className="t-body">
                {isEn
                  ? 'Each runner carries a MY50 fixed dividend for the tournament. When a horse you picked wins, the points you gave it are multiplied by that dividend. Values are shown on each race once published for the tournament.'
                  : 'Cada caballo tiene un dividendo fijo MY50 para el torneo. Cuando gana un caballo que elegiste, los puntos que le asignaste se multiplican por ese dividendo. Los valores se muestran en cada carrera cuando se publican para el torneo.'}
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
        <section className="home-section" aria-labelledby="home-rank">
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
      ) : null}

      {/* ======================================================= MODALITIES */}
      <section className="home-section" aria-labelledby="home-mod">
        <div className="ui-container ui-container--wide">
          <SectionHeader eyebrow={isEn ? 'Game modes' : 'Modalidades'} title={<span id="home-mod">{isEn ? 'Pick how you compete' : 'Elige cómo competir'}</span>} accent="m1" />
          <div className="ui-grid ui-grid--4 home-mods">
            <article className="home-mod ui-metal" data-accent="m1" data-soon="true">
              <span className="home-mod__tag t-label">{isEn ? 'Mode 1' : 'Modalidad 1'}</span>
              <Crown size={30} aria-hidden className="home-mod__icon" />
              <h3 className="t-card">{isEn ? 'Prize tournament' : 'Torneo con premio'}</h3>
              <p className="t-meta">{isEn ? 'Paid entry with prizes.' : 'Entrada de pago con premios.'}</p>
              <span className="ui-chip" data-tone="locked"><Lock size={13} aria-hidden />{isEn ? 'Coming soon' : 'Próximamente'}</span>
            </article>
            <article className="home-mod ui-metal ui-edge ui-hover-lift" data-accent="m2">
              <span className="home-mod__tag t-label">{isEn ? 'Mode 2' : 'Modalidad 2'}</span>
              <Trophy size={30} aria-hidden className="home-mod__icon" />
              <h3 className="t-card">{isEn ? 'Free tournament' : 'Torneo gratis'}</h3>
              <p className="t-meta">{isEn ? 'Registered players. History, stats and achievements.' : 'Jugadores registrados. Historial, estadísticas y logros.'}</p>
              <Link href={m2Href} className="ui-btn ui-btn--aqua ui-btn--sm">{isAuthenticated && !user?.isGuest ? (isEn ? 'Play' : 'Jugar') : isEn ? 'Sign in' : 'Iniciar sesión'}</Link>
            </article>
            <article className="home-mod ui-metal" data-accent="m3" data-soon="true">
              <span className="home-mod__tag t-label">{isEn ? 'Mode 3' : 'Modalidad 3'}</span>
              <Gem size={30} aria-hidden className="home-mod__icon" />
              <h3 className="t-card">{isEn ? 'Special tournament' : 'Torneo especial'}</h3>
              <p className="t-meta">{isEn ? 'Special events with prizes.' : 'Eventos especiales con premio.'}</p>
              <span className="ui-chip" data-tone="locked"><Lock size={13} aria-hidden />{isEn ? 'Coming soon' : 'Próximamente'}</span>
            </article>
            <article className="home-mod home-mod--m4 ui-pearl ui-hover-lift" data-accent="m4">
              <span className="home-mod__tag t-label">{isEn ? 'Mode 4' : 'Modalidad 4'}</span>
              <UserRound size={30} aria-hidden className="home-mod__icon" />
              <h3 className="t-card">{isEn ? 'Free · no sign-up' : 'Gratis · sin registro'}</h3>
              <p className="t-meta">{isEn ? 'Play with a temporary alias for 12 hours.' : 'Juega con un alias temporal durante 12 horas.'}</p>
              <Link href="/modalidades/guest" className="ui-btn ui-btn--primary ui-btn--sm">{isEn ? 'Play as guest' : 'Jugar como invitado'}</Link>
            </article>
          </div>
        </div>
      </section>

      {/* ======================================================= FINAL CTA */}
      <section className="home-section home-final" aria-labelledby="home-final">
        <div className="ui-container">
          <div className="home-final__card ui-glass ui-edge" data-accent="m1">
            <img className="home-final__art" src={ART.liveStrip} alt="" loading="lazy" decoding="async" aria-hidden />
            <div className="home-final__copy">
              <h2 id="home-final" className="t-page">{isEn ? 'The next race is yours' : 'La próxima carrera es tuya'}</h2>
              <p className="t-body-lg">{isEn ? 'Three free tickets are waiting in every tournament.' : 'En cada torneo te esperan tres boletos gratis.'}</p>
              <div className="home-hero__ctas">
                <Link href={primaryHref} className="ui-btn ui-btn--primary ui-btn--lg">{isEn ? 'Play now' : 'Jugar ahora'} <ArrowRight size={20} aria-hidden /></Link>
                <Link href="/how-to-play" className="ui-btn ui-btn--ghost ui-btn--lg">{isEn ? 'Read the rules' : 'Ver las reglas'}</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
