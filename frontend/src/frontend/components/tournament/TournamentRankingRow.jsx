"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Flame, Minus } from "lucide-react";

const MODE_CLASS = {
  full: "ranking-row__mode--full",
  dual: "ranking-row__mode--dual",
  smart: "ranking-row__mode--smart",
};

const PLAY_CLASS = {
  full: "ranking-row__play--full",
  dual: "ranking-row__play--dual",
  smart: "ranking-row__play--smart",
  miss: "ranking-row__play--miss",
  empty: "ranking-row__play--empty",
};

function PlayIndicators({ plays = [] }) {
  return (
    <div className="ranking-row__plays" aria-label="Recent plays">
      {plays.map((play, i) => (
        <span
          key={i}
          className={`ranking-row__play ${PLAY_CLASS[play.type] || PLAY_CLASS.empty}`}
          title={play.type === "miss" ? "Sin puntos" : play.type}
        >
          {play.type === "miss" ? "✕" : null}
        </span>
      ))}
    </div>
  );
}

function RankMovement({ change }) {
  if (change > 0) {
    return (
      <span className="ranking-row__movement ranking-row__movement--up">
        <TrendingUp className="w-3.5 h-3.5" />
        {change}
      </span>
    );
  }
  if (change < 0) {
    return (
      <span className="ranking-row__movement ranking-row__movement--down">
        <TrendingDown className="w-3.5 h-3.5" />
        {Math.abs(change)}
      </span>
    );
  }
  return (
    <span className="ranking-row__movement ranking-row__movement--flat">
      <Minus className="w-3.5 h-3.5" />
    </span>
  );
}

function PointDelta({ delta }) {
  if (delta > 0) {
    return <span className="ranking-row__delta ranking-row__delta--up">+{delta}</span>;
  }
  if (delta < 0) {
    return <span className="ranking-row__delta ranking-row__delta--down">{delta}</span>;
  }
  return <span className="ranking-row__delta">0</span>;
}

export default function TournamentRankingRow({
  player,
  index = 0,
  isCurrentUser = false,
  compact = false,
}) {
  const initials = player.initials || player.name?.slice(0, 2).toUpperCase() || "??";
  const profileHref = player.userId ? `/profile/${player.userId}` : "#";

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02 }}
      className={`ranking-row ${isCurrentUser ? "ranking-row--me" : ""} ${compact ? "ranking-row--compact" : ""}`}
    >
      <div className="ranking-row__pos">
        {player.position <= 3 ? (
          <span className={`ranking-row__pos-badge ranking-row__pos-badge--${player.position}`}>
            {player.position}
          </span>
        ) : (
          <span className="ranking-row__pos-num">{player.position}</span>
        )}
      </div>

      <Link href={profileHref} className="ranking-row__avatar-link" title={player.name}>
        <div
          className="ranking-row__avatar"
          style={{
            backgroundColor: (player.avatarColor || "#7c3aed") + "30",
            borderColor: player.avatarColor || "#7c3aed",
            color: player.avatarColor || "#c4b5fd",
          }}
        >
          {initials}
        </div>
      </Link>

      <div className="ranking-row__identity">
        <p className="ranking-row__name">{player.name}</p>
        <p className={`ranking-row__mode ${MODE_CLASS[player.strategy] || ""}`}>
          {player.strategyLabel}
        </p>
      </div>

      <div className="ranking-row__points">
        <span className="ranking-row__points-val">{player.score.toLocaleString()}</span>
        <span className="ranking-row__points-unit">pts</span>
      </div>

      <PlayIndicators plays={player.recentPlays} />

      <div className="ranking-row__streak">
        {player.winStreak > 0 ? (
          <>
            <Flame className="w-4 h-4 text-orange-400" />
            <span>{player.winStreak}</span>
          </>
        ) : (
          <span className="ranking-row__streak-empty">—</span>
        )}
      </div>

      <div className="ranking-row__movement-wrap">
        <RankMovement change={player.posChange} />
      </div>

      <div className="ranking-row__delta-wrap">
        <PointDelta delta={player.pointsChange} />
      </div>

      <time className="ranking-row__time">{player.updatedAtLabel || "—"}</time>
    </motion.div>
  );
}
