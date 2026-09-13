'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Flame, Target, Zap } from 'lucide-react';

const strategyConfig = {
  full: { color: 'text-purple-light', bg: 'bg-purple/20', border: 'border-purple/40', label: 'Full Point', icon: '🎯' },
  dual: { color: 'text-cyan', bg: 'bg-cyan/20', border: 'border-cyan/40', label: 'Dual Point', icon: '⚡' },
  smart: { color: 'text-gold', bg: 'bg-gold/20', border: 'border-gold/40', label: 'Smart Point', icon: '🧠' },
};

export default function FloatingTicketBar({ tickets, autoRotate = true, rotateInterval = 4000 }) {
  const [activeTicket, setActiveTicket] = useState(0);

  useEffect(() => {
    if (!autoRotate || tickets.length <= 1) return;
    const timer = setInterval(() => {
      setActiveTicket(prev => (prev + 1) % tickets.length);
    }, rotateInterval);
    return () => clearInterval(timer);
  }, [autoRotate, tickets.length, rotateInterval]);

  if (!tickets || tickets.length === 0) return null;

  const ticket = tickets[activeTicket];
  const config = strategyConfig[ticket.strategy] || strategyConfig.full;
  const isUp = ticket.posChange > 0;
  const isDown = ticket.posChange < 0;

  const prevTicket = () => setActiveTicket(prev => (prev - 1 + tickets.length) % tickets.length);
  const nextTicket = () => setActiveTicket(prev => (prev + 1) % tickets.length);

  return (
    <div className="sticky top-0 z-50">
      <div className={`relative overflow-hidden rounded-xl border ${config.border} ${config.bg} backdrop-blur-xl`}>
        <div className="absolute inset-0 bg-gradient-to-r from-purple/5 via-transparent to-cyan/5" />

        <div className="relative px-3 py-2.5">
          <div className="flex items-center gap-2">
            {tickets.length > 1 && (
              <button onClick={prevTicket} className="p-0.5 rounded-full hover:bg-white/10 transition-colors">
                <ChevronLeft size={14} className="text-white/50" />
              </button>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTicket}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex items-center gap-3 min-w-0"
              >
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${config.bg} border ${config.border}`}>
                  <span className="text-xs">{config.icon}</span>
                  <span className={`text-[11px] font-bold ${config.color}`}>Ticket {ticket.ticketNum}</span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-white/50 text-[11px]">Pos</span>
                  <span className="text-white font-bold text-sm">#{ticket.position}</span>
                </div>

                <div className="h-3 w-px bg-white/10" />

                <div className="flex items-center gap-1">
                  <span className={`font-bold text-sm ${config.color}`}>{ticket.score.toLocaleString()}</span>
                  <span className="text-white/40 text-[10px]">pts</span>
                </div>

                <div className="h-3 w-px bg-white/10" />

                {ticket.posChange !== 0 && (
                  <div className={`flex items-center gap-0.5 ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    <span className="text-[11px] font-semibold">
                      {isUp ? '+' : ''}{ticket.posChange}
                    </span>
                  </div>
                )}

                {ticket.isHot && (
                  <div className="flex items-center gap-0.5 text-orange-400">
                    <Flame size={11} className="animate-pulse" />
                    <span className="text-[10px] font-bold">HOT</span>
                  </div>
                )}

                {ticket.nearTop10 && (
                  <div className="flex items-center gap-0.5">
                    <Target size={11} className="text-cyan" />
                    <span className="text-[10px] text-cyan font-medium">Top 10 Cerca</span>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {tickets.length > 1 && (
              <button onClick={nextTicket} className="p-0.5 rounded-full hover:bg-white/10 transition-colors">
                <ChevronRight size={14} className="text-white/50" />
              </button>
            )}
          </div>

          {tickets.length > 1 && (
            <div className="flex justify-center gap-1 mt-1.5">
              {tickets.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTicket(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === activeTicket ? 'bg-white w-4' : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
