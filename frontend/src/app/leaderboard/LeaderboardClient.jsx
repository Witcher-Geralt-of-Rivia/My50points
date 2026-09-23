'use client';

/**
 * /leaderboard — global ranking (GET /leaderboard) and per-tournament ranking
 * (GET /tournaments/{slug}/leaderboard) with a selector that includes today's
 * finished tournaments. Read-only; no developer annotations.
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Globe2, Flag, ArrowRight } from 'lucide-react';
import RankingBoard from '@/frontend/components/ranking/RankingBoard';
import { fetchJson } from '@/frontend/lib/api/client';
import { fetchTournamentsList } from '@/frontend/lib/api/tournaments';
import { useAuth } from '@/frontend/contexts/AuthContext';
import { useLanguage } from '@/frontend/lib/i18n/LanguageContext';
import { displayStatus, formatDateLong, ART } from '@/frontend/lib/redesign';

export default function LeaderboardClient() {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialSlug = searchParams.get('tournament');
  const [view, setView] = useState(initialSlug ? 'tournament' : 'global');
  const [globalRows, setGlobalRows] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [slug, setSlug] = useState(initialSlug || '');
  const [tRows, setTRows] = useState(null);

  useEffect(() => {
    let live = true;
    fetchJson('/leaderboard?limit=100', { timeoutMs: 15000 })
      .then((d) => { if (live) setGlobalRows(d?.legends || []); })
      .catch(() => { if (live) setGlobalRows([]); });
    fetchTournamentsList({ forHome: true })
      .then((d) => {
        if (!live) return;
        const list = d?.tournaments || [];
        setTournaments(list);
        setSlug((s) => s || list.find((t) => ['live', 'completed', 'finished'].includes(t.status))?.slug || list[0]?.slug || '');
      })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (view !== 'tournament' || !slug) return undefined;
    let live = true;
    setTRows(null);
    fetchJson(`/tournaments/${slug}/leaderboard`)
      .then((d) => { if (live) setTRows(d?.leaderboard || []); })
      .catch(() => { if (live) setTRows([]); });
    return () => { live = false; };
  }, [view, slug]);

  const gRows = useMemo(() => (globalRows || []).map((r, i) => ({
    key: `g-${r.userId}`,
    pos: r.rank ?? i + 1,
    name: r.username,
    color: r.avatarColor,
    sub: `${r.tournamentsPlayed || 0} ${isEn ? 'tournaments' : 'torneos'}${r.isGuest ? (isEn ? ' · guest' : ' · invitado') : ''}`,
    points: r.totalPoints,
    extra: r.totalRaces != null ? r.totalRaces : null,
    isMe: user?.id != null && r.userId === user.id,
  })), [globalRows, isEn, user?.id]);

  const tBoardRows = useMemo(() => (tRows || []).map((r, i) => ({
    key: `t-${r.userId}-${r.ticketNumber ?? i}`,
    pos: r.rank ?? i + 1,
    name: r.username,
    color: r.avatarColor,
    sub: r.ticketNumber ? `${isEn ? 'Ticket' : 'Boleto'} ${r.ticketNumber}` : null,
    points: r.totalPoints,
    change: r.rankChange || 0,
    extra: r.racesPlayed != null ? `${r.racesPlayed}/7` : null,
    isMe: user?.id != null && r.userId === user.id,
  })), [tRows, isEn, user?.id]);

  const selected = tournaments.find((t) => t.slug === slug);

  return (
    <div className="ui-container ui-page">
      <header className="pg-band" data-accent="gold">
        <img className="pg-band__art" src={ART.rankingHero} alt="" aria-hidden decoding="async" />
        <div className="pg-band__veil" aria-hidden />
        <div className="pg-band__content">
          <p className="t-eyebrow">MY 50 POINTS</p>
          <h1 className="t-page">Ranking</h1>
          <p className="t-body">{isEn ? 'The best strategists across every tournament.' : 'Los mejores estrategas de todos los torneos.'}</p>
        </div>
      </header>

      <div className="ui-tabs" role="tablist" aria-label={isEn ? 'Ranking type' : 'Tipo de ranking'}>
        <button type="button" role="tab" aria-selected={view === 'global'} className={`ui-tab${view === 'global' ? ' is-on' : ''}`} onClick={() => setView('global')}>
          <Globe2 size={16} aria-hidden />Global
        </button>
        <button type="button" role="tab" aria-selected={view === 'tournament'} className={`ui-tab${view === 'tournament' ? ' is-on' : ''}`} onClick={() => setView('tournament')}>
          <Flag size={16} aria-hidden />{isEn ? 'By tournament' : 'Por torneo'}
        </button>
      </div>

      {view === 'global' ? (
        globalRows === null ? <div className="ui-skel" style={{ height: 360 }} /> : (
          <RankingBoard rows={gRows} isEn={isEn} columns={{ extra: isEn ? 'Races' : 'Carreras' }} />
        )
      ) : (
        <>
          <div className="lb-picker">
            <label className="field lb-picker__field">
              <span className="field__label">{isEn ? 'Tournament' : 'Torneo'}</span>
              <select className="field__input" value={slug} onChange={(e) => setSlug(e.target.value)} disabled={!tournaments.length}>
                {!tournaments.length ? <option value="">{isEn ? 'No tournaments' : 'Sin torneos'}</option> : null}
                {tournaments.map((t) => {
                  const st = displayStatus(t);
                  return <option key={t.slug} value={t.slug}>{t.name} · {isEn ? st.en : st.es} · {formatDateLong(t.date, isEn)}</option>;
                })}
              </select>
            </label>
            {selected ? (
              <Link href={`/tournament/${selected.slug}`} className="ui-btn ui-btn--secondary">
                {isEn ? 'Open tournament' : 'Abrir torneo'}<ArrowRight size={17} aria-hidden />
              </Link>
            ) : null}
          </div>
          {tRows === null && slug ? <div className="ui-skel" style={{ height: 360 }} /> : (
            <RankingBoard rows={tBoardRows} isEn={isEn} columns={{ extra: isEn ? 'Races' : 'Carreras' }} />
          )}
        </>
      )}
    </div>
  );
}
