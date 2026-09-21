'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
} from 'lucide-react';
import Link from 'next/link';
import { getTournamentById, getRaceById } from '@/frontend/lib/data/raceData';
import { fetchJson, fetchAuthJson } from '@/frontend/lib/api/client';
import { useAuth } from '@/frontend/contexts/AuthContext';
import RaceCard from '@/frontend/components/tournament/RaceCard';
import { strategies } from '@/frontend/components/tournament/PickSelector';
import TicketSummary from '@/frontend/components/tournament/TicketSummary';
import TicketConfirmation from '@/frontend/components/tournament/TicketConfirmation';

const BACKEND_STRATEGY = { full: 'full_point', dual: 'dual_point', smart: 'smart_pick' };

export default function RaceClient() {
  const params = useParams();
  const router = useRouter();
  const tournament = useMemo(() => getTournamentById(params.id), [params.id]);
  const race = useMemo(() => getRaceById(params.id, params.raceId), [params.id, params.raceId]);

  const [activeStrategy, setActiveStrategy] = useState('full');
  const [selectedHorses, setSelectedHorses] = useState([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [nowTs, setNowTs] = useState(() => Date.now());
  const [shares, setShares] = useState(null);
  const [saveState, setSaveState] = useState({ phase: 'idle', message: '' });
  const { token, ensureGuestSession, playAsGuest } = useAuth();

  // Live clock for the CIERRE EN countdown
  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Community strategy shares — live backend aggregates (global scope)
  useEffect(() => {
    let live = true;
    fetchJson('/statistics/global')
      .then((d) => {
        if (!live) return;
        const usage = d?.strategyUsage || [];
        const pct = (k) => usage.find((s) => s.strategyKey === k)?.percent ?? null;
        setShares({ full: pct('full_point'), dual: pct('dual_point'), smart: pct('smart_pick') });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

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

  const handleConfirm = useCallback(async () => {
    if (!isPicksComplete) return;
    setSaveState({ phase: 'saving', message: '' });
    try {
      // Session (registered or M4 guest) — required to persist the ticket
      const session = await ensureGuestSession();
      if (!session?.token && !token) {
        setSaveState({ phase: 'needs-auth', message: '' });
        return;
      }
      // Resolve the demo sheet against the live backend by track + race number,
      // then map demo picks to real runner ids by post position.
      const data = await fetchJson('/tournaments', { cache: 'no-store' });
      const list = data?.tournaments || [];
      const backendTournament = list.find((t) => t.track === tournament.track);
      if (!backendTournament) {
        throw new Error('Este hipódromo no tiene torneo activo en el backend');
      }
      const detail = await fetchJson(`/tournaments/${backendTournament.slug}`, { cache: 'no-store' });
      const backendRace = (detail?.tournament?.races || []).find((r) => r.raceNumber === race.number);
      if (!backendRace) {
        throw new Error('Esta carrera no existe en el torneo activo del backend');
      }
      const byPost = new Map((backendRace.horses || []).map((h) => [h.postPosition, h.id]));
      const runnerIds = selectedHorses.map((id) => {
        const picked = race.horses.find((h) => h.id === id);
        return picked ? byPost.get(picked.postPosition) : undefined;
      });
      if (runnerIds.some((v) => v == null)) {
        throw new Error('Algún caballo elegido no existe en la carrera oficial');
      }
      await fetchAuthJson('/tickets', {
        method: 'POST',
        body: JSON.stringify({
          raceId: backendRace.id,
          strategy: BACKEND_STRATEGY[activeStrategy],
          picks: runnerIds,
          ticketNumber: 1,
        }),
      });
      setSaveState({ phase: 'saved', message: '' });
      setShowConfirmation(true);
    } catch (err) {
      setSaveState({ phase: 'error', message: err?.message || 'No se pudo guardar el boleto' });
    }
  }, [isPicksComplete, ensureGuestSession, token, tournament, race, selectedHorses, activeStrategy]);

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

  // CIERRE EN — live countdown to today's post time (null-safe: runs before any early return)
  const closeLabel = useMemo(() => {
    const m = String(race?.postTime || '').match(/(\d{1,2}):(\d{2})/);
    if (!m) return '—';
    const target = new Date(nowTs);
    target.setHours(Number(m[1]), Number(m[2]), 0, 0);
    const diff = target.getTime() - nowTs;
    if (diff <= 0) return 'CERRADO';
    const h = Math.floor(diff / 3600000);
    const mi = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(mi)}:${pad(s)}`;
  }, [race?.postTime, nowTs]);

  const classBadge = String(race?.class || '').split(' ')[0].toUpperCase() || '—';

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

  const statusColors = {
    completed: { badge: 'bg-white/10 text-white/50', dot: '', label: 'COMPLETADO' },
    live: { badge: 'bg-red-500/20 text-red-400', dot: 'bg-red-400 animate-pulse-live', label: 'EN VIVO' },
    upcoming: { badge: 'bg-purple/20 text-purple-light', dot: '', label: 'PROXIMO' },
  };

  const strategyTabStyle = {
    full: { border: 'border-purple-500', glow: 'shadow-[0_0_18px_rgba(168,85,247,0.45)]', text: 'text-purple-300', chip: 'bg-purple-600' },
    dual: { border: 'border-cyan-400', glow: 'shadow-[0_0_18px_rgba(6,182,212,0.45)]', text: 'text-cyan-300', chip: 'bg-cyan-500' },
    smart: { border: 'border-[#f5b301]', glow: 'shadow-[0_0_18px_rgba(245,179,1,0.45)]', text: 'text-[#f5b301]', chip: 'bg-[#f5b301]' },
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

      {/* Race header strip — Figma spec */}
      <div className="border-b border-[#f5b301]/25 bg-black">
        <div className="app-page py-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-white text-base sm:text-xl font-black tracking-tight truncate">
              {tournament.track} Race {race.number}
            </h1>
            <span className="shrink-0 rounded bg-purple-600 text-white text-[10px] font-black px-2 py-0.5 uppercase tracking-wider">
              {classBadge}
            </span>
          </div>
          <span className="text-white/70 text-xs sm:text-sm">
            <span className="text-white/40">●</span> {race.distance}m <span className="text-[#f5b301]">★</span> {race.surface} <span className="text-[#f5b301]">★</span> Open
          </span>
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColors[race.status].badge}`}>
            {statusColors[race.status].dot && (
              <span className={`w-1.5 h-1.5 rounded-full ${statusColors[race.status].dot}`} />
            )}
            {statusColors[race.status].label}
          </span>
          <div className="ml-auto flex items-stretch gap-2">
            <div className="rounded-lg border border-white/20 bg-white/[0.03] px-3 py-1 text-center">
              <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Hora</p>
              <p className="text-white text-sm font-black font-mono">{race.postTime}</p>
            </div>
            <div className="rounded-lg border border-[#f5b301]/60 bg-[#f5b301]/5 px-3 py-1 text-center">
              <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Cierre en</p>
              <p className="text-[#f5b301] text-sm font-black font-mono">{closeLabel}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="app-page pb-32 lg:pb-12">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Left: Race card with picks */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Strategy tabs — Figma spec */}
            <div className="rounded-xl border border-[#f5b301]/30 bg-black p-3">
              <p className="text-center text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
                Estrategia de puntos
              </p>
              <div className="grid grid-cols-3 gap-2">
                {strategies.map((s) => {
                  const st = strategyTabStyle[s.id];
                  const isActive = activeStrategy === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleStrategyChange(s.id)}
                      className={`rounded-lg border-2 px-2 py-2 flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        isActive ? `${st.border} ${st.glow} bg-white/[0.04]` : 'border-white/10 bg-white/[0.02] opacity-60 hover:opacity-100'
                      }`}
                    >
                      <span className={`text-[11px] sm:text-xs font-black uppercase tracking-wide ${isActive ? st.text : 'text-white/60'}`}>
                        {s.name}
                      </span>
                      <span className="flex items-center gap-1">
                        {s.allocation.map((pts, idx) => (
                          <span
                            key={idx}
                            className={`text-[10px] font-black rounded px-1.5 py-0.5 ${isActive ? `${st.chip} text-black` : 'bg-white/10 text-white/50'}`}
                          >
                            {pts}
                          </span>
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

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

            {/* ATRÁS / OK — Figma spec */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-xl border-2 border-purple-500 bg-purple-600/80 hover:bg-purple-600 text-white text-sm font-black uppercase tracking-widest py-3 transition-all cursor-pointer"
              >
                Atrás
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!isPicksComplete || saveState.phase === 'saving'}
                className="rounded-xl border-2 border-purple-400 bg-purple-600 hover:bg-purple-500 text-white text-sm font-black uppercase tracking-widest py-3 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_18px_rgba(168,85,247,0.45)]"
              >
                {saveState.phase === 'saving' ? 'Guardando…' : 'OK'}
              </button>
            </div>

            {/* Persist status — honest backend feedback, never silent */}
            {saveState.phase === 'saved' && (
              <p className="rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-4 py-2.5 text-emerald-300 text-xs font-bold text-center" role="status">
                ✓ Boleto guardado en el torneo oficial
              </p>
            )}
            {saveState.phase === 'error' && (
              <p className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-2.5 text-red-300 text-xs font-bold text-center" role="alert">
                {saveState.message}
              </p>
            )}
            {saveState.phase === 'needs-auth' && (
              <div className="rounded-xl border border-amber-400/50 bg-amber-400/10 px-4 py-3 text-center">
                <p className="text-amber-200 text-xs font-bold mb-2">
                  Inicia sesión o entra como invitado para guardar tu boleto
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await playAsGuest();
                        setSaveState({ phase: 'idle', message: '' });
                      } catch {
                        setSaveState({ phase: 'error', message: 'No se pudo crear la sesión de invitado' });
                      }
                    }}
                    className="rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase px-4 py-2 cursor-pointer"
                  >
                    Entrar como invitado
                  </button>
                  <Link
                    href="/login"
                    className="rounded-lg border border-purple-400/60 text-purple-200 text-xs font-black uppercase px-4 py-2"
                  >
                    Iniciar sesión
                  </Link>
                </div>
              </div>
            )}

            {/* Community strategy shares — live backend aggregates */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'full', label: 'Full Points', bg: 'bg-purple-600', text: 'text-white' },
                { key: 'dual', label: 'Dual Points', bg: 'bg-cyan-400', text: 'text-black' },
                { key: 'smart', label: 'Smart Points', bg: 'bg-[#f5b301]', text: 'text-black' },
              ].map((b) => (
                <div key={b.key} className={`rounded-xl ${b.bg} ${b.text} p-3 text-center`}>
                  <p className="text-[10px] font-black uppercase tracking-wider opacity-80">{b.label}</p>
                  <p className="text-2xl font-black font-mono">
                    {shares?.[b.key] == null ? '—' : `${Math.round(shares[b.key])}%`}
                  </p>
                  <p className="text-[9px] font-bold opacity-70">Porcentaje acumulado</p>
                </div>
              ))}
            </div>
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
