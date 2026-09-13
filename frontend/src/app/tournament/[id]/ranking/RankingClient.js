'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import ModalityScope from '@/frontend/components/modalities/ModalityScope';
import { readPersistedModality, resolveActiveModality } from '@/frontend/lib/gameModalities';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Trophy, Activity, MessageCircle, Info,
  MapPin, Calendar, Users, Zap,
} from 'lucide-react';
import Link from 'next/link';
import { fetchJson } from '@/frontend/lib/api/client';
import { mapTournamentLeaderboard } from '@/frontend/lib/api/mappers';
import { useAuth } from '@/frontend/contexts/AuthContext';
import { useAchievementCards } from '@/frontend/contexts/AchievementCardsContext';
import { useRankingUpdates } from '@/frontend/contexts/RankingUpdatesContext';
import FloatingTicketBar from '@/frontend/components/tournament/FloatingTicketBar';
import AppPageHeader from '@/frontend/components/layout/AppPageHeader';
import TournamentRanking from '@/frontend/components/tournament/TournamentRanking';
import RealTimeRanking from '@/frontend/components/tournament/RealTimeRanking';
import TournamentChat from '@/frontend/components/tournament/TournamentChat';

const tabs = [
  { id: 'ranking', label: 'Ranking', icon: Trophy },
  { id: 'live', label: 'En Vivo', icon: Activity },
  { id: 'chat', label: 'Chat', icon: MessageCircle },
];

export default function RankingClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const modalityId = resolveActiveModality({
    searchModality: searchParams.get('modality'),
    user,
    persisted: readPersistedModality(),
  });
  const { tryAwardTournament } = useAchievementCards();
  const { checkGlobalRank, checkTournamentRank } = useRankingUpdates();
  const [tournament, setTournament] = useState(null);
  const [rankingData, setRankingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ranking');
  const [activeTicketIndex, setActiveTicketIndex] = useState(0);

  const loadRanking = useCallback(async () => {
    const slug = params.id;
    if (!slug) return;

    try {
      const [tournamentRes, lbRes] = await Promise.all([
        fetchJson(`/tournaments/${slug}`),
        fetchJson(`/tournaments/${slug}/leaderboard`),
      ]);
      setTournament(tournamentRes.tournament);
      const mapped = mapTournamentLeaderboard(
        lbRes.leaderboard || [],
        user?.id,
        lbRes.ticketEntries || lbRes.leaderboard
      );
      setRankingData(mapped);

      if (user?.id) {
        const me = (lbRes.leaderboard || []).find((e) => e.userId === user.id);
        if (me?.rankChange > 0) {
          checkTournamentRank(me, {
            racesWithGain: 2,
            tournamentName: lbRes.tournamentName || tournamentRes.tournament?.name,
          });
        } else if (me?.rank) {
          checkGlobalRank(me.rank, { racesWithGain: 2 });
        }
      }
    } catch {
      setTournament(null);
      setRankingData(null);
    } finally {
      setLoading(false);
    }
  }, [params.id, user?.id, checkGlobalRank, checkTournamentRank]);

  useEffect(() => {
    setLoading(true);
    loadRanking();
    const id = setInterval(loadRanking, 12000);
    return () => clearInterval(id);
  }, [loadRanking]);

  useEffect(() => {
    if (!tournament || !rankingData || !user?.id) return;
    const done = tournament.status === 'completed' || tournament.status === 'live';
    if (!done) return;
    tryAwardTournament(tournament, rankingData);
  }, [tournament, rankingData, user?.id, tryAwardTournament]);

  const statusConfig = {
    live: { label: 'EN VIVO', color: 'bg-red-500', glow: 'shadow-[0_0_20px_rgba(239,68,68,0.5)]' },
    upcoming: { label: 'PROXIMO', color: 'bg-purple', glow: 'shadow-[0_0_20px_rgba(124,58,237,0.3)]' },
    open: { label: 'ABIERTO', color: 'bg-green-500', glow: '' },
    completed: { label: 'COMPLETADO', color: 'bg-white/20', glow: '' },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-white/40 animate-pulse">Loading ranking...</div>
      </div>
    );
  }

  if (!tournament || !rankingData) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🏇</div>
          <p className="text-white/40">Torneo no encontrado</p>
          <Link href="/tournaments" className="text-purple-light text-sm mt-2 inline-block hover:underline">
            Volver a Torneos
          </Link>
        </div>
      </div>
    );
  }

  const status = statusConfig[tournament.status] || statusConfig.upcoming;

  return (
    <ModalityScope modalityId={modalityId}>
    <div className="min-h-screen">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src="/images/live-feed.jpg" alt="" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-dark/60 via-brand-dark/90 to-brand-dark" />
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-purple/5 rounded-full blur-[100px]" />

        <div className="relative app-page pt-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <Link
              href={`/tournament/${tournament.slug}`}
              className="inline-flex items-center gap-1 text-white/40 hover:text-white/70 text-sm transition-colors"
            >
              <ChevronLeft size={16} />
              <span>Carreras</span>
            </Link>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white ${status.color} ${status.glow}`}>
              {tournament.status === 'live' && (
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse-live" />
              )}
              {status.label}
            </span>
          </div>

          <AppPageHeader title={tournament.name} className="mb-2" />
          <div className="flex items-center gap-3 text-xs text-white/40">
            <span className="flex items-center gap-1"><MapPin size={10} />{tournament.location}</span>
            <span className="flex items-center gap-1"><Calendar size={10} />{tournament.track}</span>
            <span className="flex items-center gap-1"><Users size={10} />{rankingData.totalParticipants}</span>
          </div>
        </div>
      </div>

      <div className="app-page pb-28">
        <div className="flex gap-1 p-1 bg-white/[0.03] border border-white/10 rounded-xl mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-purple text-white'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'ranking' && (
            <motion.div key="ranking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <TournamentRanking data={rankingData} />
            </motion.div>
          )}
          {activeTab === 'live' && (
            <motion.div key="live" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <RealTimeRanking data={rankingData} />
            </motion.div>
          )}
          {activeTab === 'chat' && (
            <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <TournamentChat />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <FloatingTicketBar
        tickets={rankingData.userTickets}
        activeIndex={activeTicketIndex}
        onSelect={setActiveTicketIndex}
      />
    </div>
    </ModalityScope>
  );
}
