'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Calendar, Users, Trophy, Clock, ChevronLeft,
  Flame, Timer, CheckCircle2, ArrowRight, Zap, Lock, AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import AppPageHeader from '@/frontend/components/layout/AppPageHeader';
import RaceCard from '@/frontend/components/tournament/RaceCard';
import PickSelector, { strategies } from '@/frontend/components/tournament/PickSelector';
import TicketSummary from '@/frontend/components/tournament/TicketSummary';
import TicketConfirmation from '@/frontend/components/tournament/TicketConfirmation';
import TournamentTicketSheet from '@/frontend/components/tournament/TournamentTicketSheet';
import { useAuth } from '@/frontend/contexts/AuthContext';
import { fetchAuthJson } from '@/frontend/lib/api/client';
import { fetchTournamentDetail } from '@/frontend/lib/api/tournaments';
import ModalityScope from '@/frontend/components/modalities/ModalityScope';
import StepTracker from '@/frontend/components/layout/StepTracker';
import {
  isValidModalityId,
  readPersistedModality,
  withModalityQuery,
} from '@/frontend/lib/gameModalities';
import { markTrackTicketUsed } from '@/frontend/lib/trackTicketUsage';
import WorkspaceOnboardingTour from '@/frontend/components/onboarding/WorkspaceOnboardingTour';
import DividendsTableModal from '@/frontend/components/modals/DividendsTableModal';
import RaceSummaryMatrix from '@/frontend/components/tournament/RaceSummaryMatrix';
import TicketCarousel from '@/frontend/components/tournament/TicketCarousel';
import FigmaStrategySlips from '@/frontend/components/tournament/FigmaStrategySlips';
import FigmaFinalRanking from '@/frontend/components/tournament/FigmaFinalRanking';
import { FileSpreadsheet } from 'lucide-react';

const STRATEGY_MAP = { full: 'full_point', dual: 'dual_point', smart: 'smart_pick' };
const STRATEGY_REVERSE = { full_point: 'full', dual_point: 'dual', smart_pick: 'smart' };

function normalizeHorse(h) {
  return {
    ...h,
    silkColors: { primary: h.silkPrimary || '#7c3aed', secondary: h.silkSecondary || '#ffffff' },
    weight: 54 + (h.postPosition % 8),
  };
}

function normalizeRace(race) {
  return {
    ...race,
    number: race.raceNumber,
    class: race.raceClass || '',
    postTime: race.scheduledTime || '',
    surface: race.surface || 'Dirt',
    distance: race.distance || 1200,
    tournamentRace: true,
    horses: (race.horses || []).map(normalizeHorse),
  };
}

const RACES_PER_TOURNAMENT = 7;

function normalizeTournament(t) {
  const sorted = (t.races || [])
    .slice()
    .sort((a, b) => (a.raceNumber || 0) - (b.raceNumber || 0));
  const races = sorted.length >= RACES_PER_TOURNAMENT ? sorted.slice(-RACES_PER_TOURNAMENT) : sorted;
  return {
    ...t,
    totalRaces: RACES_PER_TOURNAMENT,
    playersJoined: t._count?.tickets || 0,
    totalPlayers: Math.max(2000, (t._count?.tickets || 0) + 500),
    racesCompleted: Math.min(t.currentRace || 0, RACES_PER_TOURNAMENT),
    races: races.map(normalizeRace),
  };
}

function TournamentSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 animate-pulse p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white border-[2.5px] border-[#7c3aed] rounded-2xl p-6 shadow-lg space-y-4">
          <div className="h-5 w-36 bg-purple-100 rounded-lg" />
          <div className="h-8 w-2/3 bg-purple-200/60 rounded-xl" />
          <div className="h-4 w-48 bg-slate-200 rounded-md" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-24 bg-white border-2 border-purple-200 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TournamentClient({ tournamentSlugParam = null, onClose = null }) {
  const params = useParams();
  const searchParams = useSearchParams();
  const tournamentSlug = tournamentSlugParam || params?.id;
  const { token, isAuthenticated, ensureGuestSession, loading: authLoading } = useAuth();
  const fromQuery = searchParams.get('modality');
  const modalityId = isValidModalityId(fromQuery)
    ? fromQuery
    : readPersistedModality() || 'free';
  const returnPath = searchParams.get('return');
  const trackFromQuery = searchParams.get('track');
  const ticketFromQuery = Number.parseInt(searchParams.get('ticket') || '', 10);
  const playFirst = searchParams.get('play') === '1';

  const [tournamentRaw, setTournamentRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submittedTickets, setSubmittedTickets] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [expandedRace, setExpandedRace] = useState(null);
  const [activeStrategy, setActiveStrategy] = useState('full');
  const [picks, setPicks] = useState({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmedRace, setConfirmedRace] = useState(null);
  const [activeTicketNumber, setActiveTicketNumber] = useState(
    ticketFromQuery >= 1 && ticketFromQuery <= 3 ? ticketFromQuery : 1,
  );
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [ticketMarkedComplete, setTicketMarkedComplete] = useState(false);
  const [showDividendsModal, setShowDividendsModal] = useState(false);
  const [gameAlert, setGameAlert] = useState({
    show: false,
    title: "",
    message: "",
    type: "error", // "error" | "warning" | "success"
  });

  const showGameAlert = useCallback((rawMessage, type = 'error') => {
    let title = '⚠️ AVISO DEL JUEGO';
    let message = rawMessage;

    const lowerMsg = typeof rawMessage === 'string' ? rawMessage.toLowerCase() : '';

    if (
      lowerMsg.includes('no longer accepting picks') ||
      lowerMsg.includes('carrera ya no acepta') ||
      lowerMsg.includes('cerrada') ||
      lowerMsg.includes('closed')
    ) {
      title = '🔒 CARRERA CERRADA';
      message = '¡Esta carrera ya comenzó y está cerrada! No se aceptan más selecciones para esta carrera. Completa las otras carreras abiertas.';
    } else if (lowerMsg.includes('submiterror') || lowerMsg.includes('error al enviar')) {
      title = '❌ ERROR DE ENVÍO';
      message = 'No se pudo registrar tu selección. Por favor, verifica tu conexión y vuelve a intentarlo.';
    }

    setGameAlert({
      show: true,
      title,
      message,
      type,
    });
  }, []);

  const renderGameAlertModal = useCallback(() => {
    if (!gameAlert.show) return null;
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", duration: 0.4 }}
          className={`relative w-full max-w-md overflow-hidden rounded-2xl border bg-slate-900 p-6 text-center shadow-2xl ${
            gameAlert.type === "error"
              ? "border-red-500/50 shadow-red-500/10"
              : gameAlert.type === "success"
              ? "border-emerald-500/50 shadow-emerald-500/10"
              : "border-amber-500/50 shadow-amber-500/10"
          }`}
        >
          {/* Top ambient color glow */}
          <div
            className={`absolute top-0 left-0 right-0 h-1.5 ${
              gameAlert.type === "error"
                ? "bg-gradient-to-r from-red-500 via-rose-500 to-red-600"
                : gameAlert.type === "success"
                ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"
                : "bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500"
            }`}
          />

          {/* Icon Container */}
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-950 border border-slate-800">
            {gameAlert.type === "error" ? (
              <span className="text-3xl">🚫</span>
            ) : gameAlert.type === "success" ? (
              <span className="text-3xl">🏆</span>
            ) : (
              <span className="text-3xl">🏇</span>
            )}
          </div>

          {/* Title */}
          <h3 className={`text-xl font-black uppercase tracking-wider mb-2 ${
            gameAlert.type === "error"
              ? "text-red-400"
              : gameAlert.type === "success"
              ? "text-emerald-400"
              : "text-amber-400"
          }`}>
            {gameAlert.title}
          </h3>

          {/* Message */}
          <p className="text-slate-300 text-sm leading-relaxed mb-6 font-medium">
            {gameAlert.message}
          </p>

          {/* Action Button */}
          <button
            type="button"
            onClick={() => setGameAlert(prev => ({ ...prev, show: false }))}
            className={`w-full py-3 px-6 rounded-xl font-extrabold uppercase tracking-widest text-xs transition-all duration-300 transform active:scale-95 shadow-md ${
              gameAlert.type === "error"
                ? "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white shadow-red-500/20"
                : gameAlert.type === "success"
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/20"
                : "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-orange-500/20"
            }`}
          >
            Entendido
          </button>
        </motion.div>
      </div>
    );
  }, [gameAlert.show, gameAlert.title, gameAlert.message, gameAlert.type]);

  useEffect(() => {
    if (ticketFromQuery >= 1 && ticketFromQuery <= 3) {
      setActiveTicketNumber(ticketFromQuery);
    }
  }, [ticketFromQuery]);

  useEffect(() => {
    if (authLoading || token) return;
    if (modalityId !== 'guest' && modalityId !== 'free') return;
    ensureGuestSession().catch(() => {});
  }, [authLoading, token, modalityId, ensureGuestSession]);

  useEffect(() => {
    const slug = tournamentSlug;
    if (!slug) return;

    setLoading(true);
    fetchTournamentDetail(slug, { refresh: true })
      .then((data) => {
        setTournamentRaw(data.tournament);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [tournamentSlug]);

  useEffect(() => {
    if (!token || !tournamentRaw) return;

    fetchAuthJson(`/tickets?tournamentId=${tournamentRaw.id}`)
      .then((data) => {
        if (!data?.tickets) return;
        const ticketMap = {};
        for (const t of data.tickets) {
          ticketMap[`${t.raceId}-${t.ticketNumber}`] = t;
        }
        setSubmittedTickets(ticketMap);
      })
      .catch(() => {});
  }, [token, tournamentRaw]);

  const tournament = useMemo(() => {
    if (!tournamentRaw) return null;
    return normalizeTournament(tournamentRaw);
  }, [tournamentRaw]);

  useEffect(() => {
    if (!playFirst || !tournament?.races?.length) return;
    const first =
      tournament.races.find((r) => r.number === 1 || r.raceNumber === 1) || tournament.races[0];
    if (first?.id) {
      setExpandedRace(first.id);
      setActiveStrategy('full');
      setPicks({});
    }
  }, [playFirst, tournament]);

  const nextRace = useMemo(() => {
    if (!tournament) return null;
    return tournament.races.find((r) => r.status === 'upcoming' || r.status === 'live' || r.status === 'open') || tournament.races[tournament.races.length - 1];
  }, [tournament]);

  useEffect(() => {
    if (!nextRace || !nextRace.scheduledTime || nextRace.scheduledTime === 'TBD') {
      setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    const targetTime = new Date(nextRace.scheduledTime);
    if (isNaN(targetTime.getTime())) {
      setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    const tick = () => {
      const now = new Date();
      const diff = Math.max(0, targetTime - now);
      setCountdown({
        days: Math.floor(diff / (24 * 3600000)),
        hours: Math.floor((diff % (24 * 3600000)) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000)
      });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [nextRace]);

  const currentRacePicks = expandedRace ? (picks[expandedRace] || []) : [];
  const currentRace = tournament?.races.find((r) => r.id === expandedRace);
  const strategy = strategies.find((s) => s.id === activeStrategy);
  const totalPointsRemaining = 50 - (strategy?.allocation?.slice(0, currentRacePicks.length).reduce((s, v) => s + v, 0) || 0);
  const isPicksComplete = currentRacePicks.length === (strategy?.maxPicks || 1);

  const handlePickHorse = useCallback((horseId) => {
    if (!expandedRace) return;
    setPicks((prev) => {
      const racePicks = prev[expandedRace] || [];
      if (racePicks.includes(horseId)) {
        return { ...prev, [expandedRace]: racePicks.filter((id) => id !== horseId) };
      }
      const maxPicks = strategies.find((s) => s.id === activeStrategy)?.maxPicks || 1;
      if (racePicks.length >= maxPicks) return prev;
      return { ...prev, [expandedRace]: [...racePicks, horseId] };
    });
  }, [expandedRace, activeStrategy]);

  const handleStrategyChange = useCallback((strategyId) => {
    setActiveStrategy(strategyId);
    if (expandedRace) {
      setPicks((prev) => ({ ...prev, [expandedRace]: [] }));
    }
  }, [expandedRace]);

  const handleConfirm = useCallback(async () => {
    if (!expandedRace || submitting) return;

    const racePicks = picks[expandedRace] || [];
    if (racePicks.length === 0) return;

    if (!isAuthenticated) {
      try {
        await ensureGuestSession();
      } catch {
        showGameAlert('Error al enviar el ticket');
        return;
      }
    }

    setSubmitting(true);
    try {
      const apiStrategy = STRATEGY_MAP[activeStrategy];
      const data = await fetchAuthJson('/tickets', {
        method: 'POST',
        body: JSON.stringify({
          raceId: expandedRace,
          tournamentId: tournamentRaw?.id,
          raceNumber: currentRace?.raceNumber ?? currentRace?.number,
          strategy: apiStrategy,
          picks: racePicks,
          ticketNumber: activeTicketNumber,
        }),
      });

      setConfirmedRace(expandedRace);
      setSubmittedTickets((prev) => ({
        ...prev,
        [`${expandedRace}-${activeTicketNumber}`]: {
          ...data.ticket,
          raceId: expandedRace,
          ticketNumber: activeTicketNumber,
        },
      }));
      setShowConfirmation(true);
    } catch (err) {
      const msg = err?.data?.detail || err?.message || 'Error al enviar el ticket';
      showGameAlert(typeof msg === 'string' ? msg : 'Error al enviar el ticket');
      if (err?.status === 404 && tournamentRaw?.slug) {
        fetchTournamentDetail(tournamentRaw.slug, { refresh: false })
          .then((data) => setTournamentRaw(data.tournament))
          .catch(() => {});
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    expandedRace,
    activeStrategy,
    picks,
    isAuthenticated,
    ensureGuestSession,
    submitting,
    activeTicketNumber,
    tournamentRaw,
    currentRace,
    showGameAlert,
  ]);

  const handleCloseConfirmation = useCallback(() => {
    setShowConfirmation(false);
    setConfirmedRace(null);
    setExpandedRace(null);
  }, []);

  const ticketKey = useCallback(
    (raceId, ticketNum = activeTicketNumber) => `${raceId}-${ticketNum}`,
    [activeTicketNumber]
  );

  const submittedForRace = useCallback(
    (raceId, ticketNum = activeTicketNumber) => submittedTickets[ticketKey(raceId, ticketNum)],
    [submittedTickets, ticketKey, activeTicketNumber]
  );

  const confirmedStrategyForRace = useCallback(
    (raceId) => {
      const sub = submittedForRace(raceId);
      return sub ? STRATEGY_REVERSE[sub.strategy] || 'full' : null;
    },
    [submittedForRace]
  );

  const isRaceConfirmed = useCallback(
    (raceId) => !!submittedForRace(raceId),
    [submittedForRace]
  );

  const handleEditRace = useCallback(
    async (raceId) => {
      if (!tournamentRaw?.id || submitting) return;

      setSubmitting(true);
      try {
        if (!isAuthenticated) {
          await ensureGuestSession();
        }

        await fetchAuthJson(
          `/tickets?tournamentId=${tournamentRaw.id}&ticketNumber=${activeTicketNumber}&raceId=${raceId}`,
          { method: 'DELETE' }
        );

        const sub = submittedForRace(raceId);
        if (sub) {
          setActiveStrategy(STRATEGY_REVERSE[sub.strategy] || 'full');
          setPicks((prev) => ({ ...prev, [raceId]: sub.picks || [] }));
        }

        setSubmittedTickets((prev) => {
          const next = { ...prev };
          delete next[`${raceId}-${activeTicketNumber}`];
          return next;
        });

        setExpandedRace(raceId);
        window.dispatchEvent(new Event("50points-tickets-updated"));
      } catch (err) {
        showGameAlert(err?.message || 'Error al eliminar el pick');
      } finally {
        setSubmitting(false);
      }
    },
    [
      tournamentRaw,
      activeTicketNumber,
      isAuthenticated,
      ensureGuestSession,
      submittedForRace,
      submitting,
      showGameAlert,
    ]
  );

  const handleSelectTicket = useCallback((ticketNum) => {
    setActiveTicketNumber(ticketNum);
    setExpandedRace(null);
    setPicks({});
    setActiveStrategy('full');
  }, []);

  const confirmedCount = useMemo(() => {
    if (!tournament) return 0;
    return tournament.races.filter((r) => submittedForRace(r.id)).length;
  }, [tournament, submittedForRace]);

  const pendingCount = useMemo(() => {
    if (!tournament) return 0;
    return tournament.races.length - confirmedCount;
  }, [tournament, confirmedCount]);

  const allRacesPlayed =
    tournament &&
    confirmedCount >= tournament.totalRaces;

  const ticketIsFullyComplete = confirmedCount >= (tournament?.totalRaces || 7);

  useEffect(() => {
    if (!allRacesPlayed || ticketMarkedComplete || !trackFromQuery) return;
    markTrackTicketUsed(trackFromQuery, ticketFromQuery, tournament?.slug);
    setTicketMarkedComplete(true);
  }, [
    allRacesPlayed,
    ticketMarkedComplete,
    trackFromQuery,
    ticketFromQuery,
    tournament?.slug,
  ]);

  const backHref = returnPath
    ? withModalityQuery(returnPath, modalityId)
    : withModalityQuery('/tournaments', modalityId);
  const showFreeFlowNav = isValidModalityId(fromQuery) && modalityId !== 'free';

  const toggleRace = useCallback(
    async (raceId) => {
      // Auto-submit previous race picks if complete
      if (expandedRace && expandedRace !== raceId && !isRaceConfirmed(expandedRace)) {
        const prevRacePicks = picks[expandedRace] || [];
        const prevRace = tournament?.races.find((r) => r.id === expandedRace);
        const prevStrategy = strategies.find((s) => s.id === activeStrategy);
        const maxPicks = prevStrategy?.maxPicks || 1;

        if (prevRacePicks.length === maxPicks) {
          try {
            if (!isAuthenticated) {
              await ensureGuestSession();
            }
            const apiStrategy = STRATEGY_MAP[activeStrategy];
            const data = await fetchAuthJson('/tickets', {
              method: 'POST',
              body: JSON.stringify({
                raceId: expandedRace,
                tournamentId: tournamentRaw?.id,
                raceNumber: prevRace?.raceNumber ?? prevRace?.number,
                strategy: apiStrategy,
                picks: prevRacePicks,
                ticketNumber: activeTicketNumber,
              }),
            });

            // Update submittedTickets state immediately
            setSubmittedTickets((prev) => ({
              ...prev,
              [ticketKey(expandedRace, activeTicketNumber)]: {
                ...data.ticket,
                raceId: expandedRace,
                ticketNumber: activeTicketNumber,
              },
            }));
            
            // Dispatch event to sync
            window.dispatchEvent(new Event("50points-tickets-updated"));
          } catch (err) {
            console.error("Auto-submit failed", err);
          }
        }
      }

      setExpandedRace((prev) => (prev === raceId ? null : raceId));
    },
    [
      expandedRace,
      picks,
      tournament,
      activeStrategy,
      isAuthenticated,
      ensureGuestSession,
      tournamentRaw,
      activeTicketNumber,
      isRaceConfirmed,
      ticketKey,
    ]
  );

  if (loading) return <TournamentSkeleton />;

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-[#161b30] flex items-center justify-center">
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

  const statusConfig = {
    live: { label: 'EN VIVO', color: 'bg-red-500', glow: 'shadow-[0_0_20px_rgba(239,68,68,0.5)]', textColor: 'text-red-400' },
    upcoming: { label: 'PROXIMO', color: 'bg-purple', glow: 'shadow-[0_0_20px_rgba(124,58,237,0.3)]', textColor: 'text-purple-light' },
    open: { label: 'ABIERTO', color: 'bg-green-500', glow: 'shadow-[0_0_20px_rgba(34,197,94,0.3)]', textColor: 'text-green-400' },
    completed: { label: 'COMPLETADO', color: 'bg-white/20', glow: '', textColor: 'text-white/50' },
  };
  const status = statusConfig[tournament.status] || statusConfig.upcoming;

  return (
    <ModalityScope modalityId={modalityId}>
      <WorkspaceOnboardingTour modalityId={modalityId} />
      <div className="min-h-screen">
      <div className="app-page pt-4">
        <StepTracker
          currentStep={
            (tournament.status === 'live' || tournament.status === 'completed')
              ? "torneo"
              : (ticketIsFullyComplete ? "confirmacion" : "estrategias")
          }
          modalityId={modalityId}
        />
      </div>
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src="/images/live-feed.jpg" alt="" className="w-full h-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-dark/60 via-brand-dark/90 to-brand-dark" />
        </div>
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-[120px]"
          style={{ backgroundColor: 'var(--modality-glow, rgba(124,58,237,0.05))' }}
        />

        <div className="relative app-page pt-6 pb-8">
          <AppPageHeader title={tournament.name} className="mb-6" />
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm transition-colors bg-transparent border-0 cursor-pointer"
              >
                <ChevronLeft size={16} />
                <span>Volver a hipódromos</span>
              </button>
            ) : (
              <Link href={backHref} className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm transition-colors">
                <ChevronLeft size={16} />
                <span>{returnPath ? 'Volver a hipódromos' : 'Volver a Torneos'}</span>
              </Link>
            )}

            <button
              id="tournament-view-dividends-btn"
              type="button"
              onClick={() => setShowDividendsModal(true)}
              className="ml-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/40 hover:bg-emerald-900/50 shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all cursor-pointer"
            >
              <FileSpreadsheet size={14} />
              <span>Tabla de Dividendos Fijos</span>
            </button>
          </div>

          {ticketIsFullyComplete ? (
            <div className="mb-6 rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/60 to-teal-950/40 px-5 py-4 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <span className="text-3xl mt-0.5">🏆</span>
                <div className="flex-1">
                  <p className="text-base font-bold text-emerald-300 mb-1">
                    ¡Ticket {activeTicketNumber} completado!
                  </p>
                  <p className="text-sm text-emerald-200/70 mb-3">
                    Registraste tus 7 selecciones. Cuando las carreras corran, el sistema calculará tus puntos automáticamente y aparecerás en el ranking.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href="/leaderboard"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition-colors"
                    >
                      <Trophy size={13} />
                      Ver Ranking
                    </Link>
                    {activeTicketNumber < 3 && (
                      <button
                        type="button"
                        onClick={() => handleSelectTicket(activeTicketNumber + 1)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/10 transition-colors"
                      >
                        Llenar Ticket {activeTicketNumber + 1}
                        <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : allRacesPlayed && returnPath ? (
            <div className="mb-6 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3">
              <p className="text-sm text-emerald-200/90 mb-2">
                Completaste las 7 carreras con el Ticket {ticketFromQuery}. Tu ticket quedó marcado como usado.
              </p>
              <Link
                href={backHref}
                className="inline-flex items-center gap-2 text-sm font-bold text-emerald-300 hover:text-emerald-200"
              >
                Volver a elegir otro ticket
                <ArrowRight size={14} />
              </Link>
            </div>
          ) : null}

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider text-white ${status.color} ${status.glow}`}>
                  {tournament.status === 'live' && (
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse-live" />
                  )}
                  {status.label}
                </span>
              </div>

              <p className="text-[11px] text-purple-light uppercase tracking-[0.2em] font-bold mb-2">TORNEO</p>

              <p className="text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-light to-cyan bg-clip-text text-transparent mb-2">
                POINT RUSH
              </p>

              <p className="text-sm sm:text-base font-bold text-white/60 uppercase tracking-widest mb-3">
                {tournament.track}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-sm text-white/50">
                <div className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-cyan" />
                  <span>{tournament.track}, {tournament.location}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-purple-light" />
                  <span>{new Date(tournament.date).toLocaleDateString('es-ES', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>

              <p className="text-white/30 text-sm mt-3 max-w-2xl">
                {tournament.description}
              </p>

              <div className="flex flex-wrap gap-3 mt-5">
                <button
                  onClick={() => {
                    if (nextRace) {
                      toggleRace(nextRace.id);
                      const el = document.getElementById(`race-${nextRace.id}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }}
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple to-purple-light hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] transition-shadow"
                >
                  HACER MI TICKET AHORA
                  <ArrowRight size={16} />
                </button>
                <Link
                  href="/leaderboard"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] transition-colors"
                >
                  <Trophy size={16} className="text-gold" />
                  VER RANKING
                </Link>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/[0.03] backdrop-blur-lg border border-white/10 rounded-xl p-5 lg:min-w-[280px]"
            >
              <div className="text-center mb-4">
                <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Jugadores Activos</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-purple-light to-cyan bg-clip-text text-transparent">
                  {tournament.playersJoined.toLocaleString()}
                </p>
                <p className="text-xs text-white/30 mt-1">de {tournament.totalPlayers.toLocaleString()} cupos</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40 flex items-center gap-1.5"><Users size={12} />Participacion</span>
                  <span className="text-white font-medium">{Math.round((tournament.playersJoined / tournament.totalPlayers) * 100)}%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple to-cyan rounded-full"
                    style={{ width: `${(tournament.playersJoined / tournament.totalPlayers) * 100}%` }}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="app-page pb-32 lg:pb-12">
        <div className="max-w-4xl mx-auto flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-3">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/[0.03] border border-white/10 rounded-xl p-3 text-center backdrop-blur-lg">
              <div className="flex items-center justify-center gap-1.5 text-green-400 mb-1">
                <CheckCircle2 size={14} />
                <span className="text-lg font-bold">{confirmedCount}</span>
              </div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Confirmadas</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white/[0.03] border border-white/10 rounded-xl p-3 text-center backdrop-blur-lg">
              <div className="flex items-center justify-center gap-1.5 text-cyan mb-1">
                <Trophy size={14} />
                <span className="text-lg font-bold">{tournament.races.length}</span>
              </div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">En Torneo</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/[0.03] border border-white/10 rounded-xl p-3 text-center backdrop-blur-lg">
              <div className="flex items-center justify-center gap-1.5 text-purple-light mb-1">
                <Timer size={14} />
                <span className="text-lg font-bold">{pendingCount}</span>
              </div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Pendientes</p>
            </motion.div>
          </div>

          {/* Figma Ticket Lifecycle Carousel (Pages 11–20, 37–44, 88–90) */}
          <TicketCarousel
            activeTicketId={activeTicketNumber}
            onSelectTicket={handleSelectTicket}
            ticketsState={submittedTickets}
            totalRaces={tournament.races.length || 7}
            completedCount={confirmedCount}
          />

          {/* Figma 7-Race General Summary Matrix (Pages 28–36, 48–52, 76–80) */}
          <RaceSummaryMatrix
            tournament={tournament}
            races={tournament.races}
            currentRaceIndex={tournament.races.findIndex((r) => r.id === (currentRace?.id || expandedRace))}
            onSelectRace={(idx) => {
              const target = tournament.races[idx];
              if (target) toggleRace(target.id);
            }}
            picks={picks}
            onOpenDividends={() => setShowDividendsModal(true)}
          />

          <div className="tour-step-races-bar">
            <TournamentTicketSheet
              races={tournament.races}
              activeTicketNumber={activeTicketNumber}
              onSelectTicket={handleSelectTicket}
              submittedTickets={submittedTickets}
              expandedRaceId={expandedRace}
              onSelectRace={toggleRace}
            />
          </div>

          {currentRace && (
            <motion.div
              key={currentRace.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Figma Strategy Selection Slips (Pages 57–64, 75, 81–82, 100) */}
              <FigmaStrategySlips
                strategy={isRaceConfirmed(currentRace.id) ? (confirmedStrategyForRace(currentRace.id) || 'full') : activeStrategy}
                onSelectStrategy={!isRaceConfirmed(currentRace.id) ? handleStrategyChange : undefined}
                race={currentRace}
                horses={currentRace.horses}
                selectedHorseIds={isRaceConfirmed(currentRace.id) ? (submittedForRace(currentRace.id)?.picks || []) : (picks[currentRace.id] || [])}
                onToggleHorse={!isRaceConfirmed(currentRace.id) ? handlePickHorse : undefined}
                onOpenRaceModal={() => {
                  const el = document.getElementById(`race-${currentRace.id}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
              />

              <RaceCard
                race={currentRace}
                activeStrategy={isRaceConfirmed(currentRace.id) ? (confirmedStrategyForRace(currentRace.id) || 'full') : activeStrategy}
                selectedHorses={isRaceConfirmed(currentRace.id) ? (submittedForRace(currentRace.id)?.picks || []) : (picks[currentRace.id] || [])}
                confirmedStrategy={confirmedStrategyForRace(currentRace.id)}
                onPickHorse={!isRaceConfirmed(currentRace.id) ? handlePickHorse : undefined}
                onStrategyChange={!isRaceConfirmed(currentRace.id) ? handleStrategyChange : undefined}
                isExpanded={true}
                onToggleExpand={() => toggleRace(currentRace.id)}
                tournamentRace={true}
              />
              
              {isRaceConfirmed(currentRace.id) ? (
                <ConfirmedRaceSummary
                  race={currentRace}
                  ticket={submittedForRace(currentRace.id)}
                  onEdit={() => handleEditRace(currentRace.id)}
                  isClosed={currentRace.status === 'completed' || currentRace.status === 'live' || currentRace.status === 'LIVE' || currentRace.status === 'COMPLETED'}
                />
              ) : (
                <TicketSummary raceNumber={currentRace.number} activeStrategy={activeStrategy} selectedHorses={currentRacePicks} horses={currentRace.horses} totalPoints={totalPointsRemaining} onConfirm={handleConfirm} isComplete={isPicksComplete} />
              )}
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            {nextRace && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white/[0.03] backdrop-blur-lg border border-white/10 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Clock size={14} className="text-cyan" />
                    <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Proxima Carrera En</span>
                  </div>
                  <div className="flex items-center justify-center gap-3 mb-4">
                    {(() => {
                      const units = [];
                      if (countdown.days > 0) {
                        units.push({ value: countdown.days, label: 'DIAS' });
                      }
                      units.push({ value: countdown.hours, label: 'HRS' });
                      units.push({ value: countdown.minutes, label: 'MIN' });
                      units.push({ value: countdown.seconds, label: 'SEC' });
                      return units;
                    })().map((unit) => (
                      <div key={unit.label} className="text-center">
                        <div className="bg-white/[0.05] border border-white/10 rounded-lg w-16 h-16 flex items-center justify-center">
                          <span className="text-2xl font-bold text-white font-mono">{String(unit.value).padStart(2, '0')}</span>
                        </div>
                        <span className="text-[9px] text-white/30 uppercase tracking-widest mt-1 block">{unit.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="bg-white/[0.03] rounded-lg p-3 border border-white/5">
                    <p className="text-xs text-white/50">
                      <span className="text-white font-semibold">CARRERA {nextRace.number}</span>
                      <span className="mx-1.5 text-white/20">|</span>
                      {nextRace.distance}m {nextRace.surface}
                    </p>
                    <p className="text-[10px] text-white/30 mt-0.5">{nextRace.class} - Post time {nextRace.postTime}</p>
                  </div>
                  <button
                    onClick={() => {
                      toggleRace(nextRace.id);
                      const el = document.getElementById(`race-${nextRace.id}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className="mt-3 w-full py-2.5 rounded-lg text-center text-xs font-bold text-white bg-gradient-to-r from-purple to-purple-light block hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] transition-shadow"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Ver Carrera Completa
                      <ArrowRight size={12} />
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            <div className="space-y-4">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white/[0.03] backdrop-blur-lg border border-white/10 rounded-xl p-5">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">Info del Torneo</h3>
                <div className="space-y-3">
                  <InfoRow label="Pista" value={tournament.track} />
                  <InfoRow label="Ubicacion" value={tournament.location} />
                  <InfoRow label="Fecha" value={new Date(tournament.date).toLocaleDateString('es-ES', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' })} />
                  <InfoRow label="Carreras" value={`${tournament.racesCompleted} / ${tournament.totalRaces}`} />
                  <InfoRow label="Entrada" value="Gratis" />
                  <InfoRow label="Tipo" value="Competencia de Puntos" />
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white/[0.03] backdrop-blur-lg border border-white/10 rounded-xl p-5">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Como Funciona</h3>
                <div className="space-y-2.5 text-xs text-white/50">
                  <div className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple/20 text-purple-light flex items-center justify-center text-[10px] font-bold flex-shrink-0">1</span>
                    <p>Distribuye <span className="text-gold font-semibold">50 puntos</span> apostando al <span className="text-green-400 font-semibold">GANADOR</span> de cada carrera</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple/20 text-purple-light flex items-center justify-center text-[10px] font-bold flex-shrink-0">2</span>
                    <p>Full Point: 50 pts en 1 caballo. Dual: 25+25 en 2. Smart: 30+15+5 en 3</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple/20 text-purple-light flex items-center justify-center text-[10px] font-bold flex-shrink-0">3</span>
                    <p>Todas las apuestas son al ganador. Si tu caballo gana, sumas sus puntos</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple/20 text-purple-light flex items-center justify-center text-[10px] font-bold flex-shrink-0">4</span>
                    <p>Tienes <span className="text-gold font-semibold">3 tickets gratis</span> por torneo: cada uno recorre las 7 carreras y suma su propio total (no se mezclan)</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Official Figma Final Ranking Podium & Leaderboard (Pages 6–9, 63, 65) */}
          <FigmaFinalRanking
            tournamentName={tournament.name}
            isFinished={tournament.status === 'finished' || allRacesPlayed}
          />
        </div>
      </div>

      {confirmedRace && (
        <TicketConfirmation
          isOpen={showConfirmation}
          onClose={handleCloseConfirmation}
          raceName={currentRace?.name}
          raceNumber={currentRace?.number}
          activeStrategy={activeStrategy}
          selectedHorses={picks[confirmedRace] || []}
          horses={tournament.races.find((r) => r.id === confirmedRace)?.horses || []}
          tournamentSlug={tournament.slug}
        />
      )}
      <AnimatePresence>
        {gameAlert.show && renderGameAlertModal()}
      </AnimatePresence>

      <DividendsTableModal
        isOpen={showDividendsModal}
        onClose={() => setShowDividendsModal(false)}
        tournamentSlug={tournament?.slug}
      />
    </div>
    </ModalityScope>
  );
}

function InfoRow({ label, value, highlight = false }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-white/30">{label}</span>
      <span className={`text-xs font-medium ${highlight ? 'text-gold font-bold' : 'text-white/70'}`}>{value}</span>
    </div>
  );
}

function ConfirmedRaceSummary({
  race,
  ticket,
  onEdit,
  isClosed,
}) {
  const strategyKey = STRATEGY_REVERSE[ticket?.strategy] || 'full';
  const strategy = strategies.find((s) => s.id === strategyKey);
  const allocation = strategy?.allocation || [50];

  const selectedHorseData = (ticket?.picks || [])
    .map((id) => race.horses.find((h) => h.id === id))
    .filter(Boolean);

  return (
    <>
      {/* Desktop sidebar card */}
      <div className="block">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-lg overflow-hidden sticky top-4">
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Picks Confirmados
              </h3>
            </div>
            <p className="text-xs text-white/40 font-semibold text-white/60">Carrera {race.raceNumber ?? race.number}</p>
          </div>

          {/* Strategy badge */}
          <div className="px-4 py-3 border-b border-white/5 bg-white/[0.01]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Estrategia</span>
              <span className={`text-xs font-black px-2.5 py-1 rounded bg-gradient-to-r ${strategy?.gradient || 'from-purple to-purple-light'} text-white shadow-sm`}>
                {strategy?.name || 'Full Point'}
              </span>
            </div>
          </div>

          {/* Picks list */}
          <div className="p-4">
            {selectedHorseData.length === 0 ? (
              <div className="flex items-center gap-2 text-white/30 text-xs py-6 justify-center">
                <AlertCircle size={14} />
                <span>Sin selecciones</span>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedHorseData.map((horse, idx) => (
                  <div
                    key={horse.id}
                    className="flex items-center justify-between bg-white/[0.03] rounded-lg p-2.5 border border-white/5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm
                        ${idx === 0 ? 'bg-purple' : idx === 1 ? 'bg-cyan' : 'bg-gold text-black'}
                      `}>
                        {horse.postPosition}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{horse.name}</p>
                        <p className="text-[10px] text-white/40">{allocation[idx]}pts x {horse.odds.toFixed(2)}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded shadow-sm
                      ${idx === 0 ? 'bg-purple text-white' : idx === 1 ? 'bg-cyan text-white' : 'bg-gold text-black'}
                    `}>
                      {Math.round(allocation[idx] * horse.odds)}pts
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Edit button */}
          <div className="p-4 pt-0">
            {isClosed ? (
              <button
                disabled
                className="w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wider bg-white/5 text-white/20 cursor-not-allowed border border-white/5 flex items-center justify-center gap-2"
              >
                <Lock size={14} />
                Carrera Cerrada
              </button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onEdit}
                className="w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wider bg-gradient-to-r from-purple/40 to-purple-light/40 hover:from-purple hover:to-purple-light text-white border border-purple-light/35 shadow-[0_0_20px_rgba(124,58,237,0.2)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] transition-all duration-300"
              >
                Editar Picks
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile bottom bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-brand-dark/95 backdrop-blur-xl border-t border-white/10 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 min-w-0">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span className="text-xs font-bold text-white truncate">
              C{race.raceNumber ?? race.number} · {strategy?.name || 'Full'}
            </span>
          </div>
          {isClosed ? (
            <span className="text-xs font-bold text-white/30 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
              <Lock size={12} />
              Cerrada
            </span>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onEdit}
              className="px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-purple text-white shadow-[0_0_15px_rgba(124,58,237,0.4)]"
            >
              Editar
            </motion.button>
          )}
        </div>
      </div>
    </>
  );
}

