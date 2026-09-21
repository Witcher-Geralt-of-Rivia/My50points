"use client";

import { useMemo, useState } from "react";
import { Search, MessageCircle, ChevronRight } from "lucide-react";

function posBadgeClass(rank) {
  if (rank === 1) return "bg-[#f5b301] text-black";
  if (rank === 2) return "bg-[#c0c0c0] text-black";
  if (rank === 3) return "bg-[#b0662a] text-white";
  return "bg-black border border-cyan-400/50 text-white/85";
}

function initialsOf(username) {
  const clean = String(username || "?").replace(/[^A-Za-z0-9]/g, "");
  return (clean.slice(0, 1) || "?").toUpperCase();
}

function lastFivePlays(entry) {
  const plays = Array.isArray(entry?.recentPlays) ? entry.recentPlays : [];
  return plays.slice(-5);
}

export default function FigmaLiveRankingTable({
  entries = [],
  tournament = null,
  currentUserId = null,
  onRefresh,
  onOpenChat,
}) {
  const [query, setQuery] = useState("");

  const now = new Date();
  const timeLabel = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  const dateLabel = now.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });

  const leaderPoints = useMemo(
    () => entries.reduce((max, e) => Math.max(max, e?.totalPoints ?? 0), 0),
    [entries]
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? entries.filter((e) => String(e?.username || "").toLowerCase().includes(q))
      : entries;
    return [...list].sort((a, b) => (a?.rank ?? 999) - (b?.rank ?? 999));
  }, [entries, query]);

  const trackLabel = String(tournament?.track || tournament?.name || "TORNEO").toUpperCase();
  const raceLabel = tournament?.currentRace
    ? `CARRERA ${tournament.currentRace} ACTUALIZADA`
    : "ACTUALIZADA";

  return (
    <div className="w-full">
      {/* Header — purple band */}
      <div className="rounded-t-2xl bg-gradient-to-r from-[#3b0764] via-[#581c87] to-[#3b0764] px-4 sm:px-6 pt-4 pb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            RANKING EN VIVO
          </h2>
          <p className="text-[#f5b301] font-bold text-xs sm:text-sm mt-1 tracking-wide">
            {trackLabel} · {raceLabel}
          </p>
        </div>
        <div className="shrink-0 rounded-lg border border-white/25 bg-black/40 px-3 py-1.5 text-center">
          <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest">Actualización</p>
          <p className="text-sm font-black text-white font-mono">{timeLabel}</p>
          <p className="text-[10px] text-white/60 font-mono">{dateLabel}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-[#05060f] px-4 sm:px-6 pt-3">
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar jugador"
            aria-label="Buscar jugador"
            className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 pr-10 text-sm text-white placeholder:text-white/30 outline-none focus:border-purple-400/60"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        </div>
      </div>

      {/* Column heads */}
      <div className="bg-[#05060f] px-4 sm:px-6 pt-3 pb-1 grid grid-cols-[44px_1fr_auto] sm:grid-cols-[52px_1fr_64px_92px_96px_150px] gap-2 items-center text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-white/35">
        <span>Pos.</span>
        <span>Jugador</span>
        <span className="hidden sm:block text-center">N° Ticket</span>
        <span className="hidden sm:block text-right">Puntos</span>
        <span className="hidden sm:block text-right">Diferencia</span>
        <span className="hidden sm:block text-right">Historial reciente</span>
      </div>

      {/* Rows */}
      <div className="bg-[#05060f] px-4 sm:px-6 pb-3 flex flex-col gap-1.5">
        {rows.map((e) => {
          const rank = e?.rank ?? 999;
          const isMe = currentUserId != null && e?.userId === currentUserId;
          const highlighted = rank <= 3 || isMe;
          const plays = lastFivePlays(e);
          const wins = plays.filter((p) => p?.won).length;
          const gap = leaderPoints - (e?.totalPoints ?? 0);
          const delta = e?.rankChange ?? 0;
          const modality = Math.min(Math.max(Number(e?.gameMode) || 2, 1), 3);

          return (
            <div
              key={`${e?.userId}-${e?.ticketNumber}`}
              className={`rounded-xl px-2.5 sm:px-3 py-2 grid grid-cols-[44px_1fr_auto] sm:grid-cols-[52px_1fr_64px_92px_96px_150px] gap-2 items-center ${
                highlighted
                  ? "bg-gradient-to-r from-purple-900/70 via-[#4c1d95]/60 to-fuchsia-900/50 border border-purple-500/30"
                  : "border border-transparent"
              }`}
            >
              {/* POS */}
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${posBadgeClass(rank)}`}>
                {rank}
              </span>

              {/* JUGADOR */}
              <span className="flex items-center gap-2 min-w-0">
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
                  style={{ background: e?.avatarColor || "#7c3aed" }}
                >
                  {initialsOf(e?.username)}
                </span>
                <span className="text-white text-xs sm:text-sm font-bold truncate">
                  {String(e?.username || "—").toUpperCase()}
                </span>
                <span className="shrink-0 rounded bg-[#e5484d] text-white text-[9px] font-black px-1.5 py-0.5">
                  M{modality}
                </span>
              </span>

              {/* TICKET */}
              <span className="hidden sm:flex justify-center">
                <span className="rounded-md bg-black border border-white/20 text-white/85 text-[11px] font-bold px-2 py-0.5 font-mono">
                  T{e?.ticketNumber ?? "—"}
                </span>
              </span>

              {/* PUNTOS */}
              <span className="hidden sm:block text-right text-white text-sm font-bold font-mono">
                {e?.totalPoints ?? 0} pts
              </span>

              {/* DIFERENCIA */}
              <span className={`hidden sm:block text-right text-xs font-bold font-mono ${gap === 0 ? "text-white/30" : "text-[#ff5c5c]"}`}>
                {gap === 0 ? "—" : `-${gap} pts`}
              </span>

              {/* HISTORIAL */}
              <span className="hidden sm:flex items-center justify-end gap-1.5">
                <span className="flex items-center gap-[3px]" aria-hidden>
                  {plays.map((p, i) => (
                    <span
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${p?.won ? "bg-cyan-400" : "bg-white/15"}`}
                    />
                  ))}
                </span>
                <span className="text-white text-xs font-bold font-mono">{wins}</span>
                <span
                  className={`text-[11px] font-bold font-mono ${
                    delta > 0 ? "text-emerald-400" : delta < 0 ? "text-[#ff5c5c]" : "text-white/30"
                  }`}
                >
                  {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : "–"}
                </span>
              </span>

              {/* Mobile sub-line: points + gap */}
              <span className="col-span-3 sm:hidden flex items-center gap-3 pl-9 text-[11px] font-mono">
                <span className="text-white font-bold">{e?.totalPoints ?? 0} pts</span>
                <span className={gap === 0 ? "text-white/30" : "text-[#ff5c5c]"}>
                  {gap === 0 ? "—" : `-${gap}`}
                </span>
                <span className="text-white/40">T{e?.ticketNumber ?? "—"}</span>
              </span>
            </div>
          );
        })}

        {rows.length === 0 && (
          <p className="text-center text-white/40 text-sm py-8">Sin jugadores para mostrar.</p>
        )}
      </div>

      {/* Bottom: live chat bar */}
      <div className="bg-[#05060f] px-4 sm:px-6 pb-2">
        <button
          type="button"
          onClick={onOpenChat}
          className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 flex items-center gap-2 hover:bg-white/[0.07] transition-colors cursor-pointer"
        >
          <MessageCircle className="w-4 h-4 text-cyan-400" />
          <span className="text-white text-xs font-black uppercase tracking-wider">Chat en vivo</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-white/50 text-xs">{rows.length} conectados</span>
          <span className="ml-auto text-white/50 text-xs flex items-center gap-1">
            Todos <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </button>
      </div>

      {/* Bottom: tournament announcement */}
      <div className="px-4 sm:px-6 pb-4 rounded-b-2xl bg-[#05060f]">
        <div className="rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-[#f5b301] text-[11px] font-black uppercase tracking-wider">
            Anuncio del torneo
          </span>
          <span className="text-white/40 text-[11px]">
            Última actualización de puntajes en 15s
          </span>
          <button
            type="button"
            onClick={onRefresh}
            className="ml-auto text-cyan-400 text-[11px] font-bold flex items-center gap-1 hover:text-cyan-300 cursor-pointer"
          >
            Ver ranking <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
