"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/frontend/contexts/AuthContext";
import { Award, Copy, Check, Ticket as TicketIcon, ChevronDown, ChevronUp, UserPlus, Zap } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

function useGuestTimeLeft(user) {
  const [left, setLeft] = useState("");
  useEffect(() => {
    if (!user?.isGuest) { setLeft(""); return undefined; }
    const raw = user.expiresAt || (typeof window !== "undefined" ? localStorage.getItem("50points_guest_expires_at") : null);
    const expiry = raw ? new Date(raw).getTime() : NaN;
    if (!expiry || isNaN(expiry)) { setLeft(""); return undefined; }
    const tick = () => {
      const ms = expiry - Date.now();
      if (ms <= 0) { setLeft("0h 00m"); return; }
      const total = Math.floor(ms / 1000);
      setLeft(`${Math.floor(total / 3600)}h ${String(Math.floor((total % 3600) / 60)).padStart(2, "0")}m`);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [user]);
  return left;
}

export default function GuestClaimTicketsDrawer() {
  const { user } = useAuth();
  const guestTimeLeft = useGuestTimeLeft(user);
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [guestTickets, setGuestTickets] = useState([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [trackGroups, setTrackGroups] = useState([]);
  // Posicion en vivo por hipodromo mientras el torneo sigue corriendo:
  // { [trackName]: { rank, total } }
  const [livePositions, setLivePositions] = useState({});

  // Helper to get actual earned or calculated points for a ticket
  const getTicketScore = (t) => {
    if (typeof t.calculatedPoints === "number") return t.calculatedPoints;
    if (typeof t.pointsEarned === "number") return t.pointsEarned;
    return 0;
  };

  useEffect(() => {
    const fetchGuestProgress = async () => {
      try {
        let apiTickets = [];

        // 1. Fetch real tickets from backend API (PostgreSQL DB)
        const token = typeof window !== "undefined"
          ? (localStorage.getItem("50points_token") || localStorage.getItem("fiftypoints_auth_token") || localStorage.getItem("50points_guest_token") || localStorage.getItem("fiftypoints_guest_token"))
          : null;

        if (token) {
          try {
            const res = await fetch("/api/tickets", {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
              const data = await res.json();
              apiTickets = (data.tickets || []).filter(t => !t.isSimulation);
            }
          } catch (e) {}

        }

        // Track name normalizer helper to avoid duplicate keys
        const normalizeTrackName = (raw) => {
          if (!raw) return "DEL MAR";
          let name = String(raw).replace(/-2026.*$/, "").replace(/[-_]/g, " ").trim().toUpperCase();
          if (name.includes("DEL MAR") || name === "DEL-MAR") return "DEL MAR";
          if (name.includes("SARATOGA")) return "SARATOGA RACE COURSE";
          if (name.includes("SANTA ANITA")) return "SANTA ANITA PARK";
          if (name.includes("MONMOUTH")) return "MONMOUTH PARK";
          if (name.includes("GULFSTREAM")) return "GULFSTREAM PARK";
          if (name.includes("WOODBINE")) return "WOODBINE";
          if (name.includes("AQUEDUCT")) return "AQUEDUCT";
          if (name.includes("PENN")) return "PENN NATIONAL";
          if (name.includes("PARX")) return "PARX RACING";
          if (name.includes("KEENELAND")) return "KEENELAND";
          if (name.includes("PIMLICO")) return "PIMLICO";
          if (name.includes("CHURCHILL")) return "CHURCHILL DOWNS";
          return name;
        };

        const mergedMap = {};
        const currentGuestToken = user?.guestToken || (typeof window !== "undefined" ? localStorage.getItem("50points_guest_token") : null);

        // A. If API returned real database tickets for user, use API tickets as primary source of truth
        if (apiTickets.length > 0) {
          for (const t of apiTickets) {
            const rawTrack = t.trackName || t.tournamentName || t.tournament?.track?.name || t.tournament?.name || t.trackSlug || "DEL MAR";
            const trackName = normalizeTrackName(rawTrack);

            if (!mergedMap[trackName]) mergedMap[trackName] = {};

            const ticketNum = Number(t.ticketNumber || 1);
            const existing = mergedMap[trackName][ticketNum] || {
              id: t.id || `api-${trackName}-${ticketNum}`,
              ticketNumber: ticketNum,
              trackName: trackName,
              trackSlug: t.trackSlug || "del-mar",
              pointsEarned: 0,
              isScored: false,
              code: t.code || null,
              createdAt: t.createdAt || new Date().toISOString(),
              stratCounts: { full: 0, dual: 0, smart: 0 },
              totalRaces: 0
            };

            const sKey = String(t.strategy || "").toLowerCase();
            const stratCounts = { ...(existing.stratCounts || { full: 0, dual: 0, smart: 0 }) };
            if (sKey.includes("full")) stratCounts.full += 1;
            else if (sKey.includes("dual")) stratCounts.dual += 1;
            else stratCounts.smart += 1;

            existing.stratCounts = stratCounts;
            existing.totalRaces = (existing.totalRaces || 0) + 1;
            existing.pointsEarned = (existing.pointsEarned || 0) + (t.pointsEarned || 0);
            if (t.isScored) {
              existing.isScored = true;
              existing.scoredRaces = (existing.scoredRaces || 0) + 1;
              const rn = Number(t.raceNumber || 0);
              if (!existing.lastScored || rn >= existing.lastScored.raceNumber) {
                existing.lastScored = { raceNumber: rn, points: t.pointsEarned || 0 };
              }
            }
            if (["open", "upcoming", "live"].includes(String(t.raceStatus || "").toLowerCase())) {
              existing.hasPendingRace = true;
            }
            if (t.code) existing.code = t.code;

            const f = stratCounts.full;
            const d = stratCounts.dual;
            const sm = stratCounts.smart;
            const parts = [];
            if (f > 0) parts.push(`${f} Full`);
            if (d > 0) parts.push(`${d} Dual`);
            if (sm > 0) parts.push(`${sm} Smart`);

            if (parts.length === 1 && f >= 7) existing.strategyLabel = "FULL POINT (7 Carreras)";
            else if (parts.length === 1 && d >= 7) existing.strategyLabel = "DUAL POINT (7 Carreras)";
            else if (parts.length === 1 && sm >= 7) existing.strategyLabel = "SMART POINT (7 Carreras)";
            else existing.strategyLabel = parts.length > 0 ? `Estrategia (${parts.join(", ")})` : "FULL POINT (1 Caballo)";

            mergedMap[trackName][ticketNum] = existing;
          }
        } else if (typeof window !== "undefined") {
          // B. Only fallback to localStorage if apiTickets is empty
          try {
            const freeTrackRaw = localStorage.getItem("50points_free_track_tickets_v1");
            if (freeTrackRaw) {
              const freeTrackObj = JSON.parse(freeTrackRaw);
              for (const [trackSlug, trackMeta] of Object.entries(freeTrackObj)) {
                if (trackMeta && Array.isArray(trackMeta.used)) {
                  if (trackMeta.guestToken && currentGuestToken && trackMeta.guestToken !== currentGuestToken) {
                    continue;
                  }

                  const trackName = normalizeTrackName(trackMeta.tournamentName || trackSlug);
                  if (!mergedMap[trackName]) mergedMap[trackName] = {};

                  for (const num of trackMeta.used) {
                    const ticketNum = Number(num);
                    const ticketMeta = trackMeta.tickets?.[String(ticketNum)] || {};
                    mergedMap[trackName][ticketNum] = {
                      id: `local-${trackSlug}-${ticketNum}`,
                      ticketNumber: ticketNum,
                      strategy: ticketNum === 1 ? "full_point" : ticketNum === 2 ? "dual_point" : "smart_pick",
                      strategyLabel: ticketNum === 1 ? "FULL POINT (1 Caballo)" : ticketNum === 2 ? "DUAL POINT (2 Caballos)" : "SMART POINT (3 Caballos)",
                      trackName: trackName,
                      trackSlug: trackSlug,
                      pointsEarned: ticketMeta.pointsEarned || 0,
                      isScored: ticketMeta.isScored || false,
                      code: ticketMeta.code || null,
                      createdAt: ticketMeta.createdAt || new Date().toISOString()
                    };
                  }
                }
              }
            }
          } catch (e) {}
        }

        // Convert merged map into array of track groups
        const groups = Object.entries(mergedMap).map(([trackName, ticketsMap]) => ({
          trackName,
          ticketsList: Object.values(ticketsMap).sort((a, b) => (a.ticketNumber || 0) - (b.ticketNumber || 0))
        }));

        setTrackGroups(groups);
        const allUniqueTickets = groups.flatMap(g => g.ticketsList);
        setGuestTickets(allUniqueTickets);

        const pts = allUniqueTickets.reduce((acc, t) => acc + getTicketScore(t), 0);
        setTotalPoints(pts);

        // Torneos aun EN CURSO (queda alguna carrera por puntuar): traer la
        // clasificacion para mostrar la posicion del jugador en tiempo real.
        const livePos = {};
        const liveGroups = groups.filter((g) => g.ticketsList.some((t) => t.hasPendingRace));
        for (const g of liveGroups.slice(0, 3)) {
          const slug = g.ticketsList[0]?.trackSlug;
          if (!slug || !slug.includes("-20")) continue;
          try {
            const lr = await fetch(`/api/tournaments/${slug}/leaderboard`);
            if (lr.ok) {
              const ld = await lr.json();
              const rows = ld.leaderboard || [];
              const mine = rows.filter((r) => r.userId === user?.id);
              if (mine.length > 0) {
                livePos[g.trackName] = {
                  rank: Math.min(...mine.map((r) => r.rank)),
                  total: rows.length,
                };
              }
            }
          } catch (e) {}
        }
        setLivePositions(livePos);
      } catch (err) {
        console.warn("Failed to fetch guest ticket stats:", err);
      }
    };

    fetchGuestProgress();
    // El backend puntua en ciclos de ~5 min; refrescar cada 45 s da sensacion
    // de vivo sin el martilleo anterior (cada 2 s y con peticion duplicada).
    const interval = setInterval(fetchGuestProgress, 45000);
    const onTicketsUpdated = () => fetchGuestProgress();
    window.addEventListener("50points-tickets-updated", onTicketsUpdated);
    return () => {
      clearInterval(interval);
      window.removeEventListener("50points-tickets-updated", onTicketsUpdated);
    };
  }, [user]);

  const handleCopyCode = () => {
    const tokenToCopy = user?.guestToken || (typeof window !== "undefined" ? localStorage.getItem("fiftypoints_guest_token") : "50P-GUEST");
    if (!tokenToCopy) return;
    navigator.clipboard.writeText(tokenToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const displayGuestToken = user?.guestToken || (typeof window !== "undefined" ? localStorage.getItem("fiftypoints_guest_token") : "50P-GUEST");
  const displayGuestAlias = user?.username || user?.guestAlias || (typeof window !== "undefined" ? localStorage.getItem("fiftypoints_guest_alias") : "Invitado");

  // Sin sesión de invitado no hay progreso que mostrar. Esto pasa de forma
  // RUTINARIA: el perfil caduca a las 12 h, el resume devuelve 404 y `user`
  // queda null — antes el render seguía y `user.guestToken` tumbaba la página
  // entera ("Application error" con la pantalla en negro).
  if (!user?.isGuest) {
    return null;
  }

  return (
    <div className="guest-claim-tickets-drawer fixed bottom-4 right-4 z-50 flex flex-col items-end pointer-events-none max-w-md w-full px-2">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-auto w-full mb-3 bg-white border-2 border-[#7c3aed] shadow-[0_10px_35px_rgba(124,58,237,0.25)] rounded-2xl overflow-hidden text-slate-900 max-h-[82vh] flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#7c3aed] to-[#a855f7] p-3.5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black">
                  <Award className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs uppercase tracking-wide leading-tight">
                    Mi Progreso de Invitado
                  </h4>
                  <p className="text-[11px] text-purple-100 font-medium">
                    Alias: <strong className="text-amber-300">{displayGuestAlias}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                title="Cerrar"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content Container */}
            <div className="p-3.5 space-y-3 bg-slate-50 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-purple-300">
              {guestTimeLeft && (
                <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl text-center">
                  <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block mb-0.5">
                    Tu perfil de invitado caduca en
                  </span>
                  <span className="text-lg font-black text-rose-600">⏳ {guestTimeLeft}</span>
                  <span className="block text-[10px] text-rose-500 font-semibold mt-0.5">
                    Al expirar se borran alias, tickets y puntos que no reclames.
                  </span>
                </div>
              )}

              {/* Stats Summary */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-purple-50 border border-purple-200 p-2.5 rounded-xl text-center">
                  <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block mb-0.5">
                    Hipódromos Jugados
                  </span>
                  <span className="text-lg font-black text-[#7c3aed]">
                    {trackGroups.length} Hipódromo(s)
                  </span>
                </div>
                <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-center">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block mb-0.5">
                    Puntos Acumulados
                  </span>
                  <span className="text-lg font-black text-amber-600 flex items-center justify-center gap-1">
                    <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    {totalPoints} Pts
                  </span>
                </div>
              </div>

              {/* Grouped Tickets List by Hipódromo */}
              {trackGroups.length > 0 ? (
                <div className="space-y-2.5">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                    🎟️ MIS TICKETS Y PUNTOS POR HIPÓDROMO:
                  </span>
                  {trackGroups.map(({ trackName, ticketsList }, tIdx) => {
                    const trackTotalPts = ticketsList.reduce((acc, t) => acc + getTicketScore(t), 0);
                    const playedCount = ticketsList.length;
                    return (
                      <div key={tIdx} className="bg-white border border-purple-200 rounded-xl p-2.5 space-y-2 shadow-xs">
                        <div className="flex items-center justify-between border-b border-purple-100 pb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-purple-950 text-[11px] uppercase">
                              🏇 {trackName}
                            </span>
                            <span className="bg-purple-100 text-[#7c3aed] px-1.5 py-0.5 rounded font-black text-[9px]">
                              {playedCount}/3 Tickets
                            </span>
                            {livePositions[trackName] && (
                              <span className="bg-red-500 text-white px-1.5 py-0.5 rounded font-black text-[9px] animate-pulse">
                                🔴 EN VIVO · Posición #{livePositions[trackName].rank} de {livePositions[trackName].total}
                              </span>
                            )}
                          </div>
                          <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded font-black text-[10px]">
                            ⚡ {trackTotalPts} Pts Total
                          </span>
                        </div>

                        <div className="space-y-1">
                          {ticketsList.map((ticket, idx) => {
                            const stratLabel = ticket.strategyLabel || (ticket.strategy === "full_point" ? "FULL POINT (1 Caballo)" : ticket.strategy === "dual_point" ? "DUAL POINT (2 Caballos)" : "SMART POINT (3 Caballos)");
                            const tPts = getTicketScore(ticket);
                            const scored = ticket.scoredRaces || 0;
                            const needed = Math.max(ticket.totalRaces || 7, scored);
                            // En vivo = ya corrio alguna carrera pero quedan por puntuar.
                            const inLive = scored > 0 && (scored < needed || ticket.hasPendingRace);
                            const isFinished = scored >= needed && scored > 0 && !ticket.hasPendingRace;
                            return (
                              <div key={ticket.id || idx} className="bg-purple-50/60 p-2 rounded-lg flex items-center justify-between text-[11px]">
                                <div>
                                  <span className="font-black text-slate-800">
                                    Ticket #{ticket.ticketNumber || idx + 1} ({stratLabel})
                                  </span>
                                  {/* Lo unico accionable antes de que expire el perfil:
                                      saber si queda un ticket a medio armar. */}
                                  {ticket.totalRaces != null && (
                                    <span className={`block font-bold text-[10px] mt-0.5 ${ticket.totalRaces >= 7 ? "text-emerald-600" : "text-amber-600"}`}>
                                      {ticket.totalRaces >= 7
                                        ? "✓ 7/7 carreras completas"
                                        : `⚠ ${ticket.totalRaces}/7 carreras — te faltan ${7 - ticket.totalRaces}`}
                                    </span>
                                  )}
                                </div>
                                <span className={`font-black ${isFinished ? (tPts > 0 ? "text-amber-600 font-extrabold text-[11px]" : "text-slate-500 text-[10px]") : inLive ? "text-red-600 bg-red-50 px-2 py-0.5 rounded-full text-[10px]" : "text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full text-[10px]"}`}>
                                  {isFinished
                                    ? (tPts > 0 ? `⚡ +${tPts} Pts` : "✓ Finalizado (0 Pts)")
                                    : inLive
                                    ? `🔴 ${scored}/${needed} · +${tPts} Pts`
                                    : "⏳ En Juego"}
                                </span>
                                {inLive && ticket.lastScored && (
                                  <span className="block text-right text-[9px] font-bold text-slate-500 mt-0.5">
                                    Últ. carrera C{ticket.lastScored.raceNumber}: {ticket.lastScored.points > 0 ? `+${ticket.lastScored.points} pts` : "0 pts"}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 bg-white border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500 font-bold">
                  Aún no has jugado tickets. ¡Selecciona un hipódromo y arma tus carreras!
                </div>
              )}

              {/* Recovery Code Box */}
              {user.guestToken && (
                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      🔑 Código de Recuperación Único
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="text-[10px] font-bold text-[#7c3aed] hover:text-[#6d28d9] flex items-center gap-1 transition-colors"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      {copied ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
                  <code className="block bg-purple-50 text-[#7c3aed] px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold text-center border border-purple-200 tracking-wider select-all">
                    {user.guestToken}
                  </code>
                </div>
              )}

              {/* Modalidad 4 Claiming Rules Banner */}
              <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl text-xs text-purple-900 space-y-1.5">
                <p className="font-extrabold text-[11px] text-[#7c3aed] uppercase tracking-wider flex items-center gap-1.5">
                  <span>🏆</span> REGLAS DE RECLAMO DE TICKETS
                </p>
                {/* El sacrificio forzado de un Top-5 se eliminó del backend: el
                    historial es ilimitado. Anunciarlo aquí desanimaba a reclamar
                    por una penalización que ya no existe. */}
                <ul className="text-[11px] text-slate-600 space-y-1 leading-snug font-medium pl-1">
                  <li>• Cada hipódromo otorga <strong>3 Tickets Gratis</strong> para 7 carreras.</li>
                  <li>• Al reclamar, el ticket pasa a tu cuenta <strong>sin perder ningún otro</strong>.</li>
                  <li>• El historial guarda que lo creó tu alias de invitado.</li>
                  <li>• Este perfil dura <strong>12 horas</strong>: lo que no reclames se borra.</li>
                </ul>
              </div>

              {/* Action Call */}
              <div className="bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] p-3.5 rounded-xl text-white text-center shadow-md">
                <p className="text-xs font-bold mb-2.5 leading-snug">
                  ¡No pierdas tus puntos ni tus tickets! Reclama tus tickets a una cuenta registrada.
                </p>
                <Link
                  href="/register"
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <UserPlus className="w-4 h-4" />
                  Reclamar y Crear Cuenta
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="pointer-events-auto bg-gradient-to-r from-[#7c3aed] to-[#a855f7] hover:from-[#6d28d9] hover:to-[#9333ea] text-white px-4 py-3 rounded-2xl shadow-[0_6px_25px_rgba(124,58,237,0.4)] border-2 border-white/40 flex items-center gap-3 transition-all duration-300 active:scale-95 group"
      >
        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-bold shadow-inner">
          <TicketIcon className="w-4 h-4 text-amber-300 group-hover:rotate-12 transition-transform" />
        </div>
        <div className="text-left">
          <span className="text-[10px] font-black uppercase tracking-widest text-purple-200 block leading-tight">
            Modalidad 4 — Invitado
          </span>
          <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
            Mis Tickets ({guestTickets.length}) • {totalPoints} Pts
          </span>
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4 text-white" /> : <ChevronUp className="w-4 h-4 text-white" />}
      </button>
    </div>
  );
}
