'use client';

import React, { useState } from 'react';
import { Trophy, Search, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/frontend/lib/i18n/LanguageContext';

export default function FigmaFinalRanking({
  entries = [],
  tournamentName = "SANTA ANITA PARK",
  isFinished = true,
}) {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [searchTerm, setSearchTerm] = useState('');

  // Certified demo leaderboard matching Figma Page 6
  const defaultFigmaData = [
    { pos: 1, name: "María López", ticket: "T1", points: 7890, diff: "—" },
    { pos: 2, name: "Alex Martín", ticket: "T2", points: 4560, diff: "-3,330" },
    { pos: 3, name: "David Ruiz", ticket: "T3", points: 2180, diff: "-5,710" },
    { pos: 4, name: "HIPÓDROMO KING", ticket: "T1", points: 1950, diff: "-5,940" },
    { pos: 5, name: "FAST BET", ticket: "T3", points: 1880, diff: "-6,010" },
    { pos: 6, name: "QUEEN RUSH", ticket: "T2", points: 1740, diff: "-6,150" },
    { pos: 7, name: "JOCKEY LEGEND", ticket: "T1", points: 1620, diff: "-6,270" },
    { pos: 8, name: "RÁPIDO Y FURIOSO", ticket: "T2", points: 1540, diff: "-6,350" },
    { pos: 9, name: "PURAS APUESTAS", ticket: "T1", points: 1420, diff: "-6,470" },
    { pos: 10, name: "INVITADO TOP", ticket: "T3", points: 1310, diff: "-6,580" },
    { pos: 11, name: "BET MASTER", ticket: "T2", points: 1240, diff: "-6,650" },
    { pos: 12, name: "GOLDEN HORSE", ticket: "T1", points: 1180, diff: "-6,710" },
    { pos: 13, name: "BLACK POWER", ticket: "T3", points: 1090, diff: "-6,800" },
    { pos: 14, name: "TURF INVITADO", ticket: "T2", points: 1020, diff: "-6,870" },
    { pos: 15, name: "VELOCIDAD TOTAL", ticket: "T1", points: 960, diff: "-6,930" },
  ];

  const filteredData = defaultFigmaData.filter((r) =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full mt-12 rounded-3xl border-2 border-purple-900/40 bg-black p-6 sm:p-10 shadow-[0_0_50px_rgba(124,58,237,0.25)] text-white relative overflow-hidden">
      {/* Laser Neon Light Accents */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[250px] bg-gradient-to-r from-purple-600/30 via-cyan-500/20 to-amber-500/30 blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="text-center relative z-10 pb-6 border-b border-white/10">
        <span className="text-xs sm:text-sm font-black tracking-[0.25em] text-[#06B6D4] uppercase">
          MY 50 POINTS
        </span>
        <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white mt-1 drop-shadow">
          {isEn ? "FINAL RANKING" : "RANKING FINAL"}
        </h2>
        <div className="text-xs sm:text-sm font-black uppercase tracking-widest text-[#FACC15] mt-1">
          {isEn ? "OFFICIAL RECORD · TOURNAMENT COMPLETED" : "REGISTRO OFICIAL · TORNEO FINALIZADO"}
        </div>
      </div>

      {/* 3D Podium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto my-10 items-end relative z-10">
        {/* 2nd Place (Silver - Left) */}
        <div className="order-2 md:order-1 flex flex-col items-center">
          <div className="w-24 h-24 rounded-full border-4 border-slate-300 p-1 bg-slate-900 shadow-[0_0_20px_rgba(203,213,225,0.4)] mb-3 overflow-hidden flex items-center justify-center">
            <span className="text-3xl">🥈</span>
          </div>
          <div className="w-full max-w-[200px] bg-white text-black text-center py-2 px-3 rounded-xl shadow-lg font-black">
            <div className="text-xs truncate">Alex Martín</div>
            <div className="text-[11px] text-zinc-600 font-bold">4,560 {isEn ? "POINTS" : "PUNTOS"}</div>
          </div>
          <div className="w-full max-w-[200px] h-36 mt-2 rounded-2xl bg-gradient-to-b from-slate-400 via-slate-600 to-slate-800 flex items-center justify-center border-2 border-slate-300 shadow-xl">
            <div className="w-16 h-16 rounded-xl bg-white/90 text-black font-black text-4xl flex items-center justify-center shadow-inner font-mono">
              2
            </div>
          </div>
        </div>

        {/* 1st Place (Gold - Center) */}
        <div className="order-1 md:order-2 flex flex-col items-center">
          <div className="w-28 h-28 rounded-full border-4 border-[#FACC15] p-1 bg-amber-950 shadow-[0_0_35px_rgba(250,204,21,0.6)] mb-3 overflow-hidden flex items-center justify-center relative">
            <span className="text-5xl">👑</span>
          </div>
          <div className="w-full max-w-[220px] bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 text-black text-center py-2.5 px-3 rounded-xl shadow-2xl font-black">
            <div className="text-sm truncate">María López</div>
            <div className="text-xs text-amber-950 font-black">7,890 {isEn ? "POINTS" : "PUNTOS"}</div>
          </div>
          <div className="w-full max-w-[220px] h-48 mt-2 rounded-2xl bg-gradient-to-b from-[#FACC15] via-[#CA8A04] to-[#854D0E] flex items-center justify-center border-2 border-yellow-300 shadow-2xl">
            <div className="w-20 h-20 rounded-xl bg-white text-black font-black text-5xl flex items-center justify-center shadow-2xl font-mono">
              1
            </div>
          </div>
        </div>

        {/* 3rd Place (Bronze - Right) */}
        <div className="order-3 flex flex-col items-center">
          <div className="w-24 h-24 rounded-full border-4 border-amber-700 p-1 bg-stone-900 shadow-[0_0_20px_rgba(180,83,9,0.4)] mb-3 overflow-hidden flex items-center justify-center">
            <span className="text-3xl">🥉</span>
          </div>
          <div className="w-full max-w-[200px] bg-white text-black text-center py-2 px-3 rounded-xl shadow-lg font-black">
            <div className="text-xs truncate">David Ruiz</div>
            <div className="text-[11px] text-zinc-600 font-bold">2,180 {isEn ? "POINTS" : "PUNTOS"}</div>
          </div>
          <div className="w-full max-w-[200px] h-28 mt-2 rounded-2xl bg-gradient-to-b from-[#B45309] via-[#78350F] to-[#451A03] flex items-center justify-center border-2 border-amber-700 shadow-xl">
            <div className="w-16 h-16 rounded-xl bg-[#FDE68A]/90 text-amber-950 font-black text-4xl flex items-center justify-center shadow-inner font-mono">
              3
            </div>
          </div>
        </div>
      </div>

      {/* Subheader Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-950 border border-white/10 mb-5 relative z-10">
        <div>
          <h3 className="text-sm font-black uppercase text-white tracking-wide">
            {isEn ? "FINAL RANKING" : "RANKING FINAL"} · {tournamentName}
          </h3>
          <p className="text-[11px] text-white/50">
            {isEn ? "CLOSED STANDINGS · CERTIFIED PERMANENT RECORD" : "CLASIFICACIÓN CERRADA · REGISTRO PERMANENTE CERTIFICADO"}
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-white/40 uppercase font-mono block">{isEn ? "TOURNAMENT DATE" : "FECHA DEL TORNEO"}</span>
          <span className="text-xs font-black font-mono text-white">02/08/2026</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4 max-w-md z-10">
        <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={isEn ? "Search player..." : "Buscar jugador..."}
          className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400 transition-colors"
        />
      </div>

      {/* Leaderboard Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10 relative z-10 bg-slate-950">
        <table className="w-full text-left text-xs border-collapse font-sans">
          <thead className="border-b border-white/10 text-white/40 uppercase tracking-wider text-[10px] bg-white/[0.02]">
            <tr>
              <th className="py-3 px-3 text-center w-14">{isEn ? "POS." : "POS."}</th>
              <th className="py-3 px-3">{isEn ? "PLAYER" : "JUGADOR"}</th>
              <th className="py-3 px-3 text-center w-24">{isEn ? "TICKET N°" : "N° TICKET"}</th>
              <th className="py-3 px-3 text-right">{isEn ? "POINTS" : "PUNTOS"}</th>
              <th className="py-3 px-3 text-right">{isEn ? "DIFF" : "DIFERENCIA"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono">
            {filteredData.map((row) => {
              // Pos color badges
              let posBadgeBg = 'bg-white/10 text-white';
              if (row.pos === 1) posBadgeBg = 'bg-[#FACC15] text-black font-black';
              else if (row.pos === 2) posBadgeBg = 'bg-slate-300 text-black font-black';
              else if (row.pos === 3) posBadgeBg = 'bg-[#B45309] text-white font-black';

              return (
                <tr key={row.pos} className="hover:bg-white/[0.04] transition-colors">
                  <td className="py-2.5 px-3 text-center">
                    <span className={`inline-flex items-center justify-center w-7 h-5 rounded-md text-xs ${posBadgeBg}`}>
                      {row.pos}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-sans font-bold text-white">
                    {row.name}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white text-black">
                      {row.ticket}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-black text-[#22C55E] text-sm">
                    {row.points.toLocaleString()} pts
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-red-400">
                    {row.diff}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-center text-[10px] text-white/40 uppercase tracking-widest mt-4">
        {isEn ? "CERTIFIED FINAL RESULT · NO FURTHER UPDATES" : "RESULTADO FINAL CERTIFICADO · SIN ACTUALIZACIONES"}
      </div>
    </div>
  );
}
