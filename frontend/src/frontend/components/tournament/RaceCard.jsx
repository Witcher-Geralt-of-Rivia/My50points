'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, MapPin, ChevronDown, Check, Lock } from 'lucide-react';
import { strategies } from './PickSelector';

function JockeySilk({ primary, secondary, size = 24 }) {
  return (
    <div
      className="rounded-sm flex-shrink-0 overflow-hidden flex"
      style={{ width: size, height: size }}
    >
      <div style={{ backgroundColor: primary, width: '50%', height: '100%' }} />
      <div style={{ backgroundColor: secondary, width: '50%', height: '100%' }} />
    </div>
  );
}

const postPositionColors = [
  { bg: '#E31937', text: '#FFFFFF' },  // 1 - Red
  { bg: '#FFFFFF', text: '#000000' },  // 2 - White
  { bg: '#003DA5', text: '#FFFFFF' },  // 3 - Royal Blue
  { bg: '#FFD100', text: '#000000' },  // 4 - Yellow
  { bg: '#00843D', text: '#FFFFFF' },  // 5 - Green
  { bg: '#000000', text: '#FFD100' },  // 6 - Black w/ yellow
  { bg: '#FF6900', text: '#FFFFFF' },  // 7 - Orange
  { bg: '#E5007D', text: '#FFFFFF' },  // 8 - Pink
  { bg: '#00B5E2', text: '#FFFFFF' },  // 9 - Turquoise
  { bg: '#6F2DA8', text: '#FFFFFF' },  // 10 - Purple
  { bg: '#A7A8AA', text: '#000000' },  // 11 - Grey
  { bg: '#78BE20', text: '#000000' },  // 12 - Lime
];

function PostBadge({ number }) {
  const colorSet = postPositionColors[(number - 1) % postPositionColors.length];
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
      style={{ backgroundColor: colorSet.bg, color: colorSet.text, border: number === 2 ? '1px solid rgba(255,255,255,0.2)' : 'none' }}
    >
      {number}
    </div>
  );
}

function LiveRaceSimulator({ horses }) {
  const [progress, setProgress] = useState(0);
  const [runners, setRunners] = useState([]);
  const [statusText, setStatusText] = useState("¡En los partidores!");

  useEffect(() => {
    if (!horses || horses.length === 0) return;
    const initial = horses.map(h => ({
      id: h.id,
      name: h.name,
      number: h.postPosition || 1,
      x: 0,
    }));
    setRunners(initial);
    setProgress(0);
    setStatusText("¡Partida limpia! Carrera en curso...");
  }, [horses]);

  useEffect(() => {
    if (runners.length === 0) return;
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setStatusText("🏆 ¡Final de la carrera! Cruzando el disco.");
          return 100;
        }
        
        setRunners(curr => {
          return curr.map(r => {
            const step = Math.random() * 8 + 2;
            return {
              ...r,
              x: Math.min(100, r.x + step)
            };
          });
        });

        return Math.min(100, prev + 5);
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [runners.length]);

  const standings = [...runners].sort((a, b) => b.x - a.x);

  return (
    <div className="p-4 md:p-5 bg-zinc-950/60 border border-red-500/20 rounded-xl mb-4 text-left relative overflow-hidden backdrop-blur-md">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-red-500" />
      
      <div className="flex justify-between items-center mb-3">
        <span className="text-[10px] font-black text-red-400 uppercase tracking-widest flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          SIMULADOR EN VIVO
        </span>
        <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest">
          {statusText}
        </span>
      </div>

      <div className="relative h-[120px] bg-zinc-900/60 border border-zinc-800 rounded-lg p-2 overflow-hidden flex flex-col justify-between">
        <div className="absolute inset-x-0 top-1/3 border-t border-zinc-800/40 border-dashed" />
        <div className="absolute inset-x-0 top-2/3 border-t border-zinc-800/40 border-dashed" />

        <div className="absolute left-[30px] inset-y-0 border-l border-zinc-800" />
        <div className="absolute right-[40px] inset-y-0 border-l-2 border-red-500/50 flex items-center justify-center">
          <span className="text-[7px] text-red-400 font-black uppercase rotate-90 tracking-widest translate-x-2">META</span>
        </div>

        {runners.map((r, idx) => {
          const colorSet = postPositionColors[(r.number - 1) % postPositionColors.length];
          const topPercent = (idx / Math.max(1, runners.length - 1)) * 75 + 10;
          return (
            <div
              key={r.id}
              className="absolute transition-all duration-1000 ease-out flex items-center gap-1"
              style={{
                left: `calc(30px + (${r.x}% * 0.75))`,
                top: `${topPercent}%`,
                transform: 'translateY(-50%)',
              }}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shadow-md border border-black/30 select-none shrink-0"
                style={{ backgroundColor: colorSet.bg, color: colorSet.text }}
                title={`${r.name} (#${r.number})`}
              >
                {r.number}
              </div>
              <span className="text-[7px] text-zinc-500 font-bold uppercase truncate max-w-[40px] hidden md:inline">
                {r.name.slice(0, 5)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-zinc-900 flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-wider text-zinc-500">
        <span>Posiciones en curso:</span>
        <div className="flex gap-3">
          {standings.slice(0, 3).map((r, i) => (
            <span key={r.id} className="text-zinc-300">
              {i + 1}° <strong className="text-white">#{r.number}</strong> {r.name.slice(0, 10)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function RaceCard({
  race,
  activeStrategy,
  selectedHorses,
  confirmedStrategy,
  onPickHorse,
  onStrategyChange,
  isExpanded = true,
  onToggleExpand,
  showHeader = true,
  tournamentRace = true,
  isLightMode = false,
}) {
  const strategy = strategies.find((s) => s.id === activeStrategy);
  const maxPicks = strategy?.maxPicks || 1;
  const allocation = strategy?.allocation || [50];

  const getHorsePoints = (horseId) => {
    const idx = selectedHorses.indexOf(horseId);
    if (idx === -1) return 0;
    return allocation[idx] || 0;
  };

  const isSelected = (horseId) => selectedHorses.includes(horseId);
  const canPick = selectedHorses.length < maxPicks;

  const surfaceColors = {
    Dirt: 'text-amber-400 bg-amber-400/10',
    Turf: 'text-green-400 bg-green-400/10',
    Synthetic: 'text-cyan-400 bg-cyan-400/10',
  };

  const statusColors = {
    completed: 'bg-white/10 text-white/50',
    live: 'bg-red-500/20 text-red-400',
    upcoming: 'bg-purple/20 text-purple-light',
  };

  const isCompleted = race.status === 'completed';
  const isNonTournament = !tournamentRace;

  const strategyStripConfig = confirmedStrategy ? ({
    full:  { borderColor: 'border-l-purple',      bgTint: 'bg-purple/[0.07]',      numGradient: 'from-purple to-purple-light' },
    dual:  { borderColor: 'border-l-cyan',         bgTint: 'bg-cyan/[0.07]',         numGradient: 'from-cyan to-cyan' },
    smart: { borderColor: 'border-l-yellow-400',   bgTint: 'bg-yellow-400/[0.07]',   numGradient: 'from-gold to-gold' },
  })[confirmedStrategy] : null;

  // A confirmed (already-picked) race row should feel "settled": slight opacity, no hover noise
  const isConfirmed = Boolean(confirmedStrategy);
  const isClosed = race.status === 'completed' || race.status === 'COMPLETED' || race.status === 'finished' || race.status === 'FINISHED';
  const picksLocked = !onPickHorse || isClosed;

  return (
    <div className={`rounded-xl overflow-hidden backdrop-blur-lg transition-opacity duration-300 ${
      isLightMode
        ? "bg-transparent border-none shadow-none"
        : isNonTournament
        ? 'border border-white/[0.04] bg-white/[0.008] opacity-[0.35]'
        : strategyStripConfig
          ? `border border-l-[3px] ${strategyStripConfig.borderColor} border-white/10 ${strategyStripConfig.bgTint} opacity-75`
          : 'border border-white/10 bg-white/[0.03]'
    }`}>
      {/* Race header */}
      {showHeader && (
        <button
          onClick={isNonTournament ? undefined : onToggleExpand}
          className={`w-full flex items-center justify-between p-4 md:p-5 transition-colors ${isNonTournament ? 'cursor-default' : 'hover:bg-white/[0.02]'}`}
        >
          <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 ${
              isNonTournament
                ? 'bg-white/[0.06] text-white/20'
                : strategyStripConfig
                  ? `bg-gradient-to-br ${strategyStripConfig.numGradient} text-white`
                  : 'bg-gradient-to-br from-cyan to-purple text-white'
            }`}>
              {isNonTournament
                ? <Lock size={16} />
                : isConfirmed
                  ? <Check size={16} />
                  : `C${race.number}`}
            </div>
            <div className="text-left min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`font-semibold text-sm md:text-base truncate ${isNonTournament ? 'text-white/25' : 'text-white'}`}>
                  {race.name !== `Race ${race.number}` ? race.name : `CARRERA ${race.number}`}
                </span>
                {isNonTournament ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-white/[0.06] text-white/20">
                    BLOQUEADA
                  </span>
                ) : strategyStripConfig ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-green-500/20 text-green-400 flex items-center gap-1">
                    <Check size={10} />
                    LISTO
                  </span>
                ) : (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${statusColors[race.status]}`}>
                    {race.status === 'live' && (
                      <span className="inline-block w-1.5 h-1.5 bg-red-400 rounded-full mr-1 animate-pulse-live" />
                    )}
                    {race.status === 'live' ? 'EN VIVO' : race.status === 'upcoming' ? 'PROXIMO' : 'COMPLETADO'}
                  </span>
                )}
              </div>
              <div className={`flex items-center gap-3 mt-0.5 text-xs ${isNonTournament ? 'text-white/15' : 'text-white/40'}`}>
                <span>{Math.round((race.distance / 201.168) * 2) / 2} furlones</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${isNonTournament ? 'text-white/15 bg-white/[0.03]' : surfaceColors[race.surface]}`}>
                  Pista
                </span>
                <span className="hidden sm:inline">{race.class}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {confirmedStrategy && (() => {
              const cs = strategies.find((s) => s.id === confirmedStrategy);
              return cs ? (
                <div className={`race-strategy-strip__confirmed race-strategy-strip__confirmed--${confirmedStrategy}`}>
                  <span className="race-strategy-strip__name">{cs.name}</span>
                </div>
              ) : null;
            })()}
            <div className={`hidden md:flex items-center gap-1 text-xs ${isNonTournament ? 'text-white/15' : 'text-white/40'}`}>
              <span>{race.horses.length} participantes</span>
            </div>
            <div className={`hidden sm:flex items-center gap-1 text-xs ${isNonTournament ? 'text-white/15' : 'text-white/40'}`}>
              <Clock size={12} />
              <span>
                {(() => {
                  if (race.scheduledTime) {
                    const parsed = new Date(race.scheduledTime);
                    if (parsed instanceof Date && !isNaN(parsed.getTime())) {
                      return `${race.postTime} ET (${parsed.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} Local)`;
                    }
                  }
                  return race.postTime || "TBD";
                })()}
              </span>
            </div>
            {!isNonTournament && (
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={18} className="text-white/30" />
              </motion.div>
            )}
          </div>
        </button>
      )}

      {/* Expandable race content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            {/* Mini-simulador eliminado (regla del cliente: cero simulación). */}

            {/* Inline strategy selector */}
            {onStrategyChange && (
              <div className="race-strategy-strip">
                <div className="race-strategy-strip__head">
                  <span className="race-strategy-strip__label text-[#a855f7] font-black">👉 PASO 1: SELECCIONA CÓMO GANAR PUNTOS (ESTRATEGIA)</span>
                  <div className="race-strategy-strip__head-line" aria-hidden />
                  <span className="race-strategy-strip__meta">{race.horses.length} participantes</span>
                </div>
                <div className="race-strategy-strip__bars">
                  {strategies.map((s) => {
                    const isActive = activeStrategy === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => onStrategyChange?.(s.id)}
                        disabled={picksLocked}
                        className={`race-strategy-strip__bar race-strategy-strip__bar--${s.id}${
                          isActive ? " race-strategy-strip__bar--active" : ""
                        } tour-step-strategy-btn ${picksLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span className="race-strategy-strip__name">{s.name}</span>
                        <div className="race-strategy-strip__points">
                          {s.allocation.map((pts, idx) => {
                            const isBlocked = isActive && idx < selectedHorses.length;
                            return (
                              <div
                                key={idx}
                                className={`race-strategy-strip__point-wrap${
                                  isBlocked ? " race-strategy-strip__point-wrap--blocked" : ""
                                }`}
                              >
                                <span
                                  className={`race-strategy-strip__point${
                                    isBlocked ? " race-strategy-strip__point--blocked" : ""
                                  }`}
                                >
                                  {pts}
                                  {isBlocked ? (
                                    <span className="race-strategy-strip__point-block" aria-hidden />
                                  ) : null}
                                </span>
                                <span className="race-strategy-strip__point-label">PUNTOS</span>
                              </div>
                            );
                          })}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="mx-4 my-2.5 p-3 bg-purple-950/20 border border-purple-500/20 rounded-xl text-xs text-purple-300 flex items-start gap-2.5">
                  <span className="text-base select-none">💡</span>
                  <p className="font-semibold leading-relaxed">
                    {activeStrategy === "full" && (
                      <><strong>Estrategia Full Point:</strong> Selecciona tu caballo favorito para ganar la carrera.</>
                    )}
                    {activeStrategy === "dual" && (
                      <><strong>Estrategia Dual Point:</strong> Selecciona tus 2 caballos favoritos.</>
                    )}
                    {activeStrategy === "smart" && (
                      <><strong>Estrategia Smart Point:</strong> Selecciona tus 3 caballos favoritos.</>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Race meta bar */}
            <div className="flex items-center gap-4 px-4 md:px-5 py-2 border-t border-b border-white/5 bg-white/[0.01] text-xs text-white/40 flex-wrap">
              <div className="flex items-center gap-1">
                <MapPin size={11} />
                <span>{Math.round((race.distance / 201.168) * 2) / 2} furlones - Pista</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={11} />
                <span>
                  {(() => {
                    if (race.scheduledTime) {
                      const parsed = new Date(race.scheduledTime);
                      if (parsed instanceof Date && !isNaN(parsed.getTime())) {
                        return `${parsed.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} Local (${race.postTime} ET)`;
                      }
                    }
                    return race.postTime || "TBD";
                  })()}
                </span>
              </div>
              <span className="text-white/20">{race.class}</span>
            </div>

            {/* Selection Helper Banner */}
            <div className="mx-4 mt-4 mb-2 flex items-center justify-between text-xs uppercase tracking-wider font-black select-none">
              <span className="text-[#a855f7]">👉 PASO 2: ELIGE TU(S) CABALLO(S) FAVORITO(S):</span>
              <span className={selectedHorses.length === maxPicks ? "text-emerald-400" : "text-amber-400"}>
                {selectedHorses.length === maxPicks
                  ? "✓ Selección Completa — Listo para confirmar"
                  : `Eligiendo: ${selectedHorses.length} de ${maxPicks} (${maxPicks - selectedHorses.length} restantes)`}
              </span>
            </div>

            {/* Horse list styled as a clean modern game grid of cards */}
            <div className="flex flex-col gap-2.5 p-2.5">
              {race.horses.map((horse, idx) => {
                const selected = isSelected(horse.id);
                const points = getHorsePoints(horse.id);
                const selectionIdx = selectedHorses.indexOf(horse.id);

                return (
                  <motion.div
                    key={horse.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className={`
                      transition-all duration-300 rounded-xl border
                      ${selected
                        ? 'bg-gradient-to-r from-purple/15 to-purple-light/5 border-purple-light/45 shadow-[0_4px_20px_rgba(124,58,237,0.08)]'
                        : 'bg-white/[0.015] border-white/5 hover:bg-white/[0.03] hover:border-white/15'
                      }
                    `}
                  >
                    {/* Desktop card style grid */}
                    <div className="hidden md:grid grid-cols-[50px_40px_1fr_120px_145px] gap-4 items-center px-5 py-3.5">
                       <PostBadge number={horse.postPosition} />
                      <div className="flex justify-center">
                        <JockeySilk primary={horse.silkColors.primary} secondary={horse.silkColors.secondary} size={28} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-white font-extrabold text-base tracking-wide truncate flex items-center flex-wrap">
                          {horse.name}
                          {selected && (() => {
                            if (activeStrategy === 'full') {
                              return <span className="ml-3 inline-block bg-purple-600/30 text-purple-300 border border-purple-400/50 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">⭐ MI CABALLO ELEGIDO</span>;
                            }
                            if (activeStrategy === 'dual') {
                              const posLabel = selectionIdx === 0 ? "🥇 1er FAVORITO" : "🥈 2do FAVORITO";
                              const badgeColor = selectionIdx === 0 ? "bg-cyan-600/30 text-cyan-300 border-cyan-400/50" : "bg-teal-600/30 text-teal-300 border-teal-400/50";
                              return <span className={`ml-3 inline-block ${badgeColor} border text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider`}>{posLabel}</span>;
                            }
                            if (activeStrategy === 'smart') {
                              const labels = ["🥇 1er FAVORITO", "🥈 2do FAVORITO", "🥉 3er FAVORITO"];
                              const colors = [
                                "bg-yellow-600/30 text-yellow-300 border-yellow-400/50",
                                "bg-amber-600/30 text-amber-300 border-amber-400/50",
                                "bg-orange-600/30 text-orange-300 border-orange-400/50"
                              ];
                              return <span className={`ml-3 inline-block ${colors[selectionIdx]} border text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider`}>{labels[selectionIdx]}</span>;
                            }
                            return null;
                          })()}
                        </span>
                        <span className="text-white/40 text-xs mt-1 truncate">
                          Jinete: <span className="text-white/60">{horse.jockey}</span> • Entrenador: <span className="text-white/60">{horse.trainer}</span> • {horse.weight}kg
                        </span>
                      </div>
                      <div className="text-right pr-4">
                        <span className="text-[10px] text-white/30 block uppercase tracking-widest font-semibold mb-0.5">Cuota</span>
                        <span className="text-gold font-black text-lg tracking-wide">{horse.odds.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-end gap-3">
                        {selected && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className={`
                              text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider
                              ${strategy?.tagColors?.[selectionIdx] || 'bg-purple'} text-white
                            `}
                          >
                            {points} pts
                          </motion.span>
                        )}
                        <motion.button
                          whileHover={picksLocked ? undefined : { scale: 1.05 }}
                          whileTap={picksLocked ? undefined : { scale: 0.95 }}
                          onClick={() => onPickHorse?.(horse.id)}
                          disabled={picksLocked || (!canPick && !selected)}
                          className={`
                            tour-step-horse-btn w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 check-circle-indicator
                            ${selected
                              ? 'bg-gradient-to-r from-purple to-purple-light text-white shadow-[0_0_15px_rgba(124,58,237,0.5)] border border-purple-light'
                              : canPick
                                ? 'border border-white/20 hover:border-purple-light/80 hover:bg-purple/10'
                                : 'border border-white/5 opacity-30 cursor-not-allowed'
                            }
                          `}
                        >
                          {selected ? (
                            <Check size={14} strokeWidth={3.5} />
                          ) : canPick ? (
                            <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.4)', marginTop: '-1px' }}>+</span>
                          ) : (
                            <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.1)' }}>🔒</span>
                          )}
                        </motion.button>
                      </div>
                    </div>

                    {/* Mobile card */}
                    <div className="md:hidden p-3">
                      <div className="flex items-center gap-3">
                        <PostBadge number={horse.postPosition} />
                        <JockeySilk primary={horse.silkColors.primary} secondary={horse.silkColors.secondary} size={20} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-semibold text-sm truncate flex items-center flex-wrap gap-1">
                              {horse.name}
                              {selected && (() => {
                                if (activeStrategy === 'full') {
                                  return <span className="bg-purple-600/30 text-purple-300 border border-purple-400/30 text-[8px] font-black px-1 rounded uppercase">⭐</span>;
                                }
                                if (activeStrategy === 'dual') {
                                  const posLabel = selectionIdx === 0 ? "🥇 1°" : "🥈 2°";
                                  return <span className="bg-cyan-600/30 text-cyan-300 border border-cyan-400/30 text-[8px] font-black px-1 rounded uppercase">{posLabel}</span>;
                                }
                                if (activeStrategy === 'smart') {
                                  const labels = ["🥇 1°", "🥈 2°", "🥉 3°"];
                                  return <span className="bg-yellow-600/30 text-yellow-300 border border-yellow-400/30 text-[8px] font-black px-1 rounded uppercase">{labels[selectionIdx]}</span>;
                                }
                                return null;
                              })()}
                            </span>
                            <span className="text-gold font-bold text-xs">{horse.odds.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-white/40 mt-0.5">
                            <span className="truncate">{horse.jockey}</span>
                            <span className="text-white/20">|</span>
                            <span className="truncate">{horse.trainer}</span>
                            <span className="text-white/20">|</span>
                            <span>{horse.weight}kg</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {selected && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className={`
                                text-[10px] font-bold px-1.5 py-0.5 rounded
                                ${strategy?.tagColors?.[selectionIdx] || 'bg-purple'} text-white
                              `}
                            >
                              {points}pts
                            </motion.span>
                          )}
                          <motion.button
                            whileTap={picksLocked ? undefined : { scale: 0.9 }}
                            onClick={() => onPickHorse?.(horse.id)}
                            disabled={picksLocked || (!canPick && !selected)}
                            className={`
                              tour-step-horse-btn w-9 h-9 rounded-lg flex items-center justify-center transition-all
                              ${selected
                                ? 'bg-gradient-to-r from-purple to-purple-light text-white shadow-[0_0_12px_rgba(124,58,237,0.4)]'
                                : canPick
                                  ? 'bg-white/5 text-white/50 border border-white/10'
                                  : 'bg-white/[0.02] text-white/15 border border-white/5 cursor-not-allowed'
                              }
                            `}
                          >
                            {selected ? <Check size={14} /> : '+'}
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
