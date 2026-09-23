'use client';

/**
 * /tournament/{slug}/ranking — contextual tournament ranking.
 * Podium + standings from GET /tournaments/{slug}/leaderboard (read-only).
 * Polls every 15 s only while the tournament is live.
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Trophy, MessageCircle, ArrowRight } from 'lucide-react';
import ModalityScope from '@/frontend/components/modalities/ModalityScope';
import RankingBoard from '@/frontend/components/ranking/RankingBoard';
import TournamentChat from '@/frontend/components/tournament/TournamentChat';
import { StatusChip, StateBlock } from '@/frontend/components/ui';
import { fetchJson } from '@/frontend/lib/api/client';
import { mapTournamentLeaderboard } from '@/frontend/lib/api/mappers';
import { readPersistedModality, resolveActiveModality, withModalityQuery } from '@/frontend/lib/gameModalities';
import { useAuth } from '@/frontend/contexts/AuthContext';
import { useAchievementCards } from '@/frontend/contexts/AchievementCardsContext';
import { useRankingUpdates } from '@/frontend/contexts/RankingUpdatesContext';
import { useLanguage } from '@/frontend/lib/i18n/LanguageContext';
import { displayStatus, formatDateLong, ART } from '@/frontend/lib/redesign';

export default function RankingClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { language } = useLanguage();
  const isEn = language === 'en';
  const modalityId = resolveActiveModality({ searchModality: searchParams.get('modality'), user, persisted: readPersistedModality() });
  const { tryAwardTournament } = useAchievementCards();
  const { checkGlobalRank, checkTournamentRank } = useRankingUpdates();
  const [tournament, setTournament] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState('ranking');

  const load = useCallback(async () => {
    const slug = params.id;
    if (!slug) return;
    try {
      const [tRes, lbRes] = await Promise.all([
        fetchJson(`/tournaments/${slug}`),
        fetchJson(`/tournaments/${slug}/leaderboard`),
      ]);
      const board = lbRes.leaderboard || [];
      setTournament(tRes.tournament);
      setRows(board);
      setFailed(false);
      if (user?.id) {
        const me = board.find((e) => e.userId === user.id);
        if (me?.rankChange > 0) checkTournamentRank(me, { racesWithGain: 2, tournamentName: lbRes.tournamentName || tRes.tournament?.name });
        else if (me?.rank) checkGlobalRank(me.rank, { racesWithGain: 2 });
      }
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [params.id, user?.id, checkGlobalRank, checkTournamentRank]);

  // Achievement card for a live/finished tournament (unchanged behaviour).
  useEffect(() => {
    if (!tournament || !user?.id || !rows.length) return;
    if (!['completed', 'live'].includes(tournament.status)) return;
    tryAwardTournament(tournament, mapTournamentLeaderboard(rows, user.id, rows));
  }, [tournament, rows, user?.id, tryAwardTournament]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (tournament?.status !== 'live') return undefined;
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [tournament?.status, load]);

  if (loading) {
    return (
      <div className="ui-container ui-page" aria-busy="true">
        <div className="ui-skel" style={{ height: 180 }} />
        <div className="ui-skel" style={{ height: 320, marginTop: 24 }} />
      </div>
    );
  }

  if (failed || !tournament) {
    return (
      <div className="ui-container ui-page">
        <StateBlock title={isEn ? 'Ranking unavailable' : 'Ranking no disponible'}
          actions={<Link href="/leaderboard" className="ui-btn ui-btn--primary">{isEn ? 'Global ranking' : 'Ranking global'}</Link>}>
          {isEn ? 'This tournament ranking could not be loaded.' : 'No se pudo cargar el ranking de este torneo.'}
        </StateBlock>
      </div>
    );
  }

  const status = displayStatus(tournament);
  const tournamentHref = withModalityQuery(`/tournament/${tournament.slug}`, modalityId);
  const boardRows = rows.map((r, idx) => ({
    key: `${r.userId}-${r.ticketNumber ?? idx}`,
    pos: r.rank ?? idx + 1,
    name: r.username || '—',
    color: r.avatarColor,
    sub: r.ticketNumber ? `${isEn ? 'Ticket' : 'Boleto'} ${r.ticketNumber}` : null,
    points: r.totalPoints,
    change: r.rankChange || 0,
    extra: r.racesPlayed != null ? `${r.racesPlayed}/7` : null,
    isMe: user?.id != null && r.userId === user.id,
  }));

  return (
    <ModalityScope modalityId={modalityId}>
      <div className="ui-container ui-page">
        <nav className="ui-crumb" aria-label={isEn ? 'Breadcrumb' : 'Migas de pan'}>
          <Link href={tournamentHref}><ChevronLeft size={16} aria-hidden />{tournament.name}</Link>
        </nav>
        <header className="pg-band" data-accent={status.key === 'live' ? 'live' : 'gold'}>
          <img className="pg-band__art" src={ART.rankingHero} alt="" aria-hidden decoding="async" />
          <div className="pg-band__veil" aria-hidden />
          <div className="pg-band__content">
            <div className="pg-band__chips"><StatusChip tone={status.key}>{isEn ? status.en : status.es}</StatusChip></div>
            <p className="t-eyebrow">{isEn ? 'Tournament ranking' : 'Ranking del torneo'}</p>
            <h1 className="t-page">{tournament.name}</h1>
            <p className="t-body">{[tournament.track, formatDateLong(tournament.date, isEn)].filter(Boolean).join(' · ')}</p>
          </div>
        </header>

        <div className="ui-tabs" role="tablist" aria-label={isEn ? 'Sections' : 'Secciones'}>
          <button type="button" role="tab" aria-selected={tab === 'ranking'} className={`ui-tab${tab === 'ranking' ? ' is-on' : ''}`} onClick={() => setTab('ranking')}>
            <Trophy size={16} aria-hidden />{isEn ? 'Standings' : 'Clasificación'}
          </button>
          <button type="button" role="tab" aria-selected={tab === 'chat'} className={`ui-tab${tab === 'chat' ? ' is-on' : ''}`} onClick={() => setTab('chat')}>
            <MessageCircle size={16} aria-hidden />Chat
          </button>
        </div>

        {tab === 'ranking' ? (
          <RankingBoard
            rows={boardRows}
            isEn={isEn}
            columns={{ extra: isEn ? 'Races' : 'Carreras' }}
            emptyTitle={status.key === 'finished' ? (isEn ? 'No scored tickets' : 'Sin boletos puntuados') : undefined}
            emptyText={status.key === 'upcoming' || status.key === 'today'
              ? isEn ? 'Standings are published once the first race is run.' : 'La clasificación se publica cuando se corra la primera carrera.'
              : undefined}
          />
        ) : (
          <div className="ui-glass rchat"><TournamentChat /></div>
        )}

        <div className="pg-cta">
          <Link href={tournamentHref} className="ui-btn ui-btn--secondary">{isEn ? 'Back to tournament' : 'Volver al torneo'}<ArrowRight size={17} aria-hidden /></Link>
          <Link href="/leaderboard" className="ui-btn ui-btn--ghost">{isEn ? 'Global ranking' : 'Ranking global'}</Link>
        </div>
      </div>
    </ModalityScope>
  );
}
