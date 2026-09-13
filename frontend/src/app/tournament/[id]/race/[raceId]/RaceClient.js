'use client';

import { useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ChevronLeft, MapPin, Clock, Trophy, Zap, Users,
} from 'lucide-react';
import Link from 'next/link';
import { getTournamentById, getRaceById } from '@/frontend/lib/data/raceData';
import RaceCard from '@/frontend/components/tournament/RaceCard';
import PickSelector, { strategies } from '@/frontend/components/tournament/PickSelector';
import TicketSummary from '@/frontend/components/tournament/TicketSummary';
import TicketConfirmation from '@/frontend/components/tournament/TicketConfirmation';
import AppPageHeader from '@/frontend/components/layout/AppPageHeader';

export default function RaceClient() {
  const params = useParams();
  const router = useRouter();
  const tournament = useMemo(() => getTournamentById(params.id), [params.id]);
  const race = useMemo(() => getRaceById(params.id, params.raceId), [params.id, params.raceId]);

  const [activeStrategy, setActiveStrategy] = useState('full');
  const [selectedHorses, setSelectedHorses] = useState([]);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const strategy = strategies.find((s) => s.id === activeStrategy);
  const totalPointsRemaining = 50 - (strategy?.allocation?.slice(0, selectedHorses.length).reduce((s, v) => s + v, 0) || 0);
  const isPicksComplete = selectedHorses.length === (strategy?.maxPicks || 1);

  const handlePickHorse = useCallback((horseId) => {
    setSelectedHorses((prev) => {
      if (prev.includes(horseId)) {
        return prev.filter((id) => id !== horseId);
      }
      const maxPicks = strategies.find((s) => s.id === activeStrategy)?.maxPicks || 1;
      if (prev.length >= maxPicks) return prev;
      return [...prev, horseId];
    });
  }, [activeStrategy]);

  const handleStrategyChange = useCallback((strategyId) => {
    setActiveStrategy(strategyId);
    setSelectedHorses([]);
  }, []);

  const handleConfirm = useCallback(() => {
    setShowConfirmation(true);
  }, []);

  const handleCloseConfirmation = useCallback(() => {
    setShowConfirmation(false);
    // Navigate to next race if available
    if (tournament && race) {
      const currentIndex = tournament.races.findIndex((r) => r.id === race.id);
      if (currentIndex < tournament.races.length - 1) {
        const nextRace = tournament.races[currentIndex + 1];
        setSelectedHorses([]);
        router.push(`/tournament/${tournament.id}/race/${nextRace.id}`);
      } else {
        router.push(`/tournament/${tournament.id}`);
      }
    }
  }, [tournament, race, router]);

  // Find adjacent races for navigation
  const raceIndex = tournament?.races.findIndex((r) => r.id === race?.id) ?? -1;
  const prevRace = raceIndex > 0 ? tournament.races[raceIndex - 1] : null;
  const nextRace = raceIndex < (tournament?.races.length || 0) - 1 ? tournament.races[raceIndex + 1] : null;

  if (!tournament || !race) {
    return (
      <div className="min-h-screen bg-[#161b30] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🏇</div>
          <p className="text-white/40 mb-2">Carrera no encontrada</p>
          <Link href="/" className="text-purple-light text-sm hover:underline">
            Volver al Inicio
          </Link>
        </div>
      </div>
    );
  }

  const surfaceColors = {
    Dirt: 'text-amber-400 bg-amber-400/10',
    Turf: 'text-green-400 bg-green-400/10',
    Synthetic: 'text-cyan-400 bg-cyan-400/10',
  };

  const surfaceLabels = {
    Dirt: 'Tierra',
    Turf: 'Cesped',
    Synthetic: 'Sintetico',
  };

  const statusColors = {
    completed: { badge: 'bg-white/10 text-white/50', dot: '', label: 'COMPLETADO' },
    live: { badge: 'bg-red-500/20 text-red-400', dot: 'bg-red-400 animate-pulse-live', label: 'EN VIVO' },
    upcoming: { badge: 'bg-purple/20 text-purple-light', dot: '', label: 'PROXIMO' },
  };

  return (
    <div className="min-h-screen">
      {/* Top navigation bar */}
      <div className="sticky top-0 z-40 bg-[#161b30]/90 backdrop-blur-xl border-b border-white/5">
        <div className="app-page py-3 flex items-center justify-between">
          <Link
            href={`/tournament/${tournament.id}`}
            className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm transition-colors"
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">{tournament.name}</span>
            <span className="sm:hidden">Volver</span>
          </Link>

          {/* Race navigation */}
          <div className="flex items-center gap-2">
            {prevRace && (
              <Link
                href={`/tournament/${tournament.id}/race/${prevRace.id}`}
                className="px-3 py-1.5 text-xs text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              >
                R{prevRace.number}
              </Link>
            )}
            <span className="px-3 py-1.5 text-xs font-bold text-white bg-purple/20 rounded-lg border border-purple/30">
              R{race.number}
            </span>
            {nextRace && (
              <Link
                href={`/tournament/${tournament.id}/race/${nextRace.id}`}
                className="px-3 py-1.5 text-xs text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              >
                R{nextRace.number}
              </Link>
            )}
          </div>

          <div className="text-xs text-white/30 hidden sm:block">
            {race.horses.length} participantes
          </div>
        </div>
      </div>

      {/* Race Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple/5 via-transparent to-transparent" />
        <div className="relative app-page pt-6 pb-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColors[race.status].badge}`}>
                {statusColors[race.status].dot && (
                  <span className={`w-1.5 h-1.5 rounded-full ${statusColors[race.status].dot}`} />
                )}
                {statusColors[race.status].label}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${surfaceColors[race.surface]}`}>
                {surfaceLabels[race.surface] || race.surface}
              </span>
            </div>

            <AppPageHeader
              title={race.name !== `Race ${race.number}` ? race.name : `CARRERA ${race.number}`}
              className="mb-2"
            />

            <div className="flex flex-wrap items-center gap-4 text-sm text-white/40">
              <div className="flex items-center gap-1.5">
                <MapPin size={13} className="text-cyan" />
                <span>{tournament.track}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap size={13} className="text-purple-light" />
                <span>{race.distance}m</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={13} />
                <span>{race.postTime}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users size={13} />
                <span>{race.horses.length} participantes</span>
              </div>
            </div>

            <p className="text-xs text-white/25 mt-1">{race.class}</p>
          </motion.div>
        </div>
      </div>

      {/* Main content */}
      <div className="app-page pb-32 lg:pb-12">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Left: Race card with picks */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Pick Selector */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/[0.02] border border-white/10 rounded-xl p-4 backdrop-blur-lg"
            >
              <PickSelector
                activeStrategy={activeStrategy}
                onStrategyChange={handleStrategyChange}
                picksCount={selectedHorses.length}
                totalPoints={totalPointsRemaining}
              />
            </motion.div>

            {/* Full race card (always expanded, no header toggle) */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <RaceCard
                race={race}
                activeStrategy={activeStrategy}
                selectedHorses={selectedHorses}
                onPickHorse={handlePickHorse}
                isExpanded={true}
                onToggleExpand={() => {}}
                showHeader={false}
              />
            </motion.div>
          </div>

          {/* Right: Ticket Summary sidebar */}
          <div className="w-full lg:w-[320px] flex-shrink-0">
            <TicketSummary
              raceNumber={race.number}
              activeStrategy={activeStrategy}
              selectedHorses={selectedHorses}
              horses={race.horses}
              totalPoints={totalPointsRemaining}
              onConfirm={handleConfirm}
              isComplete={isPicksComplete}
            />

            {/* Quick race navigation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="hidden lg:block mt-4 bg-white/[0.03] backdrop-blur-lg border border-white/10 rounded-xl p-4"
            >
              <h3 className="text-[10px] text-white/40 uppercase tracking-widest font-medium mb-3">
                Todas las Carreras
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {tournament.races.map((r) => {
                  const isCurrent = r.id === race.id;
                  return (
                    <Link
                      key={r.id}
                      href={`/tournament/${tournament.id}/race/${r.id}`}
                      className={`
                        py-2 rounded-lg text-center text-xs font-bold transition-all
                        ${isCurrent
                          ? 'bg-gradient-to-r from-purple to-purple-light text-white shadow-[0_0_12px_rgba(124,58,237,0.3)]'
                          : r.status === 'completed'
                            ? 'bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/50'
                            : r.status === 'live'
                              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                              : 'bg-white/[0.03] text-white/50 hover:bg-white/10 hover:text-white border border-white/5'
                        }
                      `}
                    >
                      R{r.number}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <TicketConfirmation
        isOpen={showConfirmation}
        onClose={handleCloseConfirmation}
        raceName={race.name}
        raceNumber={race.number}
        activeStrategy={activeStrategy}
        selectedHorses={selectedHorses}
        horses={race.horses}
        tournamentId={tournament.id}
      />
    </div>
  );
}
