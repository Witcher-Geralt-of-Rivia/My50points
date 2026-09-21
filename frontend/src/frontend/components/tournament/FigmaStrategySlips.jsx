'use client';

import React from 'react';
import { Sparkles, Edit3, Check, Trophy, AlertCircle, Clock } from 'lucide-react';
import { useLanguage } from '@/frontend/lib/i18n/LanguageContext';

export default function FigmaStrategySlips({
  strategy = 'full', // 'full' | 'dual' | 'smart'
  onSelectStrategy,
  race,
  horses = [],
  selectedHorseIds = [],
  onToggleHorse,
  onOpenRaceModal,
}) {
  const { t, language } = useLanguage();
  const raceNum = race?.raceNumber || 1;

  // Find selected horse objects in priority order
  const pickedHorses = selectedHorseIds
    .map((id) => horses.find((h) => h.id === id))
    .filter(Boolean);

  const isEn = language === 'en';

  const strategies = [
    {
      id: 'full',
      name: 'FULL POINT',
      points: isEn ? '50 POINTS' : '50 PUNTOS',
      slots: 1,
      distribution: [isEn ? '50 pts (1st place)' : '50 pts (1er lugar)'],
      color: 'purple',
      accent: 'border-purple-500/50 text-purple-300 bg-purple-950/50',
    },
    {
      id: 'dual',
      name: 'DUAL POINT',
      points: '25 + 25 PTS',
      slots: 2,
      distribution: ['25 pts', '25 pts'],
      color: 'cyan',
      accent: 'border-cyan-500/50 text-cyan-300 bg-cyan-950/50',
    },
    {
      id: 'smart',
      name: 'SMART POINT',
      points: '30 + 15 + 5 PTS',
      slots: 3,
      distribution: [
        isEn ? '30 pts (Favorite)' : '30 pts (Favorito)',
        isEn ? '15 pts (Second)' : '15 pts (Segundo)',
        isEn ? '5 pts (Third)' : '5 pts (Tercero)',
      ],
      color: 'amber',
      accent: 'border-amber-500/50 text-amber-300 bg-amber-950/50',
    },
  ];

  const currentStrat = strategies.find((s) => s.id === strategy) || strategies[0];
  const maxSlots = currentStrat.slots;

  return (
    <div className="w-full mb-8 rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-2xl p-5 sm:p-6 shadow-2xl">
      {/* Strategy Header Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-white/50">
            {isEn ? 'Points Strategy · Race' : 'Estrategia de Puntos · Carrera'} {raceNum}
          </span>
          <h3 className="text-xl font-black text-white flex items-center gap-2 mt-0.5">
            <span>{isEn ? 'Select Your Allocation Strategy' : 'Selecciona tu Estrategia de Asignación'}</span>
          </h3>
        </div>

        {/* Strategy Switcher Pills */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-950/80 border border-white/10">
          {strategies.map((s) => {
            const isSelected = s.id === strategy;
            return (
              <button
                key={s.id}
                id={`strategy-tab-${s.id}`}
                type="button"
                onClick={() => onSelectStrategy && onSelectStrategy(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  isSelected
                    ? `${s.accent} shadow-[0_0_15px_rgba(255,255,255,0.15)] ring-1 ring-white/20`
                    : 'text-white/50 hover:text-white/80 bg-transparent'
                }`}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Strategy Info Banner */}
      <div className="flex items-center justify-between py-3 text-xs text-white/60">
        <div>
          {isEn ? 'Scoring mode' : 'Modalidad de puntuación'}: <strong className="text-white">{currentStrat.name}</strong> ({currentStrat.points})
        </div>
        <div className="text-[11px] text-white/40">
          {isEn ? 'Available slots' : 'Ranuras disponibles'}: {pickedHorses.length} / {maxSlots} {isEn ? 'selected' : 'seleccionadas'}
        </div>
      </div>

      {/* Interactive Slot Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 mt-2">
        {Array.from({ length: maxSlots }).map((_, slotIdx) => {
          const horse = pickedHorses[slotIdx];
          const slotLabel = currentStrat.distribution[slotIdx] || (isEn ? `Slot ${slotIdx + 1}` : `Ranura ${slotIdx + 1}`);

          if (horse) {
            return (
              <div
                key={horse.id}
                className="flex flex-col p-4 rounded-xl border border-cyan-500/40 bg-gradient-to-b from-cyan-950/40 to-slate-950/80 shadow-[0_0_15px_rgba(6,182,212,0.15)] relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {slotLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => onToggleHorse && onToggleHorse(horse.id)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-200 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{isEn ? 'EDIT' : 'EDITAR'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-3 my-2">
                  <div className="w-9 h-9 rounded-lg bg-cyan-400 text-slate-950 font-black text-base flex items-center justify-center shadow-md shrink-0">
                    {horse.postPosition || horse.number || slotIdx + 1}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-black text-white truncate">
                      {horse.name}
                    </h4>
                    <p className="text-[11px] text-white/50 truncate">
                      {isEn ? 'Jockey: ' : 'Jinete: '}{horse.jockey || (isEn ? 'Official' : 'Oficial')}
                    </p>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                  <span className="text-white/40">{t("figmaUI.slips.frozenDiv")}:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    ${Number(horse.odds || 2.0).toFixed(2)}
                  </span>
                </div>
              </div>
            );
          }

          // Empty Placeholder Slot
          return (
            <button
              key={`empty-${slotIdx}`}
              type="button"
              onClick={() => onOpenRaceModal && onOpenRaceModal()}
              className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-white/15 bg-slate-950/30 hover:border-cyan-500/40 hover:bg-slate-900/40 transition-all cursor-pointer group text-center min-h-[130px]"
            >
              <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-cyan-500/20 text-white/40 group-hover:text-cyan-400 flex items-center justify-center mb-2 transition-all">
                <span className="font-mono text-xs font-bold">#{slotIdx + 1}</span>
              </div>
              <span className="text-xs font-bold text-white/70 group-hover:text-cyan-300">
                {isEn ? 'Select Horse' : 'Seleccionar Caballo'}
              </span>
              <span className="text-[10px] text-white/40 mt-0.5">
                {slotLabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
