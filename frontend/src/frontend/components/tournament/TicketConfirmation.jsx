'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Check, Trophy, ArrowRight, X } from 'lucide-react';
import { strategies } from './PickSelector';

function Particle({ index }) {
  const colors = ['#7c3aed', '#a855f7', '#06b6d4', '#f59e0b', '#22c55e', '#ec4899'];
  const color = colors[index % colors.length];
  const angle = (index / 20) * 360;
  const distance = 60 + Math.random() * 100;
  const x = Math.cos((angle * Math.PI) / 180) * distance;
  const y = Math.sin((angle * Math.PI) / 180) * distance;
  const size = 3 + Math.random() * 5;

  return (
    <motion.div
      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      animate={{
        x,
        y: y - 30,
        opacity: 0,
        scale: 0,
      }}
      transition={{
        duration: 0.8 + Math.random() * 0.6,
        ease: 'easeOut',
        delay: Math.random() * 0.2,
      }}
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
        backgroundColor: color,
        top: '50%',
        left: '50%',
      }}
    />
  );
}

export default function TicketConfirmation({
  isOpen,
  onClose,
  raceName,
  raceNumber,
  activeStrategy,
  selectedHorses,
  horses,
  tournamentSlug,
}) {
  const [autoCloseTimer, setAutoCloseTimer] = useState(5);
  const strategy = strategies.find((s) => s.id === activeStrategy);
  const allocation = strategy?.allocation || [50];

  const selectedHorseData = selectedHorses
    .map((id) => horses.find((h) => h.id === id))
    .filter(Boolean);

  useEffect(() => {
    if (!isOpen) return;
    setAutoCloseTimer(5);
    const interval = setInterval(() => {
      setAutoCloseTimer((prev) => {
        if (prev <= 1) {
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl border border-white/10 bg-brand-card backdrop-blur-xl overflow-hidden"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1 text-white/30 hover:text-white/60 transition-colors z-10"
            >
              <X size={18} />
            </button>

            {/* Success animation area */}
            <div className="relative flex items-center justify-center pt-10 pb-4">
              {/* Particles */}
              <div className="relative">
                {Array.from({ length: 20 }).map((_, i) => (
                  <Particle key={i} index={i} />
                ))}
              </div>

              {/* Checkmark circle */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                className="relative"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple to-purple-light flex items-center justify-center shadow-[0_0_40px_rgba(124,58,237,0.5)]">
                  <motion.div
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                  >
                    <Check size={36} className="text-white" strokeWidth={3} />
                  </motion.div>
                </div>

                {/* Glow ring */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.8 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 1, repeat: 1, repeatDelay: 0.5 }}
                  className="absolute inset-0 rounded-full border-2 border-purple/50"
                />
              </motion.div>
            </div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center px-6 pb-4"
            >
              <h2 className="text-xl font-bold text-white mb-1">PUNTOS REGISTRADOS</h2>
              <p className="text-sm text-white/40">Tus selecciones han sido confirmadas</p>
            </motion.div>

            {/* Summary */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mx-6 mb-4 rounded-xl bg-white/[0.03] border border-white/5 overflow-hidden"
            >
              {/* Race info */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div>
                  <p className="text-xs text-white/40">Carrera</p>
                  <p className="text-sm font-semibold text-white">
                    {raceName || `CARRERA ${raceNumber}`}
                  </p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded bg-gradient-to-r ${strategy?.gradient} text-white`}>
                  {strategy?.name}
                </span>
              </div>

              {/* Picks */}
              <div className="divide-y divide-white/5">
                {selectedHorseData.map((horse, idx) => (
                  <div key={horse.id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white
                        ${idx === 0 ? 'bg-purple' : idx === 1 ? 'bg-cyan' : 'bg-gold'}
                      `}>
                        {horse.postPosition}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{horse.name}</p>
                        <p className="text-[10px] text-white/40">{horse.jockey} - {allocation[idx]}pts x {horse.odds.toFixed(2)}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded
                      ${idx === 0 ? 'bg-purple text-white' : idx === 1 ? 'bg-cyan text-white' : 'bg-gold text-black'}
                    `}>
                      {Math.round(allocation[idx] * horse.odds)} pts
                    </span>
                  </div>
                ))}
              </div>

              {/* Total potential */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 bg-white/[0.02]">
                <span className="text-xs text-white/40">Ganancia potencial</span>
                <span className="text-sm font-bold text-green-400">
                  {selectedHorseData.reduce((sum, horse, idx) => sum + Math.round((allocation[idx] || 0) * horse.odds), 0)} pts
                </span>
              </div>
            </motion.div>

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex gap-3 px-6 pb-6"
            >
              <Link
                href="/leaderboard"
                className="flex-1 py-2.5 rounded-xl text-center text-sm font-semibold bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all border border-white/10"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <Trophy size={14} />
                  Ver Clasificacion
                </div>
              </Link>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-center text-sm font-bold bg-gradient-to-r from-purple to-purple-light text-white shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:shadow-[0_0_25px_rgba(124,58,237,0.5)] transition-shadow"
              >
                <div className="flex items-center justify-center gap-1.5">
                  Siguiente Carrera
                  <ArrowRight size={14} />
                </div>
              </button>
            </motion.div>

            {/* Auto close timer */}
            <div className="text-center pb-4">
              <span className="text-[10px] text-white/20">
                Cerrando en {autoCloseTimer}s
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
