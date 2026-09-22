"use client";

import { Pencil } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { useAuth } from "@/frontend/contexts/AuthContext";
import { fetchAuthJson } from "@/frontend/lib/api/client";
import TicketUnlockModal from "@/frontend/components/tournament/TicketUnlockModal";
import { fetchTournamentDetail } from "@/frontend/lib/api/tournaments";
import { normalizeTournament } from "@/frontend/lib/tournamentNormalize";
import RaceCard from "@/frontend/components/tournament/RaceCard";
import { strategies } from "@/frontend/components/tournament/PickSelector";
import TicketStrategyReview from "@/frontend/components/onboarding/TicketStrategyReview";
import TicketReceipt from "@/frontend/components/onboarding/TicketReceipt";
import {
  buildTicketReceiptCode,
  persistTicketReceiptCode,
  readTicketReceiptCode,
} from "@/frontend/lib/ticketReceiptCode";
import {
  getUsedTicketMeta,
  isTrackTicketUsed,
  markTrackTicketUsed,
  unmarkTrackTicketUsed,
} from "@/frontend/lib/trackTicketUsage";
import { STRATEGY_MAP, STRATEGY_REVERSE, getRacePickSummary } from "@/frontend/lib/ticketRaceSummary";
import {
  BrowserTabs,
  BrowserTabBar,
  BrowserTabPanel,
} from "@/frontend/components/ui/BrowserTabBar";
import LobbyDashboardSidebar from "@/frontend/components/modalities/LobbyDashboardSidebar";

function Modality4NextStepsPanel({ trackName, startTime }) {
  return (
    <div className="p-6 bg-zinc-950/60 border border-purple-500/20 rounded-2xl shadow-xl text-left relative overflow-hidden backdrop-blur-md w-full">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600" />
      
      <h3 className="text-sm font-black text-purple-400 uppercase tracking-widest mb-4 flex items-center gap-2 select-none">
        <span>🏇</span> ¿QUÉ SIGUE AHORA? / PRÓXIMOS PASOS
      </h3>
      
      <ul className="flex flex-col gap-4 text-xs text-zinc-300">
        <li className="flex gap-3 items-start">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-500/10 text-purple-400 font-bold text-[10px] shrink-0 mt-0.5 border border-purple-500/20">
            1
          </span>
          <div>
            <h4 className="font-extrabold text-white uppercase tracking-wider mb-1">Espera el inicio del torneo</h4>
            <p className="text-zinc-400 leading-relaxed font-semibold">
              El torneo de <strong className="text-white">{trackName}</strong> iniciará oficialmente en la fecha programada. Las carreras se correrán en tiempo real.
            </p>
          </div>
        </li>

        <li className="flex gap-3 items-start">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-500/10 text-purple-400 font-bold text-[10px] shrink-0 mt-0.5 border border-purple-500/20">
            2
          </span>
          <div>
            <h4 className="font-extrabold text-white uppercase tracking-wider mb-1">Monitorea la tabla de posiciones</h4>
            <p className="text-zinc-400 leading-relaxed font-semibold">
              Una vez que inicien las carreras, podrás ver la tabla de posiciones global en tiempo real para seguir el puntaje acumulado de tus tickets.
            </p>
          </div>
        </li>

        <li className="flex gap-3 items-start">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-500/10 text-purple-400 font-bold text-[10px] shrink-0 mt-0.5 border border-purple-500/20">
            3
          </span>
          <div>
            <h4 className="font-extrabold text-white uppercase tracking-wider mb-1">Reclama tu ticket destacado</h4>
            <p className="text-zinc-400 leading-relaxed font-semibold">
              Al finalizar, si tu ticket logra una puntuación alta, podrás <strong className="text-purple-400">reclamarlo</strong> desde una cuenta registrada (iniciando sesión o registrándote) a cambio de sacrificar uno de tus Top 5 tickets personales. ¡El ticket conservará tu alias original en el historial de por vida!
            </p>
          </div>
        </li>
      </ul>
      
      <div className="mt-5 pt-4 border-t border-zinc-900 flex justify-between items-center text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
        <span>ESTADO: TICKET CONFIRMADO</span>
        <span className="text-emerald-400">● LISTO PARA EL TORNEO</span>
      </div>
    </div>
  );
}

/** Una carrera admite apuestas solo hasta su hora de salida. El estado del
 *  backend puede ir unos minutos por detrás (lo refresca el ciclo de sync), así
 *  que además se compara con la hora real: sin esto se podía apostar a una
 *  carrera que ya estaba corriendo. */
function isRaceBettable(race) {
  const closed = ["finished", "completed", "running"];
  if (closed.includes(String(race?.status || "").toLowerCase())) return false;
  const post = race?.scheduledTime;
  if (post && post !== "TBD") {
    const t = new Date(post).getTime();
    if (!isNaN(t) && Date.now() >= t) return false;
  }
  return true;
}

export default function EmbeddedTicketRaces({
  tournamentSlug,
  ticketNum,
  trackSlug,
  trackName = "",
  onUsageChange,
}) {
  const { t, language } = useLanguage();
  const { token, ensureGuestSession, loading: authLoading } = useAuth();
  const [tournamentRaw, setTournamentRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submittedTickets, setSubmittedTickets] = useState({});
  const [expandedRace, setExpandedRace] = useState(null);
  const [activeStrategy, setActiveStrategy] = useState("full");
  const [picks, setPicks] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [tutorialStep, setTutorialStep] = useState("strategy");
  const [showSummary, setShowSummary] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [ticketFinalized, setTicketFinalized] = useState(false);
  const [receiptCode, setReceiptCode] = useState("");
  const [receiptIssuedAt, setReceiptIssuedAt] = useState(() => new Date());
  const [clearing, setClearing] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [ticketUsed, setTicketUsed] = useState(() => isTrackTicketUsed(trackSlug, ticketNum));
  // Same aggregate + ad entitlement as the canonical tournament flow:
  // Tickets 2 & 3 need their own completed ad each (M2 and M4 alike).
  const [unlocks, setUnlocks] = useState({ 2: false, 3: false });
  const [ticketConfirmed, setTicketConfirmed] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [aggregateState, setAggregateState] = useState({ phase: 'idle', message: '' });
  const [gameAlert, setGameAlert] = useState({
    show: false,
    title: "",
    message: "",
    type: "error", // "error" | "warning" | "success"
  });

  useEffect(() => {
    if (!expandedRace) return;
    const timer = setTimeout(() => {
      const element = document.getElementById(`race-zone-${expandedRace}`);
      if (element) {
        const elementRect = element.getBoundingClientRect();
        const absoluteElementTop = elementRect.top + (window.pageYOffset || document.documentElement.scrollTop);
        // 130px offset keeps the horizontal races tabs bar fully visible at the top
        const scrollOffset = Math.max(0, absoluteElementTop - 130);
        
        window.scrollTo({
          top: scrollOffset,
          behavior: "smooth",
        });
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [expandedRace]);

  useEffect(() => {
    if (tutorialStep === "horses" && expandedRace) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`horses-zone-${expandedRace}`);
        if (element) {
          const elementRect = element.getBoundingClientRect();
          const absoluteElementTop = elementRect.top + (window.pageYOffset || document.documentElement.scrollTop);
          const scrollOffset = Math.max(0, absoluteElementTop - 140);
          window.scrollTo({
            top: scrollOffset,
            behavior: "smooth",
          });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [tutorialStep, expandedRace]);

  const showGameAlert = useCallback((rawMessage, type = "error") => {
    let title = language === "en" ? "⚠️ SYSTEM NOTICE" : "⚠️ AVISO DEL JUEGO";
    let message = rawMessage;

    const lowerMsg = typeof rawMessage === "string" ? rawMessage.toLowerCase() : "";

    if (
      lowerMsg.includes("no longer accepting picks") ||
      lowerMsg.includes("carrera ya no acepta") ||
      lowerMsg.includes("cerrada") ||
      lowerMsg.includes("closed")
    ) {
      title = language === "en" ? "🔒 RACE CLOSED" : "🔒 CARRERA CERRADA";
      message = language === "en"
        ? "This race is closed and no longer accepting picks! Complete your selections for the other open races."
        : "¡Esta carrera ya comenzó y está cerrada! No se aceptan más selecciones para esta carrera. Completa las otras carreras abiertas.";
    } else if (lowerMsg.includes("submiterror") || lowerMsg.includes("error al enviar")) {
      title = language === "en" ? "❌ TRANSACTION ERROR" : "❌ ERROR DE ENVÍO";
      message = language === "en"
        ? "We could not register your selection. Please check your network connection and try again."
        : "No se pudo registrar tu selección. Por favor, verifica tu conexión y vuelve a intentarlo.";
    }

    setGameAlert({
      show: true,
      title,
      message,
      type,
    });
  }, [language]);

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
            {language === "en" ? "Understood" : "Entendido"}
          </button>
        </motion.div>
      </div>
    );
  }, [gameAlert.show, gameAlert.title, gameAlert.message, gameAlert.type, language]);

  useEffect(() => {
    const syncUsed = () => setTicketUsed(isTrackTicketUsed(trackSlug, ticketNum));
    syncUsed();
    window.addEventListener("50points-tickets-updated", syncUsed);
    return () => window.removeEventListener("50points-tickets-updated", syncUsed);
  }, [trackSlug, ticketNum]);

  useEffect(() => {
    if (authLoading || token || !tournamentSlug) return;
    ensureGuestSession().catch(() => {});
  }, [authLoading, token, tournamentSlug, ensureGuestSession]);

  useEffect(() => {
    const used = ticketUsed;
    setTicketFinalized(used);
    if (used && tournamentSlug) {
      const saved = readTicketReceiptCode(trackSlug, ticketNum, tournamentSlug);
      if (saved) setReceiptCode(saved);
      setShowReceipt(true);
      setShowSummary(false);
    } else if (!used) {
      setShowReceipt(false);
    }
  }, [trackSlug, ticketNum, tournamentSlug, ticketUsed]);

  useEffect(() => {
    if (!tournamentSlug) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchTournamentDetail(tournamentSlug, { refresh: false })
      .then((data) => {
        if (cancelled) return;
        if (data.tournament?.races && data.tournament.races.length > 0) {
          setTournamentRaw(data.tournament);
          setLoading(false);
        } else {
          // Fall back to scraping refresh only if empty
          fetchTournamentDetail(tournamentSlug, { refresh: true })
            .then((freshData) => {
              if (cancelled) return;
              setTournamentRaw(freshData.tournament);
            })
            .catch((err) => {
              if (cancelled) return;
              setError(err.message);
            })
            .finally(() => {
              if (!cancelled) setLoading(false);
            });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tournamentSlug]);

  useEffect(() => {
    if (!tournamentRaw) return;
    let cancelled = false;

    async function loadSubmittedTickets() {
      try {
        if (!token) {
          await ensureGuestSession();
        }
      } catch {
        return;
      }
      if (cancelled) return;
      try {
        const data = await fetchAuthJson(`/tickets?tournamentId=${tournamentRaw.id}`);
        if (!data?.tickets) return;
        const ticketMap = {};
        for (const ticket of data.tickets) {
          if (ticket.ticketNumber === ticketNum) {
            ticketMap[`${ticket.raceId}-${ticket.ticketNumber}`] = ticket;
          }
        }
        if (!cancelled) setSubmittedTickets(ticketMap);
      } catch {
        /* guest session may still be starting */
      }
    }

    loadSubmittedTickets();
    return () => {
      cancelled = true;
    };
  }, [token, tournamentRaw, ticketNum, ensureGuestSession]);

  const tournament = useMemo(
    () => (tournamentRaw ? normalizeTournament(tournamentRaw) : null),
    [tournamentRaw],
  );

  // Entitlement + confirmed state from the backend (same source of truth).
  useEffect(() => {
    if (!token || !tournamentRaw) return;
    let cancelled = false;
    fetchAuthJson(`/tickets/unlocks?tournamentId=${tournamentRaw.id}`)
      .then((data) => {
        if (cancelled || !data) return;
        setUnlocks({ 2: Boolean(data.ticket2), 3: Boolean(data.ticket3) });
        if (data.confirmed && data.confirmed[ticketNum]) setTicketConfirmed(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token, tournamentRaw, ticketNum]);

  const isLocked = ticketNum > 1 && !unlocks[ticketNum] && !ticketConfirmed;

  // Auto-lock the complete 7-race ticket via /aggregate (same as canonical flow).
  const aggregateTried = useRef({});
  useEffect(() => {
    if (!tournament || !token || !tournamentRaw?.id) return;
    if (!allRacesSubmitted || ticketConfirmed) return;
    const submittable = ['upcoming', 'live', 'open'].includes(tournament.status);
    if (!submittable) return;
    const triedKey = `${ticketNum}:${tournament.races.length}`;
    if (aggregateTried.current[triedKey]) return;
    aggregateTried.current[triedKey] = true;
    let live = true;
    (async () => {
      setAggregateState({ phase: 'saving', message: '' });
      try {
        const selections = tournament.races.map((r, idx) => {
          const sub = submittedTickets[`${r.id}-${ticketNum}`];
          return { raceId: r.id, raceOrder: idx + 1, strategy: sub.strategy, picks: sub.picks };
        });
        await fetchAuthJson('/tickets/aggregate', {
          method: 'POST',
          body: JSON.stringify({ tournamentId: tournamentRaw.id, ticketNumber: ticketNum, selections }),
        });
        if (live) {
          setAggregateState({ phase: 'saved', message: '' });
          setTicketConfirmed(true);
        }
      } catch (err) {
        if (live) {
          const msg = err?.data?.detail || err?.message || 'No se pudo bloquear el ticket';
          setAggregateState({ phase: 'error', message: typeof msg === 'string' ? msg : 'Error' });
        }
      }
    })();
    return () => { live = false; };
  }, [tournament, token, tournamentRaw, ticketNum, allRacesSubmitted, ticketConfirmed, submittedTickets]);

  const submittedForRace = useCallback(
    (raceId) => submittedTickets[`${raceId}-${ticketNum}`],
    [submittedTickets, ticketNum],
  );

  const allRacesSubmitted = useMemo(
    () =>
      Boolean(
        tournament?.races?.length &&
          tournament.races.every((race) => submittedForRace(race.id)),
      ),
    [tournament, submittedForRace],
  );

  const selectRace = useCallback(
    async (raceId) => {
      // Auto-save current race if it has complete picks and is not submitted yet
      if (expandedRace && !submittedForRace(expandedRace) && !showSummary) {
        const racePicks = picks[expandedRace] || [];
        const maxPicks = strategies.find((s) => s.id === activeStrategy)?.maxPicks || 1;
        if (racePicks.length === maxPicks) {
          try {
            if (!token) {
              await ensureGuestSession();
            }
            const currentRace = tournament?.races.find((r) => r.id === expandedRace);
            const apiStrategy = STRATEGY_MAP[activeStrategy];
            const data = await fetchAuthJson("/tickets", {
              method: "POST",
              body: JSON.stringify({
                raceId: expandedRace,
                tournamentId: tournamentRaw?.id,
                raceNumber: currentRace?.raceNumber ?? currentRace?.number,
                strategy: apiStrategy,
                picks: racePicks,
                ticketNumber: ticketNum,
              }),
            });

            // Update submittedTickets state immediately
            setSubmittedTickets((prev) => ({
              ...prev,
              [`${expandedRace}-${ticketNum}`]: {
                ...data.ticket,
                raceId: expandedRace,
                ticketNumber: ticketNum,
              },
            }));
          } catch (err) {
            console.error("Auto-submit failed", err);
          }
        }
      }

      setShowSummary(false);
      setExpandedRace(raceId);
      setTutorialStep("strategy");
      const sub = submittedTickets[`${raceId}-${ticketNum}`];
      if (sub) {
        setActiveStrategy(STRATEGY_REVERSE[sub.strategy] || "full");
        setPicks((prev) => ({ ...prev, [raceId]: sub.picks || [] }));
      } else {
        setActiveStrategy("full");
        setPicks((prev) => ({ ...prev, [raceId]: prev[raceId] || [] }));
      }
    },
    [
      expandedRace,
      picks,
      activeStrategy,
      submittedTickets,
      ticketNum,
      token,
      ensureGuestSession,
      tournament,
      tournamentRaw,
      submittedForRace,
      showSummary,
    ],
  );

  useEffect(() => {
    if (ticketUsed || !tournament?.races?.length || showSummary || ticketFinalized || showReceipt) {
      return;
    }
    if (expandedRace && tournament.races.some((race) => race.id === expandedRace)) {
      return;
    }
    const firstOpen =
      tournament.races.find(
        (race) => !submittedTickets[`${race.id}-${ticketNum}`] && isRaceBettable(race)
      ) ||
      tournament.races.find((race) => isRaceBettable(race)) ||
      tournament.races[0];
    if (firstOpen) selectRace(firstOpen.id);
  }, [
    tournamentRaw?.id,
    ticketNum,
    tournament?.races,
    submittedTickets,
    selectRace,
    showSummary,
    ticketFinalized,
    ticketUsed,
    showReceipt,
    expandedRace,
  ]);

  useEffect(() => {
    if (ticketUsed || !allRacesSubmitted) return;
    setShowSummary(true);
    setShowReceipt(false);
  }, [allRacesSubmitted, ticketUsed]);

  useEffect(() => {
    if (!showReceipt || ticketUsed) return;
    if (ticketFinalized && allRacesSubmitted) {
      setShowSummary(false);
    }
  }, [ticketFinalized, allRacesSubmitted, showReceipt, ticketUsed]);

  const confirmedStrategyForRace = useCallback(
    (raceId) => {
      const sub = submittedForRace(raceId);
      return sub ? STRATEGY_REVERSE[sub.strategy] || "full" : null;
    },
    [submittedForRace],
  );

  const confirmRacePicks = useCallback(async (raceId, racePicks) => {
    if (submitting || submittedForRace(raceId) || showSummary) return;
    if (!racePicks || racePicks.length === 0) return;

    setSubmitting(true);
    try {
      if (!token) {
        await ensureGuestSession();
      }

      const currentRace = tournament?.races.find((r) => r.id === raceId);
      const data = await fetchAuthJson("/tickets", {
        method: "POST",
        body: JSON.stringify({
          raceId: raceId,
          tournamentId: tournamentRaw?.id,
          raceNumber: currentRace?.raceNumber ?? currentRace?.number,
          strategy: STRATEGY_MAP[activeStrategy],
          picks: racePicks,
          ticketNumber: ticketNum,
        }),
      });

      const nextSubmitted = {
        ...submittedTickets,
        [`${raceId}-${ticketNum}`]: {
          ...data.ticket,
          raceId: raceId,
          ticketNumber: ticketNum,
        },
      };
      setSubmittedTickets(nextSubmitted);

      const allDone = (tournament?.races || []).every((race) =>
        Boolean(nextSubmitted[`${race.id}-${ticketNum}`]),
      );

      if (allDone) {
        setShowSummary(true);
      } else {
        const nextOpen = tournament?.races.find(
          (race) => !nextSubmitted[`${race.id}-${ticketNum}`],
        );
        if (nextOpen) {
          setTimeout(() => selectRace(nextOpen.id), 300);
        }
      }
    } catch (err) {
      const detail = err?.data?.detail;
      const msg =
        typeof detail === "string"
          ? detail
          : err?.message || t("gameModalities.submitError");
      showGameAlert(msg);
    } finally {
      setSubmitting(false);
    }
  }, [
    submitting,
    token,
    ensureGuestSession,
    activeStrategy,
    ticketNum,
    tournamentRaw,
    tournament,
    submittedTickets,
    submittedForRace,
    selectRace,
    t,
  ]);

  const handlePickHorse = useCallback(
    async (horseId) => {
      if (!expandedRace || submittedForRace(expandedRace) || showSummary) return;
      
      const currentPicks = picks[expandedRace] || [];
      const isRemoving = currentPicks.includes(horseId);
      const maxPicks = strategies.find((s) => s.id === activeStrategy)?.maxPicks || 1;
      
      let nextPicks;
      if (isRemoving) {
        nextPicks = currentPicks.filter((id) => id !== horseId);
      } else {
        if (currentPicks.length >= maxPicks) return;
        nextPicks = [...currentPicks, horseId];
      }

      setPicks((prev) => ({ ...prev, [expandedRace]: nextPicks }));

      if (nextPicks.length === maxPicks) {
        await confirmRacePicks(expandedRace, nextPicks);
      }
    },
    [expandedRace, activeStrategy, picks, submittedForRace, showSummary, confirmRacePicks],
  );

  const handleStrategyChange = useCallback(
    (strategyId) => {
      if (expandedRace && submittedForRace(expandedRace)) return;
      setActiveStrategy(strategyId);
      if (expandedRace) {
        setPicks((prev) => ({ ...prev, [expandedRace]: [] }));
      }
      setTutorialStep("horses");
    },
    [expandedRace, submittedForRace],
  );

  const goToNextRace = useCallback(() => {
    if (!tournament?.races?.length || !expandedRace) return;
    const idx = tournament.races.findIndex((race) => race.id === expandedRace);
    const nextRace = idx >= 0 ? tournament.races[idx + 1] : null;
    if (nextRace) selectRace(nextRace.id);
  }, [tournament, expandedRace, selectRace]);

  const handleEditRace = useCallback(
    async (raceId) => {
      if (!tournamentRaw?.id) return;
      try {
        if (!token) {
          await ensureGuestSession();
        }
        await fetchAuthJson(
          `/tickets?tournamentId=${tournamentRaw.id}&ticketNumber=${ticketNum}&raceId=${raceId}`,
          { method: "DELETE" },
        );
        setSubmittedTickets((prev) => {
          const next = { ...prev };
          delete next[`${raceId}-${ticketNum}`];
          return next;
        });
        setTicketFinalized(false);
        setShowSummary(false);
        selectRace(raceId);
      } catch (err) {
        showGameAlert(err?.message || t("gameModalities.submitError"));
      }
    },
    [
      tournamentRaw?.id,
      ticketNum,
      token,
      ensureGuestSession,
      selectRace,
      t,
      showGameAlert,
    ],
  );

  const handleClearTicket = useCallback(async () => {
    if (!tournamentRaw?.id || clearing) return;
    setClearing(true);
    try {
      if (!token) {
        await ensureGuestSession();
      }
      await fetchAuthJson(
        `/tickets?tournamentId=${tournamentRaw.id}&ticketNumber=${ticketNum}`,
        { method: "DELETE" },
      );
      setSubmittedTickets({});
      setPicks({});
      setShowSummary(false);
      setShowReceipt(false);
      setTicketFinalized(false);
      setTicketUsed(false);
      unmarkTrackTicketUsed(trackSlug, ticketNum);
      onUsageChange?.();
      const firstRace = tournament?.races?.[0];
      if (firstRace) selectRace(firstRace.id);
    } catch (err) {
      showGameAlert(err?.message || t("gameModalities.ticketReviewClearError"));
    } finally {
      setClearing(false);
    }
  }, [
    tournamentRaw?.id,
    ticketNum,
    clearing,
    token,
    ensureGuestSession,
    tournament,
    selectRace,
    trackSlug,
    onUsageChange,
    t,
    showGameAlert,
  ]);

  const handleFinalizeTicket = useCallback(async () => {
    if (!allRacesSubmitted || finalizing || ticketFinalized) return;
    setFinalizing(true);
    try {
      const raceIds = (tournament?.races || []).map((race) => race.id);
      const code =
        readTicketReceiptCode(trackSlug, ticketNum, tournament?.slug || tournamentSlug) ||
        buildTicketReceiptCode({
          tournamentId: tournamentRaw?.id,
          ticketNum,
          trackSlug,
          raceIds,
        });
      // Same aggregate root as the canonical flow: persist the complete
      // 7-race ticket server-side (best-effort; receipt flow continues).
      try {
        const selections = (tournament?.races || []).map((r, idx) => {
          const sub = submittedTickets[`${r.id}-${ticketNum}`];
          return { raceId: r.id, raceOrder: idx + 1, strategy: sub.strategy, picks: sub.picks };
        });
        if (selections.length >= 7 && selections.every((s) => Array.isArray(s.picks) && s.picks.length > 0)) {
          await fetchAuthJson('/tickets/aggregate', {
            method: 'POST',
            body: JSON.stringify({ tournamentId: tournamentRaw?.id, ticketNumber: ticketNum, selections }),
          });
          setTicketConfirmed(true);
          setAggregateState({ phase: 'saved', message: '' });
        }
      } catch (aggErr) {
        setAggregateState({ phase: 'error', message: aggErr?.data?.detail || aggErr?.message || 'Error' });
      }
      const issuedAt = new Date();
      persistTicketReceiptCode(trackSlug, ticketNum, tournament?.slug || tournamentSlug, code);
      markTrackTicketUsed(
        trackSlug,
        ticketNum,
        tournament?.slug,
        tournament?.name || trackName,
      );
      setTicketUsed(true);
      setReceiptCode(code);
      setReceiptIssuedAt(issuedAt);
      setTicketFinalized(true);
      setShowSummary(false);
      setShowReceipt(true);
      onUsageChange?.();
    } finally {
      setFinalizing(false);
    }
  }, [
    allRacesSubmitted,
    finalizing,
    ticketFinalized,
    trackSlug,
    ticketNum,
    tournament?.slug,
    tournament?.races,
    tournamentSlug,
    tournamentRaw?.id,
    trackSlug,
    onUsageChange,
    trackName,
    tournament?.name,
  ]);

  const usedMeta = getUsedTicketMeta(trackSlug, ticketNum);
  const tournamentDisplayName =
    tournament?.name ||
    usedMeta?.tournamentName ||
    trackName ||
    tournament?.track ||
    "";

  const renderReceipt = (readOnly = false) => {
    const code =
      receiptCode ||
      readTicketReceiptCode(trackSlug, ticketNum, tournament?.slug || tournamentSlug) ||
      buildTicketReceiptCode({
        tournamentId: tournamentRaw?.id,
        ticketNum,
        trackSlug,
        raceIds: tournament.races.map((race) => race.id),
      });

    const firstTicketKey = Object.keys(submittedTickets || {})[0];
    const firstTicket = firstTicketKey ? submittedTickets[firstTicketKey] : null;
    const isClaimed = firstTicket?.isClaimed || false;
    const claimedBy = firstTicket?.claimedBy || null;

    return (
      <div className="flex flex-col items-center justify-center w-full my-4">
        {/* Ticket Receipt Centered */}
        <div className="w-full max-w-md flex flex-col items-center">
          <TicketReceipt
            trackName={trackName || tournament.track || tournament.name}
            trackLocation={tournament.location}
            tournamentName={tournamentDisplayName}
            ticketNum={ticketNum}
            tournament={tournament}
            submittedTickets={submittedTickets}
            receiptCode={code}
            issuedAt={receiptIssuedAt}
            isEn={language === "en"}
            readOnly={readOnly}
            isClaimed={isClaimed}
            claimedBy={claimedBy}
            onEdit={
              readOnly
                ? undefined
                : () => {
                    setShowReceipt(false);
                    setShowSummary(true);
                  }
            }
            t={t}
          />
        </div>
      </div>
    );
  };

  if (loading) {
    return <p className="comenzar-inline-races__status">{t("gameModalities.loading")}</p>;
  }

  if (error) {
    return <p className="comenzar-inline-races__status">{error}</p>;
  }

  if (!tournament?.races?.length) {
    return <p className="comenzar-inline-races__status">{t("tournamentsSection.empty")}</p>;
  }

  if (ticketUsed) {
    return renderReceipt(true);
  }

  if (showReceipt && (ticketFinalized || receiptCode)) {
    return renderReceipt(false);
  }

  if (showSummary && allRacesSubmitted && !ticketFinalized) {
    return (
      <>
        <TicketStrategyReview
          trackName={trackName || tournament.track || tournament.name}
          ticketNum={ticketNum}
          tournament={tournament}
          submittedTickets={submittedTickets}
          onEditRace={handleEditRace}
          onClear={handleClearTicket}
          onBack={() => {
            setShowSummary(false);
            const resume =
              tournament.races.find((race) => !submittedForRace(race.id)) || tournament.races[0];
            if (resume) selectRace(resume.id);
          }}
          onConfirmTicket={handleFinalizeTicket}
          clearing={clearing}
          confirming={finalizing}
          readOnly={false}
          t={t}
        />
        <AnimatePresence>
          {gameAlert.show && renderGameAlertModal()}
        </AnimatePresence>
      </>
    );
  }

  const expandedRaceData = tournament.races.find((r) => r.id === expandedRace);
  const currentRacePicks = expandedRace ? picks[expandedRace] || [] : [];
  const strategy = strategies.find((s) => s.id === activeStrategy);
  const isPicksComplete = currentRacePicks.length === (strategy?.maxPicks || 1);
  const expandedDone = expandedRace ? Boolean(submittedForRace(expandedRace)) : false;
  const expandedRaceIndex = expandedRace
    ? tournament.races.findIndex((race) => race.id === expandedRace)
    : -1;
  const hasNextRace =
    expandedRaceIndex >= 0 && expandedRaceIndex < tournament.races.length - 1;
  const confirmedCount = tournament.races.filter((race) =>
    Boolean(submittedForRace(race.id)),
  ).length;
  const currentRaceNum =
    expandedRaceData?.raceNumber ?? expandedRaceData?.number ?? expandedRaceIndex + 1;

  if (!expandedRace || !expandedRaceData) {
    return <p className="comenzar-inline-races__status">{t("gameModalities.loading")}</p>;
  }

  // Same ad entitlement as the canonical tournament flow: Tickets 2 & 3 need
  // their own completed ad each (M2 and M4 guests alike).
  if (isLocked) {
    return (
      <div className="rounded-2xl border border-amber-400/40 bg-amber-400/5 p-6 text-center">
        <p className="text-amber-300 text-sm font-black uppercase tracking-widest">
          Boleto {ticketNum} bloqueado
        </p>
        <p className="text-zinc-400 text-xs mt-2 mb-4">{t("ads.m2Rule")}</p>
        <button
          type="button"
          onClick={() => setShowUnlockModal(true)}
          className="rounded-xl bg-amber-400 hover:brightness-110 text-black text-xs font-black uppercase tracking-widest px-6 py-3 cursor-pointer"
        >
          {t("ads.watchAd")}
        </button>
        {showUnlockModal && (
          <TicketUnlockModal
            ticketNumber={ticketNum}
            tournamentId={tournamentRaw?.id}
            tournamentName={tournament?.name}
            onClose={() => setShowUnlockModal(false)}
            onUnlocked={() => {
              setShowUnlockModal(false);
              fetchAuthJson(`/tickets/unlocks?tournamentId=${tournamentRaw?.id}`)
                .then((data) => {
                  if (data) setUnlocks({ 2: Boolean(data.ticket2), 3: Boolean(data.ticket3) });
                })
                .catch(() => {});
            }}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <BrowserTabs className="browser-tabs--races comenzar-inline-races comenzar-inline-races--linear">
        <BrowserTabBar
          className="browser-tabs__bar--races ticket-race-overview tour-step-races-bar"
          role="tablist"
          aria-label={t("gameModalities.raceLabel")}
        >
          {tournament.races.map((race) => {
            const raceNum = race.raceNumber ?? race.number ?? tournament.races.indexOf(race) + 1;
            const isActive = expandedRace === race.id;
            const submitted = submittedForRace(race.id);
            const summary = getRacePickSummary(
              race,
              submitted,
              picks[race.id],
              isActive ? activeStrategy : submitted ? STRATEGY_REVERSE[submitted.strategy] || "full" : activeStrategy,
            );

            const strategyId =
              summary.strategyId ||
              (submitted ? STRATEGY_REVERSE[submitted.strategy] || null : null);

            let statusLabel = t("gameModalities.raceOverviewNoPick");
            if (summary.ready) statusLabel = t("gameModalities.raceOverviewReady");
            else if (summary.draft) statusLabel = t("gameModalities.raceOverviewDraft");
            else if (isActive) statusLabel = t("gameModalities.raceOverviewEdit");

            return (
              <div
                key={race.id}
                role="tab"
                id={`race-tab-${race.id}`}
                aria-controls={`race-zone-${race.id}`}
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                className={`browser-tabs__tab ticket-race-overview__card${
                  isActive ? " browser-tabs__tab--active ticket-race-overview__card--active active-tutorial-tab" : ""
                }${summary.ready ? " ticket-race-overview__card--ready" : ""}${
                  strategyId ? ` ticket-race-overview__card--${strategyId}` : ""
                }`}
                onClick={() => selectRace(race.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    selectRace(race.id);
                  }
                }}
              >
                <span className="ticket-race-overview__head">
                  {t("gameModalities.raceLabel")} {raceNum}
                </span>
                <div className="ticket-race-overview__body">
                  <span className="ticket-race-overview__strategy">
                    {summary.strategy || "—"}
                  </span>
                  <div className="ticket-race-overview__picks">
                    {summary.posts.length
                      ? summary.posts.map((post, index) => (
                          <span key={`${race.id}-pick-${index}`} className="ticket-race-overview__pick">
                            {post}
                          </span>
                        ))
                      : t("gameModalities.raceOverviewNoPick")}
                  </div>
                </div>
                {summary.ready ? (
                  <button
                    type="button"
                    className="ticket-race-overview__edit"
                    aria-label={`${t("gameModalities.raceOverviewEdit")} ${t("gameModalities.raceLabel")} ${raceNum}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleEditRace(race.id);
                    }}
                  >
                    <Pencil className="ticket-race-overview__edit-icon" strokeWidth={2.5} aria-hidden />
                    {t("gameModalities.raceOverviewEdit")}
                  </button>
                ) : (
                  <span
                    className={`ticket-race-overview__status${
                      summary.ready ? " ticket-race-overview__status--ready" : ""
                    }`}
                  >
                    {statusLabel}
                  </span>
                )}
              </div>
            );
          })}
        </BrowserTabBar>

        <BrowserTabPanel
          className="comenzar-inline-races__zone"
          id={`race-zone-${expandedRace}`}
          role="tabpanel"
          aria-labelledby={`race-tab-${expandedRace}`}
          style={{
            borderColor: activeStrategy === "full" ? "#a855f7" : activeStrategy === "dual" ? "#06b6d4" : "#eab308",
            boxShadow: activeStrategy === "full" ? "0 0 25px rgba(168, 85, 247, 0.25)" : activeStrategy === "dual" ? "0 0 25px rgba(6, 182, 212, 0.25)" : "0 0 25px rgba(234, 179, 8, 0.25)",
            transition: "border-color 0.3s ease, box-shadow 0.3s ease",
          }}
        >
          <div className="comenzar-inline-races__zone-body">
            <RaceCard
              race={expandedRaceData}
              activeStrategy={activeStrategy}
              selectedHorses={currentRacePicks}
              confirmedStrategy={confirmedStrategyForRace(expandedRaceData.id)}
              onPickHorse={expandedDone ? undefined : handlePickHorse}
              onStrategyChange={expandedDone ? undefined : handleStrategyChange}
              isExpanded
              onToggleExpand={() => selectRace(expandedRaceData.id)}
              tournamentRace
              tutorialStep={tutorialStep}
              isLightMode={true}
            />
            <div className="comenzar-inline-races__pick-bar">
              <p className="comenzar-inline-races__progress">
                {t("gameModalities.raceLabel")} {currentRaceNum} / {tournament.races.length}
                <span className="comenzar-inline-races__progress-done">
                  {" · "}
                  {confirmedCount}/{tournament.races.length} {t("gameModalities.raceProgressDone")}
                </span>
              </p>
              <div className="comenzar-inline-races__pick-actions">
                {expandedDone && (
                  <button
                    type="button"
                    className="comenzar-inline-races__edit"
                    onClick={() => handleEditRace(expandedRaceData.id)}
                  >
                    <Pencil className="comenzar-inline-races__edit-icon" strokeWidth={2.5} aria-hidden />
                    {t("gameModalities.raceOverviewEdit")}
                  </button>
                )}
              </div>
            </div>
          </div>
        </BrowserTabPanel>
      </BrowserTabs>
      <AnimatePresence>
        {gameAlert.show && renderGameAlertModal()}
      </AnimatePresence>

    </>
  );
}
