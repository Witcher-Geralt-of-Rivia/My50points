'use client';

import { motion } from 'framer-motion';
import { Trophy, Crown, Medal, Zap } from 'lucide-react';
import TournamentRankingRow from '@/frontend/components/tournament/TournamentRankingRow';
import { useAuth } from '@/frontend/contexts/AuthContext';

const strategyText = {
  full: 'text-purple-light',
  dual: 'text-cyan',
  smart: 'text-gold',
};

const positionBadge = {
  1: 'from-yellow-400 to-amber-600',
  2: 'from-gray-300 to-gray-500',
  3: 'from-amber-600 to-orange-800',
};

function RecordCard({ player, index }) {
  const icons = [Crown, Trophy, Medal];
  const Icon = icons[index] || Medal;
  const gradient = positionBadge[index + 1] || 'from-purple to-cyan';
  const sizes = ['scale-110', 'scale-100', 'scale-95'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`relative flex-1 ${sizes[index]}`}
    >
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
        <div className={`absolute inset-0 bg-gradient-to-b ${gradient} opacity-[0.08]`} />
        <div className="relative">
          <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br ${gradient} mb-1.5`}>
            <Icon size={14} className="text-black" />
          </div>
          <div className="text-xl mb-0.5">{player.avatar}</div>
          <p className="text-white text-xs font-semibold truncate">{player.name}</p>
          <p className={`text-sm font-bold ${strategyText[player.strategy]} mt-0.5`}>
            {player.score.toLocaleString()}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function RecordSection({ title, icon, records, accentColor = 'text-white' }) {
  if (!records || records.length === 0) return null;

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className={`text-sm font-bold ${accentColor} uppercase tracking-wider`}>{title}</h3>
      </div>
      <div className="flex gap-2 items-end">
        {records.map((player, i) => (
          <RecordCard key={player.id} player={player} index={i} />
        ))}
      </div>
    </div>
  );
}

export default function TournamentRanking({ data }) {
  const { user } = useAuth();
  if (!data) return null;

  const currentUserId = user?.id;

  return (
    <div className="space-y-4">
      <RecordSection
        title="Record de All Time"
        icon={<Trophy size={16} className="text-gold" />}
        records={data.allTimeRecords}
        accentColor="text-gold"
      />

      <RecordSection
        title="Record de Full Point"
        icon={<Zap size={16} className="text-purple-light" />}
        records={data.fullPointRecords}
        accentColor="text-purple-light"
      />

      <RecordSection
        title="Record de Dual Point"
        icon={<span className="text-cyan text-sm">⚡</span>}
        records={data.dualPointRecords}
        accentColor="text-cyan"
      />

      <RecordSection
        title="Record de Smart Pick"
        icon={<span className="text-gold text-sm">🧠</span>}
        records={data.smartPickRecords}
        accentColor="text-gold"
      />

      <div className="ranking-table">
        <div className="ranking-table__head">
          <span>#</span>
          <span />
          <span>Jugador</span>
          <span>Puntos</span>
          <span>Historial</span>
          <span>Racha</span>
          <span>Mov.</span>
          <span>+/-</span>
          <span>Hora</span>
        </div>

        <div className="ranking-table__body">
          {data.players.map((player, i) => (
            <TournamentRankingRow
              key={player.id}
              player={player}
              index={i}
              isCurrentUser={currentUserId != null && player.userId === currentUserId}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
