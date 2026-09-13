"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Trophy, Medal, Zap, Check, AlertCircle, ArrowLeft, RefreshCw, Calendar, Clock } from "lucide-react";

// El puntaje NO se recalcula en el cliente: se muestra `pointsEarned` tal como
// lo devuelve el backend, ya calculado con el dividendo oficial del hipodromo.

export default function FinishedTournamentResultsDashboard({
  tournamentSlug,
  trackName,
  modalityId = "guest",
  userGuestToken = "",
  userAlias = "",
  user = null,
  onBack,
}) {
  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [userTickets, setUserTickets] = useState([]);
  const [selectedRaceIdx, setSelectedRaceIdx] = useState(0);

  // Derive guest alias & recovery token clearly
  const displayAlias = userAlias || user?.username || user?.guestAlias || (typeof window !== "undefined" ? localStorage.getItem("fiftypoints_guest_alias") : "") || "Invitado";
  const displayToken = userGuestToken || user?.guestToken || (typeof window !== "undefined" ? localStorage.getItem("fiftypoints_guest_token") : "") || "50P-GUEST";

  const races = tournament?.races || [];

  // Group 21 race pick rows into 3 Ticket objects (Ticket #1, Ticket #2, Ticket #3)
  const evaluatedTickets = useMemo(() => {
    if (!userTickets || userTickets.length === 0) return [];
    const map = {};
    for (const t of userTickets) {
      const num = Number(t.ticketNumber || 1);
      if (!map[num]) {
        map[num] = {
          id: `ticket-group-${num}`,
          ticketNumber: num,
          trackSlug: t.trackSlug,
          tournamentId: t.tournamentId,
          tournamentName: t.tournamentName || t.trackName,
          racesMap: {},
          raceScores: [],
          stratCounts: { full: 0, dual: 0, smart: 0 },
          totalPoints: 0,
        };
      }
      map[num].racesMap[t.raceId] = t;
      if (t.raceNumber) map[num].racesMap[t.raceNumber] = t;
      map[num].racesMap[String(t.raceId)] = t;
      if (t.raceNumber) map[num].racesMap[String(t.raceNumber)] = t;

      const sKey = String(t.strategy || "").toLowerCase();
      if (sKey.includes("full")) map[num].stratCounts.full += 1;
      else if (sKey.includes("dual")) map[num].stratCounts.dual += 1;
      else map[num].stratCounts.smart += 1;

      map[num].totalPoints += (t.pointsEarned || 0);
    }

    return Object.values(map)
      .map((group) => {
        const f = group.stratCounts.full;
        const d = group.stratCounts.dual;
        const sm = group.stratCounts.smart;
        let label = "FULL POINT";
        if (f >= 7) label = "FULL POINT";
        else if (d >= 7) label = "DUAL POINT";
        else if (sm >= 7) label = "SMART POINT";
        else {
          const parts = [];
          if (f > 0) parts.push(`${f} Full`);
          if (d > 0) parts.push(`${d} Dual`);
          if (sm > 0) parts.push(`${sm} Smart`);
          label = parts.length > 0 ? `Estrategia (${parts.join(", ")})` : "FULL POINT";
        }
        return {
          ...group,
          calculatedPoints: group.totalPoints,
          pointsEarned: group.totalPoints,
          strategyLabel: label,
        };
      })
      .sort((a, b) => a.ticketNumber - b.ticketNumber);
  }, [userTickets, races]);

  useEffect(() => {
    if (!tournamentSlug) return;

    let isMounted = true;
    const fetchResults = async () => {
      setLoading(true);
      try {
        const token =
          userGuestToken ||
          user?.guestToken ||
          user?.token ||
          (typeof window !== "undefined"
            ? localStorage.getItem("50points_guest_token") ||
              localStorage.getItem("50points_token") ||
              localStorage.getItem("fiftypoints_guest_token") ||
              localStorage.getItem("fiftypoints_auth_token")
            : null);
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        // Fetch tournament detail + leaderboard + user tickets in parallel
        const [tournRes, leadRes, ticketsRes] = await Promise.all([
          fetch(`/api/tournaments/${tournamentSlug}`),
          fetch(`/api/tournaments/${tournamentSlug}/leaderboard`),
          token ? fetch(`/api/tickets`, { headers }) : Promise.resolve(null),
        ]);

        if (tournRes.ok && isMounted) {
          const tournData = await tournRes.json();
          setTournament(tournData.tournament || tournData);
        }

        if (leadRes.ok && isMounted) {
          const leadData = await leadRes.json();
          setLeaderboard(leadData.leaderboard || leadData.entries || []);
        }

        if (ticketsRes && ticketsRes.ok && isMounted) {
          const tickData = await ticketsRes.json();
          const allTickets = tickData.tickets || [];
          const matched = allTickets.filter(
            (t) =>
              t.tournamentSlug === tournamentSlug ||
              t.trackSlug === tournamentSlug ||
              t.tournament?.slug === tournamentSlug ||
              (t.tournamentId && String(t.tournamentId) === String(tournamentId)) ||
              (t.trackName && tournamentSlug.includes(t.trackName.toLowerCase().replace(/\s+/g, "-")))
          );
          setUserTickets(matched);
        }
      } catch (err) {
        console.error("Error fetching tournament results:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchResults();
    return () => {
      isMounted = false;
    };
  }, [tournamentSlug]);

  // Selected ticket state for inspecting picks
  const [activeTicketIdx, setActiveTicketIdx] = useState(0);





  const handleClearTestTickets = () => {
    setUserTickets([]);
    try {
      const existing = JSON.parse(localStorage.getItem("fiftypoints_guest_tickets") || "[]");
      const filtered = existing.filter((t) => t.tournamentSlug !== tournamentSlug);
      localStorage.setItem("fiftypoints_guest_tickets", JSON.stringify(filtered));
    } catch (e) {}
  };

  if (loading) {
    return (
      <div className="bg-white border-[2.5px] border-[#7c3aed] rounded-2xl p-8 text-center space-y-4 shadow-xl">
        <RefreshCw className="w-8 h-8 text-[#7c3aed] animate-spin mx-auto" />
        <p className="text-xs font-black text-[#7c3aed] uppercase tracking-wider">
          Cargando Resultados Oficiales del Torneo...
        </p>
      </div>
    );
  }

  const currentRace = races[selectedRaceIdx] || races[0];
  const hasUserPlayed = userTickets.length > 0;
  const activeEvaluatedTicket = evaluatedTickets[activeTicketIdx] || evaluatedTickets[0];

  return (
    <div className="space-y-6 bg-white border-[2.5px] border-[#7c3aed] rounded-2xl p-5 md:p-7 shadow-xl">
      {/* Top Bar with Navigation */}
      <div className="flex items-center justify-between pb-4 border-b border-purple-100 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 bg-purple-50 hover:bg-purple-100 text-[#7c3aed] rounded-xl transition-colors font-bold text-xs flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Atrás
            </button>
          )}
          <div>
            <span className="bg-purple-100 text-[#7c3aed] text-[10px] font-black uppercase px-2.5 py-1 rounded-md tracking-wider inline-block mb-1">
              🏁 RESULTADOS OFICIALES DEL TORNEO
            </span>
            <h2 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <span>🏇</span> {trackName || tournament?.track || tournament?.name || "Hipódromo"}
            </h2>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs font-extrabold text-slate-500 flex items-center gap-1.5 justify-end">
            <Calendar className="w-3.5 h-3.5 text-[#7c3aed]" />
            <span>{tournament?.date ? new Date(tournament.date).toLocaleDateString("es-ES") : "Finalizado"}</span>
          </div>
          <div className="text-[11px] font-bold text-slate-400 mt-0.5">
            <span>7 Carreras Oficiales Completadas</span>
          </div>
        </div>
      </div>

      {/* Guest User Played Ticket / Status Banner */}
      {hasUserPlayed ? (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-400 p-4 md:p-5 rounded-2xl text-emerald-950 shadow-md">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-black text-emerald-800 text-sm uppercase tracking-wider flex items-center gap-2">
                  <span>🎫</span> ¡JUGASTE EN ESTE TORNEO FINALIZADO!
                </h4>
              </div>
              <p className="text-xs text-emerald-700 font-semibold leading-relaxed">
                Tienes <strong>{userTickets.length} ticket(s)</strong> registrado(s) bajo tu Alias de Invitado{" "}
                <span className="bg-emerald-200 text-emerald-950 px-2 py-0.5 rounded font-black">
                  {displayAlias}
                </span>{" "}
                (Clave:{" "}
                <code className="bg-emerald-100 px-2 py-0.5 rounded text-emerald-900 font-mono font-bold">
                  {displayToken}
                </code>
                ). Selecciona tu ticket abajo para ver la jugada carrera por carrera:
              </p>
              {/* Ticket Selector Buttons */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {evaluatedTickets.map((t, idx) => {
                  const isActive = activeTicketIdx === idx;
                  return (
                    <button
                      key={t.id || idx}
                      onClick={() => setActiveTicketIdx(idx)}
                      className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 shadow-sm ${
                        isActive
                          ? "bg-emerald-600 text-white ring-2 ring-emerald-400 scale-105"
                          : "bg-white border border-emerald-300 text-emerald-900 hover:bg-emerald-100"
                      }`}
                    >
                      <span>TICKET #{t.ticketNumber || idx + 1} ({t.strategyLabel}):</span>
                      <span className="bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded text-[10px] font-extrabold">
                        ⚡ {t.calculatedPoints} Pts
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              <Link
                href={`/register?guestToken=${displayToken}`}
                className="py-3 px-5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all active:scale-95 text-center flex items-center gap-2"
              >
                <Trophy className="w-4 h-4 text-slate-950" />
                Reclamar Ticket a Mi Cuenta Real
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl text-purple-950 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h4 className="font-black text-[#7c3aed] text-xs md:text-sm uppercase tracking-wider flex items-center gap-2 mb-1">
              <span>ℹ️</span> TORNEO FINALIZADO SIN APUESTAS
            </h4>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              No registraste tickets en este torneo finalizado con tu Alias de Invitado{" "}
              <span className="bg-purple-200 text-[#7c3aed] px-2 py-0.5 rounded font-black">
                {displayAlias}
              </span>{" "}
              (Clave de Recuperación:{" "}
              <code className="bg-purple-100 px-2 py-0.5 rounded text-[#7c3aed] font-mono font-bold">
                {displayToken}
              </code>
              ). A continuación puedes consultar la tabla oficial de ganadores y el resultado carrera por carrera.
            </p>
          </div>
        </div>
      )}

      {/* Race Results Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <span>🏁</span> RESULTADOS CARRERA POR CARRERA (1.º A 3.er LUGAR)
        </h3>

        {/* 7 Races Selector Tabs */}
        {races.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {races.map((race, idx) => (
              <button
                key={race.id || idx}
                onClick={() => setSelectedRaceIdx(idx)}
                className={`py-2 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all shrink-0 flex items-center gap-1.5 ${
                  selectedRaceIdx === idx
                    ? "bg-[#7c3aed] text-white shadow-md shadow-purple-500/20 scale-105"
                    : "bg-slate-100 hover:bg-purple-50 text-slate-600 border border-slate-200"
                }`}
              >
                <span>CARRERA {race.raceNumber || idx + 1}</span>
                {race.results?.length > 0 && <span className="text-[10px] opacity-80">✓</span>}
              </button>
            ))}
          </div>
        )}

        {/* Selected Race Winners Box */}
        {currentRace && (
          <div className="bg-slate-50 border border-purple-100 rounded-2xl p-4 md:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-2">
              <div>
                <span className="text-xs font-black text-[#7c3aed] uppercase tracking-wider block">
                  {/* El torneo son las 7 ULTIMAS carreras del hipodromo, asi que la
                      carrera 1 del torneo no es la carrera 1 de la cartelera. Se
                      aclara para que el jugador no crea que hay un desfase. */}
                  CARRERA #{currentRace.raceNumber} DEL TORNEO
                  {currentRace.name ? ` — ${currentRace.name} en el hipódromo` : ""}
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  {currentRace.distance ? `${currentRace.distance} m` : ""} {currentRace.surface ? `· ${currentRace.surface}` : ""} {currentRace.purse ? `· Premio: $${currentRace.purse.toLocaleString()}` : ""}
                </span>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                ✓ OFICIAL
              </span>
            </div>

            {/* Winners Podium Cards (1st, 2nd, 3rd) */}
            {(() => {
              const effectiveResults = (currentRace.results && currentRace.results.length > 0)
                ? currentRace.results
                : (currentRace.horses || []).slice(0, 3).map((h, idx) => ({
                    position: idx + 1,
                    horseId: h.id || h.postPosition,
                  }));

              const res1 = effectiveResults.find((r) => r.position === 1);
              const horse1 = currentRace.horses?.find(
                (h) => h.id === res1?.horseId || h.postPosition === res1?.horseId || Number(h.programNumber) === res1?.horseId
              );

              const res2 = effectiveResults.find((r) => r.position === 2);
              const horse2 = currentRace.horses?.find(
                (h) => h.id === res2?.horseId || h.postPosition === res2?.horseId || Number(h.programNumber) === res2?.horseId
              ) || currentRace.horses?.[1];

              const res3 = effectiveResults.find((r) => r.position === 3);
              const horse3 = currentRace.horses?.find(
                (h) => h.id === res3?.horseId || h.postPosition === res3?.horseId || Number(h.programNumber) === res3?.horseId
              ) || currentRace.horses?.[2];

              const cleanHorseName = (name) => {
                if (!name) return "";
                return name.replace(/\s*\(\d+\)$/, "").trim();
              };

              const h1Name = cleanHorseName(horse1?.name || horse1?.horseName || "Ejemplar #1");
              const j1Name = horse1?.jockey || horse1?.jockeyName || "Jinete Oficial";
              const t1Name = horse1?.trainer || horse1?.trainerName || "Entrenador Oficial";

              const h2Name = cleanHorseName(horse2?.name || horse2?.horseName || "Ejemplar #2");
              const j2Name = horse2?.jockey || horse2?.jockeyName || "Jinete Oficial";

              const h3Name = cleanHorseName(horse3?.name || horse3?.horseName || "Ejemplar #3");
              const j3Name = horse3?.jockey || horse3?.jockeyName || "Jinete Oficial";

              const pp1 = horse1?.postPosition && Number(horse1.postPosition) < 90 ? `#${horse1.postPosition} ` : "";
              const pp2 = horse2?.postPosition && Number(horse2.postPosition) < 90 ? `#${horse2.postPosition} ` : "";
              const pp3 = horse3?.postPosition && Number(horse3.postPosition) < 90 ? `#${horse3.postPosition} ` : "";

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* 1st Place (Gold Winner) */}
                  <div className="bg-amber-50 border-2 border-amber-400 p-3.5 rounded-xl shadow-sm relative overflow-hidden">
                    <div className="absolute top-2 right-2 text-2xl">🥇</div>
                    <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest block mb-1">
                      1.er LUGAR (GANADOR)
                    </span>
                    <div className="text-sm font-black text-slate-900 truncate">
                      {pp1}{h1Name}
                    </div>
                    <div className="text-[11px] font-bold text-slate-500 mt-1 truncate">
                      Jinete: {j1Name} · Entrenador: {t1Name}
                    </div>
                  </div>

                  {/* 2nd Place (Silver) */}
                  <div className="bg-slate-100 border border-slate-300 p-3.5 rounded-xl shadow-sm relative overflow-hidden">
                    <div className="absolute top-2 right-2 text-2xl">🥈</div>
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-1">
                      2.º LUGAR (SEGUNDO)
                    </span>
                    <div className="text-sm font-black text-slate-900 truncate">
                      {pp2}{h2Name}
                    </div>
                    <div className="text-[11px] font-bold text-slate-500 mt-1 truncate">
                      Jinete: {j2Name}
                    </div>
                  </div>

                  {/* 3rd Place (Bronze) */}
                  <div className="bg-amber-900/5 border border-amber-800/20 p-3.5 rounded-xl shadow-sm relative overflow-hidden">
                    <div className="absolute top-2 right-2 text-2xl">🥉</div>
                    <span className="text-[10px] font-black text-amber-900 uppercase tracking-widest block mb-1">
                      3.er LUGAR (TERCERO)
                    </span>
                    <div className="text-sm font-black text-slate-900 truncate">
                      {pp3}{h3Name}
                    </div>
                    <div className="text-[11px] font-bold text-slate-500 mt-1 truncate">
                      Jinete: {j3Name}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Strategy Banner for this specific race */}
            {(() => {
              const raceTicketRow =
                activeEvaluatedTicket?.racesMap?.[currentRace?.id] ||
                activeEvaluatedTicket?.racesMap?.[currentRace?.raceNumber] ||
                activeEvaluatedTicket?.racesMap?.[String(currentRace?.id)] ||
                activeEvaluatedTicket?.racesMap?.[String(currentRace?.raceNumber)];

              if (!raceTicketRow) return null;

              const strat = raceTicketRow.strategy || "full_point";
              const stratLabel =
                strat === "full_point"
                  ? "FULL POINT [50 PTS]"
                  : strat === "dual_point"
                  ? "DUAL POINT [25][25 PTS]"
                  : "SMART POINT [30][15][5 PTS]";

              const stratColor =
                strat === "full_point"
                  ? "bg-purple-950 border-purple-500/50 text-purple-200"
                  : strat === "dual_point"
                  ? "bg-cyan-950 border-cyan-500/50 text-cyan-200"
                  : "bg-amber-950 border-amber-500/50 text-amber-200";

              const pts = raceTicketRow.pointsEarned || 0;

              return (
                <div className={`mt-3 p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-md ${stratColor}`}>
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-400 text-black font-black text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider shadow-sm">
                      {stratLabel}
                    </span>
                    <span className="font-extrabold text-xs uppercase tracking-wider">
                      CARRERA #{currentRace.raceNumber} EN TICKET #{activeEvaluatedTicket?.ticketNumber}
                    </span>
                  </div>
                  <div className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                    <span className="opacity-80">PUNTOS GANADOS EN ESTA CARRERA:</span>
                    <span className="bg-amber-400 text-black px-2.5 py-0.5 rounded-full font-black text-xs shadow-sm">
                      ⚡ {pts > 0 ? `+${pts} PTS` : "0 PTS"}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Full Field Starters Table */}
            {currentRace.horses?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-2">
                  🐴 LISTA COMPLETA DE EJEMPLARES DE LA CARRERA:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {(() => {
                    const effectiveResults = (currentRace.results && currentRace.results.length > 0)
                      ? currentRace.results
                      : (currentRace.horses || []).slice(0, 3).map((h, idx) => ({
                          position: idx + 1,
                          horseId: h.id || h.postPosition,
                        }));

                    const checkScr = (h) => h.scratched ||
                      h.name?.toUpperCase().includes("SCRATCH") ||
                      h.jockey?.toUpperCase().includes("SCRATCH") ||
                      h.trainer?.toUpperCase().includes("SCRATCH");

                    const nonPodiumActive = currentRace.horses.filter((h) => {
                      const isScr = checkScr(h);
                      const isPodium = effectiveResults.some((r) => r.horseId === h.id || r.horseId === h.postPosition);
                      return !isScr && !isPodium;
                    });

                    // Helper to get numeric order (1, 2, 3, 4, 5... 999 for scratched)
                    const getOrderNum = (horse) => {
                      if (checkScr(horse)) return 9999;
                      const podiumRes = effectiveResults.find((r) => r.horseId === horse.id || r.horseId === horse.postPosition);
                      if (podiumRes?.position) return podiumRes.position;
                      const npIdx = nonPodiumActive.findIndex((h) => (h.id || h.postPosition) === (horse.id || horse.postPosition));
                      return npIdx >= 0 ? npIdx + 4 : 500;
                    };

                    // Sort horses array by finish position ascending
                    const sortedHorses = [...currentRace.horses].sort((a, b) => getOrderNum(a) - getOrderNum(b));

                    return sortedHorses.map((horse) => {
                      const isScr = checkScr(horse);
                      const podiumRes = effectiveResults.find(
                        (r) => r.horseId === horse.id || r.horseId === horse.postPosition
                      );
                      const resPos = podiumRes?.position;

                      let displayPos = "";
                      if (isScr) {
                        displayPos = "RETIRADO";
                      } else if (resPos) {
                        displayPos = `${resPos}º`;
                      } else {
                        const npIdx = nonPodiumActive.findIndex((h) => (h.id || h.postPosition) === (horse.id || horse.postPosition));
                        displayPos = npIdx >= 0 ? `${npIdx + 4}º` : "4.º+";
                      }

                      const rawName = horse.name || horse.horseName || `Ejemplar #${horse.postPosition}`;
                      const hName = rawName.replace(/\s*\(\d+\)$/, "").trim();
                      const jName = horse.jockey || horse.jockeyName || "";
                      const tName = horse.trainer || horse.trainerName || "";
                      const validPP = horse.postPosition && Number(horse.postPosition) < 90 ? horse.postPosition : null;

                      const currentRaceTicketRow =
                        activeEvaluatedTicket?.racesMap?.[currentRace?.id] ||
                        activeEvaluatedTicket?.racesMap?.[currentRace?.raceNumber] ||
                        activeEvaluatedTicket?.racesMap?.[String(currentRace?.id)] ||
                        activeEvaluatedTicket?.racesMap?.[String(currentRace?.raceNumber)];

                      let isUserPick = false;
                      let userPickSlotIndex = 1;
                      let userPickPoints = 0;

                      if (currentRaceTicketRow) {
                        const rawPicks = Array.isArray(currentRaceTicketRow.picks) ? currentRaceTicketRow.picks : [];
                        const hId = horse.id;
                        const hPP = horse.postPosition;
                        const hProg = horse.programNumber;

                        const foundIdx = rawPicks.findIndex(
                          (p) => p === hId || p === hPP || Number(p) === Number(hPP) || Number(p) === Number(hId) || Number(p) === Number(hProg)
                        );
                        if (foundIdx >= 0) {
                          isUserPick = true;
                          userPickSlotIndex = foundIdx + 1;

                          const res1 = currentRace.results?.find((r) => r.position === 1);
                          const win1Horse = currentRace.horses?.find(
                            (h) => h.id === res1?.horseId || h.postPosition === res1?.horseId || Number(h.programNumber) === res1?.horseId
                          );
                          const win1Id = win1Horse?.id || win1Horse?.postPosition;

                          const isWinner = hId === win1Id || Number(hPP) === Number(win1Horse?.postPosition) || hId === win1Horse?.id || Number(hId) === Number(win1Horse?.id);
                          userPickPoints = isWinner ? (currentRaceTicketRow.pointsEarned || 0) : 0;
                        }
                      }

                      return (
                        <div
                          key={horse.id || horse.postPosition}
                          className={`rounded-2xl border-2 text-xs flex flex-col justify-between font-bold transition-all relative overflow-hidden shadow-sm ${
                            isUserPick
                              ? "bg-purple-50/70 border-[2.5px] border-[#7c3aed] text-purple-950 shadow-md ring-2 ring-purple-300/50"
                              : resPos === 1
                              ? "bg-amber-50/80 border-amber-400 text-amber-950 font-black"
                              : resPos === 2
                              ? "bg-slate-100 border-slate-300 text-slate-950"
                              : resPos === 3
                              ? "bg-amber-900/5 border-amber-800/20 text-amber-950"
                              : isScr
                              ? "bg-red-50/50 border-red-200 text-red-900"
                              : "bg-white border-slate-200 text-slate-700"
                          }`}
                        >
                          {isUserPick && (
                            <div className="bg-gradient-to-r from-[#7c3aed] to-purple-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 flex items-center justify-between shadow-sm">
                              <span className="flex items-center gap-1">
                                <span>🚀</span> TU SELECCIÓN {currentRaceTicketRow?.strategy === "dual_point" || currentRaceTicketRow?.strategy === "smart_pick" ? `#${userPickSlotIndex}` : ""} ({
                                  currentRaceTicketRow?.strategy === "full_point"
                                    ? "FULL POINT [50 PTS]"
                                    : currentRaceTicketRow?.strategy === "dual_point"
                                    ? `DUAL POINT - RANURA ${userPickSlotIndex} [25 PTS]`
                                    : `SMART POINT - RANURA ${userPickSlotIndex} [${userPickSlotIndex === 1 ? 30 : userPickSlotIndex === 2 ? 15 : 5} PTS]`
                                })
                              </span>
                              <span className="bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full font-black text-[10px] shadow-xs shrink-0">
                                ⚡ {userPickPoints > 0 ? `+${userPickPoints} PTS GANADOS` : "0 PTS GANADOS"}
                              </span>
                            </div>
                          )}

                          <div className="p-3 flex items-center justify-between gap-2">
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-2 truncate">
                                {validPP ? (
                                  <span className="bg-purple-100 text-[#7c3aed] text-[11px] font-black px-2 py-0.5 rounded-md shrink-0">
                                    #{validPP}
                                  </span>
                                ) : (
                                  <span className="bg-red-100 text-red-700 text-[9px] font-black px-1.5 py-0.5 rounded shrink-0">
                                    RET
                                  </span>
                                )}
                                <span className="truncate font-black text-sm text-slate-900">{hName}</span>
                              </div>
                              {(jName || tName) && !jName.includes("SCRATCHED") && (
                                <div className="text-[11px] text-slate-500 font-semibold truncate pl-7 mt-0.5">
                                  {jName ? `J: ${jName}` : ""} {tName ? `· E: ${tName}` : ""}
                                </div>
                              )}
                            </div>

                            {isScr ? (
                              <span className="text-[9px] font-black px-2 py-1 rounded bg-red-100 text-red-700 shrink-0">
                                RETIRADO
                              </span>
                            ) : (
                              <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg shrink-0 ${
                                resPos === 1
                                  ? "bg-amber-400 text-amber-950 font-black shadow-xs"
                                  : resPos === 2
                                  ? "bg-slate-300 text-slate-950"
                                  : resPos === 3
                                  ? "bg-amber-800 text-amber-50"
                                  : "bg-slate-100 text-slate-600 font-bold"
                              }`}>
                                {displayPos}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
