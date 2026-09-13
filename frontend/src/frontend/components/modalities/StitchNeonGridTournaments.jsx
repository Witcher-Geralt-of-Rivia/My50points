"use client";

import React from "react";
import { isTrackTicketUsed } from "@/frontend/lib/trackTicketUsage";

const ARTWORK = {
  purple: "/images/jockey/jockey-purple.jpg",
  cyan: "/images/jockey/jockey-cyan.jpg",
  gold: "/images/jockey/jockey-gold.jpg",
};

function TrackCard({ track, colorTheme, activeSlug, onClick }) {
  const isSelected = activeSlug === track.slug;
  const imageSrc = ARTWORK[colorTheme] || ARTWORK.purple;

  const themeStyles = {
    purple: {
      border: "border-2 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]",
      activeBorder: "border-2 border-purple-300 shadow-[0_0_25px_rgba(168,85,247,0.9)] scale-[1.03]",
      headerBorder: "border-t-2 border-purple-500",
      btn: "bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 text-white font-black shadow-lg shadow-purple-500/30 border border-purple-400/40",
    },
    cyan: {
      border: "border-2 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)]",
      activeBorder: "border-2 border-cyan-200 shadow-[0_0_25px_rgba(6,182,212,0.9)] scale-[1.03]",
      headerBorder: "border-t-2 border-cyan-400",
      btn: "bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 text-black font-black shadow-lg shadow-cyan-500/30 border border-cyan-200/50",
    },
    gold: {
      border: "border-2 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]",
      activeBorder: "border-2 border-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.9)] scale-[1.03]",
      headerBorder: "border-t-2 border-amber-500",
      btn: "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 text-black font-black shadow-lg shadow-amber-500/30 border border-amber-200/50",
    },
  }[colorTheme] || {};

  const startDateObj = track.startDate || (track.eventDate ? new Date(track.eventDate) : null);
  const endDateObj = track.endDate || (startDateObj ? new Date(startDateObj.getTime() + 4 * 3600 * 1000) : null);
  const hasValidDate = startDateObj && !isNaN(startDateObj.getTime());

  const formattedDate = hasValidDate
    ? startDateObj.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }).toUpperCase()
    : "";
  const formattedTimeStart = hasValidDate
    ? startDateObj.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : "";
  const formattedTimeEnd = endDateObj && !isNaN(endDateObj.getTime())
    ? endDateObj.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : "";

  const used1 = isTrackTicketUsed(track.slug, 1);
  const used2 = isTrackTicketUsed(track.slug, 2);
  const used3 = isTrackTicketUsed(track.slug, 3);

  return (
    <div
      onClick={() => onClick(track)}
      className={`rounded-xl overflow-hidden relative group cursor-pointer transition-all duration-300 bg-black flex flex-col justify-between ${
        isSelected ? themeStyles.activeBorder : themeStyles.border
      } hover:scale-[1.03] hover:brightness-105`}
    >
      {/* Top Image Banner */}
      <div className="relative w-full aspect-square overflow-hidden bg-black">
        <img
          src={imageSrc}
          alt={track.name}
          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60 pointer-events-none" />

        {/* Top Badges (Status + Ticket availability) */}
        <div className="absolute top-1.5 left-1.5 right-1.5 flex justify-between items-center z-10 gap-1 flex-wrap sm:flex-nowrap">
          {track.live ? (
            <span className="bg-red-600 text-white font-black text-[9px] sm:text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full shadow-md animate-pulse shrink-0">
              🔴 EN VIVO
            </span>
          ) : track.finished ? (
            <span className="bg-amber-600 text-white font-black text-[9px] sm:text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full shadow-md shrink-0">
              🏆 FINALIZADO
            </span>
          ) : (
            <span className="bg-emerald-600 text-white font-black text-[9px] sm:text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full shadow-md shrink-0">
              🟢 DISPONIBLE
            </span>
          )}

          {/* Ticket Availability Badges */}
          <div className="flex items-center gap-0.5 bg-black/85 backdrop-blur-md px-1.5 py-0.5 rounded-full border border-zinc-700 shrink-0">
            <span className="text-[8px] sm:text-[9px] font-extrabold text-amber-400 mr-0.5 hidden xs:inline">TICKETS:</span>
            <span className={`text-[8px] sm:text-[9px] font-black px-1 rounded ${!used1 ? "bg-amber-400 text-black" : "bg-zinc-800 text-zinc-500 line-through"}`}>#1</span>
            <span className={`text-[8px] sm:text-[9px] font-black px-1 rounded ${!used2 ? "bg-amber-400 text-black" : "bg-zinc-800 text-zinc-500 line-through"}`}>#2</span>
            <span className={`text-[8px] sm:text-[9px] font-black px-1 rounded ${!used3 ? "bg-amber-400 text-black" : "bg-zinc-800 text-zinc-500 line-through"}`}>#3</span>
          </div>
        </div>

        {/* Floating Start/End Time Tag over image */}
        {formattedTimeStart && (
          <div className="absolute bottom-1.5 right-1.5 z-10 max-w-[90%]">
            <span className="bg-black/90 backdrop-blur-md text-amber-300 font-extrabold text-[8px] sm:text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border border-amber-500/40 shadow-md whitespace-nowrap block truncate">
              ⏰ {formattedTimeStart} {formattedTimeEnd ? `— ${formattedTimeEnd}` : ""}
            </span>
          </div>
        )}
      </div>

      {/* Bottom Title Bar Enclosed with Section Border-Top */}
      <div className={`relative z-10 w-full bg-black/95 backdrop-blur-md py-2 px-1.5 text-center space-y-1 ${themeStyles.headerBorder}`}>
        <span className="text-amber-400 font-black text-[11px] sm:text-base uppercase tracking-wide block leading-tight min-h-[1.8rem] flex items-center justify-center text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
          {track.name}
        </span>
        <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-extrabold text-zinc-300 uppercase tracking-wider px-0.5">
          <span className="whitespace-nowrap">📅 {formattedDate || "PRÓXIMA"}</span>
          <span className="text-purple-300 whitespace-nowrap">🏆 {track.racesCount || 7} CARRERAS</span>
        </div>
      </div>
    </div>
  );
}

export default function StitchNeonGridTournaments({
  todayTracks = [],
  upcomingTracks = [],
  historyTracks = [],
  workflow,
  onTrackClick,
  userTimezoneLabel = "",
}) {
  const sortedToday = [...todayTracks].sort((a, b) => {
    const da = a.startDate ? new Date(a.startDate).getTime() : 0;
    const db = b.startDate ? new Date(b.startDate).getTime() : 0;
    return da - db;
  });

  const sortedUpcoming = [...upcomingTracks].sort((a, b) => {
    const da = a.startDate ? new Date(a.startDate).getTime() : 0;
    const db = b.startDate ? new Date(b.startDate).getTime() : 0;
    return da - db;
  });

  const sortedHistory = [...historyTracks].sort((a, b) => {
    const da = a.startDate ? new Date(a.startDate).getTime() : 0;
    const db = b.startDate ? new Date(b.startDate).getTime() : 0;
    return db - da;
  });
  return (
    <div className="w-full max-w-full mx-auto bg-black p-2 md:p-4 space-y-10 text-white font-['Roboto_Condensed',sans-serif]">
      {workflow?.expandedSlug && (
        <div className="flex justify-center mb-4">
          <button
            type="button"
            onClick={() => workflow.toggleTrack(workflow.expandedSlug)}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400 hover:text-amber-300 transition-all bg-purple-950/60 border border-purple-500/50 px-4 py-2 rounded-xl shadow-lg shadow-purple-500/20 cursor-pointer"
          >
            ← Volver a ver todas las secciones de torneos
          </button>
        </div>
      )}

      {/* Header Banner */}
      <header className="text-center mb-8 pt-2">
        <h1
          className="text-white mb-3 font-black italic uppercase tracking-wider leading-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] select-none text-2xl sm:text-4xl md:text-[48px]"
          style={{ fontSize: "clamp(24px, 5vw, 48px)", color: "#ffffff" }}
        >
          EN TODOS ESTOS TORNEOS
        </h1>
        <div className="inline-block bg-[#ffb800] rounded-xl px-6 sm:px-10 py-2.5 sm:py-3.5 transform -skew-x-6 shadow-[0_0_30px_rgba(255,184,0,0.5)] border border-amber-300">
          <h2
            className="text-black font-black italic uppercase tracking-wider transform skew-x-6 leading-none select-none text-2xl sm:text-4xl md:text-[48px]"
            style={{ fontSize: "clamp(24px, 5vw, 48px)", color: "#000000" }}
          >
            TIENES 3 TICKETS GRATIS
          </h2>
        </div>

        {userTimezoneLabel && (
          <div className="mt-4 text-xs font-extrabold text-purple-300 uppercase tracking-widest flex items-center justify-center gap-1.5">
            <span>🌐 HORARIOS AJUSTADOS A TU HORA LOCAL:</span>
            <span className="bg-purple-950/80 border border-purple-500/40 text-amber-300 px-2.5 py-0.5 rounded-full">
              {userTimezoneLabel}
            </span>
          </div>
        )}
      </header>

      {/* Section 1: HOY Y EN VIVO (Purple Neon) */}
      <section className="border-2 border-purple-500 rounded-xl p-2.5 sm:p-4 md:p-6 bg-black relative shadow-[0_0_15px_rgba(168,85,247,0.3)]">
        <div className="absolute -top-4 sm:-top-5 left-0 w-full flex justify-center">
          <div className="bg-black px-3 sm:px-6 flex items-center gap-2 sm:gap-4 border-x border-purple-500/50">
            <div className="h-0.5 w-6 sm:w-10 bg-purple-500"></div>
            <h2
              className="text-white uppercase tracking-wider font-['Roboto_Condensed',sans-serif] font-black leading-none text-base sm:text-2xl md:text-[30px]"
              style={{ fontSize: "clamp(16px, 3.8vw, 30px)", color: "#ffffff" }}
            >
              HOY Y EN VIVO ({todayTracks.length})
            </h2>
            <div className="h-0.5 w-6 sm:w-10 bg-purple-500"></div>
          </div>
        </div>

        {sortedToday.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-5 mt-4">
            {sortedToday.map((tr) => (
              <TrackCard
                key={tr.slug}
                track={tr}
                colorTheme="purple"
                activeSlug={workflow?.expandedSlug}
                onClick={onTrackClick}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-zinc-400 font-bold text-xs uppercase tracking-wider">
            No hay carreras programadas para hoy en este momento.
          </div>
        )}
      </section>

      {/* Section 2: PRÓXIMOS TORNEOS (Cyan Neon) */}
      <section className="border-2 border-cyan-400 rounded-xl p-2.5 sm:p-4 md:p-6 bg-black relative shadow-[0_0_15px_rgba(6,182,212,0.3)]">
        <div className="absolute -top-4 sm:-top-5 left-0 w-full flex justify-center">
          <div className="bg-black px-3 sm:px-6 flex items-center gap-2 sm:gap-4 border-x border-cyan-400/50">
            <div className="h-0.5 w-6 sm:w-10 bg-cyan-400"></div>
            <h2
              className="text-white uppercase tracking-wider font-['Roboto_Condensed',sans-serif] font-black leading-none text-base sm:text-2xl md:text-[30px]"
              style={{ fontSize: "clamp(16px, 3.8vw, 30px)", color: "#ffffff" }}
            >
              PRÓXIMOS TORNEOS ({sortedUpcoming.length})
            </h2>
            <div className="h-0.5 w-6 sm:w-10 bg-cyan-400"></div>
          </div>
        </div>

        {sortedUpcoming.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-5 mt-4">
            {sortedUpcoming.map((tr) => (
              <TrackCard
                key={tr.slug}
                track={tr}
                colorTheme="cyan"
                activeSlug={workflow?.expandedSlug}
                onClick={onTrackClick}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-zinc-400 font-bold text-xs uppercase tracking-wider">
            No hay torneos próximos programados.
          </div>
        )}
      </section>

      {/* Section 3: HISTORIAL/EVENTOS FINALIZADOS (Gold Neon) */}
      <section className="border-2 border-amber-500 rounded-xl p-2.5 sm:p-4 md:p-6 bg-black relative shadow-[0_0_15px_rgba(245,158,11,0.3)]">
        <div className="absolute -top-4 sm:-top-5 left-0 w-full flex justify-center">
          <div className="bg-black px-3 sm:px-6 flex items-center gap-2 sm:gap-4 border-x border-amber-500/50">
            <div className="h-0.5 w-6 sm:w-10 bg-amber-500"></div>
            <h2
              className="text-white uppercase tracking-wider font-['Roboto_Condensed',sans-serif] font-black leading-none text-base sm:text-2xl md:text-[30px]"
              style={{ fontSize: "clamp(16px, 3.8vw, 30px)", color: "#ffffff" }}
            >
              HISTORIAL/EVENTOS FINALIZADOS ({sortedHistory.length})
            </h2>
            <div className="h-0.5 w-6 sm:w-10 bg-amber-500"></div>
          </div>
        </div>

        {sortedHistory.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-5 mt-4">
            {sortedHistory.map((tr) => (
              <TrackCard
                key={tr.slug}
                track={tr}
                colorTheme="gold"
                activeSlug={workflow?.expandedSlug}
                onClick={onTrackClick}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-zinc-400 font-bold text-xs uppercase tracking-wider">
            No hay torneos finalizados en el historial aún.
          </div>
        )}
      </section>
    </div>
  );
}
