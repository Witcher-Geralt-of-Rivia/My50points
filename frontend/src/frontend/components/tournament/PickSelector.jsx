'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { strategyPickButtonAsset } from '@/frontend/lib/config/pointStrategyAssets';

const strategies = [
  {
    id: 'full',
    name: 'FULL POINT',
    description: '50 puntos en 1 caballo',
    maxPicks: 1,
    allocation: [50],
    gradient: 'from-purple to-purple-light',
    borderColor: 'border-purple',
    glowColor: 'shadow-[0_0_30px_rgba(124,58,237,0.5)]',
    bgActive: 'bg-purple/20',
    tagColors: ['bg-purple'],
  },
  {
    id: 'dual',
    name: 'DUAL POINT',
    description: '25 puntos en 2 caballos',
    maxPicks: 2,
    allocation: [25, 25],
    gradient: 'from-cyan to-cyan',
    borderColor: 'border-cyan',
    glowColor: 'shadow-[0_0_30px_rgba(6,182,212,0.5)]',
    bgActive: 'bg-cyan/20',
    tagColors: ['bg-cyan', 'bg-cyan'],
  },
  {
    id: 'smart',
    name: 'SMART POINT',
    description: '30 / 15 / 5 en 3 caballos',
    maxPicks: 3,
    allocation: [30, 15, 5],
    gradient: 'from-gold to-gold',
    borderColor: 'border-yellow-400',
    glowColor: 'shadow-[0_0_30px_rgba(250,204,21,0.5)]',
    bgActive: 'bg-yellow-400/15',
    tagColors: ['bg-gold', 'bg-gold', 'bg-gold'],
  },
];

export { strategies };

export default function PickSelector({ activeStrategy, onStrategyChange, picksCount, totalPoints }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-white/60">
          Estrategia de Seleccion
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">Puntos restantes:</span>
          <motion.span
            key={totalPoints}
            initial={{ scale: 1.3, color: '#a855f7' }}
            animate={{ scale: 1, color: totalPoints === 0 ? '#22c55e' : '#f59e0b' }}
            className="text-sm font-bold"
          >
            {totalPoints}
          </motion.span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {strategies.map((strategy) => {
          const isActive = activeStrategy === strategy.id;
          const btnArt = strategyPickButtonAsset(strategy.id);

          return (
            <motion.button
              key={strategy.id}
              onClick={() => onStrategyChange(strategy.id)}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={`
                pick-selector-card relative rounded-xl border text-left transition-all duration-300 overflow-hidden tour-step-strategy-btn
                ${isActive
                  ? `${strategy.bgActive} ${strategy.borderColor} ${strategy.glowColor} border-opacity-60`
                  : 'bg-black/40 border-white/10 hover:bg-white/[0.06] hover:border-white/20'
                }
              `}
            >
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    exit={{ scaleX: 0 }}
                    className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${strategy.gradient} z-10`}
                  />
                )}
              </AnimatePresence>

              {btnArt ? (
                <img
                  src={btnArt}
                  alt={strategy.name}
                  className="pick-selector-card__art w-full h-auto block"
                />
              ) : null}

              <div className="pick-selector-card__meta px-3 pb-3 pt-1">
                <p className={`text-[11px] ${isActive ? 'text-white/75' : 'text-white/35'}`}>
                  {strategy.description}
                </p>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {strategy.allocation.map((pts, idx) => (
                    <span
                      key={idx}
                      className={`
                        text-[10px] font-bold px-1.5 py-0.5 rounded
                        ${isActive
                          ? `${strategy.tagColors[idx]} text-white`
                          : 'bg-white/5 text-white/30'
                        }
                      `}
                    >
                      {pts}pts
                    </span>
                  ))}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
