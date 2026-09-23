'use client';

/**
 * /profile — player summary + "Mis tickets" (?section=tickets) + achievements.
 * Read-only: GET /profile, GET /tickets, GET /tickets/unlocks per tournament.
 * Local drafts on this device are listed separately and never shown as
 * confirmed.
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Ticket, Trophy, Award, LogIn, UserRound, ArrowRight, PenLine, CheckCircle2, LogOut } from 'lucide-react';
import AchievementGallery from '@/frontend/components/profile/AchievementGallery';
import Avatar from '@/frontend/components/ui/Avatar';
import { StateBlock, StatusChip } from '@/frontend/components/ui';
import { useAuth } from '@/frontend/contexts/AuthContext';
import { fetchAuthJson } from '@/frontend/lib/api/client';
import { listDrafts } from '@/frontend/lib/ticketDraft';
import { useLanguage } from '@/frontend/lib/i18n/LanguageContext';
import { SINGLE_GUEST_ENTRY, GUEST_ENTRY_HREF } from '@/frontend/lib/productFlags';
import { formatDateLong } from '@/frontend/lib/redesign';

const SECTIONS = ['summary', 'tickets', 'achievements'];
const STRAT = { full_point: 'Full', dual_point: 'Dual', smart_pick: 'Smart' };

function Stat({ label, value }) {
  return (
    <div className="pstat ui-metal">
      <span className="t-label">{label}</span>
      <span className="t-data pstat__v">{value}</span>
    </div>
  );
}

export default function ProfileClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const isEn = language === 'en';
  const { user, token, loading, logout } = useAuth();
  const raw = searchParams.get('section');
  const section = SECTIONS.includes(raw) ? raw : 'summary';
  const [profile, setProfile] = useState(null);
  const [rows, setRows] = useState(null);
  const [confirmedMap, setConfirmedMap] = useState({});
  const [drafts, setDrafts] = useState([]);

  useEffect(() => {
    if (!token) return undefined;
    let live = true;
    fetchAuthJson('/profile').then((d) => { if (live) setProfile(d); }).catch(() => { if (live) setProfile({}); });
    fetchAuthJson('/tickets')
      .then(async (d) => {
        const list = d?.tickets || [];
        if (!live) return;
        setRows(list);
        const ids = [...new Set(list.map((t) => t.tournamentId).filter(Boolean))].slice(0, 20);
        const pairs = await Promise.all(ids.map((id) =>
          fetchAuthJson(`/tickets/unlocks?tournamentId=${id}`).then((u) => [id, u?.confirmed || {}]).catch(() => [id, {}])));
        if (live) setConfirmedMap(Object.fromEntries(pairs));
      })
      .catch(() => { if (live) setRows([]); });
    return () => { live = false; };
  }, [token]);

  useEffect(() => {
    if (user?.id != null) setDrafts(listDrafts(`u${user.id}`));
  }, [user?.id]);

  // One card per (tournament, ticket number) — the unit that competes.
  const tickets = useMemo(() => {
    const map = new Map();
    for (const t of rows || []) {
      const k = `${t.tournamentId}-${t.ticketNumber}`;
      if (!map.has(k)) {
        map.set(k, { key: k, tournamentId: t.tournamentId, name: t.tournamentName, slug: t.trackSlug, ticketNumber: t.ticketNumber, races: [], points: 0, scored: 0, createdAt: t.createdAt });
      }
      const e = map.get(k);
      e.races.push(t);
      e.points += Number(t.pointsEarned || 0);
      if (t.isScored) e.scored += 1;
    }
    return [...map.values()]
      .map((e) => ({ ...e, confirmed: Boolean(confirmedMap[e.tournamentId]?.[e.ticketNumber] || confirmedMap[e.tournamentId]?.[String(e.ticketNumber)]) }))
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }, [rows, confirmedMap]);

  const go = (s) => router.replace(s === 'summary' ? '/profile' : `/profile?section=${s}`, { scroll: false });

  if (loading) return <div className="ui-container ui-page"><div className="ui-skel" style={{ height: 260 }} /></div>;

  if (!token) {
    return (
      <div className="ui-container ui-container--narrow ui-page">
        <header className="ui-pagehead">
          <p className="t-eyebrow" data-accent="aqua">MY 50 POINTS</p>
          <h1 className="t-page">{isEn ? 'Profile' : 'Perfil'}</h1>
        </header>
        <StateBlock icon={UserRound} title={isEn ? 'Your tickets and points' : 'Tus boletos y puntos'} accent={SINGLE_GUEST_ENTRY ? 'm4' : 'm2'}
          actions={
            SINGLE_GUEST_ENTRY ? (
              <Link href={`${GUEST_ENTRY_HREF}?next=${encodeURIComponent(`/profile${raw ? `?section=${raw}` : ''}`)}`} className="ui-btn ui-btn--primary">{isEn ? 'Play as guest' : 'Jugar como invitado'}</Link>
            ) : (
              <>
                <Link href={`/login?next=${encodeURIComponent(`/profile${raw ? `?section=${raw}` : ''}`)}`} className="ui-btn ui-btn--primary"><LogIn size={17} aria-hidden />{isEn ? 'Sign in' : 'Iniciar sesión'}</Link>
                <Link href="/modalidades/guest?next=%2Fprofile" className="ui-btn ui-btn--secondary">{isEn ? 'Play as guest' : 'Jugar como invitado'}</Link>
              </>
            )
          }>
          {SINGLE_GUEST_ENTRY
            ? (isEn ? 'Play as a guest to see your tickets, points and achievements here.' : 'Juega como invitado para ver aquí tus boletos, puntos y logros.')
            : isEn ? 'Sign in or play as a guest to see your tickets, points and achievements.' : 'Inicia sesión o juega como invitado para ver tus boletos, puntos y logros.'}
        </StateBlock>
      </div>
    );
  }

  const stats = profile?.user?.stats || {};
  const name = profile?.user?.username || user?.username || '—';

  return (
    <div className="ui-container ui-page">
      <header className="phead ui-glass" data-accent={user?.isGuest ? 'm4' : 'm2'}>
        <Avatar name={name} color={profile?.user?.avatarColor} size={84} className="phead__avatar" />
        <div className="phead__id">
          <p className="t-eyebrow">{user?.isGuest ? (isEn ? 'Guest · Mode 4' : 'Invitado · Modalidad 4') : isEn ? 'Registered · Mode 2' : 'Registrado · Modalidad 2'}</p>
          <h1 className="t-page">{name}</h1>
          {profile?.user?.globalRank ? <p className="t-meta">{isEn ? 'Global rank' : 'Posición global'} <strong className="t-num">#{profile.user.globalRank}</strong></p> : null}
        </div>
        <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm phead__out" onClick={() => { logout(); router.push('/'); }}>
          <LogOut size={16} aria-hidden />{isEn ? 'Sign out' : 'Cerrar sesión'}
        </button>
      </header>

      <div className="ui-tabs" role="tablist" aria-label={isEn ? 'Profile sections' : 'Secciones del perfil'}>
        {[
          ['summary', Trophy, isEn ? 'Summary' : 'Resumen'],
          ['tickets', Ticket, isEn ? 'My tickets' : 'Mis tickets'],
          ['achievements', Award, isEn ? 'Achievements' : 'Logros'],
        ].map(([id, Icon, label]) => (
          <button key={id} type="button" role="tab" aria-selected={section === id} className={`ui-tab${section === id ? ' is-on' : ''}`} onClick={() => go(id)}>
            <Icon size={16} aria-hidden />{label}
          </button>
        ))}
      </div>

      {section === 'summary' ? (
        <>
          <div className="ui-grid--4 pstats">
            <Stat label={isEn ? 'Points' : 'Puntos'} value={Number(stats.totalPoints || 0).toLocaleString(isEn ? 'en-GB' : 'es-ES')} />
            <Stat label={isEn ? 'Tournaments' : 'Torneos'} value={stats.tournamentsPlayed ?? 0} />
            <Stat label={isEn ? 'Races played' : 'Carreras jugadas'} value={stats.totalRaces ?? 0} />
            <Stat label={isEn ? 'Win rate' : 'Acierto'} value={`${Math.round(Number(stats.winRate || 0))}%`} />
          </div>
          <section className="trn-section" aria-labelledby="p-recent">
            <div className="trn-section__head">
              <h2 id="p-recent" className="t-section">{isEn ? 'Recent tournaments' : 'Torneos recientes'}</h2>
              <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" onClick={() => go('tickets')}>{isEn ? 'My tickets' : 'Mis tickets'}<ArrowRight size={16} aria-hidden /></button>
            </div>
            {(profile?.tournamentSummaries || []).length ? (
              <ul className="plist">
                {profile.tournamentSummaries.slice(0, 6).map((t) => (
                  <li key={t.tournamentId}>
                    <Link href={t.slug ? `/tournament/${t.slug}` : '/tournaments'} className="plist__row ui-glass ui-hover-lift">
                      <span className="plist__name">{t.name}</span>
                      <span className="t-meta">{t.track}</span>
                      <span className="t-num plist__pts">{Number(t.totalPoints || 0).toLocaleString(isEn ? 'en-GB' : 'es-ES')} pts</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="t-meta">{isEn ? 'You have not played a tournament yet.' : 'Todavía no has jugado ningún torneo.'} <Link href="/tournaments">{isEn ? 'See tournaments' : 'Ver torneos'}</Link></p>
            )}
          </section>
        </>
      ) : null}

      {section === 'tickets' ? (
        <section aria-label={isEn ? 'My tickets' : 'Mis tickets'}>
          {drafts.length ? (
            <div className="trn-section">
              <h2 className="t-section">{isEn ? 'In progress on this device' : 'En progreso en este dispositivo'}</h2>
              <p className="t-meta">{isEn ? 'Drafts are not registered until you confirm them.' : 'Los borradores no quedan registrados hasta que los confirmes.'}</p>
              <ul className="plist">
                {drafts.map((d) => (
                  <li key={`${d.tournamentId}-${d.ticketNumber}`}>
                    <Link href={d.meta?.slug ? `/tournament/${d.meta.slug}?ticket=${d.ticketNumber}` : '/tournaments'} className="plist__row ui-glass ui-hover-lift">
                      <span className="plist__name">{d.meta?.name || (isEn ? 'Tournament' : 'Torneo')} · {isEn ? 'Ticket' : 'Boleto'} {d.ticketNumber}</span>
                      <StatusChip tone="progress" icon={false}><PenLine size={13} aria-hidden />{d.saved}/7 {isEn ? 'saved' : 'guardadas'}</StatusChip>
                      <span className="plist__go">{isEn ? 'Continue' : 'Continuar'}<ArrowRight size={16} aria-hidden /></span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="trn-section">
            <h2 className="t-section">{isEn ? 'Registered tickets' : 'Boletos registrados'}</h2>
            {rows === null ? <div className="ui-skel" style={{ height: 180 }} /> : tickets.length ? (
              <ul className="tlist">
                {tickets.map((t) => (
                  <li key={t.key} className="tlist__item ui-glass">
                    <div className="tlist__head">
                      <div>
                        <p className="t-label">{isEn ? 'Ticket' : 'Boleto'} {t.ticketNumber}</p>
                        <h3 className="t-card">{t.name}</h3>
                        {t.createdAt ? <p className="t-meta">{formatDateLong(t.createdAt, isEn)}</p> : null}
                      </div>
                      {t.confirmed
                        ? <StatusChip tone="confirmed" icon={false}><CheckCircle2 size={13} aria-hidden />{isEn ? 'Confirmed' : 'Confirmado'}</StatusChip>
                        : <StatusChip tone="pending" icon={false}>{isEn ? 'Not confirmed' : 'Sin confirmar'}</StatusChip>}
                    </div>
                    <ol className="tlist__races">
                      {t.races.slice().sort((a, b) => (a.raceNumber || 0) - (b.raceNumber || 0)).map((r, i) => (
                        <li key={r.id} className="tlist__race" data-won={r.isScored && r.pointsEarned > 0 ? 'yes' : undefined}>
                          <span className="t-label">{isEn ? 'R' : 'C'}{i + 1}</span>
                          <span className="tlist__strat">{STRAT[r.strategy] || '—'}</span>
                          <span className="t-num">{r.isScored ? r.pointsEarned : '—'}</span>
                        </li>
                      ))}
                    </ol>
                    <div className="tlist__foot">
                      <span className="t-num tlist__pts">{t.points.toLocaleString(isEn ? 'en-GB' : 'es-ES')} pts</span>
                      <span className="t-meta">{t.scored}/7 {isEn ? 'scored' : 'puntuadas'}</span>
                      {t.slug ? <Link href={`/tournament/${t.slug}?ticket=${t.ticketNumber}`} className="ui-btn ui-btn--secondary ui-btn--sm">{isEn ? 'View' : 'Ver'}<ArrowRight size={15} aria-hidden /></Link> : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <StateBlock icon={Ticket} title={isEn ? 'No tickets yet' : 'Aún no tienes boletos'}
                actions={<Link href="/tournaments" className="ui-btn ui-btn--primary">{isEn ? 'See tournaments' : 'Ver torneos'}</Link>}>
                {isEn ? 'Build your first ticket: 7 races, 50 points per race.' : 'Crea tu primer boleto: 7 carreras, 50 puntos por carrera.'}
              </StateBlock>
            )}
          </div>
        </section>
      ) : null}

      {section === 'achievements' ? (
        <section className="trn-section ui-glass pach">
          <AchievementGallery userId={user?.id} cardsFromApi={profile?.achievementCards} canOpenCards />
        </section>
      ) : null}
    </div>
  );
}
