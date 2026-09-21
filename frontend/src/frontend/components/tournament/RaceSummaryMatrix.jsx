'use client';

import React from 'react';
import { Calendar, Clock, MapPin, FileSpreadsheet } from 'lucide-react';
import { useLanguage } from '@/frontend/lib/i18n/LanguageContext';

export default function RaceSummaryMatrix({
  tournament,
  races = [],
  currentRaceIndex = 0,
  onSelectRace,
  picks = {},
  onOpenDividends,
}) {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const trackName = tournament?.name || "PARX RACING";
  const location = tournament?.location || (isEn ? "Bensalem, PA" : "Bensalem, PA");
  const postTime = tournament?.postTime || "2:30 PM";

  // Ensure we display the 7 tournament races
  const tournamentRaces = races.slice(0, 7);

  return (
    <div className="w-full mb-8 rounded-2xl border-2 border-purple-900/40 bg-black/90 backdrop-blur-2xl p-5 sm:p-6 shadow-2xl">
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-purple-900/30">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {isEn ? "50POINTS OFFICIAL TOURNAMENT" : "TORNEO OFICIAL 50POINTS"}
            </span>
            <span className="text-xs font-semibold text-white/50">
              {isEn ? "7 Official Races" : "7 Carreras Oficiales"}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight italic flex items-center gap-2">
            <span>{trackName}</span>
          </h2>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-white/60 font-medium">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span>{location}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>12/05/2024</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isEn ? "Closes " : "Cierre "}{postTime}</span>
            </div>
          </div>
        </div>

        {/* Action Button: Fixed Dividends Modal Trigger */}
        <div className="flex items-center gap-2.5">
          {onOpenDividends && (
            <button
              id="matrix-open-dividends-btn"
              type="button"
              onClick={onOpenDividends}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.25)] transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>{isEn ? "Fixed Dividends Table" : "Tabla de Dividendos Fijos"}</span>
            </button>
          )}
        </div>
      </div>

      {/* 7-Race Cards Strip */}
      <div className="mt-5">
        <div className="text-[11px] font-black uppercase tracking-widest text-white/40 mb-3 flex items-center justify-between">
          <span>{isEn ? "7-RACE TOURNAMENT OVERVIEW" : "RESUMEN GENERAL DE CARRERAS (7 CARRERAS DEL TORNEO)"}</span>
          <span>{isEn ? "CLICK EDIT TO CHANGE PICKS" : "HAZ CLIC EN EDITAR PARA CAMBIAR PICKS"}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
          {tournamentRaces.map((race, idx) => {
            const isSelected = idx === currentRaceIndex;
            const raceNum = race.raceNumber || idx + 1;

            // Pick analysis
            const racePick = picks[race.id];
            const horseIds = Array.isArray(racePick)
              ? racePick
              : (racePick?.horseIds || (racePick?.horseId ? [racePick.horseId] : []));

            // Strategy determination
            let strategyName = 'SMART POINT';
            let stratBg = 'bg-[#FACC15] text-black'; // Gold
            if (horseIds.length === 1) {
              strategyName = 'FULL POINT';
              stratBg = 'bg-[#7C3AED] text-white'; // Purple
            } else if (horseIds.length === 2) {
              strategyName = 'DUAL POINT';
              stratBg = 'bg-[#06B6D4] text-black'; // Cyan
            }

            // Find horse post positions or numbers
            const horseNumbers = horseIds.map((hid) => {
              const h = (race.horses || []).find((item) => item.id === hid);
              return h?.postPosition || h?.number || hid;
            });

            // Default demo display if no picks made yet
            const displayNumbers = horseNumbers.length > 0 ? horseNumbers : [];

            return (
              <div
                key={race.id || idx}
                id={`race-summary-card-${raceNum}`}
                onClick={() => onSelectRace && onSelectRace(idx)}
                className={`flex flex-col rounded-xl border-2 overflow-hidden transition-all cursor-pointer text-center select-none ${
                  isSelected
                    ? 'border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)] ring-2 ring-yellow-400/50 scale-[1.02]'
                    : 'border-purple-900/60 bg-black/60 hover:border-purple-500/50'
                }`}
              >
                {/* 1. Cream Top Tab */}
                <div className="w-full bg-[#F5EEDC] text-black font-black text-xs py-1 uppercase tracking-wide border-b border-black/20">
                  {isEn ? "RACE" : "CARRERA"} {raceNum}
                </div>

                {/* 2. Strategy Banner */}
                <div className={`w-full py-1.5 px-1 font-black text-[10px] uppercase tracking-wider ${stratBg}`}>
                  {displayNumbers.length > 0 ? strategyName : (isEn ? 'NO PICKS' : 'SIN PICKS')}
                </div>

                {/* 3. White Number Boxes */}
                <div className="flex items-center justify-center gap-1.5 p-2.5 bg-black/80 min-h-[52px]">
                  {displayNumbers.length > 0 ? (
                    displayNumbers.map((num, nIdx) => (
                      <div
                        key={nIdx}
                        className="w-7 h-7 rounded-md bg-white text-black font-black text-sm flex items-center justify-center shadow-md font-mono"
                      >
                        {num}
                      </div>
                    ))
                  ) : (
                    <span className="text-[10px] text-white/30 italic">{isEn ? 'Empty' : 'Vacío'}</span>
                  )}
                </div>

                {/* 4. Green EDIT Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectRace && onSelectRace(idx);
                  }}
                  className="w-full py-1.5 bg-[#16A34A] hover:bg-[#15803D] text-white font-black text-[10px] uppercase tracking-widest transition-colors cursor-pointer border-t border-black/30"
                >
                  {isEn ? "EDIT" : "EDITAR"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
