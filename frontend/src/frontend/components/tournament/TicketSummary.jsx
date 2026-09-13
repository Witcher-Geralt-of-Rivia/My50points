'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, ChevronUp, ChevronDown, AlertCircle } from 'lucide-react';
import { strategies } from './PickSelector';

export default function TicketSummary({
  raceNumber,
  activeStrategy,
  selectedHorses,
  horses,
  totalPoints,
  onConfirm,
  isComplete,
}) {
  const strategy = strategies.find((s) => s.id === activeStrategy);
  const allocation = strategy?.allocation || [50];

  const selectedHorseData = selectedHorses
    .map((id) => horses.find((h) => h.id === id))
    .filter(Boolean);

  // Mobile: bottom bar expand toggle
  // Desktop: sidebar card
  return (
    <>
      {/* Desktop sidebar card */}
      <div className="block">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-lg overflow-hidden sticky top-4">
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <Ticket size={16} className="text-purple-light" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Tu Ticket
              </h3>
            </div>
            <p className="text-xs text-white/40">Carrera {raceNumber}</p>
          </div>

          {/* Strategy badge */}
          <div className="px-4 py-3 border-b border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/40 uppercase tracking-wider">Estrategia</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded bg-gradient-to-r ${strategy?.gradient} text-white`}>
                {strategy?.name}
              </span>
            </div>
          </div>

          {/* Picks list */}
          <div className="p-4">
            {selectedHorseData.length === 0 ? (
              <div className="flex items-center gap-2 text-white/30 text-xs py-4 justify-center">
                <AlertCircle size={14} />
                <span>Sin selecciones</span>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedHorseData.map((horse, idx) => (
                  <motion.div
                    key={horse.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between bg-white/[0.03] rounded-lg p-2.5 border border-white/5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white
                        ${idx === 0 ? 'bg-purple' : idx === 1 ? 'bg-cyan' : 'bg-gold'}
                      `}>
                        {horse.postPosition}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{horse.name}</p>
                        <p className="text-[10px] text-white/40">{allocation[idx]}pts x {horse.odds.toFixed(2)}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded
                      ${idx === 0 ? 'bg-purple text-white' : idx === 1 ? 'bg-cyan text-white' : 'bg-gold text-black'}
                    `}>
                      {Math.round(allocation[idx] * horse.odds)}pts
                    </span>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Points remaining */}
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-white/40">Puntos restantes</span>
              <motion.span
                key={totalPoints}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                className={`font-bold ${totalPoints === 0 ? 'text-green-400' : 'text-gold'}`}
              >
                {totalPoints} / 50
              </motion.span>
            </div>

            {/* Progress bar */}
            <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: `${((50 - totalPoints) / 50) * 100}%` }}
                transition={{ type: 'spring', stiffness: 100 }}
                className="h-full bg-gradient-to-r from-purple to-purple-light rounded-full"
              />
            </div>
          </div>

          {/* Confirm button */}
          <div className="p-4 pt-0">
            <motion.button
              whileHover={isComplete ? { scale: 1.02 } : {}}
              whileTap={isComplete ? { scale: 0.98 } : {}}
              onClick={onConfirm}
              disabled={!isComplete}
              className={`
                w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-300 tour-step-confirm-btn
                ${isComplete
                  ? 'bg-gradient-to-r from-purple to-purple-light text-white shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:shadow-[0_0_30px_rgba(124,58,237,0.6)]'
                  : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                }
              `}
            >
              {isComplete ? 'Confirmar Selecciones' : `Selecciona ${strategy?.maxPicks - selectedHorses.length} caballo(s) mas`}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Mobile bottom bar */}
      <MobileTicketBar
        raceNumber={raceNumber}
        strategy={strategy}
        selectedHorseData={selectedHorseData}
        allocation={allocation}
        totalPoints={totalPoints}
        isComplete={isComplete}
        onConfirm={onConfirm}
        selectedCount={selectedHorses.length}
      />
    </>
  );
}

function MobileTicketBar({
  raceNumber,
  strategy,
  selectedHorseData,
  allocation,
  totalPoints,
  isComplete,
  onConfirm,
  selectedCount,
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-brand-dark/95 backdrop-blur-xl border-t border-white/10 overflow-hidden"
          >
            <div className="p-4 space-y-2 max-h-[40vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/40">Carrera {raceNumber} - {strategy?.name}</span>
                <span className={`text-xs font-bold ${totalPoints === 0 ? 'text-green-400' : 'text-gold'}`}>
                  {totalPoints}/50 pts restantes
                </span>
              </div>
              {selectedHorseData.length === 0 ? (
                <p className="text-white/30 text-xs text-center py-3">Elige tus caballos abajo</p>
              ) : (
                selectedHorseData.map((horse, idx) => (
                  <div key={horse.id} className="flex items-center justify-between bg-white/[0.03] rounded-lg p-2 border border-white/5">
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white
                        ${idx === 0 ? 'bg-purple' : idx === 1 ? 'bg-cyan' : 'bg-gold'}
                      `}>
                        {horse.postPosition}
                      </div>
                      <span className="text-xs text-white font-medium">{horse.name}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded
                      ${idx === 0 ? 'bg-purple text-white' : idx === 1 ? 'bg-cyan text-white' : 'bg-gold text-black'}
                    `}>
                      {allocation[idx]}pts
                    </span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-brand-dark/95 backdrop-blur-xl border-t border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <Ticket size={14} className="text-purple-light" />
              <span className="text-xs font-bold text-white">
                {selectedCount}/{strategy?.maxPicks} selecciones
              </span>
            </div>
            <div className="flex gap-0.5">
              {Array.from({ length: strategy?.maxPicks || 1 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i < selectedCount ? 'bg-purple-light' : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
            {expanded ? <ChevronDown size={14} className="text-white/30" /> : <ChevronUp size={14} className="text-white/30" />}
          </button>
          <motion.button
            whileTap={isComplete ? { scale: 0.95 } : {}}
            onClick={onConfirm}
            disabled={!isComplete}
            className={`
              px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex-shrink-0 tour-step-confirm-btn
              ${isComplete
                ? 'bg-gradient-to-r from-purple to-purple-light text-white shadow-[0_0_15px_rgba(124,58,237,0.4)]'
                : 'bg-white/5 text-white/20 border border-white/5'
              }
            `}
          >
            Confirmar
          </motion.button>
        </div>
      </div>
    </div>
  );
}
