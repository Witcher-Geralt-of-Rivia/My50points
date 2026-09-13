'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, TrendingUp, TrendingDown, Zap, Target, Eye, Activity } from 'lucide-react';
import TournamentRankingRow from '@/frontend/components/tournament/TournamentRankingRow';
import { useAuth } from '@/frontend/contexts/AuthContext';

const strategyDot = { full: 'bg-purple', dual: 'bg-cyan', smart: 'bg-gold' };
const strategyText = { full: 'text-purple-light', dual: 'text-cyan', smart: 'text-gold' };
const strategyBg = { full: 'bg-purple/10', dual: 'bg-cyan/10', smart: 'bg-gold/10' };
const strategyBorder = { full: 'border-purple/30', dual: 'border-cyan/30', smart: 'border-gold/30' };

function HotPlayerCard({ player }) {
  if (!player) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden rounded-xl border border-orange-500/30 bg-gradient-to-r from-orange-500/10 via-red-500/10 to-orange-500/10 p-3 mb-4"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-transparent" />
      <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full blur-2xl" />

      <div className="relative flex items-center gap-3">
        <div className="relative">
          <div className="text-2xl">{player.avatar}</div>
          <Flame size={14} className="absolute -top-1 -right-1 text-orange-400 animate-pulse" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest flex items-center gap-1">
              <Flame size={10} /> Jugador en Llamas
            </span>
          </div>
          <p className="text-white font-bold text-sm truncate">{player.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`w-2 h-2 rounded-full ${strategyDot[player.strategy]}`} />
            <span className="text-white/40 text-[10px]">{player.strategyLabel}</span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-orange-400 font-bold text-lg">{player.score.toLocaleString()}</span>
          <div className="flex items-center justify-end gap-0.5 text-emerald-400 mt-0.5">
            <TrendingUp size={11} />
            <span className="text-[11px] font-bold">+{player.posChange}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function UserPositionCard({ ticket }) {
  if (!ticket) return null;

  const config = {
    full: { gradient: 'from-purple/20 to-purple/5', border: 'border-purple/40' },
    dual: { gradient: 'from-cyan/20 to-cyan/5', border: 'border-cyan/40' },
    smart: { gradient: 'from-gold/20 to-gold/5', border: 'border-gold/40' },
  }[ticket.strategy] || { gradient: 'from-purple/20 to-purple/5', border: 'border-purple/40' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-xl border ${config.border} bg-gradient-to-r ${config.gradient} p-4 mb-4`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/40 text-[10px] uppercase tracking-widest mb-1">Tu Posición</p>
          <div className="flex items-baseline gap-2">
            <span className="text-white font-black text-3xl">#{ticket.position}</span>
            {ticket.posChange !== 0 && (
              <span className={`flex items-center gap-0.5 text-sm font-bold ${ticket.posChange > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {ticket.posChange > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {ticket.posChange > 0 ? '+' : ''}{ticket.posChange}
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <p className="text-white/40 text-[10px] uppercase tracking-widest mb-1">Puntos</p>
          <span className={`font-black text-2xl ${strategyText[ticket.strategy]}`}>
            {ticket.score.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${strategyDot[ticket.strategy]}`} />
          <span className="text-white/50 text-xs">{ticket.strategyLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          <Activity size={11} className="text-white/30" />
          <span className="text-white/40 text-xs">{ticket.racesConfirmed}/{ticket.totalRaces} carreras</span>
        </div>
        {ticket.nearTop10 && (
          <div className="flex items-center gap-1 text-cyan">
            <Target size={11} />
            <span className="text-[10px] font-semibold">Top 10 Cerca</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function RealTimeRanking({ data, activeTicket }) {
  const { user } = useAuth();
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setPulse(p => !p), 2000);
    return () => clearInterval(timer);
  }, []);

  if (!data) return null;

  const userTicket = activeTicket || data.userTickets[0];
  const userPosition = userTicket?.position || 18;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full bg-emerald-400 ${pulse ? 'opacity-100' : 'opacity-40'} transition-opacity`} />
        <span className="text-emerald-400 text-[11px] font-bold uppercase tracking-widest">En Vivo</span>
        <span className="text-white/20 text-[10px]">actualizado hace 5s</span>
      </div>

      <HotPlayerCard player={data.hotPlayer} />

      <UserPositionCard ticket={userTicket} />

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Eye size={14} className="text-white/40" />
            Ranking en Tiempo Real
          </h3>
          <span className="text-white/30 text-xs">{data.totalParticipants} jugadores</span>
        </div>

        <div className="ranking-table ranking-table--live">
          <div className="ranking-table__head ranking-table__head--live">
            <span>#</span>
            <span />
            <span>Jugador</span>
            <span>Pts</span>
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="ranking-table__body">
            {data.players.map((player, i) => (
              <TournamentRankingRow
                key={player.id}
                player={player}
                index={i}
                compact
                isCurrentUser={
                  user?.id != null
                    ? player.userId === user.id
                    : player.position === userPosition
                }
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
